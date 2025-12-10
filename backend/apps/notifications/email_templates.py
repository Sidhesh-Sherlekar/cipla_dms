"""
Email Templates for Cipla DMS

All email templates are defined here for consistency and easy maintenance.
Templates support HTML formatting.
"""

from .email_config import APP_BASE_URL


def get_base_template(content, title="Cipla DMS Notification"):
    """Base HTML email template wrapper."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background-color: #1a365d;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }}
        .content {{
            background-color: #f8f9fa;
            padding: 20px;
            border: 1px solid #e9ecef;
        }}
        .footer {{
            background-color: #e9ecef;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-radius: 0 0 8px 8px;
        }}
        .button {{
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 0;
        }}
        .button:hover {{
            background-color: #1d4ed8;
        }}
        .alert {{
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
        }}
        .alert-warning {{
            background-color: #fef3cd;
            border: 1px solid #ffc107;
            color: #856404;
        }}
        .alert-danger {{
            background-color: #f8d7da;
            border: 1px solid #dc3545;
            color: #721c24;
        }}
        .alert-success {{
            background-color: #d4edda;
            border: 1px solid #28a745;
            color: #155724;
        }}
        .alert-info {{
            background-color: #d1ecf1;
            border: 1px solid #17a2b8;
            color: #0c5460;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        th, td {{
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #e9ecef;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Cipla DMS</h1>
        <p>Document Management System</p>
    </div>
    <div class="content">
        {content}
    </div>
    <div class="footer">
        <p>This is an automated message from Cipla Document Management System.</p>
        <p>Please do not reply to this email.</p>
        <p>&copy; Cipla Ltd. All rights reserved.</p>
    </div>
</body>
</html>
"""


# ==================== REQUEST TEMPLATES ====================

def request_created_template(request_type, request_id, crate_barcode, requester_name, unit_name, purpose=""):
    """Template for new request creation notification."""
    content = f"""
    <h2>New {request_type} Request Created</h2>

    <div class="alert alert-info">
        <strong>Request #{request_id}</strong> has been submitted and is pending approval.
    </div>

    <table>
        <tr><th>Request Type</th><td>{request_type}</td></tr>
        <tr><th>Request ID</th><td>#{request_id}</td></tr>
        <tr><th>Crate</th><td>{crate_barcode}</td></tr>
        <tr><th>Submitted By</th><td>{requester_name}</td></tr>
        <tr><th>Unit</th><td>{unit_name}</td></tr>
        {"<tr><th>Purpose</th><td>" + purpose + "</td></tr>" if purpose else ""}
    </table>

    <p>Please review and take appropriate action.</p>

    <a href="{APP_BASE_URL}" class="button">View in DMS</a>
    """
    return get_base_template(content, f"New {request_type} Request - #{request_id}")


def request_approved_template(request_type, request_id, crate_barcode, approver_name, requester_name):
    """Template for request approval notification."""
    content = f"""
    <h2>{request_type} Request Approved</h2>

    <div class="alert alert-success">
        <strong>Good news!</strong> Your {request_type.lower()} request has been approved.
    </div>

    <table>
        <tr><th>Request Type</th><td>{request_type}</td></tr>
        <tr><th>Request ID</th><td>#{request_id}</td></tr>
        <tr><th>Crate</th><td>{crate_barcode}</td></tr>
        <tr><th>Approved By</th><td>{approver_name}</td></tr>
    </table>

    <p>Your request is now ready for the next step in the workflow.</p>

    <a href="{APP_BASE_URL}" class="button">View Details</a>
    """
    return get_base_template(content, f"{request_type} Request Approved - #{request_id}")


def request_rejected_template(request_type, request_id, crate_barcode, rejector_name, requester_name, reason=""):
    """Template for request rejection notification."""
    content = f"""
    <h2>{request_type} Request Rejected</h2>

    <div class="alert alert-danger">
        Your {request_type.lower()} request has been rejected.
    </div>

    <table>
        <tr><th>Request Type</th><td>{request_type}</td></tr>
        <tr><th>Request ID</th><td>#{request_id}</td></tr>
        <tr><th>Crate</th><td>{crate_barcode}</td></tr>
        <tr><th>Rejected By</th><td>{rejector_name}</td></tr>
        {"<tr><th>Reason</th><td>" + reason + "</td></tr>" if reason else ""}
    </table>

    <p>Please contact the approver if you have questions about this decision.</p>

    <a href="{APP_BASE_URL}" class="button">View Details</a>
    """
    return get_base_template(content, f"{request_type} Request Rejected - #{request_id}")


