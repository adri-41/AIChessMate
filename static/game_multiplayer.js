document.addEventListener("DOMContentLoaded", function () {
    const game = Chess();
    let playerColor = null;
    const statusElement = document.getElementById("status");
    const endgameMessage = document.getElementById("endgame-message");
    const backHomeBtn = document.getElementById("back-home-btn");

    const board = new Chessboard("chessboard", {
        position: "start",
        draggable: true,
        onDrop: onDropMultiplayer
    });

    if (backHomeBtn) {
        backHomeBtn.addEventListener("click", () => window.location.href = "/");
    }

    function updateStatus(isPlayerTurn) {
        if (game.game_over()) {
            const winner = game.turn() === "w" ? "black" : "white";
            endgameMessage.textContent = getResultMessage(winner);
            endgameMessage.style.display = "block";
            backHomeBtn.style.display = "inline-block";
            statusElement.textContent = "Partie terminée.";
        } else {
            statusElement.textContent = isPlayerTurn ? "À votre tour de jouer !" : "En attente de l'adversaire...";
        }
    }

    function getResultMessage(winner) {
        if (game.in_draw()) return "🤝 Match nul !";
        return ((winner === "white" && playerColor === "w") || (winner === "black" && playerColor === "b"))
            ? "🎉 Victoire !" : "😞 Défaite...";
    }

    function updateTurnStatus() {
        updateStatus(game.turn() === playerColor);
    }

    function onDropMultiplayer(source, target) {
        if (game.turn() !== playerColor) return false;

        const move = game.move({ from: source, to: target, promotion: "q" });
        if (!move) return false;

        board.setPosition(game.fen());
        updateTurnStatus();

        sendMessage({ type: "move", source, target });
        return true;
    }

    // --- WebSocket Multiplayer ---
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socketUrl = `${protocol}://${window.location.host}/ws/chess/`;
    let socket = new WebSocket(socketUrl);

    socket.onopen = () => sendMessage({ type: "join" });
    socket.onclose = reconnectWebSocket;
    socket.onerror = console.error;
    socket.onmessage = handleIncomingMessage;

    function sendMessage(data) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(data));
        }
    }

    function reconnectWebSocket() {
        socket = new WebSocket(socketUrl);
        socket.onopen = () => sendMessage({ type: "join" });
        socket.onmessage = handleIncomingMessage;
    }

    function handleIncomingMessage(event) {
        const data = JSON.parse(event.data);

        if (data.type === "assign_color") {
            playerColor = data.color;
            if (playerColor === "b") {
                document.getElementById("chessboard").style.transform = "rotate(180deg)";
                document.querySelectorAll(".square").forEach(sq => sq.style.transform = "rotate(180deg)");
            }
            updateTurnStatus();
        }

        if (data.type === "move") {
            const move = game.move({ from: data.source, to: data.target, promotion: "q" });
            if (move) {
                board.setPosition(game.fen());
                updateTurnStatus();
            }
        }
    }

    console.log("🔎 Échiquier multijoueur initialisé :", board);
});