from django.urls import path
from .views import *

urlpatterns = [
    path("", home_view, name="home"),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("game/<str:room_name>/", game_view, name="game"),
    path("api/random-ai-move/", random_ai_move, name="random_ai_move"),
    path("api/minimax-ai-move/", minimax_ai_move, name="minimax_ai_move"),
    path("api/nn-ai-move/", nn_ai_move, name="nn_ai_move"),

]
