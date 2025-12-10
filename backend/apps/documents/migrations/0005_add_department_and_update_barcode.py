# Migration to add department field and update barcode format
# New barcode format: [unit_code]/[dept_name]/[year]/[number]

from django.db import migrations, models
import django.db.models.deletion


def set_default_department_and_update_barcodes(apps, schema_editor):
    """
    Set default department for existing crates and update their barcodes
    to use new format: [unit_code]/[dept_name]/[year]/[number]
    """
    Crate = apps.get_model('documents', 'Crate')
    Department = apps.get_model('auth_custom', 'Department')

    from django.utils import timezone

    for crate in Crate.objects.select_related('unit').all():
        try:
            # Get or create a default department for the unit
            department, created = Department.objects.get_or_create(
                unit=crate.unit,
                department_name='General',
                defaults={
                    'department_head': None
                }
            )

            if created:
                print(f"Created default department 'General' for unit {crate.unit.unit_code}")

            # Set the department for the crate
            crate.department = department

            # Generate new barcode format
            current_year = crate.creation_date.year if crate.creation_date else timezone.now().year
            dept_name_clean = department.department_name.replace(' ', '').replace('-', '')[:10]

            # Get the sequence number for this department/year
            # Count existing crates with this dept/year (excluding current one)
            existing_count = Crate.objects.filter(
                unit=crate.unit,
                department=department,
                creation_date__year=current_year
            ).exclude(id=crate.id).count()

            sequence_number = existing_count + 1

            # Generate new barcode
            new_barcode = f"{crate.unit.unit_code}/{dept_name_clean}/{current_year}/{sequence_number:05d}"
            crate.barcode = new_barcode

            crate.save(update_fields=['department', 'barcode'])
            print(f"Updated crate {crate.id}: {new_barcode}")

        except Exception as e:
            print(f"Error updating crate {crate.id}: {e}")


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0004_update_barcode_format'),
        ('auth_custom', '0001_initial'),  # Department is in auth_custom app
    ]

    operations = [
        # Add department field (nullable first to allow data migration)
        migrations.AddField(
            model_name='crate',
            name='department',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='crates',
                to='auth_custom.department'
            ),
        ),

        # Increase barcode field max_length to accommodate new format
        migrations.AlterField(
            model_name='crate',
            name='barcode',
            field=models.CharField(db_index=True, editable=False, max_length=100, unique=True),
        ),

        # Run the data migration to set default departments and update barcodes
        migrations.RunPython(
            set_default_department_and_update_barcodes,
            migrations.RunPython.noop
        ),

        # Make department field non-nullable after data migration
        migrations.AlterField(
            model_name='crate',
            name='department',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='crates',
                to='auth_custom.department'
            ),
        ),
    ]
