# Barcode System Documentation

## Overview

The barcode system provides automatic barcode generation for crates, enabling easy tracking and quick access to crate information and related requests through scanning.

## Features

- ✅ **Automatic Barcode Generation** - Barcodes are auto-generated when crates are created
- ✅ **QR Code Support** - QR codes generated alongside barcodes for mobile scanning
- ✅ **Barcode Scanning** - Scan barcodes to instantly view crate details and requests
- ✅ **Printable Labels** - Generate printable labels with barcodes for physical crates
- ✅ **Bulk Label Printing** - Print multiple crate labels at once
- ✅ **Request Tracking** - View all requests associated with a crate via barcode scan
- ✅ **Audit Trail** - All barcode scans are logged for compliance

## Barcode Format

Barcodes follow a standardized format:

```
UNIT-CRATE-YYYYMMDD-XXXXXX
```

**Components:**
- `UNIT` - Unit code (e.g., MFG01, QC02)
- `CRATE` - Fixed identifier
- `YYYYMMDD` - Creation date (e.g., 20250112)
- `XXXXXX` - 6-digit crate ID (e.g., 000123)

**Example:** `MFG01-CRATE-20250112-000123`

## Setup Instructions

### 1. Install Required Libraries

```bash
cd backend
pip install python-barcode==0.15.1 qrcode[pil]==7.4.2 Pillow==10.1.0
```

These are already in `requirements.txt` - just run:
```bash
pip install -r requirements.txt
```

### 2. Run Migration

The barcode field needs to be added to existing crates:

```bash
python manage.py makemigrations documents
python manage.py migrate documents
```

**Note:** The migration will automatically generate barcodes for all existing crates.

### 3. Verify Installation

Check that barcodes were generated:

```python
python manage.py shell
>>> from apps.documents.models import Crate
>>> crate = Crate.objects.first()
>>> print(crate.barcode)
# Should print: UNIT-CRATE-YYYYMMDD-XXXXXX
```

## API Endpoints

### 1. Scan Barcode

**Get crate information and all related requests by scanning a barcode.**

```http
GET /api/documents/barcode/scan/?barcode=UNIT-CRATE-20250112-000123
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "crate": {
    "id": 123,
    "barcode": "MFG01-CRATE-20250112-000123",
    "destruction_date": "2026-01-12",
    "status": "Active",
    "storage_location": "MFG01-R01-RK05-C12",
    "unit_code": "MFG01",
    "unit_name": "Manufacturing Unit 1",
    "document_count": 45,
    "barcode_image": "data:image/svg+xml;base64,...",
    "qr_code": "data:image/png;base64,..."
  },
  "current_request": {
    "id": 456,
    "request_type": "Withdrawal",
    "status": "Issued",
    "request_date": "2025-01-10T10:30:00Z",
    "purpose": "Annual audit review"
  },
  "history": [
    {
      "id": 455,
      "request_type": "Storage",
      "status": "Completed",
      "request_date": "2025-01-05T14:20:00Z"
    }
  ],
  "total_requests": 2
}
```

### 2. Generate Barcode Image

**Get barcode as image file (SVG or PNG).**

```http
GET /api/documents/crates/{crate_id}/barcode/?format=svg
Authorization: Bearer {access_token}
```

**Parameters:**
- `format`: `svg` or `png` (default: `svg`)

**Response:** Image file (SVG or PNG)

### 3. Generate Barcode Base64

**Get barcode as base64 string for embedding.**

```http
GET /api/documents/crates/{crate_id}/barcode/base64/?format=svg
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "barcode": "data:image/svg+xml;base64,...",
  "qr_code": "data:image/png;base64,...",
  "crate_id": 123,
  "barcode_value": "MFG01-CRATE-20250112-000123"
}
```

### 4. Print Crate Label

**Generate printable label with barcode.**

```http
GET /api/documents/crates/{crate_id}/print-label/
Authorization: Bearer {access_token}
```

**Response:** HTML page ready for printing (4"x6" label format)

### 5. Search by Barcode

**Search for crates using partial barcode match.**

```http
GET /api/documents/barcode/search/?q=MFG01-CRATE
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "count": 15,
  "results": [
    {
      "id": 123,
      "barcode": "MFG01-CRATE-20250112-000123",
      "status": "Active",
      ...
    }
  ]
}
```

