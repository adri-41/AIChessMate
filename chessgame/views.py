from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.contrib.auth.forms import UserCreationForm


def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('home')  # ou vers ta page de jeu
        else:
            return render(request, 'login.html', {'error': "Nom d'utilisateur ou mot de passe incorrect"})
    return render(request, 'login.html')


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
def game_view(request, room_name=None):
    # On détecte le mode : contre IA ou multijoueur
    mode = "ai" if room_name == "vs-bot" else "multi"
    return render(request, "game.html", {
        "mode": mode,
        "room_name": room_name,
    })