def request_sent_back_template(request_type, request_id, crate_barcode, sender_name, requester_name, reason=""):
    """Template for request sent back notification."""
    content = f"""
    <h2>{request_type} Request Sent Back</h2>

    <div class="alert alert-warning">
        Your {request_type.lower()} request has been sent back for revision.
    </div>

    <table>
        <tr><th>Request Type</th><td>{request_type}</td></tr>
        <tr><th>Request ID</th><td>#{request_id}</td></tr>
        <tr><th>Crate</th><td>{crate_barcode}</td></tr>
        <tr><th>Sent Back By</th><td>{sender_name}</td></tr>
        {"<tr><th>Reason</th><td>" + reason + "</td></tr>" if reason else ""}
    </table>

    <p>Please review the feedback, make necessary changes, and resubmit your request.</p>

    <a href="{APP_BASE_URL}" class="button">Update Request</a>
    """
    return get_base_template(content, f"{request_type} Request Needs Revision - #{request_id}")


# ==================== STORAGE TEMPLATES ====================

def storage_allocated_template(request_id, crate_barcode, storage_location, allocated_by, requester_name):
    """Template for storage allocation notification."""
    content = f"""
    <h2>Storage Allocated</h2>

    <div class="alert alert-success">
        Storage has been allocated for your crate.
    </div>

    <table>
        <tr><th>Request ID</th><td>#{request_id}</td></tr>
        <tr><th>Crate</th><td>{crate_barcode}</td></tr>
        <tr><th>Storage Location</th><td>{storage_location}</td></tr>
        <tr><th>Allocated By</th><td>{allocated_by}</td></tr>
    </table>

    <p>Your storage request has been completed successfully.</p>

    <a href="{APP_BASE_URL}" class="button">View Details</a>
    """
    return get_base_template(content, f"Storage Allocated - Crate {crate_barcode}")


# ==================== WITHDRAWAL TEMPLATES ====================

def documents_issued_template(request_id, crate_barcode, issued_by, requester_name, expected_return_date):
    """Template for documents issued notification."""
    content = f"""
    <h2>Documents Issued</h2>

    <div class="alert alert-success">
        Your requested documents have been issued.
    </div>

    <table>
        <tr><th>Request ID</th><td>#{request_id}</td></tr>
        <tr><th>Crate</th><td>{crate_barcode}</td></tr>
        <tr><th>Issued By</th><td>{issued_by}</td></tr>
        <tr><th>Expected Return Date</th><td>{expected_return_date}</td></tr>
    </table>

    <div class="alert alert-warning">
        <strong>Important:</strong> Please ensure documents are returned by the expected return date.
    </div>

    <a href="{APP_BASE_URL}" class="button">View Details</a>
    """
    return get_base_template(content, f"Documents Issued - Request #{request_id}")


def documents_returned_template(request_id, crate_barcode, returned_to, storage_location, requester_name):
    """Template for documents returned notification."""
    content = f"""
    <h2>Documents Returned</h2>

    <div class="alert alert-success">
        Documents have been successfully returned.
    </div>

    <table>
        <tr><th>Request ID</th><td>#{request_id}</td></tr>
        <tr><th>Crate</th><td>{crate_barcode}</td></tr>
        <tr><th>Returned To</th><td>{returned_to}</td></tr>
        <tr><th>Storage Location</th><td>{storage_location}</td></tr>
    </table>

    <p>Thank you for returning the documents on time.</p>

    <a href="{APP_BASE_URL}" class="button">View Details</a>
    """
    return get_base_template(content, f"Documents Returned - Request #{request_id}")


# ==================== REMINDER TEMPLATES ====================

def return_reminder_template(request_id, crate_barcode, requester_name, expected_return_date, days_remaining):
    """Template for return reminder notification."""
    urgency_class = "alert-danger" if days_remaining <= 1 else "alert-warning"
    urgency_text = "URGENT: " if days_remaining <= 1 else ""

    content = f"""
    <h2>{urgency_text}Document Return Reminder</h2>

    <div class="alert {urgency_class}">
        <strong>{"Documents are overdue!" if days_remaining < 0 else f"{days_remaining} day(s) remaining"}</strong> to return borrowed documents.
    </div>

    <table>
        <tr><th>Request ID</th><td>#{request_id}</td></tr>
        <tr><th>Crate</th><td>{crate_barcode}</td></tr>
        <tr><th>Borrowed By</th><td>{requester_name}</td></tr>
        <tr><th>Expected Return Date</th><td>{expected_return_date}</td></tr>
        <tr><th>Days Remaining</th><td><strong>{days_remaining if days_remaining >= 0 else f"Overdue by {abs(days_remaining)} day(s)"}</strong></td></tr>
    </table>

    <p>Please ensure documents are returned by the expected return date to avoid compliance issues.</p>

    <a href="{APP_BASE_URL}" class="button">View Request</a>
    """
    return get_base_template(content, f"Return Reminder - Request #{request_id}")


