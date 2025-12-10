from django.urls import path
from apps.requests import views

urlpatterns = [
    # List and detail
    path('', views.list_requests, name='request-list'),
    path('<int:pk>/', views.get_request, name='request-detail'),

    # Create requests
    path('storage/create/', views.create_storage_request, name='storage-request-create'),
    path('withdrawal/create/', views.create_withdrawal_request, name='withdrawal-request-create'),
    path('destruction/create/', views.create_destruction_request, name='destruction-request-create'),

    # Update sent-back requests
    path('storage/<int:pk>/update/', views.update_storage_request, name='storage-request-update'),
    path('withdrawal/<int:pk>/update/', views.update_withdrawal_request, name='withdrawal-request-update'),
    path('destruction/<int:pk>/update/', views.update_destruction_request, name='destruction-request-update'),

    # Approve/Reject/Send Back
    path('<int:pk>/approve/', views.approve_request, name='request-approve'),
    path('<int:pk>/reject/', views.reject_request, name='request-reject'),
    path('<int:pk>/send-back/', views.send_back_request, name='request-send-back'),

    # Storage allocation
    path('<int:pk>/allocate-storage/', views.allocate_storage, name='request-allocate-storage'),

    # Withdrawal workflow
    path('<int:pk>/issue/', views.issue_documents, name='request-issue'),
    path('<int:pk>/return/', views.return_documents, name='request-return'),

    # Destruction workflow
    path('<int:pk>/destroy/', views.confirm_destruction, name='request-destroy'),
]
