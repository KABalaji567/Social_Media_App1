from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReactionViewSet

router = DefaultRouter()
router.register(r'', ReactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
