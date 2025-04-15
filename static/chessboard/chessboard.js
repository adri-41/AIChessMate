class Chessboard {
    constructor(elementId, config) {
        this.injectStyles(); // Injecte le CSS ici

        this.element = document.getElementById(elementId);
        if (!this.element) {
            console.error(`Élément ${elementId} introuvable`);
            return;
        }

        this.position = config.position || 'start';
        this.draggable = config.draggable || false;
        this.onDrop = config.onDrop || function () {
        };
        this.pieces = {
            'r': 'bR.png', 'n': 'bN.png', 'b': 'bB.png', 'q': 'bQ.png', 'k': 'bK.png', 'p': 'bP.png',
            'R': 'wR.png', 'N': 'wN.png', 'B': 'wB.png', 'Q': 'wQ.png', 'K': 'wK.png', 'P': 'wP.png'
        };

        this.initBoard();
        this.enableDragging();

        if (this.position !== "start") {
            this.setPosition(this.position);
        }
    }

    injectStyles() {
        const style = document.createElement("style");
        style.textContent = `
            body {
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                min-height: 100vh;
                font-family: sans-serif;
            }

            .chessboard {
                width: 100%;
                max-width: 480px;
                aspect-ratio: 1 / 1;
                display: grid;
                grid-template-columns: repeat(8, 1fr);
                grid-template-rows: repeat(8, 1fr);
                border: 2px solid #333;
                margin: auto;
            }

            .square {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .piece {
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
                cursor: grab;
            }
        `;
        document.head.appendChild(style);
    }

    initBoard() {
        this.element.innerHTML = '';
        this.element.classList.add("chessboard");

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.dataset.row = row;
                square.dataset.col = col;

                if ((row + col) % 2 === 0) {
                    square.style.backgroundColor = "#f0d9b5";
                } else {
                    square.style.backgroundColor = "#b58863";
                }

                this.element.appendChild(square);
            }
        }

        if (this.position === 'start') {
            this.loadPosition(this.getStartFEN());
        }
    }

    enableDragging() {
        let draggedPiece = null;
        let startSquare = null;

        // 🖱 Drag & Drop - PC
        this.element.addEventListener("dragstart", (event) => {
            if (event.target.classList.contains("piece")) {
                draggedPiece = event.target;
                startSquare = event.target.parentElement;
                setTimeout(() => draggedPiece.style.display = "none", 0);
            }
        });

        this.element.addEventListener("dragover", (event) => {
            event.preventDefault();
        });

        this.element.addEventListener("drop", (event) => {
            event.preventDefault();
            if (!draggedPiece || !startSquare) return;

            let targetSquare = event.target.closest(".square");

            if (targetSquare && this.element.contains(targetSquare)) {
                const from = this.getSquareNotation(startSquare.dataset.row, startSquare.dataset.col);
                const to = this.getSquareNotation(targetSquare.dataset.row, targetSquare.dataset.col);

                const moveIsValid = this.onDrop(from, to);

                if (moveIsValid) {
                    // ✅ Réafficher la position correcte après mouvement
                    this.setPosition(game.fen());
                }
            }

            // 🔄 Réinitialisation
            if (draggedPiece) draggedPiece.style.display = "block";
            draggedPiece = null;
            startSquare = null;
        });

        // 📱 Touch support - Mobile
        let touchStartSquare = null;

        this.element.addEventListener("touchstart", (event) => {
            const touch = event.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && target.classList.contains("piece")) {
                touchStartSquare = target.parentElement;
                event.preventDefault();
            }
        }, {passive: false});

        this.element.addEventListener("touchend", (event) => {
            if (!touchStartSquare) return;

            const touch = event.changedTouches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetSquare = target?.closest(".square");

            if (targetSquare && this.element.contains(targetSquare)) {
                const from = this.getSquareNotation(
                    touchStartSquare.dataset.row,
                    touchStartSquare.dataset.col
                );
                const to = this.getSquareNotation(
                    targetSquare.dataset.row,
                    targetSquare.dataset.col
                );

                const moveIsValid = this.onDrop(from, to);

                if (moveIsValid) {
                    // ✅ Forcer la synchro visuelle après déplacement
                    this.setPosition(game.fen());
                }
            }

            touchStartSquare = null;
        }, {passive: false});
    }


    getInitialPiece(row, col) {
        const startPosition = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
        return startPosition[row][col];
    }

    getSquareNotation(row, col) {
        const files = "abcdefgh";
        return files[col] + (8 - row);
    }

    getStartFEN() {
        return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    }

    loadPosition(fen) {
        const rows = fen.split(' ')[0].split('/');
        const squares = this.element.querySelectorAll('.square');
        squares.forEach(sq => sq.innerHTML = '');

        for (let row = 0; row < 8; row++) {
            const fenRow = rows[row];
            let col = 0;
            for (let char of fenRow) {
                if (isNaN(char)) {
                    const pieceName = this.pieces[char];
                    if (pieceName) {
                        const img = document.createElement('img');
                        img.src = `/static/chessboard/img/${pieceName}`;
                        img.classList.add('piece');
                        img.draggable = this.draggable;
                        const index = row * 8 + col;
                        squares[index].appendChild(img);
                    }
                    col++;
                } else {
                    col += parseInt(char);
                }
            }
        }
    }

    setPosition(fen) {
        this.position = fen;
        this.loadPosition(fen);
    }

    clear() {
        const squares = this.element.querySelectorAll('.square');
        squares.forEach(sq => sq.innerHTML = '');
    }

    destroy() {
        this.element.innerHTML = '';
    }
}

window.Chessboard = Chessboard;