from django.urls import path
from apps.reports import views

urlpatterns = [
    # Reports
    path('stored-documents/', views.stored_documents_report, name='report-stored-documents'),
    path('withdrawn-documents/', views.withdrawn_documents_report, name='report-withdrawn-documents'),
    path('overdue-returns/', views.overdue_returns_report, name='report-overdue-returns'),
    path('destruction-schedule/', views.destruction_schedule_report, name='report-destruction-schedule'),

    # Dashboard
    path('dashboard/kpis/', views.dashboard_kpis, name='dashboard-kpis'),
]
