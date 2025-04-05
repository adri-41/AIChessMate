import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

from django.core.asgi import get_asgi_application
import chessgame.routing  # ton fichier routing.py dans chessgame/

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'AIChessMate.settings')
django.setup()

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chessgame.routing.websocket_urlpatterns
        )
    ),
})
