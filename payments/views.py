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


# =========================
# FRONTEND CONFIG
# =========================
class PaystackConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "publicKey": settings.PAYSTACK_PUBLIC_KEY
        })


# =========================
# MEMBERSHIP PAYMENT INIT
# =========================
class PaystackInitializeMembershipView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        service = PaystackService()

        amount = settings.MEMBERSHIP_PRICE  # R39.00
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


# =========================
# BOOKING PAYMENT INIT
# =========================
class PaystackInitializeBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        booking_id = request.data.get("booking_id")

        if not booking_id:
            return Response({"error": "booking_id is required"}, status=400)

        try:
            booking = Booking.objects.get(id=booking_id, user=user)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=404)

        service = PaystackService()
        amount = float(booking.total_amount)  # R10.00
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


# =========================
# PAYSTACK WEBHOOK
# =========================
class PaystackWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        secret = settings.PAYSTACK_SECRET_KEY
        signature = request.headers.get("X-Paystack-Signature")

        if not signature:
            return Response({"error": "Missing signature"}, status=400)

        # Verify webhook signature
        computed_signature = hmac.new(
            secret.encode("utf-8"),
            request.body,
            digestmod=hashlib.sha512
        ).hexdigest()

        if computed_signature != signature:
            return Response({"error": "Invalid signature"}, status=400)

        payload = request.data
        event = payload.get("event")
        data = payload.get("data", {})

        if event != "charge.success":
            return Response({"status": "ignored"})

        reference = data.get("reference")

        # Prevent duplicate processing
        if PaymentTransaction.objects.filter(reference=reference).exists():
            return Response({"status": "duplicate"})

        metadata = data.get("metadata", {})
        context = metadata.get("context")
        amount = data.get("amount", 0) / 100  # cents → rands

        if context == "membership":
            user_id = metadata.get("user_id")
            try:
                user = User.objects.get(id=user_id)
                membership, _ = Membership.objects.get_or_create(user=user)

                membership.tier = "premium"
                membership.status = "active"

                now = timezone.now()
                if membership.end_date and membership.end_date > now:
                    membership.end_date += timedelta(days=settings.MEMBERSHIP_DURATION_DAYS)
                else:
                    membership.end_date = now + timedelta(days=settings.MEMBERSHIP_DURATION_DAYS)

                membership.save()

                PaymentTransaction.objects.create(
                    user=user,
                    amount=amount,
                    status="complete",
                    transaction_type="membership",
                    reference=reference,
                    description="MedMap Premium Membership",
                    metadata=data
                )
            except Exception as e:
                print("Membership webhook error:", e)

        elif context == "booking":
            booking_id = metadata.get("booking_id")
            try:
                booking = Booking.objects.get(id=booking_id)

                booking.payment_status = "COMPLETE"
                booking.status = "confirmed"
                booking.save()

                PaymentTransaction.objects.create(
                    user=booking.user,
                    amount=amount,
                    status="complete",
                    transaction_type="booking",
                    reference=reference,
                    description=f"Booking #{booking.id}",
                    metadata=data
                )
            except Exception as e:
                print("Booking webhook error:", e)

        return Response({"status": "success"})
