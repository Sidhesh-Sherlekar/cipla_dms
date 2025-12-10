# Getting Started with Cipla DMS

## Quick Start (2 Minutes)

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL (or use SQLite for testing)

### Step 1: Start Backend (30 seconds)
```bash
cd backend
python manage.py runserver
```

Backend will run on: **http://localhost:8000**

### Step 2: Start Frontend (30 seconds)
```bash
cd Frontend
npm run dev
```

Frontend will run on: **http://localhost:5173**

### Step 3: Login (10 seconds)
1. Open browser: http://localhost:5173
2. Username: `admin`
3. Password: `admin123456`
4. Click "Sign In"

**You're in! 🎉**

---

## What You Can Do Now

### ✅ Working Features

1. **Login/Logout**
   - Secure JWT authentication
   - Auto token refresh
   - User info in header

2. **Navigation**
   - Home page with module cards
   - All sections accessible
   - Back to home button

3. **User Interface**
   - All components render
   - Dummy data visible
   - Responsive design

### 🚧 In Progress

The following components have **backend APIs ready** but still show dummy data:

- Crate Creation
- Document Withdrawal
- Document Destruction
- Dashboard
- Audit Trail
- Reports

To use real data, these need API hook integration (see [PHASE4_COMPLETE.md](PHASE4_COMPLETE.md)).

---

## Testing the Backend API

### Using cURL

#### 1. Get Auth Token
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123456"}'
```

Response:
```json
{
  "access": "eyJ0eXAi...",
  "refresh": "eyJ0eXAi...",
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "Admin User",
    "role": {"role_name": "Admin"}
  }
}
```

#### 2. Create Storage Request
```bash
curl -X POST http://localhost:8000/api/requests/storage/create/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "unit": 1,
    "destruction_date": "2026-12-31",
    "purpose": "Test request",
    "documents": [
      {
        "document_name": "Test Document",
        "document_number": "TEST-001",
        "document_type": "Physical"
      }
    ],
    "digital_signature": "admin123456"
  }'
```

#### 3. List Requests
```bash
curl http://localhost:8000/api/requests/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman

1. Import collection from `backend/API_DOCUMENTATION.md`
2. Set base URL: `http://localhost:8000/api`
3. Login to get token
4. Use token in Authorization header
5. Test endpoints

---

## Project Structure

```
Cipla_DMS/
├── backend/                  # Django Backend
│   ├── apps/
│   │   ├── auth/            # Authentication & permissions
│   │   ├── documents/       # Document models
│   │   ├── storage/         # Storage hierarchy
│   │   ├── requests/        # Request workflows
│   │   ├── audit/           # Audit trail
│   │   └── reports/         # Reports
│   ├── config/              # Django settings
│   └── manage.py
│
├── Frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   ├── context/         # React context
│   │   └── App.tsx          # Main app
│   └── package.json
│
├── PHASE4_COMPLETE.md       # Phase 4 guide
├── PHASE4_SUMMARY.md        # Quick reference
├── PROJECT_STATUS.md        # Project status
└── GETTING_STARTED.md       # This file
```

---

## Key Concepts

### Digital Signatures (21 CFR Part 11)

Every critical action requires password re-entry:
- Creating requests
- Approving requests
- Allocating storage
- Issuing documents
- Destroying documents

This is implemented via the `DigitalSignatureModal` component.

### Audit Trail

All actions are logged:
- Who did it
- When it happened
- What changed
- IP address and user agent

Audit logs are **immutable** (cannot be modified or deleted).

### Role-Based Access

Four roles with different permissions:
- **Section Head**: Create requests
- **Head QC**: Approve/reject requests
- **Document Store**: Allocate storage, issue documents
- **Admin**: Full access

---

## Common Tasks

### Create a New User

Via Django admin panel:

1. Go to: http://localhost:8000/admin
2. Login: admin / admin123456
3. Click "Users" → "Add User"
4. Fill in details
5. Assign role

### Create a Unit

Via Django admin:

1. Go to: http://localhost:8000/admin
2. Click "Units" → "Add Unit"
3. Enter unit code and name
4. Save

### Create Storage Location

Via Django admin:

1. Go to: http://localhost:8000/admin
2. Click "Storages" → "Add Storage"
3. Select unit
4. Enter room, rack, compartment, shelf names
5. Save

---

## Troubleshooting

### Backend won't start

