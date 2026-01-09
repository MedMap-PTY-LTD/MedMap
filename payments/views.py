from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, viewsets
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from bookings.models import Booking
from memberships.models import Membership
from .models import PaymentTransaction
from .serializers import PaymentTransactionSerializer
from .paystack import PaystackService
import hashlib
import hmac

User = get_user_model()


# =========================
# ADMIN: VIEW TRANSACTIONS
# =========================
class PaymentTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentTransaction.objects.all().order_by("-created_at")
    serializer_class = PaymentTransactionSerializer
    permission_classes = [permissions.IsAdminUser]


class PaystackConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "publicKey": settings.PAYSTACK_PUBLIC_KEY
        })

class PaystackInitializeMembershipView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        service = PaystackService()
        
        amount = settings.MEMBERSHIP_PRICE
        callback_url = f"{settings.FRONTEND_URL}/memberships"
        
        metadata = {
            "context": "membership",
            "user_id": user.id,
            "plan": "premium"
        }
        
        try:
            response = service.initialize_transaction(
                email=user.email,
                amount=amount,
                callback_url=callback_url,
                metadata=metadata
            )
            return Response(response)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

class PaystackInitializeBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        booking_id = request.data.get("booking_id")
        
        try:
            booking = Booking.objects.get(id=booking_id, user=user)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=404)
            
        service = PaystackService()
        amount = float(booking.total_amount)
        callback_url = f"{settings.FRONTEND_URL}/booking-success?booking_id={booking.id}"
        
        metadata = {
            "context": "booking",
            "user_id": user.id,
            "booking_id": booking.id
        }
        
        try:
            response = service.initialize_transaction(
                email=user.email,
                amount=amount,
                callback_url=callback_url,
                metadata=metadata
            )
            return Response(response)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

class PaystackWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Paystack sends the event in the body
        # We should verify the signature (X-Paystack-Signature) 
        # But for now, let's trust the data if we can verify the transaction status via API or signature
        
        # Verify Signature
        secret = settings.PAYSTACK_SECRET_KEY
        signature = request.headers.get('X-Paystack-Signature')
        
        if not signature:
             return Response({"status": "failed", "message": "No signature"}, status=400)
             
        # Verify payload signature
        body_bytes = request.body
        computed_signature = hashlib.sha512(body_bytes).hexdigest() # Paystack uses HMAC SHA512 with secret key
        
        # In python hmac
        import hmac
        computed_hmac = hmac.new(secret.encode('utf-8'), body_bytes, digestmod=hashlib.sha512).hexdigest()
        
        if computed_hmac != signature:
            return Response({"status": "failed", "message": "Invalid signature"}, status=400)
            
        payload = request.data
        event = payload.get('event')
        data = payload.get('data', {})
        
        if event == 'charge.success':
            metadata = data.get('metadata', {})
            context = metadata.get('context')
            
            if context == 'membership':
                user_id = metadata.get('user_id')
                try:
                    user = User.objects.get(id=user_id)
                    membership, _ = Membership.objects.get_or_create(user=user)
                    membership.tier = "premium"
                    membership.status = "active"
                    
                    now = timezone.now()
                    current_end = membership.end_date
                    if current_end and current_end > now:
                        membership.end_date = current_end + timedelta(days=settings.MEMBERSHIP_DURATION_DAYS)
                    else:
                        membership.end_date = now + timedelta(days=settings.MEMBERSHIP_DURATION_DAYS)
                    membership.save()
                    
                    # Log transaction
                    PaymentTransaction.objects.create(
                        user=user,
                        amount=data.get('amount') / 100, # Cents to Rands
                        status='complete',
                        transaction_type='membership',
                        reference=data.get('reference'),
                        description='MedMap Premium Membership',
                        metadata=data
                    )
                    
                except Exception as e:
                    print(f"Error updating membership: {e}")
                    
            elif context == 'booking':
                booking_id = metadata.get('booking_id')
                try:
                    booking = Booking.objects.get(id=booking_id)
                    booking.payment_status = 'COMPLETE'
                    booking.status = 'confirmed'
                    booking.save()
                    
                    # Log transaction
                    PaymentTransaction.objects.create(
                        user=booking.user,
                        amount=data.get('amount') / 100,
                        status='complete',
                        transaction_type='booking',
                        reference=data.get('reference'),
                        description=f"Booking #{booking.id}",
                        metadata=data
                    )
                except Exception as e:
                    print(f"Error updating booking: {e}")
                    
        return Response({"status": "success"})
