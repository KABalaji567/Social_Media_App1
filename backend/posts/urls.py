from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, TagViewSet, CategoryViewSet

router = DefaultRouter()
router.register(r'tags', TagViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'', PostViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
