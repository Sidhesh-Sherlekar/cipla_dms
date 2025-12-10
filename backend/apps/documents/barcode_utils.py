"""
Barcode Generation and Management Utilities

Provides functions to generate barcodes for crates and convert them to
various formats (SVG, PNG, base64) for display and printing.
"""

import io
import base64
from typing import Optional, Tuple


def generate_barcode_image(barcode_value: str, format: str = 'svg') -> Tuple[Optional[bytes], str]:
    """
    Generate barcode image in specified format.

    Args:
        barcode_value: The barcode string to encode
        format: Output format ('svg' or 'png')

    Returns:
        Tuple of (image_bytes, mime_type)
    """
    try:
        import barcode
        from barcode.writer import SVGWriter, ImageWriter

        # Use Code128 barcode format (versatile and widely supported)
        barcode_class = barcode.get_barcode_class('code128')

        if format.lower() == 'svg':
            writer = SVGWriter()
            mime_type = 'image/svg+xml'
        else:
            writer = ImageWriter()
            mime_type = 'image/png'

        # Generate barcode
        barcode_instance = barcode_class(barcode_value, writer=writer)

        # Write to BytesIO buffer
        buffer = io.BytesIO()
        barcode_instance.write(buffer, options={
            'module_width': 0.3,
            'module_height': 15.0,
            'quiet_zone': 6.5,
            'font_size': 10,
            'text_distance': 5.0,
            'write_text': True,
        })

        buffer.seek(0)
        return buffer.getvalue(), mime_type

    except ImportError:
        # Fallback if python-barcode is not installed
        return None, ''
    except Exception as e:
        print(f"Error generating barcode: {str(e)}")
        return None, ''


def generate_barcode_base64(barcode_value: str, format: str = 'svg') -> Optional[str]:
    """
    Generate barcode and return as base64 string for embedding in HTML/JSON.

    Args:
        barcode_value: The barcode string to encode
        format: Output format ('svg' or 'png')

    Returns:
        Base64 encoded string with data URI prefix, or None if failed
    """
    image_bytes, mime_type = generate_barcode_image(barcode_value, format)

    if image_bytes:
        b64_string = base64.b64encode(image_bytes).decode('utf-8')
        return f"data:{mime_type};base64,{b64_string}"

    return None


def generate_qr_code(data: str, format: str = 'png') -> Tuple[Optional[bytes], str]:
    """
    Generate QR code for crate information.
    QR codes can store more data than barcodes.

    Args:
        data: Data to encode (can be JSON string with crate info)
        format: Output format ('png')

    Returns:
        Tuple of (image_bytes, mime_type)
    """
    try:
        import qrcode
        from qrcode.image.pil import PilImage

        # Create QR code instance
        qr = qrcode.QRCode(
            version=1,  # Auto-adjust size
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )

        qr.add_data(data)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to bytes
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        return buffer.getvalue(), 'image/png'

    except ImportError:
        return None, ''
    except Exception as e:
        print(f"Error generating QR code: {str(e)}")
        return None, ''


def generate_qr_code_base64(data: str) -> Optional[str]:
    """
    Generate QR code and return as base64 string.

    Args:
        data: Data to encode

    Returns:
        Base64 encoded string with data URI prefix, or None if failed
    """
    image_bytes, mime_type = generate_qr_code(data)

    if image_bytes:
        b64_string = base64.b64encode(image_bytes).decode('utf-8')
        return f"data:{mime_type};base64,{b64_string}"

    return None


def validate_barcode_format(barcode_value: str) -> bool:
    """
    Validate that a barcode string follows the expected format.
    Expected format: [unit_code]/[dept_name]/[year]/[number]
    Example: MFG01/QC/2025/00001

    Args:
        barcode_value: The barcode string to validate

    Returns:
        True if valid, False otherwise
    """
    import re

    # Pattern: UNIT/DEPT/YEAR/NUMBER
    # - Unit code: alphanumeric (1-20 chars)
    # - Dept name: alphanumeric (1-20 chars)
    # - Year: 4 digits
    # - Number: 1-10 digits
    pattern = r'^[A-Z0-9]{1,20}/[A-Za-z0-9]{1,20}/\d{4}/\d{1,10}$'

    # Also accept old format for backward compatibility: UNIT-CRATE-ID
    old_pattern = r'^[A-Z0-9]+-CRATE-\d+$'

    return bool(re.match(pattern, barcode_value) or re.match(old_pattern, barcode_value))