**Error:** "Port 8000 already in use"
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
# Or use different port
python manage.py runserver 8001
```

**Error:** "No module named django"
```bash
cd backend
pip install -r requirements.txt
```

### Frontend won't start

**Error:** "Cannot find module"
```bash
cd Frontend
rm -rf node_modules package-lock.json
npm install
```

**Error:** "Port 5173 already in use"
```bash
# Vite will automatically try next port
# Or kill process
lsof -ti:5173 | xargs kill -9
```

### Can't login

**Issue:** Invalid credentials
- Check username/password: admin / admin123456
- Make sure backend is running
- Check browser console for errors

**Issue:** CORS error
- Check `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py`
- Should include `http://localhost:5173`

### API calls failing

**Issue:** 401 Unauthorized
- Check you're logged in
- Token might have expired, try logging out and back in

**Issue:** Network error
- Check backend is running
- Check `VITE_API_URL` in `Frontend/.env`
- Should be `http://localhost:8000/api`

---

## Development Workflow

### Adding a New API Endpoint

1. **Backend**: Create view in `backend/apps/*/views.py`
2. **Backend**: Add URL pattern in `backend/apps/*/urls.py`
3. **Frontend**: Add TypeScript type in `Frontend/src/types/index.ts`
4. **Frontend**: Create hook in `Frontend/src/hooks/*.ts`
5. **Frontend**: Use hook in component
6. Test end-to-end

### Updating a Component with API

Example: Update Dashboard to show real KPIs

1. Import hook:
```typescript
import { useDashboardKPIs } from '../hooks/useReports';
```

2. Use hook:
```typescript
const { data, isLoading, error } = useDashboardKPIs();
```

3. Handle states:
```typescript
if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error loading KPIs</div>;
```

4. Display data:
```typescript
<div>Total Crates: {data.total_stored_crates}</div>
```

See [PHASE4_COMPLETE.md](PHASE4_COMPLETE.md) for more examples.

---

## Documentation

| File | Purpose |
|------|---------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Quick start guide (this file) |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Overall project status |
| [PHASE4_COMPLETE.md](PHASE4_COMPLETE.md) | Complete Phase 4 guide |
| [PHASE4_SUMMARY.md](PHASE4_SUMMARY.md) | Quick reference |
| [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) | API reference |
| [agent.md](agent.md) | Full specification |

---

## Next Steps

### For Developers

1. **Read** [PHASE4_COMPLETE.md](PHASE4_COMPLETE.md)
2. **Choose** a component to integrate (start with Dashboard)
3. **Replace** dummy data with API hooks
4. **Add** digital signature modal to critical actions
5. **Test** end-to-end workflow
6. **Repeat** for other components

### For Testers

1. **Test** login/logout
2. **Test** all navigation flows
3. **Test** backend API with Postman
4. **Report** any issues

### For Project Managers

1. **Review** [PROJECT_STATUS.md](PROJECT_STATUS.md)
2. **Track** component integration progress
3. **Plan** Phase 6 (Email Notifications)

---

## Support

### Having Issues?

1. Check this guide
2. Check [PHASE4_COMPLETE.md](PHASE4_COMPLETE.md)
3. Check troubleshooting section
4. Review browser console for errors
5. Check backend terminal for API errors

### Common Questions

**Q: Where are the test users?**
A: Only admin user exists. Create more via Django admin panel.

**Q: How do I reset the database?**
A: Delete `db.sqlite3`, run `python manage.py migrate`, then `python manage.py createsuperuser`

**Q: Can I use MySQL instead of PostgreSQL?**
A: Yes, update `DATABASES` in `settings.py`

**Q: Where's the production deployment guide?**
A: Coming in Phase 8 (not started yet)

---

## Success Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Can login with admin/admin123456
- [ ] Can see user info in header
- [ ] Can navigate between pages
- [ ] Can logout
- [ ] Can access Django admin panel

If all checked: **You're ready to develop!** ✅

---

## Quick Reference

### Default Credentials
```
Username: admin
Password: admin123456
```

### URLs
```
Frontend:     http://localhost:5173
Backend API:  http://localhost:8000/api
Django Admin: http://localhost:8000/admin
```

### Key Commands
```bash
# Backend
cd backend && python manage.py runserver

# Frontend  
cd Frontend && npm run dev

# Django Admin
python manage.py createsuperuser

# Migrations
python manage.py makemigrations
python manage.py migrate
```

---

**Ready to build! 🚀**

For detailed Phase 4 integration guide, see [PHASE4_COMPLETE.md](PHASE4_COMPLETE.md)
