# Barcode System - Quick Start Guide

## Setup (One-Time)

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs:
- `python-barcode` - Barcode generation
- `qrcode` - QR code generation
- `Pillow` - Image processing

### 2. Run Migration

```bash
python manage.py makemigrations documents
python manage.py migrate documents
```

This adds the `barcode` field to the Crate model and generates barcodes for existing crates.

### 3. Verify Installation

```python
python manage.py shell
>>> from apps.documents.models import Crate
>>> crate = Crate.objects.first()
>>> print(crate.barcode)
# Output: MFG01-CRATE-20250112-000123
```

## Using the Barcode Scanner

### Frontend

1. Navigate to the **Barcode Scanner** page
2. Enter or scan a barcode: `UNIT-CRATE-YYYYMMDD-XXXXXX`
3. Press Enter or click **Scan**
4. View crate details, current request, and history
5. Click **Print Label** to print a physical label

### API

**Scan a barcode:**
```bash
curl -X GET "http://localhost:8000/api/documents/barcode/scan/?barcode=MFG01-CRATE-20250112-000123" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Print a label:**
```bash
# Open in browser to print
http://localhost:8000/api/documents/crates/123/print-label/
```

## Common Use Cases

### 1. Print Label for New Crate

```javascript
// After creating a crate
const crateId = 123;
window.open(`/api/documents/crates/${crateId}/print-label/`, '_blank');
```

### 2. Scan Crate at Warehouse

1. Use barcode scanner (USB/Bluetooth)
2. Scanner types barcode into input field
3. Press Enter (or scanner auto-enters)
4. System shows crate info and requests

### 3. Bulk Print Labels

```bash
curl -X POST "http://localhost:8000/api/documents/barcode/bulk-print/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"crate_ids": [123, 124, 125]}'
```

## Barcode Format

```
UNIT-CRATE-YYYYMMDD-XXXXXX

Examples:
- MFG01-CRATE-20250112-000123
- QC02-CRATE-20250115-000456
- WH03-CRATE-20250120-001789
```

## Scanner Setup

### USB Barcode Scanner

1. Plug in scanner
2. Configure for **Code128** barcodes
3. Enable "Add Enter Key After Scan"
4. Test with sample barcode

### Mobile/Camera Scanning

Use the **QR Code** for mobile scanning:
1. Open camera or QR scanner app
2. Scan QR code on label
3. Opens direct link to crate details

## Printing Labels

### Single Label

```
GET /api/documents/crates/{id}/print-label/
```

Opens printable 4"x6" label with:
- Barcode (Code128)
- QR Code
- Crate ID
- Unit info
- Storage location
- Destruction date

### Bulk Labels

```
POST /api/documents/barcode/bulk-print/
Body: {"crate_ids": [1, 2, 3]}
```

Prints multiple labels with page breaks.

## Troubleshooting

### Barcode Not Scanning?

1. **Clean the label** with a dry cloth
2. **Check scanner** is configured for Code128
3. **Manually enter** barcode as fallback
4. **Re-print** label if damaged

### "Barcode Not Found"?

1. Verify barcode format is correct
2. Check crate exists in system
3. Try searching by partial barcode

### Label Won't Print?

1. Check printer is connected
2. Set paper size to 4"x6" (or Custom: 4in x 6in)
3. Use Print Preview to verify
4. Try different browser (Chrome recommended)

## API Endpoints Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/barcode/scan/?barcode=...` | GET | Scan barcode, get crate + requests |
| `/api/documents/barcode/search/?q=...` | GET | Search by partial barcode |
| `/api/documents/barcode/validate/?barcode=...` | GET | Validate barcode format |
| `/api/documents/crates/{id}/barcode/` | GET | Download barcode image |
| `/api/documents/crates/{id}/barcode/base64/` | GET | Get barcode as base64 |
| `/api/documents/crates/{id}/print-label/` | GET | Print label |
| `/api/documents/barcode/bulk-print/` | POST | Bulk print labels |

## Next Steps

1. ✅ Install dependencies
2. ✅ Run migration
3. ✅ Verify barcode generation
4. ✅ Test scanning with sample crate
5. ✅ Print test label
6. ✅ Configure barcode scanner (if using hardware)
7. ✅ Train users on scanning workflow

For detailed documentation, see [BARCODE_SYSTEM.md](./BARCODE_SYSTEM.md)
