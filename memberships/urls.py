from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import MembershipViewSet, MembershipPlansView

router = SimpleRouter()
router.register(r'memberships', MembershipViewSet)

urlpatterns = [
    # serve plans at /api/memberships/plans/ to avoid namespace collisions
    path('plans/', MembershipPlansView.as_view(), name='membership-plans'),
    path('', include(router.urls)),
]
