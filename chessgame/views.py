from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.forms import UserCreationForm


def login_view(request):
    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect("home")  # Redirige vers la page d'accueil après connexion
    else:
        form = AuthenticationForm()

    return render(request, "login.html", {"form": form})


@login_required(login_url="login")  # Redirige vers la connexion si l'utilisateur n'est pas connecté
def home_view(request):
    return render(request, "home.html")  # Affiche la page d'accueil si connecté


def logout_view(request):
    logout(request)
    return redirect("login")


def register_view(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)  # Connexion automatique après inscription
            return redirect("home")  # Redirige vers la page d'accueil après inscription
    else:
        form = UserCreationForm()

    return render(request, "register.html", {"form": form})


# def game(request, game_id):
# return render(request, "game.html", {"game_id": game_id})

@login_required
def game(request, room_name):  # Vérifie que room_name est bien un paramètre ici
    return render(request, "game.html", {"room_name": room_name})