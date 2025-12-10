"""
Production-optimized Django settings for 200 concurrent users.

This file contains production-ready settings with optimizations for:
- 200 concurrent WebSocket connections
- Redis caching
- Database connection pooling
- Security hardening
- Performance tuning
"""

from .settings import *
import os

# ==============================================================================
# SECURITY SETTINGS
# ==============================================================================

# Must be set in environment variables for production
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)

# Production hosts
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

# Security middleware
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True

# ==============================================================================
# DATABASE OPTIMIZATION FOR 200 USERS
# ==============================================================================

if USE_POSTGRES:
    DATABASES['default'].update({
        'CONN_MAX_AGE': 600,  # Persistent connections
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',  # 30 second query timeout
        },
        # Connection pooling settings
        'POOL_OPTIONS': {
            'POOL_SIZE': 20,  # Base pool size
            'MAX_OVERFLOW': 30,  # Can handle spikes up to 50 connections
            'POOL_TIMEOUT': 30,
            'POOL_RECYCLE': 3600,  # Recycle connections every hour
        }
    })

# ==============================================================================
# CACHE CONFIGURATION (Redis)
# ==============================================================================

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': config('REDIS_CACHE_URL', default='redis://redis:6379/2'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
        },
        'KEY_PREFIX': 'cipla_dms',
        'TIMEOUT': 300,  # 5 minutes default
    }
}

# Use cache for sessions (better performance)
SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
SESSION_CACHE_ALIAS = 'default'

# ==============================================================================
# CHANNELS OPTIMIZATION FOR 200 WEBSOCKET CONNECTIONS
# ==============================================================================

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [config('REDIS_URL', default='redis://redis:6379/1')],
            "capacity": 2000,  # Max messages in a channel
            "expiry": 10,  # Message expiry in seconds
            "group_expiry": 86400,  # Group expiry: 24 hours
            "symmetric_encryption_keys": [SECRET_KEY],  # Encrypt messages
            # Connection pool for 200 clients
            "connection_kwargs": {
                "max_connections": 250,
                "retry_on_timeout": True,
            },
        },
    },
}

# ==============================================================================
# CELERY OPTIMIZATION
# ==============================================================================

# Task result backend with expiry
CELERY_RESULT_EXPIRES = 3600  # 1 hour
CELERY_TASK_ACKS_LATE = True  # Tasks acknowledged after completion
CELERY_WORKER_PREFETCH_MULTIPLIER = 4  # Prefetch 4 tasks per worker
CELERY_TASK_COMPRESSION = 'gzip'  # Compress large task payloads

# Connection pool settings
CELERY_BROKER_POOL_LIMIT = 50
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

# ==============================================================================
# REST FRAMEWORK OPTIMIZATION
# ==============================================================================

REST_FRAMEWORK.update({
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'PAGE_SIZE': 50,
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'MAX_PAGE_SIZE': 1000,
    # Throttling for 200 users
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '2000/hour',  # ~33 requests/min per user
    },
    # Optimize serializer performance
    'COERCE_DECIMAL_TO_STRING': False,
    'DATETIME_FORMAT': 'iso-8601',
})

# ==============================================================================
# LOGGING CONFIGURATION
# ==============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s'
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'app.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'audit_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'audit.log',
            'maxBytes': 1024 * 1024 * 50,  # 50MB
            'backupCount': 50,
            'formatter': 'json',
        },
        'websocket_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'websocket.log',
            'maxBytes': 1024 * 1024 * 25,  # 25MB
            'backupCount': 20,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'apps.audit': {
            'handlers': ['audit_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.requests.signals': {
            'handlers': ['websocket_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.requests.consumers': {
            'handlers': ['websocket_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# ==============================================================================
# STATIC FILES (WhiteNoise for production)
# ==============================================================================

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ==============================================================================
# MIDDLEWARE OPTIMIZATION
# ==============================================================================

# Add WhiteNoise and compression middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'apps.auth.middleware.DynamicSessionTimeoutMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.middleware.gzip.GZipMiddleware',  # Compress responses
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ==============================================================================
# EMAIL CONFIGURATION (Production)
# ==============================================================================

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@cipla.com')

# ==============================================================================
# CORS CONFIGURATION
# ==============================================================================

CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='').split(',')
CORS_ALLOW_CREDENTIALS = True

# ==============================================================================
# ADDITIONAL PRODUCTION OPTIMIZATIONS
# ==============================================================================

# Template caching
TEMPLATES[0]['OPTIONS']['loaders'] = [
    ('django.template.loaders.cached.Loader', [
        'django.template.loaders.filesystem.Loader',
        'django.template.loaders.app_directories.Loader',
    ]),
]

# Disable admin auto-discover in production
ADMIN_URL = config('ADMIN_URL', default='admin/')

# Media files
MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10 MB

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Time zone
USE_TZ = True
TIME_ZONE = config('TIME_ZONE', default='UTC')

print(f"✅ Production settings loaded for {ALLOWED_HOSTS}")
print(f"✅ Cache backend: Redis")
print(f"✅ Database: {'PostgreSQL' if USE_POSTGRES else 'SQLite'}")
print(f"✅ WebSocket capacity: 2000 messages, 250 connections")
