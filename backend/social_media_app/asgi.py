import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from social_media_app.channels_middleware import JWTAuthMiddleware
import chat.routing
import notifications.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'social_media_app.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(
            chat.routing.websocket_urlpatterns +
            notifications.routing.websocket_urlpatterns
        )
    ),
})
