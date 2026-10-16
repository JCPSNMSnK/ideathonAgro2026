import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "subruta_config.settings")

application = get_wsgi_application()

# Requerido por Vercel (@vercel/python busca la variable `app`)
app = application
