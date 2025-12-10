# Quick Authentication Guide

## TL;DR - Get Started in 2 Minutes

### 1. Setup (30 seconds)
```bash
cd backend
python manage.py setup_auth
```

### 2. Start Server (10 seconds)
```bash
python manage.py runserver
```

### 3. Login (10 seconds)
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"username": "admin", "password": "admin123456"}'
```

**Done!** You have a JWT token.

---

## Key Concepts

### Django Groups = Roles

Instead of hardcoded roles, we use **Django's built-in Groups**:

- Admins create groups via admin panel
- Assign permissions to groups
- Add users to groups
- **No code changes needed!**

### Default Groups

| Group | Purpose |
|-------|---------|
| Admin | Full access |
| Section Head | Create requests |
| Head QC | Approve requests |
| Document Store | Allocate storage |

### How to Use in Code

```python
# Require specific group
@require_group('Section Head')
def create_request(request):
    pass

# Require specific permission
@require_permission('requests.add_request')
def create_request(request):
    pass

# Require digital signature (21 CFR Part 11)
@require_digital_signature
def create_request(request):
    pass
```

---

## Common Tasks

### Create New Group
1. Go to http://localhost:8000/admin/
2. Login: admin / admin123456
3. Groups → Add Group
4. Select permissions
5. Save

### Assign User to Group
1. Go to Users in admin
2. Click user
3. Select groups
4. Save

### Create New User
1. Django admin → Users → Add User
2. Fill in details
3. Assign to groups
4. Save

---

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/login/` | Login |
| `POST /api/auth/token/refresh/` | Refresh token |
| `GET /api/auth/me/` | Current user |
| `GET /api/auth/permissions/` | User permissions |

---

## Frontend Usage

```typescript
// Check if user has permission
if (user?.permissions.includes('requests.add_request')) {
  // Show create button
}

// Check if user is in group
if (user?.groups.some(g => g.name === 'Admin')) {
  // Show admin panel
}
```

---

## Need More Details?

See: [AUTH_SETUP_COMPLETE.md](AUTH_SETUP_COMPLETE.md)