### 6. Validate Barcode

**Validate barcode format and check if it exists.**

```http
GET /api/documents/barcode/validate/?barcode=MFG01-CRATE-20250112-000123
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "valid": true,
  "exists": true,
  "message": "Barcode exists in system",
  "parsed": {
    "unit_code": "MFG01",
    "type": "CRATE",
    "creation_date": "20250112",
    "crate_id": 123,
    "full_barcode": "MFG01-CRATE-20250112-000123"
  }
}
```

### 7. Get Crate Requests by Barcode

**Get all requests for a crate.**

```http
GET /api/documents/barcode/requests/?barcode=MFG01-CRATE-20250112-000123
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "crate_id": 123,
  "barcode": "MFG01-CRATE-20250112-000123",
  "count": 5,
  "requests": [...]
}
```

### 8. Bulk Print Labels

**Print labels for multiple crates.**

```http
POST /api/documents/barcode/bulk-print/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "crate_ids": [123, 124, 125]
}
```

**Response:** HTML page with all labels for printing

## Frontend Usage

### Barcode Scanner Component

The `BarcodeScanner` component provides a complete scanning interface:

```tsx
import { BarcodeScanner } from './components/BarcodeScanner';

function App() {
  return <BarcodeScanner />;
}
```

**Features:**
- Manual barcode input with Enter key support
- Automatic focus on barcode input field
- Real-time scanning and validation
- Display crate details with barcode/QR code images
- Show current request and full request history
- Print label button
- Navigate to request details

### Using Barcode Hooks

```tsx
import { useScanBarcode, printCrateLabel, downloadBarcodeImage } from '../hooks/useBarcode';

function MyComponent() {
  const scanMutation = useScanBarcode();

  const handleScan = () => {
    scanMutation.mutate('MFG01-CRATE-20250112-000123', {
      onSuccess: (data) => {
        console.log('Scanned:', data);
      }
    });
  };

  const handlePrint = () => {
    printCrateLabel(123);
  };

  const handleDownload = async () => {
    await downloadBarcodeImage(123, 'svg');
  };

  return (
    <div>
      <button onClick={handleScan}>Scan</button>
      <button onClick={handlePrint}>Print Label</button>
      <button onClick={handleDownload}>Download Barcode</button>
    </div>
  );
}
```

## Barcode Scanner Hardware

### Recommended Scanners

1. **USB Barcode Scanners**
   - Plug-and-play, works as keyboard input
   - Automatically enters scanned barcode
   - Recommended brands: Zebra, Honeywell, Symbol

2. **Bluetooth Scanners**
   - Wireless freedom
   - Works with mobile devices
   - Recommended for warehouse use

3. **Mobile App Scanners**
   - Use device camera to scan
   - QR code support built-in
   - Recommended: Browser-based scanning

### Scanner Configuration

Most USB scanners work out-of-the-box with the following settings:

1. **Scan Mode**: Code128 (barcode type we use)
2. **Enter Key**: Add Enter/Return after scan (auto-submit)
3. **Prefix/Suffix**: None required
4. **Case**: Upper case (if adjustable)

## Workflow Examples

### Example 1: Scanning During Crate Allocation

```
1. User creates new storage request
2. System allocates crate
3. Barcode is auto-generated
4. User navigates to Barcode Scanner
5. User scans barcode (or enters manually)
6. System displays crate details and current request
7. User clicks "Print Label"
8. Physical label is printed and attached to crate
```

### Example 2: Warehouse Receiving

```
1. Warehouse staff receives crate from storage
2. Staff scans barcode on crate
3. System shows:
   - Current withdrawal request
   - Purpose and requester
   - Expected return date
4. Staff confirms receipt in system
5. Request status updated to "Issued"
```

### Example 3: Crate Return

```
1. Staff scans returned crate
2. System shows active withdrawal request
3. Staff confirms return
4. Request status updated to "Returned"
5. Audit trail updated with scan time and user
```

### Example 4: Bulk Label Printing

```
1. Admin creates 50 new crates
2. Admin selects all 50 crates
3. Admin clicks "Bulk Print Labels"
4. System generates HTML with 50 labels
5. Print dialog opens with page breaks between labels
6. All labels printed at once
```

## Label Specifications

### Physical Label Format

