import chess
import math

# Valeurs classiques des pièces
piece_values = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 100
}

# Cases du centre : important à contrôler
central_squares = [chess.D4, chess.E4, chess.D5, chess.E5]


def evaluate_board(board: chess.Board):
    """
    Évalue l'état du plateau :
    - Valeur du matériel
    - Contrôle du centre
    - Roi sécurisé
    - Pièces vulnérables (non défendues ou attaquées)
    """
    score = 0

    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece:
            multiplier = 1 if piece.color == board.turn else -1
            value = piece_values.get(piece.piece_type, 0)

            score += value * multiplier

            # Contrôle du centre
            if square in central_squares:
                score += 0.3 * multiplier

            # Roi castlé : sécurité renforcée
            if piece.piece_type == chess.KING:
                if (piece.color == chess.WHITE and chess.square_rank(square) == 0) or \
                        (piece.color == chess.BLACK and chess.square_rank(square) == 7):
                    score += 0.5 * multiplier

            # Pénalité pour pièce non défendue
            attackers = board.attackers(piece.color, square)
            attacked_by_enemy = board.is_attacked_by(not piece.color, square)

            if not attackers and attacked_by_enemy:
                score -= 0.5 * multiplier  # pièce en danger
            elif attackers and attacked_by_enemy:
                score -= 0.1 * multiplier  # pièce échangée
            elif attackers and not attacked_by_enemy:
                score += 0.2 * multiplier  # pièce bien protégée
    print(score)
    return score


def minimax(board: chess.Board, depth, maximizing):
    """
    Algorithme Minimax simple :
    - sans élagage alpha-beta (plus lent mais plus simple à lire)
    """
    if depth == 0 or board.is_game_over():
        return evaluate_board(board), None

    best_move = None
    moves = list(board.legal_moves)

    if maximizing:
        max_eval = -math.inf
        for move in moves:
            board.push(move)
            eval_score, _ = minimax(board, depth - 1, False)
            board.pop()

            if eval_score > max_eval:
                max_eval = eval_score
                best_move = move

        return max_eval, best_move
    else:
        min_eval = math.inf
        for move in moves:
            board.push(move)
            eval_score, _ = minimax(board, depth - 1, True)
            board.pop()

            if eval_score < min_eval:
                min_eval = eval_score
                best_move = move

        return min_eval, best_move


def get_minimax_move(fen, depth=5):
    """
    Point d'entrée appelé depuis le backend Django.
    """
    board = chess.Board(fen)
    _, move = minimax(board, depth, board.turn)
    if move:
        return {
            "from": move.uci()[:2],
            "to": move.uci()[2:4]
        }
    return None
