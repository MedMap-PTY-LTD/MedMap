from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from .models import Membership
from .serializers import MembershipSerializer

class MembershipPlansView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        plans = [
            {
                "id": "premium",
                "name": "Premium Membership",
                "description": "Unlock premium features including priority support and advanced analytics.",
                "price": settings.MEMBERSHIP_PRICE
            }
        ]
        return Response(plans)

class MembershipViewSet(viewsets.ModelViewSet):
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_staff:
            return Membership.objects.all()
        return Membership.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
