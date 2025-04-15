document.addEventListener("DOMContentLoaded", function () {
    const game = Chess();
    const playerColor = "w";
    const statusElement = document.getElementById("status");
    const endgameMessage = document.getElementById("endgame-message");
    const backHomeBtn = document.getElementById("back-home-btn");

    const board = new Chessboard("chessboard", {
        position: "start",
        draggable: true,
        onDrop: onDropAI
    });

    if (backHomeBtn) {
        backHomeBtn.addEventListener("click", () => window.location.href = "/");
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

        const move = game.move({ from: source, to: target, promotion: "q" });
        if (!move) return false;

        board.setPosition(game.fen());
        updateStatus();

        setTimeout(makeRandomAIMove, 500);
        return true;
    }

    function makeRandomAIMove() {
        if (game.game_over()) return;

        const moves = game.moves();
        const move = moves[Math.floor(Math.random() * moves.length)];
        game.move(move);
        board.setPosition(game.fen());
        updateStatus();
    }

    updateStatus();
    console.log("🤖 Partie contre IA initialisée :", board);
});
