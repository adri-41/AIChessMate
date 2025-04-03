class Chessboard {
    constructor(elementId, config) {
        this.element = document.getElementById(elementId);
        if (!this.element) {
            console.error(`Élément ${elementId} introuvable`);
            return;
        }

        this.position = config.position || 'start';
        this.draggable = config.draggable || false;
        this.onDrop = config.onDrop || function () {};

        this.pieces = {
            'r': 'bR.png', 'n': 'bN.png', 'b': 'bB.png', 'q': 'bQ.png', 'k': 'bK.png', 'p': 'bP.png',
            'R': 'wR.png', 'N': 'wN.png', 'B': 'wB.png', 'Q': 'wQ.png', 'K': 'wK.png', 'P': 'wP.png'
        };

        this.initBoard();
        this.enableDragging();
    }

    initBoard() {
        this.element.innerHTML = ''; // Vide le conteneur
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.dataset.row = i;
                square.dataset.col = j;

                if ((i + j) % 2 === 0) {
                    square.style.backgroundColor = "#f0d9b5"; // Case blanche
                } else {
                    square.style.backgroundColor = "#b58863"; // Case noire
                }

                const piece = this.getInitialPiece(i, j);
                if (piece) {
                    const img = document.createElement('img');
                    img.src = `/static/chessboard/img/${piece}`;
                    img.classList.add('piece');
                    img.draggable = true;
                    img.dataset.piece = piece;
                    square.appendChild(img);
                }

                this.element.appendChild(square);
            }
        }
    }

    enableDragging() {
        let draggedPiece = null;
        let startSquare = null;

        this.element.addEventListener("dragstart", (event) => {
            if (event.target.classList.contains("piece")) {
                draggedPiece = event.target;
                startSquare = event.target.parentElement;
                setTimeout(() => {
                    draggedPiece.style.display = "none";
                }, 0);
            }
        });

        this.element.addEventListener("dragover", (event) => {
            event.preventDefault();
        });

        this.element.addEventListener("drop", (event) => {
            event.preventDefault();
            if (!draggedPiece) return;

            let targetSquare = event.target;
            if (targetSquare.classList.contains("piece")) {
                targetSquare = targetSquare.parentElement;
            }

            if (targetSquare.classList.contains("square")) {
                // Vérifier si le mouvement est légal avec la fonction callback
                const moveIsValid = this.onDrop(
                    this.getSquareNotation(startSquare.dataset.row, startSquare.dataset.col),
                    this.getSquareNotation(targetSquare.dataset.row, targetSquare.dataset.col)
                );

                if (moveIsValid) {
                    targetSquare.innerHTML = "";
                    targetSquare.appendChild(draggedPiece);
                }
            }

            draggedPiece.style.display = "block";
            draggedPiece = null;
            startSquare = null;
        });
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

        return this.pieces[startPosition[row][col]];
    }

    getSquareNotation(row, col) {
        const files = "abcdefgh"; // Colonnes en notation échiquéenne
        return files[col] + (8 - row);
    }
}

// Expose Chessboard à window pour qu'il soit accessible globalement
window.Chessboard = Chessboard;