def overdue_return_template(request_id, crate_barcode, requester_name, expected_return_date, days_overdue):
    """Template for overdue return notification."""
    content = f"""
    <h2>URGENT: Documents Overdue</h2>

    <div class="alert alert-danger">
        <strong>Documents are {days_overdue} day(s) overdue!</strong> Immediate action required.
    </div>

    <table>
        <tr><th>Request ID</th><td>#{request_id}</td></tr>
        <tr><th>Crate</th><td>{crate_barcode}</td></tr>
        <tr><th>Borrowed By</th><td>{requester_name}</td></tr>
        <tr><th>Expected Return Date</th><td>{expected_return_date}</td></tr>
        <tr><th>Days Overdue</th><td><strong style="color: #dc3545;">{days_overdue}</strong></td></tr>
    </table>

    <p>This is a compliance violation. Please return the documents immediately.</p>

    <a href="{APP_BASE_URL}" class="button">View Request</a>
    """
    return get_base_template(content, f"OVERDUE - Request #{request_id}")


# ==================== DESTRUCTION TEMPLATES ====================

def destruction_confirmed_template(request_id, crate_barcode, destroyed_by, requester_name):
    """Template for destruction confirmation notification."""
    content = f"""
    <h2>Crate Destruction Confirmed</h2>

    <div class="alert alert-info">
        The crate has been successfully destroyed.
    </div>

    <table>
        <tr><th>Request ID</th><td>#{request_id}</td></tr>
        <tr><th>Crate</th><td>{crate_barcode}</td></tr>
        <tr><th>Destroyed By</th><td>{destroyed_by}</td></tr>
    </table>

    <p>This action has been logged in the audit trail for compliance purposes.</p>

    <a href="{APP_BASE_URL}" class="button">View Audit Trail</a>
    """
    return get_base_template(content, f"Destruction Confirmed - Crate {crate_barcode}")


def destruction_reminder_template(crate_barcode, destruction_date, days_remaining, unit_name, department_name):
    """Template for destruction schedule reminder."""
    urgency_class = "alert-danger" if days_remaining <= 1 else "alert-warning"

    content = f"""
    <h2>Destruction Schedule Reminder</h2>

    <div class="alert {urgency_class}">
        <strong>{days_remaining} day(s)</strong> until scheduled destruction.
    </div>

    <table>
        <tr><th>Crate</th><td>{crate_barcode}</td></tr>
        <tr><th>Scheduled Destruction Date</th><td>{destruction_date}</td></tr>
        <tr><th>Unit</th><td>{unit_name}</td></tr>
        <tr><th>Department</th><td>{department_name}</td></tr>
    </table>

    <p>Please ensure all necessary approvals are in place for the scheduled destruction.</p>

    <a href="{APP_BASE_URL}" class="button">View Crate Details</a>
    """
    return get_base_template(content, f"Destruction Reminder - Crate {crate_barcode}")


# ==================== USER TEMPLATES ====================

def user_account_created_template(username, temp_password, full_name, role_name):
    """Template for new user account notification."""
    content = f"""
    <h2>Welcome to Cipla DMS</h2>

    <div class="alert alert-success">
        Your account has been created successfully.
    </div>

    <table>
        <tr><th>Username</th><td>{username}</td></tr>
        <tr><th>Temporary Password</th><td><code>{temp_password}</code></td></tr>
        <tr><th>Role</th><td>{role_name}</td></tr>
    </table>

    <div class="alert alert-warning">
        <strong>Important:</strong> You will be required to change your password on first login.
    </div>

    <a href="{APP_BASE_URL}" class="button">Login to DMS</a>
    """
    return get_base_template(content, f"Welcome to Cipla DMS - {full_name}")


def password_reset_template(username, new_password, full_name):
    """Template for password reset notification."""
    content = f"""
    <h2>Password Reset</h2>

    <div class="alert alert-info">
        Your password has been reset by an administrator.
    </div>

    <table>
        <tr><th>Username</th><td>{username}</td></tr>
        <tr><th>New Temporary Password</th><td><code>{new_password}</code></td></tr>
    </table>

    <div class="alert alert-warning">
        <strong>Important:</strong> You will be required to change your password on next login.
    </div>

    <a href="{APP_BASE_URL}" class="button">Login to DMS</a>
    """
    return get_base_template(content, f"Password Reset - {full_name}")


def account_locked_template(username, full_name, reason="Too many failed login attempts"):
    """Template for account locked notification."""
    content = f"""
    <h2>Account Locked</h2>

    <div class="alert alert-danger">
        Your account has been temporarily locked.
    </div>

    <table>
        <tr><th>Username</th><td>{username}</td></tr>
        <tr><th>Reason</th><td>{reason}</td></tr>
    </table>

    <p>Please contact your system administrator to unlock your account.</p>
    """
    return get_base_template(content, f"Account Locked - {full_name}")
