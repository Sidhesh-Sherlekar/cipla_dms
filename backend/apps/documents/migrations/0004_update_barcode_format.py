# Migration to update barcode format to simpler format: UNIT-CRATE-ID

from django.db import migrations


def update_barcode_format(apps, schema_editor):
    """Update barcodes to use simpler format: UNIT-CRATE-ID"""
    Crate = apps.get_model('documents', 'Crate')

    for crate in Crate.objects.all():
        try:
            unit_code = crate.unit.unit_code if crate.unit else 'UNKNOWN'
            # New format: UNIT-CRATE-ID (e.g., MFG01-CRATE-123)
            new_barcode = f"{unit_code}-CRATE-{crate.id}"
            crate.barcode = new_barcode
            crate.save(update_fields=['barcode'])
            print(f"Updated crate {crate.id}: {new_barcode}")
        except Exception as e:
            print(f"Error updating barcode for crate {crate.id}: {e}")


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0003_add_barcode_field'),
    ]

    operations = [
        migrations.RunPython(update_barcode_format, migrations.RunPython.noop),
    ]
