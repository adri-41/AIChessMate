document.addEventListener("DOMContentLoaded", function () {
    window.game = Chess();

    const aiMode = document.getElementById("chessboard").dataset.aiMode || "random";

    const playerColor = Math.random() < 0.5 ? "w" : "b";
    const statusElement = document.getElementById("status");
    const endgameMessage = document.getElementById("endgame-message");
    const backHomeBtn = document.getElementById("back-home-btn");

    let pendingPromotion = null;
    let lastFromSquare = null;
    let lastToSquare = null;
    let kingInCheckSquare = null;
    let selectedSquare = null;
    let legalTargetSquares = [];

    injectStyles();

    const board = new Chessboard("chessboard", {
        position: "start",
        draggable: true,
        onDrop: onDropAI
    });

    if (playerColor === "b") {
        setTimeout(() => {
            if (aiMode === "minimax") {
                makeMinimaxMove();
            } else {
                makeRandomAIMove();
            }
        }, 500);

        document.getElementById("chessboard").style.transform = "rotate(180deg)";
        document.querySelectorAll(".square").forEach(sq => sq.style.transform = "rotate(180deg)");
    }


    if (backHomeBtn) {
        backHomeBtn.addEventListener("click", () => window.location.href = "/");
    }

    /**
     * Injecte dynamiquement les styles CSS (ronds, overlay promotion, etc.)
     */
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
                box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
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
                transform: translate(-50%, -50%); /* ✅ Centre le rond dans la case */
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
        const chessboard = document.getElementById("chessboard");
        chessboard.parentNode.insertBefore(wrapper, chessboard);
        wrapper.appendChild(chessboard);

        setTimeout(() => {
            document.querySelectorAll(".square").forEach(sq => {
                sq.dataset.originalColor = window.getComputedStyle(sq).backgroundColor;
                sq.addEventListener("click", () => handleSquareClick(sq));
            });
            console.log("✅ Écouteurs de clic ajoutés aux cases.");
        }, 500);
    }

    /**
     * Gère le clic sur une case : sélection de pièce ou déplacement
     */
    function handleSquareClick(sq) {
        const squareName = getSquareNotation(sq.dataset.row, sq.dataset.col);
        console.log("🟦 Case cliquée :", squareName);

        // 🟢 Si une case est déjà sélectionnée et le clic est une destination valide
        if (selectedSquare && legalTargetSquares.includes(squareName)) {
            console.log("➡️ Tentative de déplacement de", selectedSquare, "vers", squareName);

            // Obtenir tous les coups légaux de la case sélectionnée
            const possibleMoves = game.moves({square: selectedSquare, verbose: true});
            const promotionMove = possibleMoves.find(m =>
                m.from === selectedSquare && m.to === squareName && m.promotion
            );

            if (promotionMove) {
                console.log("♕ Promotion détectée !");
                pendingPromotion = {from: selectedSquare, to: squareName};
                showPromotionDialog(selectedSquare, squareName);
            } else {
                makePlayerMove(selectedSquare, squareName, "q");
            }

            return;
        }

        // ❌ Si on clique sur une case vide
        const pieceImg = sq.querySelector(".piece");
        if (!pieceImg) {
            console.log("📭 Case vide cliquée, on annule la sélection");
            clearHighlights();
            return;
        }

        // 🔍 Identifier la couleur
        const filename = pieceImg.src.split("/").pop();
        const colorCode = filename[0];

        if (colorCode === playerColor && game.turn() === playerColor) {
            console.log("🎯 Pièce sélectionnée :", squareName);
            showLegalMoves(squareName);
        } else {
            console.log("🚫 Mauvaise pièce ou pas ton tour.");
            clearHighlights();
        }
    }


    /**
     * Affiche les coups légaux sous forme de ronds
     */
    function showLegalMoves(square) {
        clearHighlights();
        selectedSquare = square;
        const moves = game.moves({square, verbose: true});
        legalTargetSquares = moves.map(m => m.to);

        legalTargetSquares.forEach(to => {
            const squareEl = getSquareElement(to);
            if (squareEl) squareEl.classList.add("legal-move");
        });
    }

    /**
     * Supprime les ronds et la sélection
     */
    function clearHighlights() {
        document.querySelectorAll(".square.legal-move").forEach(sq => {
            sq.classList.remove("legal-move");
        });
        selectedSquare = null;
        legalTargetSquares = [];
    }

    /**
     * Appelé quand une pièce est déplacée avec la souris
     */
    function onDropAI(source, target) {
        if (game.turn() !== playerColor) return false;

        const moves = game.moves({verbose: true});
        const isPromotion = moves.some(m => m.from === source && m.to === target && m.promotion);
        if (isPromotion) {
            pendingPromotion = {from: source, to: target};
            showPromotionDialog(source, target);
            return false;
        }

        return makePlayerMove(source, target, "q");
    }

    /**
     * Joue un coup du joueur, met à jour l'affichage, puis appelle l'IA
     */
    function makePlayerMove(from, to, promotion) {
        // Si on attend une promotion, ne pas faire de mouvement tant qu’elle n’est pas sélectionnée
        if (pendingPromotion && (from !== pendingPromotion.from || to !== pendingPromotion.to)) {
            return false;
        }

        const move = game.move({from, to, promotion});
        if (!move) return false;

        pendingPromotion = null;  // 🧹 On réinitialise le statut de promotion
        board.setPosition(game.fen());
        highlightLastMove(from, to);
        highlightKingInCheck();
        updateStatus();
        clearHighlights();

        if (!game.game_over()) {
            setTimeout(() => {
                if (aiMode === "minimax") {
                    makeMinimaxMove();
                } else {
                    makeRandomAIMove();
                }
            }, 500);
        }
        return true;
    }


    /**
     * Appelle le backend Python pour générer un coup aléatoire
     */
    async function makeRandomAIMove() {
        if (game.game_over()) return;

        try {
            const response = await fetch("/api/random-ai-move/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken()
                },
                body: JSON.stringify({fen: game.fen()})
            });

            const data = await response.json();
            if (data.from && data.to) {
                game.move({from: data.from, to: data.to, promotion: "q"});
                board.setPosition(game.fen());
                highlightLastMove(data.from, data.to);
                highlightKingInCheck();
                updateStatus();
            }
        } catch (error) {
            console.error("Erreur IA Python :", error);
        }
    }

    /**
     * Appelle le backend Python pour que l'ia joue
     */
    async function makeMinimaxMove() {
        if (game.game_over()) return;

        try {
            const response = await fetch("/api/minimax-ai-move/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken()
                },
                body: JSON.stringify({fen: game.fen()})
            });

            const data = await response.json();
            if (data.from && data.to) {
                game.move({from: data.from, to: data.to, promotion: "q"});
                board.setPosition(game.fen());
                highlightLastMove(data.from, data.to);
                highlightKingInCheck();
                updateStatus();
            }
        } catch (err) {
            console.error("Erreur IA Minimax :", err);
        }
    }

    /**
     * Affiche un menu pour choisir la pièce en cas de promotion
     */
    function showPromotionDialog(from, to) {
        const overlay = document.createElement("div");
        overlay.classList.add("promotion-overlay");

        ["q", "r", "b", "n"].forEach(type => {
            const img = document.createElement("img");
            img.src = `/static/chessboard/img/${playerColor}${type.toUpperCase()}.png`;
            img.alt = type;
            img.onclick = () => {
                makePlayerMove(from, to, type);
                document.body.removeChild(overlay);
                pendingPromotion = null;
            };
            overlay.appendChild(img);
        });

        document.body.appendChild(overlay);
    }

    /**
     * Met à jour le texte de statut (victoire, tour, échec, etc.)
     */
    function updateStatus() {
        if (game.game_over()) {
            let message = "Partie terminée.";
            if (game.in_draw()) {
                message = "🤝 Match nul !";
            } else if (game.in_checkmate()) {
                const loser = game.turn();
                const winner = loser === "w" ? "b" : "w";
                message = (winner === playerColor) ? "🎉 Victoire !" : "😞 Défaite...";
            }

            statusElement.textContent = "Partie terminée.";
            endgameMessage.textContent = message;
            endgameMessage.style.display = "block";
            backHomeBtn.style.display = "inline-block";
        } else {
            statusElement.textContent = game.turn() === playerColor
                ? "À votre tour de jouer !" : "L’IA réfléchit...";
        }
    }

    /**
     * Surligne les deux dernières cases du dernier coup
     */
    function highlightLastMove(from, to) {
        if (lastFromSquare && lastFromSquare.dataset.originalColor)
            lastFromSquare.style.background = lastFromSquare.dataset.originalColor;
        if (lastToSquare && lastToSquare.dataset.originalColor)
            lastToSquare.style.background = lastToSquare.dataset.originalColor;

        lastFromSquare = getSquareElement(from);
        lastToSquare = getSquareElement(to);

        if (lastFromSquare && lastToSquare) {
            lastFromSquare.style.background = "rgba(155, 199, 0, 0.41)";
            lastToSquare.style.background = "rgba(155, 199, 0, 0.41)";
        }
    }

    /**
     * Surligne la case du roi si en échec
     */
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

    /**
     * Trouve la case du roi pour la couleur donnée
     */
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

    /**
     * Renvoie l’élément DOM d’une case à partir du nom (ex: "e4")
     */
    function getSquareElement(square) {
        const file = square[0];
        const rank = parseInt(square[1]);
        const col = file.charCodeAt(0) - 'a'.charCodeAt(0);
        const row = 8 - rank;
        return document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
    }

    /**
     * Convertit ligne + colonne vers notation e4
     */
    function getSquareNotation(row, col) {
        const files = "abcdefgh";
        return files[col] + (8 - row);
    }

    /**
     * Récupère le token CSRF depuis les cookies (nécessaire pour Django)
     */
    function getCSRFToken() {
        const name = "csrftoken";
        const cookies = document.cookie.split(';');
        for (let c of cookies) {
            const [key, value] = c.trim().split('=');
            if (key === name) return decodeURIComponent(value);
        }
        return null;
    }

    updateStatus();
    console.log("🤖 Partie contre IA initialisée :", board);
});
