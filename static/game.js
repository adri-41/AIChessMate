document.addEventListener("DOMContentLoaded", function () {
    const game = Chess();
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socketUrl = `${protocol}://${window.location.host}/ws/chess/`;
    let socket = new WebSocket(socketUrl);
    let playerColor = null;

    const statusElement = document.getElementById("status");
    const endgameMessage = document.getElementById("endgame-message");
    const backHomeBtn = document.getElementById("back-home-btn");

    if (!statusElement || !endgameMessage || !backHomeBtn) {
        console.warn("⚠️ Un ou plusieurs éléments HTML manquent.");
        return;
    }

    if (backHomeBtn) {
        backHomeBtn.addEventListener("click", () => {
            window.location.href = "/"; // Redirige vers la page d'accueil
        });
    }

    function updateStatus(isPlayerTurn) {

        if (!statusElement) return;

        if (game.game_over()) {
            const winner = game.turn() === "w" ? "black" : "white";
            endgameMessage.textContent = getResultMessage(winner);
            endgameMessage.style.display = "block";
            backHomeBtn.style.display = "inline-block";
            statusElement.textContent = "Partie terminée.";
        } else {
            if (isPlayerTurn) {
                statusElement.textContent = "À votre tour de jouer !";
            } else {
                statusElement.textContent = "En attente de l'adversaire...";
            }
        }
    }

    function getResultMessage(winner) {
        if (game.in_draw()) {
            return "🤝 Match nul !";
        } else if ((winner === "white" && playerColor === "w") || (winner === "black" && playerColor === "b")) {
            return "🎉 Victoire !";
        } else {
            return "😞 Défaite...";
        }
    }

    function updateTurnStatus() {
        if (playerColor) {
            const isPlayerTurn = game.turn() === playerColor;
            updateStatus(isPlayerTurn);
        }
    }

    function sendMessage(data) {
        if (socket.readyState === WebSocket.OPEN) {
            console.log("📤 Envoi du message WebSocket :", data);
            socket.send(JSON.stringify(data));
        } else {
            console.warn("⚠️ WebSocket fermé, tentative de reconnexion...");
            reconnectWebSocket();
        }
    }

    function reconnectWebSocket() {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) return;

        console.log("🔄 Tentative de reconnexion WebSocket...");

        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const socketUrl = `${protocol}://${window.location.host}/ws/chess/`;
        socket = new WebSocket(socketUrl);

        socket.onopen = () => {
            console.log("✅ Reconnecté au WebSocket !");
            sendMessage({type: "join"});
        };
        socket.onerror = (error) => console.error("❌ Erreur WebSocket :", error);
        socket.onclose = () => console.warn("⚠️ Connexion WebSocket fermée.");
        socket.onmessage = handleIncomingMessage;
    }

    function handleIncomingMessage(event) {
        console.log("📩 Message WebSocket brut reçu :", event);
        try {
            const data = JSON.parse(event.data);
            console.log("📩 Message WebSocket JSON reçu :", data);

            if (data.type === "assign_color") {
                playerColor = data.color;
                console.log("🎨 Couleur assignée :", playerColor);

                // 🔄 Rotation de l’échiquier pour les noirs
                if (playerColor === "b") {
                    document.getElementById("chessboard").style.transform = "rotate(180deg)";
                    document.querySelectorAll(".square").forEach(square => {
                        square.style.transform = "rotate(180deg)";
                    });
                }

                updateTurnStatus();
                return;
            }


            if (data.type === "move") {
                console.log("♟️ Mouvement reçu :", data.source, "->", data.target);

                if (game.turn() === playerColor) {
                    console.warn("⚠️ Mouvement reçu alors que ce n'est pas mon tour !");
                    return;
                }

                const move = game.move({
                    from: data.source,
                    to: data.target,
                    promotion: "q"
                });

                if (move !== null) {
                    board.setPosition(game.fen());
                    updateTurnStatus();
                } else {
                    console.warn("⚠️ Mouvement invalide reçu :", data);
                }
            }
        } catch (error) {
            console.error("❌ Erreur lors du traitement du message WebSocket :", error);
        }
    }

    const board = new Chessboard("chessboard", {
        position: "start",
        draggable: true,
        onDrop: function (source, target) {
            if (game.turn() !== playerColor) {
                console.warn("⛔ Ce n'est pas ton tour !");
                return false;
            }

            const move = game.move({
                from: source,
                to: target,
                promotion: "q"
            });

            if (move === null) {
                console.log("⛔ Mouvement illégal :", source, "->", target);
                return false;
            }

            console.log("✅ Mouvement joué :", move);

            sendMessage({
                type: "move",
                source: source,
                target: target
            });

            updateTurnStatus();
            return true;
        }
    });

    console.log("🔎 board initialisé :", board);

    socket.onopen = () => {
        console.log("✅ Connexion WebSocket établie !");
        sendMessage({type: "join"});
    };
    socket.onerror = (error) => console.error("❌ Erreur WebSocket :", error);
    socket.onclose = reconnectWebSocket;
    socket.onmessage = handleIncomingMessage;
});
