import random
import chess


def get_random_move(fen):
    board = chess.Board(fen)
    moves = list(board.legal_moves)
    if not moves:
        return None
    return random.choice(moves)