def generate_printable_label(crate_id: int, barcode_value: str, unit_name: str,
                            destruction_date: str, storage_location: str = None) -> str:
    """
    Generate HTML for a printable crate label with barcode.

    Args:
        crate_id: Crate ID
        barcode_value: Barcode string
        unit_name: Unit name
        destruction_date: Destruction date
        storage_location: Optional storage location

    Returns:
        HTML string for printable label
    """
    barcode_image = generate_barcode_base64(barcode_value, format='svg')

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Crate Label - {barcode_value}</title>
        <style>
            @page {{
                size: 4in 6in;
                margin: 0.25in;
            }}
            body {{
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                width: 4in;
                height: 6in;
                box-sizing: border-box;
            }}
            .label {{
                border: 2px solid #000;
                padding: 15px;
                text-align: center;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }}
            .header {{
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
            }}
            .barcode {{
                margin: 20px 0;
                display: flex;
                justify-content: center;
            }}
            .barcode img {{
                max-width: 100%;
                height: auto;
            }}
            .info {{
                font-size: 14px;
                text-align: left;
                margin: 10px 0;
            }}
            .info-row {{
                margin: 5px 0;
                padding: 5px;
                border-bottom: 1px solid #ccc;
            }}
            .label-field {{
                font-weight: bold;
                display: inline-block;
                width: 140px;
            }}
            .destruction-warning {{
                background: #ff0000;
                color: white;
                padding: 10px;
                font-weight: bold;
                font-size: 16px;
                margin-top: 10px;
            }}
            @media print {{
                body {{
                    margin: 0;
                    padding: 0;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="label">
            <div class="header">
                CIPLA DMS - CRATE LABEL
            </div>

            <div class="barcode">
                <img src="{barcode_image}" alt="{barcode_value}" />
            </div>

            <div class="info">
                <div class="info-row">
                    <span class="label-field">Crate ID:</span>
                    <span>#{crate_id}</span>
                </div>
                <div class="info-row">
                    <span class="label-field">Unit:</span>
                    <span>{unit_name}</span>
                </div>
                {"<div class='info-row'><span class='label-field'>Storage:</span><span>" + storage_location + "</span></div>" if storage_location else ""}
                <div class="info-row">
                    <span class="label-field">Barcode:</span>
                    <span style="font-family: monospace;">{barcode_value}</span>
                </div>
            </div>

            <div class="destruction-warning">
                DESTROY BY: {destruction_date}
            </div>
        </div>
    </body>
    </html>
    """

    return html


def parse_barcode(barcode_value: str) -> dict:
    """
    Parse barcode string to extract information.

    Args:
        barcode_value: Barcode string in format [unit_code]/[dept_name]/[year]/[number]
                       or old format UNIT-CRATE-ID

    Returns:
        Dictionary with parsed components
    """
    if not validate_barcode_format(barcode_value):
        return {}

    # Check if it's the new format (contains /)
    if '/' in barcode_value:
        parts = barcode_value.split('/')

        if len(parts) == 4:
            return {
                'unit_code': parts[0],
                'department_name': parts[1],
                'year': int(parts[2]),
                'sequence_number': int(parts[3]),
                'full_barcode': barcode_value,
                'format': 'new'
            }

    # Old format: UNIT-CRATE-ID
    if '-' in barcode_value:
        parts = barcode_value.split('-')

        if len(parts) == 3:
            return {
                'unit_code': parts[0],
                'type': parts[1],  # Should be 'CRATE'
                'crate_id': int(parts[2]),
                'full_barcode': barcode_value,
                'format': 'old'
            }

    return {}
