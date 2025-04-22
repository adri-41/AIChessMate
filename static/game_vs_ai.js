document.addEventListener("DOMContentLoaded", function () {
    window.game = Chess();
    const playerColor = "w";
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

    function handleSquareClick(sq) {
        const pieceImg = sq.querySelector(".piece");
        const squareName = getSquareNotation(sq.dataset.row, sq.dataset.col);
        console.log("🟦 Case cliquée :", squareName);

        // Si on a déjà une case sélectionnée et qu'on clique sur une destination légale
        if (selectedSquare && legalTargetSquares.includes(squareName)) {
            console.log("➡️ Déplacement de", selectedSquare, "vers", squareName);
            makePlayerMove(selectedSquare, squareName, "q");
            return;
        }

        // Si la case est vide
        if (!pieceImg) {
            console.log("❌ Case vide, aucune pièce à sélectionner.");
            clearHighlights();
            return;
        }

        // Analyse du chemin de l'image pour détecter la couleur
        const src = pieceImg.src;
        const filename = src.split("/").pop(); // Ex: "wP.png"
        const colorCode = filename[0]; // "w" ou "b"
        console.log("🔍 Image détectée :", filename, "| Couleur :", colorCode);

        if (colorCode === "w" && game.turn() === "w") {
            console.log("✅ Pièce blanche sélectionnée sur", squareName);
            showLegalMoves(squareName);
        } else {
            console.log("❌ Clic ignoré : pas une pièce blanche ou pas notre tour.");
            clearHighlights();
        }
    }


    function showLegalMoves(square) {
        clearHighlights();
        selectedSquare = square;
        const moves = game.moves({square, verbose: true});
        legalTargetSquares = moves.map(m => m.to);

        console.log("✅ Coups légaux depuis", square, ":", legalTargetSquares);

        legalTargetSquares.forEach(to => {
            const squareEl = getSquareElement(to);
            if (squareEl) {
                squareEl.classList.add("legal-move");
            }
        });
    }

    function clearHighlights() {
        document.querySelectorAll(".square.legal-move").forEach(sq => {
            sq.classList.remove("legal-move");
        });
        selectedSquare = null;
        legalTargetSquares = [];
    }

    function getSquareNotation(row, col) {
        const files = "abcdefgh";
        return files[col] + (8 - row);
    }

    function updateStatus() {
        if (game.game_over()) {
            let message = "Partie terminée.";
            if (game.in_draw()) message = "🤝 Match nul !";
            else if (game.in_checkmate()) {
                const winner = game.turn() === "w" ? "noirs" : "blancs";
                message = winner === "blancs" ? "🎉 Victoire !" : "😞 Défaite...";
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

    function makePlayerMove(from, to, promotion) {
        console.log("🎯 Tentative de déplacement de", from, "vers", to);
        const move = game.move({from, to, promotion});
        if (!move) {
            console.log("❌ Mouvement invalide");
            return false;
        }

        board.setPosition(game.fen());
        highlightLastMove(from, to);
        highlightKingInCheck();
        updateStatus();
        clearHighlights();

        if (!game.game_over()) {
            setTimeout(makeRandomAIMove, 500);
        }
        return true;
    }

    function makeRandomAIMove() {
        if (game.game_over()) return;
        const moves = game.moves({verbose: true});
        const move = moves[Math.floor(Math.random() * moves.length)];

        game.move(move);
        board.setPosition(game.fen());
        highlightLastMove(move.from, move.to);
        highlightKingInCheck();
        updateStatus();
    }

    function showPromotionDialog(from, to) {
        const overlay = document.createElement("div");
        overlay.classList.add("promotion-overlay");

        ["q", "r", "b", "n"].forEach(type => {
            const img = document.createElement("img");
            img.src = `/static/chessboard/img/w${type.toUpperCase()}.png`;
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

    updateStatus();
    console.log("🤖 Partie contre IA initialisée :", board);
});
