from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, viewsets
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
import hashlib
from .models import PaymentTransaction
from .serializers import PaymentTransactionSerializer
from memberships.models import Membership
from bookings.models import Booking
from django.contrib.auth import get_user_model
from .services import generate_payfast_signature, PayFastService
import traceback

User = get_user_model()


class PaymentTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentTransaction.objects.all().order_by('-created_at')
    serializer_class = PaymentTransactionSerializer
    permission_classes = [permissions.IsAdminUser]


class CreateMembershipPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            user = request.user
            service = PayFastService()
            
            plan = request.data.get('plan')
            membership_id = request.data.get('membership_id')

            # Default values for Premium plan
            if plan == 'premium':
                amount_rands = settings.MEMBERSHIP_PRICE
                # Simplified item name to avoid URL encoding issues with parentheses
                item_name = "Premium Membership Quarterly"
                custom_str1 = f"membership_{membership_id}_premium"
            else:
                # Fallback or other plans
                amount = request.data.get('amount', 0)
                description = request.data.get('description', 'Membership')
                amount_rands = float(amount) / 100 if float(amount) > 1000 else float(amount)
                item_name = description
                custom_str1 = f"membership_{user.id}_{plan}"

            return_url = f"{settings.FRONTEND_URL}/memberships?status=success"
            cancel_url = f"{settings.FRONTEND_URL}/memberships?status=cancelled"
            notify_url = settings.PAYFAST_NOTIFY_URL
            
            data = {
                "merchant_id": service.merchant_id,
                "merchant_key": service.merchant_key,
                "return_url": return_url,
                "cancel_url": cancel_url,
                "notify_url": notify_url,
                "amount": f"{amount_rands:.2f}",
                "item_name": item_name,
                "custom_str1": custom_str1,
                "email_address": user.email,
            }
            
            # Add name fields only if they exist
            if user.first_name:
                data["name_first"] = user.first_name
            if user.last_name:
                data["name_last"] = user.last_name

            # Remove empty values and strip strings
            clean_data = {}
            for k, v in data.items():
                if v is not None:
                    val_str = str(v).strip()
                    if val_str != "":
                        clean_data[k] = val_str

            clean_data['signature'] = generate_payfast_signature(clean_data)

            # Debug logging
            print("=" * 80)
            print("PAYFAST MEMBERSHIP PAYMENT DEBUG")
            print(f"Merchant ID: {service.merchant_id}")
            print(f"Amount: {clean_data['amount']}")
            print(f"Sandbox Mode: {settings.PAYFAST_SANDBOX}")
            print(f"Payment URL: {service.base_url}/eng/process")
            print(f"Signature: {clean_data['signature']}")
            print(f"All data keys: {list(clean_data.keys())}")
            print("=" * 80)

            # Return JSON instead of HTML form
            return Response({
                "payment_url": f"{service.base_url}/eng/process",
                "payment_data": clean_data
            })

        except Exception as e:
            print(f"Error in CreateMembershipPaymentView: {e}")
            traceback.print_exc()
            return Response({"error": f"Internal Error: {str(e)}"}, status=500)


class InitiatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            user = request.user
            service = PayFastService()
            booking_id = request.data.get('booking_id')
            
            # Securely fetch amount from booking if present
            amount_val = 0.0
            description = request.data.get('description') or request.data.get('item_name')

            if booking_id:
                try:
                    booking = Booking.objects.get(id=booking_id)
                    # Use the total_amount from the booking model as source of truth
                    amount_val = float(booking.total_amount)
                    description = description or f"Booking {booking.id} with Dr. {booking.doctor.user.last_name}"
                except Booking.DoesNotExist:
                    return Response({"error": "Booking not found"}, status=404)
            else:
                 # Fallback for non-booking payments (should be restricted or removed if strictly booking platform)
                 # Keeping logic but relying on user provided amount if no booking_id (legacy behavior)
                 # Or strictly enforce booking_id for now as per "booking platform" requirement
                 amount = request.data.get('amount')
                 if not amount:
                      return Response({"error": "Amount is required"}, status=400)
                 try:
                    amount_val = float(amount)
                    if amount_val > 1000:  # assume cents
                        amount_val /= 100
                 except ValueError:
                    return Response({"error": "Invalid amount"}, status=400)

            if not description:
                description = "Payment"

            return_url = f"{settings.FRONTEND_URL}/bookings?status=success"
            cancel_url = f"{settings.FRONTEND_URL}/bookings?status=cancelled"
            notify_url = settings.PAYFAST_NOTIFY_URL

            data = {
                "merchant_id": service.merchant_id,
                "merchant_key": service.merchant_key,
                "return_url": return_url,
                "cancel_url": cancel_url,
                "notify_url": notify_url,
                "amount": f"{amount_val:.2f}",
                "item_name": description,
                "email_address": user.email,
            }
            
            # Add optional fields
            if booking_id:
                data["custom_str1"] = f"booking_{booking_id}"
            if user.first_name:
                data["name_first"] = user.first_name
            if user.last_name:
                data["name_last"] = user.last_name

            # Remove empty values
            clean_data = {k: v for k, v in data.items() if v is not None and v != ""}
            clean_data['signature'] = generate_payfast_signature(clean_data)

            # Return JSON instead of HTML form
            return Response({
                "payment_url": f"{service.base_url}/eng/process",
                "payment_data": clean_data
            })
        except Exception as e:
            print(f"Error in InitiatePaymentView: {e}")
            traceback.print_exc()
            return Response({"error": f"Internal Error: {str(e)}"}, status=500)


class PayFastNotifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data.dict() if hasattr(request.data, 'dict') else request.data

        pf_signature = data.get('signature')
        if not pf_signature:
            return Response({"error": "No signature"}, status=400)

        verify_data = data.copy()
        del verify_data['signature']

        calc_signature = generate_payfast_signature(verify_data)
        if calc_signature != pf_signature:
            print(f"Signature mismatch: Calculated {calc_signature} != Received {pf_signature}")
            # Optional: return Response({"error": "Signature mismatch"}, status=400)

        # Idempotency Check
        pf_payment_id = data.get('pf_payment_id')
        if pf_payment_id and PaymentTransaction.objects.filter(reference=pf_payment_id).exists():
            print(f"Duplicate payment notification received: {pf_payment_id}")
            return Response({"status": "OK"})

        # Log transaction
        try:
            user = None
            custom_str1 = data.get('custom_str1')
            if custom_str1:
                parts = custom_str1.split('_')
                if len(parts) >= 2:
                    try:
                        if custom_str1.startswith('membership_'):
                            user_id = parts[1]
                            user = User.objects.get(id=user_id)
                        elif custom_str1.startswith('booking_'):
                            booking_id = parts[1]
                            booking = Booking.objects.get(id=booking_id)
                            user = booking.user
                    except:
                        pass

            PaymentTransaction.objects.create(
                user=user,
                amount=data.get('amount_gross', 0),
                status=data.get('payment_status', 'pending').lower(),
                transaction_type='membership' if custom_str1 and 'membership' in custom_str1 else 'booking',
                reference=pf_payment_id,
                description=data.get('item_name', ''),
                metadata=data
            )
        except Exception as e:
            print(f"Error logging payment transaction: {e}")

        status = data.get('payment_status')
        if status == 'COMPLETE':
            custom_str1 = data.get('custom_str1')
            amount_gross = float(data.get('amount_gross', 0))

            if custom_str1 and custom_str1.startswith('membership_'):
                parts = custom_str1.split('_')
                if len(parts) >= 3:
                    user_id = parts[1]
                    plan = parts[2]
                    try:
                        # Security Check: Verify amount
                        expected_amount = settings.MEMBERSHIP_PRICE
                        if abs(amount_gross - expected_amount) > 1.0: # Allow small variance, but R1 is generous
                            print(f"Security Alert: Payment amount mismatch. Expected {expected_amount}, got {amount_gross}")
                            return Response({"status": "Failed: Amount mismatch"})

                        user = User.objects.get(id=user_id)
                        membership, created = Membership.objects.get_or_create(user=user)
                        membership.tier = plan
                        membership.status = 'active'
                        
                        # Correct Renewal Logic
                        now = timezone.now()
                        current_end = membership.end_date
                        
                        if current_end and current_end > now:
                            # Extend from current end date
                            membership.end_date = current_end + timedelta(days=settings.MEMBERSHIP_DURATION_DAYS)
                        else:
                            # Start fresh from now
                            membership.end_date = now + timedelta(days=settings.MEMBERSHIP_DURATION_DAYS)
                            
                        membership.save()
                    except Exception as e:
                        print(f"Error updating membership: {e}")
            elif custom_str1 and custom_str1.startswith('booking_'):
                parts = custom_str1.split('_')
                if len(parts) >= 2:
                    booking_id = parts[1]
                    try:
                        booking = Booking.objects.get(id=booking_id)
                        
                        # Security Check: Verify amount
                        expected_amount = float(booking.total_amount)
                        if abs(amount_gross - expected_amount) > 1.0:
                             print(f"Security Alert: Booking payment mismatch. Expected {expected_amount}, got {amount_gross}")
                             return Response({"status": "Failed: Amount mismatch"})

                        booking.payment_status = 'COMPLETE'
                        booking.status = 'confirmed'
                        booking.save()
                    except Exception as e:
                        print(f"Error updating booking: {e}")

        return Response({"status": "OK"})
