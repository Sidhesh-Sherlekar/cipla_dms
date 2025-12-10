from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'auth'

urlpatterns = [
    # Login/Logout
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('session-terminate/', views.session_terminate, name='session_terminate'),

    # JWT Token endpoints
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # User info
    path('me/', views.current_user, name='current_user'),
    path('permissions/', views.user_permissions, name='user_permissions'),

    # User Management
    path('users/', views.user_list, name='user_list'),
    path('users/<int:pk>/', views.user_detail, name='user_detail'),

    # Master Data - Units
    path('units/', views.unit_list, name='unit_list'),
    path('units/<int:pk>/', views.unit_detail, name='unit_detail'),

    # Master Data - Departments
    path('departments/', views.department_list, name='department_list'),
    path('departments/<int:pk>/', views.department_detail, name='department_detail'),

    # Master Data - Sections
    path('sections/', views.section_list, name='section_list'),
    path('sections/<int:pk>/', views.section_detail, name='section_detail'),

    # Master Data - Roles (Django Groups based)
    path('roles/', views.role_list, name='role_list'),
    path('roles/<int:pk>/', views.role_detail, name='role_detail'),

    # Groups/Roles Management (Django Groups for RBAC)
    path('groups/', views.group_list, name='group_list'),
    path('groups/<int:pk>/', views.group_detail, name='group_detail'),
    path('groups/assign-user/', views.assign_user_to_group, name='assign_user_to_group'),
    path('groups/remove-user/', views.remove_user_from_group, name='remove_user_from_group'),

    # Permissions
    path('permissions/', views.permission_list, name='permission_list'),

    # Privileges
    path('privileges/', views.privilege_list, name='privilege_list'),
    path('privileges/<int:pk>/', views.privilege_detail, name='privilege_detail'),
    path('user/privileges/', views.user_privileges, name='user_privileges'),

    # Security Policies
    path('security-policies/', views.security_policies, name='security_policies'),
    path('session-timeout/', views.update_session_timeout, name='update_session_timeout'),
    path('password-expiry/', views.update_password_expiry, name='update_password_expiry'),

    # Password Management
    path('users/reset-password/', views.reset_user_password, name='reset_user_password'),
    path('users/unlock/', views.unlock_user, name='unlock_user'),
    path('request-unlock/', views.request_account_unlock, name='request_account_unlock'),
    path('change-password/', views.change_password, name='change_password'),
]
