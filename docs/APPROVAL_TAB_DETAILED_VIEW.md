# Approval Tab - Detailed Request Information Display

## Overview
Enhanced the Approval tab's expanded request view to show comprehensive information about requests, including detailed crate information, document lists, and all relevant metadata.

## Implementation

### Location
**File**: `Frontend/src/components/Transaction.tsx:1506-1699`

### What Was Changed

**Before**: Minimal information showing only basic fields
**After**: Comprehensive detailed view with organized sections

### New Features

## 1. Organized Layout

The expanded view is now divided into clear sections:

### Header Section
- File icon with "Detailed Request Information" title
- Professional layout with proper spacing

### Two-Column Grid Layout
Left column: **Request Details**
Right column: **Crate Information**

### Request Type Specific Sections
- **Storage Requests**: Document list with full details
- **Withdrawal Requests**: Withdrawal details and document list
- **Destruction Requests**: Destruction details with warnings

## 2. Request Details Section

Shows comprehensive request information:

```typescript
- Request ID (e.g., REQ-123)
- Request Type (Storage/Withdrawal/Destruction) with badge
- Requested By (full name of requester)
- Unit (unit code)
- Request Date (date + time)
- Purpose (if provided)
```

**Visual Design**:
- White card background
- Clean two-column layout (label : value)
- Purpose shown at bottom with border-top separator

## 3. Crate Information Section

Shows detailed crate metadata:

```typescript
- Crate ID (monospace font, e.g., #456)
- Destruction Date (formatted)
- Crate Created (creation date)
- Crate Status (badge with color coding)
- Current Storage Location (if allocated, shown in blue)
```

**Visual Design**:
- White card background matching request details
- Status badge with conditional styling (Active = default, others = secondary)
- Storage location highlighted in blue color

## 4. Storage Request Details

For storage requests, shows all documents to be stored:

**Layout**:
- Section header with document count
- List of documents with visual cards
- Each document card shows:
  - Blue circular icon with FileText
  - Document name (bold)
  - Document number (monospace)
  - Document type badge (Physical/Digital)

**Empty State**:
- "No documents listed" message if no documents

## 5. Withdrawal Request Details

For withdrawal requests, shows:

**Withdrawal Type**:
- Badge indicating "Full Withdrawal" or "Partial Withdrawal"
- Color coded (full = default, partial = secondary)

**Expected Return Date**:
- Formatted date display

**Documents to Withdraw**:
- List with FileText icons
- Document name (bold)
- Document number in parentheses (monospace, small)

## 6. Destruction Request Details

For destruction requests, shows:

**Scheduled Destruction Date**:
- Formatted date
- Falls back to "Not Set" if missing

**Overdue Warning**:
- Red warning box if destruction date has passed
- Shows: "⚠️ This crate has passed its destruction date"
- Only appears when date is in the past

## Visual Design Improvements

### Color Scheme
- **Background**: Gray-50 for expanded area
- **Cards**: White with rounded corners
- **Text**: Gray-600 for labels, Gray-900 for values
- **Highlights**: Blue-600 for storage locations, Red for warnings

### Typography
- **Headers**: Uppercase tracking-wide for section titles
- **Values**: Font-medium for emphasis
- **Monospace**: For IDs and document numbers
- **Small text**: For secondary information

### Spacing
- **Outer**: p-6 padding for expanded area
- **Sections**: space-y-6 between major sections
- **Cards**: p-4 padding inside cards
- **Items**: space-y-2 or space-y-3 for list items

### Components Used
- `Badge`: For status, type, and category indicators
- `FileText` icon: For document indicators
- `rounded-lg`: For card corners
- `border`: For separators and card outlines

## Information Displayed by Request Type

### Storage Requests Show:
✓ Request ID, type, requester, unit, date, purpose
✓ Crate ID, destruction date, creation date, status
✓ Complete list of documents with names, numbers, and types
✓ Document count in section header

