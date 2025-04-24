document.addEventListener("DOMContentLoaded", function () {
    window.game = Chess();
    let playerColor = null;
    const statusElement = document.getElementById("status");
    const endgameMessage = document.getElementById("endgame-message");
    const backHomeBtn = document.getElementById("back-home-btn");
    const chessboardElement = document.getElementById("chessboard");

    let lastFromSquare = null;
    let lastToSquare = null;
    let kingInCheckSquare = null;

    let selectedSquare = null;
    let legalTargetSquares = [];

    injectStyles();

    const board = new Chessboard("chessboard", {
        position: "start",
        draggable: true,
        onDrop: onDropMultiplayer
    });

    if (backHomeBtn) {
        backHomeBtn.addEventListener("click", () => window.location.href = "/");
    }

    function injectStyles() {
        const style = document.createElement("style");
        style.textContent = `
            .promotion-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #f0d9b5;
                border: 2px solid #444;
                display: flex;
                gap: 10px;
                padding: 10px;
                z-index: 1000;
            }

            .promotion-overlay img {
                width: 50px;
                height: 50px;
                cursor: pointer;
            }

            .chessboard-wrapper {
                position: relative;
                display: inline-block;
            }

            .square {
                position: relative;
            }

            .square.legal-move::after {
                content: "";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: radial-gradient(rgba(20, 85, 30, 0.5) 19%, rgba(0, 0, 0, 0) 20%);
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);

        const wrapper = document.createElement("div");
        wrapper.classList.add("chessboard-wrapper");
        chessboardElement.parentNode.insertBefore(wrapper, chessboardElement);
        wrapper.appendChild(chessboardElement);

        setTimeout(() => {
            document.querySelectorAll(".square").forEach(sq => {
                sq.dataset.originalColor = window.getComputedStyle(sq).backgroundColor;
            });
        }, 100);
    }

    function showPromotionDialog(source, target) {
        const overlay = document.createElement("div");
        overlay.classList.add("promotion-overlay");

        ["q", "r", "b", "n"].forEach(type => {
            const img = document.createElement("img");
            img.src = `/static/chessboard/img/${playerColor === "w" ? "w" : "b"}${type.toUpperCase()}.png`;
            img.alt = type;
            img.onclick = () => {
                document.body.removeChild(overlay);
                const move = game.move({from: source, to: target, promotion: type});
                if (move) {
                    board.setPosition(game.fen());
                    highlightLastMove(source, target);
                    highlightKingInCheck();
                    updateTurnStatus();
                    clearHighlights();
                    sendMessage({type: "move", source, target});
                }
            };
            overlay.appendChild(img);
        });

        document.body.appendChild(overlay);
    }

    function onDropMultiplayer(source, target) {
        if (game.turn() !== playerColor) return false;
        const isPromotion = game.moves({verbose: true}).some(m => m.from === source && m.to === target && m.promotion);
        if (isPromotion) {
            showPromotionDialog(source, target);
            return;
        }
        const move = game.move({from: source, to: target, promotion: "q"});
        if (!move) return false;

        board.setPosition(game.fen());
        highlightLastMove(source, target);
        highlightKingInCheck();
        updateTurnStatus();
        clearHighlights();
        sendMessage({type: "move", source, target});
        return true;
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

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socketUrl = `${protocol}://${window.location.host}/ws/chess/`;
    let socket = new WebSocket(socketUrl);

    socket.onopen = () => sendMessage({type: "join"});
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
        socket.onopen = () => sendMessage({type: "join"});
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
            const move = game.move({from: data.source, to: data.target, promotion: "q"});
            if (move) {
                board.setPosition(game.fen());
                highlightLastMove(data.source, data.target);
                highlightKingInCheck();
                updateTurnStatus();
                clearHighlights();
            }
        }
    }

    function highlightLastMove(from, to) {
        if (lastFromSquare && lastFromSquare.dataset.originalColor) {
            lastFromSquare.style.background = lastFromSquare.dataset.originalColor;
        }
        if (lastToSquare && lastToSquare.dataset.originalColor) {
            lastToSquare.style.background = lastToSquare.dataset.originalColor;
        }

        lastFromSquare = getSquareElement(from);
        lastToSquare = getSquareElement(to);

        if (lastFromSquare && lastToSquare) {
            lastFromSquare.style.background = "rgba(155, 199, 0, 0.41)";
            lastToSquare.style.background = "rgba(155, 199, 0, 0.41)";
        }
    }

    function highlightKingInCheck() {
        if (kingInCheckSquare && kingInCheckSquare.dataset.originalColor) {
            kingInCheckSquare.style.background = kingInCheckSquare.dataset.originalColor;
            kingInCheckSquare = null;
        }

        if (!game.in_check()) return;

        const kingSquare = findKingSquare(game.turn());
        const square = getSquareElement(kingSquare);

        if (square) {
            kingInCheckSquare = square;
            square.style.background = "radial-gradient(ellipse at center, rgb(255, 0, 0) 0%, rgb(231, 0, 0) 25%, rgba(169, 0, 0, 0) 89%, rgba(158, 0, 0, 0) 100%)";
        }
    }

    function findKingSquare(color) {
        const fen = game.fen().split(" ")[0];
        const rows = fen.split("/");
        for (let i = 0; i < 8; i++) {
            let col = 0;
            for (let char of rows[i]) {
                if (isNaN(char)) {
                    if ((char === "k" && color === "b") || (char === "K" && color === "w")) {
                        return "abcdefgh"[col] + (8 - i);
                    }
                    col++;
                } else {
                    col += parseInt(char);
                }
            }
        }
        return null;
    }

    function getSquareElement(square) {
        const file = square[0];
        const rank = parseInt(square[1]);
        const col = file.charCodeAt(0) - 'a'.charCodeAt(0);
        const row = 8 - rank;
        return document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
    }

    function showLegalMoves(square) {
        clearHighlights();
        selectedSquare = square;
        const moves = game.moves({square, verbose: true});
        legalTargetSquares = moves.map(m => m.to);

        legalTargetSquares.forEach(to => {
            const el = getSquareElement(to);
            if (el) el.classList.add("legal-move");
        });
    }

    function clearHighlights() {
        document.querySelectorAll(".square.legal-move").forEach(sq => {
            sq.classList.remove("legal-move");
        });
        selectedSquare = null;
        legalTargetSquares = [];
    }

    // 🎯 Gestion clic utilisateur
    document.addEventListener("click", (e) => {
        const sq = e.target.closest(".square");
        if (!sq) return;

        const squareName = getSquareNotation(sq.dataset.row, sq.dataset.col);
        const piece = sq.querySelector(".piece");

        if (selectedSquare && legalTargetSquares.includes(squareName)) {
            onDropMultiplayer(selectedSquare, squareName);
            return;
        }

        if (!piece) {
            clearHighlights();
            return;
        }

        const imgSrc = piece.getAttribute("src");
        if (imgSrc.includes(`${playerColor.toLowerCase()}`) && game.turn() === playerColor) {
            showLegalMoves(squareName);
        } else {
            clearHighlights();
        }
    });

    function getSquareNotation(row, col) {
        const files = "abcdefgh";
        return files[col] + (8 - row);
    }

    updateStatus();
    console.log("🔗 Partie multijoueur initialisée !");
});
