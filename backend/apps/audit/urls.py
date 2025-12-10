from django.urls import path
from apps.audit import views

urlpatterns = [
    path('trail/', views.list_audit_trail, name='audit-trail-list'),
    path('trail/<int:pk>/', views.get_audit_entry, name='audit-trail-detail'),
]
