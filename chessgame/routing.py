from django.urls import path
from chessgame.consumers import MatchmakingConsumer, ChessConsumer

websocket_urlpatterns = [
    path("ws/matchmaking/", MatchmakingConsumer.as_asgi()),
    path("ws/chess/", ChessConsumer.as_asgi()),
]
