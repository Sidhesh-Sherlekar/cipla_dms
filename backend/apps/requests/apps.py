from django.apps import AppConfig


class RequestsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.requests'

    def ready(self):
        """Import signal handlers when the app is ready."""
        import apps.requests.signals  # noqa
