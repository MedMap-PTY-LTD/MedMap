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

            plan = request.data.get("plan")
            membership_id = request.data.get("membership_id")

            # Membership pricing
            amount_rands = settings.MEMBERSHIP_PRICE
            item_name = "MedMap Premium Membership"
            custom_str1 = f"membership_{user.id}_{plan or 'premium'}"

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

            if user.first_name:
                data["name_first"] = user.first_name
            if user.last_name:
                data["name_last"] = user.last_name

            # Remove empty values
            clean_data = {
                k: str(v).strip()
                for k, v in data.items()
                if v is not None and str(v).strip() != ""
            }

            # ✅ Correct signature handling
            signature = generate_payfast_signature(clean_data)
            clean_data["signature"] = signature

            return Response({
                "payment_url": f"{service.base_url}/eng/process",
                "payment_data": clean_data
            })

        except Exception as e:
            print("CreateMembershipPaymentView error:", e)
            traceback.print_exc()
            return Response({"error": "Payment initialization failed"}, status=500)


class InitiatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            user = request.user
            service = PayFastService()
            booking_id = request.data.get("booking_id")

            if not booking_id:
                return Response({"error": "booking_id is required"}, status=400)

            try:
                booking = Booking.objects.get(id=booking_id)
            except Booking.DoesNotExist:
                return Response({"error": "Booking not found"}, status=404)

            amount_val = float(booking.total_amount)
            item_name = f"MedMap Booking #{booking.id}"

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
                "item_name": item_name,
                "custom_str1": f"booking_{booking.id}",
                "email_address": user.email,
            }

            if user.first_name:
                data["name_first"] = user.first_name
            if user.last_name:
                data["name_last"] = user.last_name

            clean_data = {
                k: str(v).strip()
                for k, v in data.items()
                if v is not None and str(v).strip() != ""
            }

            # ✅ Correct signature handling
            signature = generate_payfast_signature(clean_data)
            clean_data["signature"] = signature

            return Response({
                "payment_url": f"{service.base_url}/eng/process",
                "payment_data": clean_data
            })

        except Exception as e:
            print("InitiatePaymentView error:", e)
            traceback.print_exc()
            return Response({"error": "Payment initialization failed"}, status=500)


class PayFastNotifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data.dict() if hasattr(request.data, "dict") else request.data

        pf_signature = data.get("signature")
        if not pf_signature:
            return Response({"error": "Missing signature"}, status=400)

        verify_data = data.copy()
        verify_data.pop("signature", None)

        calculated_signature = generate_payfast_signature(verify_data)
        if calculated_signature != pf_signature:
            print("PayFast ITN signature mismatch")
            return Response({"error": "Invalid signature"}, status=400)

        pf_payment_id = data.get("pf_payment_id")
        if pf_payment_id and PaymentTransaction.objects.filter(reference=pf_payment_id).exists():
            return Response({"status": "OK"})

        custom_str1 = data.get("custom_str1")
        payment_status = data.get("payment_status")
        amount_gross = float(data.get("amount_gross", 0))

        user = None
        booking = None

        try:
            if custom_str1:
                parts = custom_str1.split("_")
                if custom_str1.startswith("membership_"):
                    user = User.objects.get(id=parts[1])
                elif custom_str1.startswith("booking_"):
                    booking = Booking.objects.get(id=parts[1])
                    user = booking.user
        except Exception:
            pass

        PaymentTransaction.objects.create(
            user=user,
            amount=amount_gross,
            status=payment_status.lower() if payment_status else "pending",
            transaction_type="membership" if custom_str1 and "membership" in custom_str1 else "booking",
            reference=pf_payment_id,
            description=data.get("item_name", ""),
            metadata=data
        )

        if payment_status == "COMPLETE":
            if booking:
                booking.payment_status = "COMPLETE"
                booking.status = "confirmed"
                booking.save()

            elif custom_str1 and custom_str1.startswith("membership_") and user:
                membership, _ = Membership.objects.get_or_create(user=user)
                membership.tier = "premium"
                membership.status = "active"

                now = timezone.now()
                if membership.end_date and membership.end_date > now:
                    membership.end_date += timedelta(days=settings.MEMBERSHIP_DURATION_DAYS)
                else:
                    membership.end_date = now + timedelta(days=settings.MEMBERSHIP_DURATION_DAYS)

                membership.save()

        return Response({"status": "OK"})
