from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.storage.views import StorageViewSet

router = DefaultRouter()
router.register(r'', StorageViewSet, basename='storage')

urlpatterns = [
    path('', include(router.urls)),
]
