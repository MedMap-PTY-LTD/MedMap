
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from django.conf import settings
from django.conf.urls.static import static
from payments.views import PaystackWebhookView

def home(request):
    return JsonResponse({"message": "MedMap Backend API is running"})

urlpatterns = [
    path('', home),
    path('api/', home),
    path('admin/', admin.site.urls),
    # Paystack Webhook Shortcut
    path('api/paystack/webhook/', PaystackWebhookView.as_view(), name='paystack-webhook-shortcut'),
    path('api/users/', include('users.urls')),
    path('api/doctors/', include('doctors.urls')),
    path('api/bookings/', include('bookings.urls')),
    path('api/memberships/', include('memberships.urls')),
    path('api/system/', include('system.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/notifications/', include('medmap_notifications.urls')),
    path('api/telecommunications/', include('telecommunications.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
