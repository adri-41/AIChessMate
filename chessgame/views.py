import json

from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.contrib.auth.forms import UserCreationForm
from django.views.decorators.csrf import csrf_exempt

from chessgame.ai.ai_random import *

from chessgame.ai.ai_minimax import *


def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('home')
        else:
            return render(request, 'login.html', {'error': "Nom d'utilisateur ou mot de passe incorrect"})
    return render(request, 'login.html')


@login_required(login_url="login")
def home_view(request):
    return render(request, "home.html")


def logout_view(request):
    logout(request)
    return redirect("login")


def register_view(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("home")
    else:
        form = UserCreationForm()
    return render(request, "register.html", {"form": form})


@login_required
def game_view(request, room_name=None):
    mode_param = request.GET.get("mode")  # Ex: "random", "minimax"

    if room_name == "vs-bot":
        if mode_param == "minimax":
            mode = "minimax"
        else:
            mode = "random"
    else:
        mode = "multi"

    return render(request, "game.html", {
        "mode": mode,
        "room_name": room_name,
    })


@csrf_exempt
def random_ai_move(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            fen = data.get("fen")

            move = get_random_move(fen)
            if move:
                return JsonResponse({
                    "from": move.uci()[:2],
                    "to": move.uci()[2:4]
                })
            else:
                return JsonResponse({"error": "No legal moves"}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    return JsonResponse({"error": "Méthode non autorisée"}, status=405)


@csrf_exempt
def minimax_ai_move(request):
    if request.method == "POST":
        data = json.loads(request.body)
        fen = data.get("fen")
        if not fen:
            return JsonResponse({"error": "FEN manquant"}, status=400)

        move = get_minimax_move(fen)
        if move:
            return JsonResponse(move)
        return JsonResponse({"error": "Aucun coup possible"}, status=200)
    return JsonResponse({"error": "Méthode non autorisée"}, status=405)
