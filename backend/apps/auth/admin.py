from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, Unit, Department, Section, UserUnit, DeptUser, SectionUser


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('id', 'role_name', 'description', 'created_at')
    search_fields = ('role_name',)
    list_filter = ('created_at',)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'username', 'full_name', 'email', 'role', 'status', 'last_login')
    list_filter = ('status', 'role', 'is_staff', 'is_superuser')
    search_fields = ('username', 'full_name', 'email')
    ordering = ('-created_at',)
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('full_name', 'role', 'status', 'last_login_ip')}),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('full_name', 'role', 'status')}),
    )


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('id', 'unit_code', 'unit_name', 'location', 'created_at')
    search_fields = ('unit_code', 'unit_name', 'location')
    list_filter = ('created_at',)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'department_name', 'unit', 'department_head', 'created_at')
    search_fields = ('department_name',)
    list_filter = ('unit', 'created_at')
    raw_id_fields = ('department_head',)


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('id', 'section_name', 'department', 'created_at')
    search_fields = ('section_name',)
    list_filter = ('department', 'created_at')


@admin.register(UserUnit)
class UserUnitAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'unit')
    search_fields = ('user__username', 'unit__unit_code')
    list_filter = ('unit',)
    raw_id_fields = ('user',)


@admin.register(DeptUser)
class DeptUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'department')
    search_fields = ('user__username', 'department__department_name')
    list_filter = ('department',)
    raw_id_fields = ('user',)


@admin.register(SectionUser)
class SectionUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'section')
    search_fields = ('user__username', 'section__section_name')
    list_filter = ('section',)
    raw_id_fields = ('user',)
