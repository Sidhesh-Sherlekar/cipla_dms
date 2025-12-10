# Generated migration for adding to_central, to_be_retained, and section fields

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0005_add_department_and_update_barcode'),
        ('auth_custom', '0001_initial'),  # Section is in auth_custom app
    ]

    operations = [
        # Make destruction_date nullable for retained crates
        migrations.AlterField(
            model_name='crate',
            name='destruction_date',
            field=models.DateField(blank=True, null=True),
        ),
        # Add section field
        migrations.AddField(
            model_name='crate',
            name='section',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='crates',
                to='auth_custom.section'
            ),
        ),
        # Add to_central field
        migrations.AddField(
            model_name='crate',
            name='to_central',
            field=models.BooleanField(
                default=False,
                help_text='If checked, crate will be sent to central storage instead of unit storage'
            ),
        ),
        # Add to_be_retained field
        migrations.AddField(
            model_name='crate',
            name='to_be_retained',
            field=models.BooleanField(
                default=False,
                help_text='If checked, crate will be retained indefinitely (no destruction date)'
            ),
        ),
    ]