- **Size**: 4" x 6" (standard shipping label size)
- **Layout**:
  - Header: "CIPLA DMS - CRATE LABEL"
  - Barcode (Code128): Center, large
  - QR Code: Optional, right side
  - Text Information:
    - Crate ID
    - Unit
    - Storage Location
    - Barcode value (human-readable)
  - Footer: Destruction date (red background)

### Label Material

Recommended materials:
- **Paper Labels**: For short-term use (< 6 months)
- **Polyester Labels**: For long-term use (> 6 months)
- **Thermal Labels**: Not recommended (fades over time)

### Printer Requirements

- **Thermal Transfer Printer**: For durable labels
- **Laser Printer**: For standard paper labels
- **Inkjet Printer**: For temporary labels

## Best Practices

### 1. Label Placement

- Place label on **front** of crate
- Ensure barcode is **flat** and **clean**
- Avoid placing over seams or edges
- Keep barcode area clear of tape/stickers

### 2. Scanning Tips

- Scan from **6-12 inches** away
- Ensure good **lighting**
- Hold scanner **perpendicular** to barcode
- If scan fails, manually enter barcode

### 3. Barcode Maintenance

- **Replace damaged labels** immediately
- **Clean labels** regularly (dry cloth only)
- **Re-print** if barcode becomes unreadable
- **Never** write on barcode area

### 4. System Integration

- **Scan on entry**: Scan when crate enters storage
- **Scan on exit**: Scan when crate leaves storage
- **Scan on return**: Scan when crate returns
- **Scan on audit**: Scan during inventory checks

## Troubleshooting

### Issue 1: Barcode Not Scanning

**Causes:**
- Damaged/dirty label
- Scanner not configured for Code128
- Barcode too small/large

**Solution:**
- Clean label with dry cloth
- Verify scanner supports Code128
- Re-print label if damaged
- Manually enter barcode as fallback

### Issue 2: "Barcode Not Found"

**Causes:**
- Typo in manual entry
- Barcode not yet in system
- Database sync issue

**Solution:**
- Double-check barcode value
- Verify crate exists in system
- Contact system administrator

### Issue 3: Label Won't Print

**Causes:**
- Printer not connected
- Wrong paper size selected
- Browser print settings

**Solution:**
- Check printer connection
- Set paper size to 4"x6" or Custom
- Use "Print Preview" to verify layout
- Try different browser

### Issue 4: QR Code Not Generating

**Causes:**
- Missing `qrcode` library
- Image generation error

**Solution:**
```bash
pip install qrcode[pil]==7.4.2
```

### Issue 5: Existing Crates Missing Barcodes

**Solution:**
Run this management command:

```python
python manage.py shell
>>> from apps.documents.models import Crate
>>> for crate in Crate.objects.filter(barcode__isnull=True):
...     crate.save()  # Triggers barcode generation
```

## Security Considerations

1. **Authentication Required** - All barcode endpoints require authentication
2. **Audit Trail** - All scans are logged with user and timestamp
3. **Permission Checks** - Only authorized users can scan/print
4. **No Sensitive Data** - Barcodes contain only crate ID and metadata
5. **Tampering Prevention** - Barcodes are read-only after generation

## Performance Optimization

1. **Caching** - Barcode images are generated once and cached
2. **Lazy Loading** - Barcodes generated only when needed
3. **Batch Operations** - Bulk printing reduces server load
4. **Indexing** - Barcode field is indexed for fast lookups

## Future Enhancements

Potential future features:

- [ ] Mobile app with camera scanning
- [ ] Real-time location tracking via scans
- [ ] Automated inventory checks via scanning
- [ ] Integration with RFID tags
- [ ] Advanced analytics on scan patterns
- [ ] Multi-language label support
- [ ] Custom label templates
- [ ] Barcode history and genealogy

## Support

For issues or questions:

1. Check **troubleshooting section** above
2. Review **API documentation**
3. Check **audit logs** for scan history
4. Contact system administrator

## Summary

The barcode system provides:

✅ Automatic barcode generation for all crates
✅ Fast scanning and lookup
✅ Printable labels with barcode and QR code
✅ Complete request history via scan
✅ Audit trail for compliance
✅ Mobile-friendly QR codes
✅ Bulk label printing
✅ Integration with existing workflows

Barcodes enable efficient tracking and management of document crates throughout their lifecycle, from creation to destruction.
