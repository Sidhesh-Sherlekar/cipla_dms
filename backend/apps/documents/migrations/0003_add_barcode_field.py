# Generated migration for adding barcode field to Crate model

from django.db import migrations, models
from django.utils import timezone


def generate_barcodes_for_existing_crates(apps, schema_editor):
    """Generate barcodes for existing crates"""
    Crate = apps.get_model('documents', 'Crate')

    for crate in Crate.objects.all():
        # Generate barcode in format: UNIT-CRATE-YYYYMMDD-ID
        try:
            creation_date = crate.creation_date if hasattr(crate, 'creation_date') and crate.creation_date else timezone.now()
            unit_code = crate.unit.unit_code if crate.unit else 'UNKNOWN'
            barcode = f"{unit_code}-CRATE-{creation_date.strftime('%Y%m%d')}-{str(crate.id).zfill(6)}"
            crate.barcode = barcode
            crate.save(update_fields=['barcode'])
        except Exception as e:
            print(f"Error generating barcode for crate {crate.id}: {e}")


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0002_add_withdrawn_status'),
    ]

    operations = [
        # Step 1: Add barcode field as nullable
        migrations.AddField(
            model_name='crate',
            name='barcode',
            field=models.CharField(max_length=50, null=True, blank=True, db_index=True),
        ),

        # Step 2: Generate barcodes for existing crates
        migrations.RunPython(generate_barcodes_for_existing_crates, migrations.RunPython.noop),

        # Step 3: Make barcode unique and non-nullable
        migrations.AlterField(
            model_name='crate',
            name='barcode',
            field=models.CharField(max_length=50, unique=True, db_index=True, editable=False),
        ),
    ]
