document.addEventListener("DOMContentLoaded", function () {
    const game = new Chess();
    let socket = new WebSocket("ws://localhost:8000/ws/chess/");
    let playerColor = null;  // Définira la couleur du joueur (`w` ou `b`)

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
        socket = new WebSocket("ws://localhost:8000/ws/chess/");

        socket.onopen = () => {
            console.log("✅ Reconnecté au WebSocket !");
            sendMessage({ type: "join" });  // Demander la couleur au serveur
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
                return;
            }

            if (data.type === "move") {
                console.log("♟️ Mouvement reçu :", data.source, "->", data.target);

                // Vérifier si c'est bien le tour de l'adversaire
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
                    console.log("🖥️ Mise à jour de l'échiquier FEN :", game.fen());

                    // Correction ici : Utilisation de `setPosition`
                    if (typeof board.setPosition === "function") {
                        board.position(game.fen());
                    } else {
                        console.error("❌ Erreur : board.setPosition n'est pas défini !");
                    }
                } else {
                    console.warn("⚠️ Mouvement invalide reçu :", data);
                }
            }
        } catch (error) {
            console.error("❌ Erreur lors du traitement du message WebSocket :", error);
        }
    }

    const board = new window.Chessboard("chessboard", {
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

            return true;
        }
    });

    console.log("🔎 board initialisé :", board);

    socket.onopen = () => {
        console.log("✅ Connexion WebSocket établie !");
        sendMessage({ type: "join" });  // Demander la couleur au serveur
    };
    socket.onerror = (error) => console.error("❌ Erreur WebSocket :", error);
    socket.onclose = reconnectWebSocket;
    socket.onmessage = handleIncomingMessage;
});