### Withdrawal Requests Show:
✓ Request ID, type, requester, unit, date, purpose
✓ Crate ID, destruction date, creation date, status, storage location
✓ Withdrawal type (full/partial)
✓ Expected return date
✓ List of documents to be withdrawn

### Destruction Requests Show:
✓ Request ID, type, requester, unit, date, purpose
✓ Crate ID, destruction date, creation date, status
✓ Scheduled destruction date
✓ Overdue warning if past destruction date

## Code Structure

```typescript
{expandedRequests.includes(String(request.id)) && (
  <TableRow>
    <TableCell colSpan={7} className="bg-gray-50 p-6">
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h4 className="font-semibold text-lg">
            <FileText className="h-5 w-5" />
            Detailed Request Information
          </h4>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">

          {/* Left: Request Details */}
          <div className="space-y-3">
            <h5>Request Details</h5>
            <div className="bg-white rounded-lg p-4">
              {/* Request info fields */}
            </div>
          </div>

          {/* Right: Crate Information */}
          <div className="space-y-3">
            <h5>Crate Information</h5>
            <div className="bg-white rounded-lg p-4">
              {/* Crate info fields */}
            </div>
          </div>
        </div>

        {/* Request Type Specific Sections */}
        {request.request_type === "Storage" && (
          <div className="space-y-3">
            {/* Document list */}
          </div>
        )}

        {request.request_type === "Withdrawal" && (
          <div className="space-y-3">
            {/* Withdrawal details */}
          </div>
        )}

        {request.request_type === "Destruction" && (
          <div className="space-y-3">
            {/* Destruction details */}
          </div>
        )}
      </div>
    </TableCell>
  </TableRow>
)}
```

## Benefits for Approvers

### Better Decision Making
- All relevant information in one place
- No need to switch screens or look up details
- Clear visual hierarchy

### Document Verification
- Can see all document names and numbers
- Document types clearly indicated
- Easy to verify document list completeness

### Crate Status Awareness
- Current crate status visible
- Storage location shown for context
- Destruction date prominently displayed

### Quick Scanning
- Organized sections
- Color-coded badges
- Icons for visual cues

## Example View

**Storage Request Expanded View**:
```
┌─────────────────────────────────────────────────────────────┐
│ 📄 Detailed Request Information                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ REQUEST DETAILS      │  │ CRATE INFORMATION    │       │
│  │                      │  │                      │       │
│  │ Request ID: REQ-123  │  │ Crate ID: #456      │       │
│  │ Type: Storage ⚪      │  │ Destruction: 2025   │       │
│  │ Requested By: John   │  │ Created: 2024       │       │
│  │ Unit: MUM-01         │  │ Status: Active ⚪    │       │
│  │ Date: 2024-01-15     │  │                      │       │
│  │ Purpose: Archive...  │  │                      │       │
│  └──────────────────────┘  └──────────────────────┘       │
│                                                             │
│  DOCUMENTS TO BE STORED (3)                                │
│  ┌─────────────────────────────────────────────┐          │
│  │  📄  Operations Manual                       │          │
│  │      DOC-2024-001                           │          │
│  │      [Physical]                             │          │
│  ├─────────────────────────────────────────────┤          │
│  │  📄  Quality Standards                       │          │
│  │      DOC-2024-002                           │          │
│  │      [Physical]                             │          │
│  ├─────────────────────────────────────────────┤          │
│  │  📄  Safety Procedures                       │          │
│  │      DOC-2024-003                           │          │
│  │      [Digital]                              │          │
│  └─────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Status: ✓ Complete

**Changes Made**:
- ✓ Enhanced expanded view layout
- ✓ Added two-column grid for request and crate details
- ✓ Added comprehensive request information display
- ✓ Added detailed crate information display
- ✓ Added document list with full details for storage requests
- ✓ Added withdrawal-specific information
- ✓ Added destruction-specific information with warnings
- ✓ Applied professional visual design
- ✓ Added proper typography and spacing
- ✓ Added color-coded badges and indicators
- ✓ Added icons for visual clarity

**Result**: Approvers now have all the information they need to make informed decisions without leaving the approval screen.
