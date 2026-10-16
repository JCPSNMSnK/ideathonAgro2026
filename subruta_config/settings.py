"""
Configuración de Django para SubRuta (Ideathon NEA Tech 2026 - Corrientes).
Soporta conexión directa a Supabase (PostgreSQL) mediante DATABASE_URL en .env,
y cuenta con fallback automático a SQLite local para que el equipo pueda
trabajar y presentar aún si se corta el Wi-Fi en el salón del evento.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar variables desde archivo .env si existe
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv(
    "SECRET_KEY", "django-insecure-subruta-ideathon-nea-2026-corrientes"
)

DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "mercado",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "subruta_config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "subruta_config.wsgi.application"

# ==============================================================================
# BASE DE DATOS: SUPABASE (PostgreSQL) CON FALLBACK LOCAL AUTOMÁTICO (SQLite)
# ==============================================================================
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if DATABASE_URL:
    # Limpiar parámetro ?pgbouncer=true (propio de Prisma) que psycopg2 no admite en el DSN
    clean_db_url = (
        DATABASE_URL.replace("?pgbouncer=true&", "?")
        .replace("&pgbouncer=true", "")
        .replace("?pgbouncer=true", "")
    )
    db_config = dj_database_url.parse(
        clean_db_url,
        conn_max_age=0,
        ssl_require=True,
    )
    # Requerido por el Transaction Pooler de Supabase (puerto 6543) en Django
    db_config["DISABLE_SERVER_SIDE_CURSORS"] = True
    DATABASES = {"default": db_config}
    DB_MODE_LABEL = "Supabase Cloud Activo (PostgreSQL)"
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
    DB_MODE_LABEL = "Modo Local Resiliente (SQLite - Listo para migrar a Supabase)"

LANGUAGE_CODE = "es-ar"
TIME_ZONE = "America/Argentina/Cordoba"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
