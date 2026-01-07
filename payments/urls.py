# payments/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PaystackInitializeMembershipView,
    PaystackInitializeBookingView,
    PaystackWebhookView,
    PaymentTransactionViewSet,
    PaystackConfigView,
)

# Router for transaction history (admin view)
router = DefaultRouter()
router.register(r'transactions', PaymentTransactionViewSet)

urlpatterns = [
    # Include router paths
    path('', include(router.urls)),

    # Paystack endpoints
    path('paystack/config/', PaystackConfigView.as_view(), name='paystack-config'),
    path('paystack/membership/', PaystackInitializeMembershipView.as_view(), name='paystack-init-membership'),
    path('paystack/booking/', PaystackInitializeBookingView.as_view(), name='paystack-init-booking'),
    path('paystack/webhook/', PaystackWebhookView.as_view(), name='paystack-webhook'),
]
