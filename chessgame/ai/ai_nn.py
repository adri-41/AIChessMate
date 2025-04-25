import torch
import torch.nn as nn
import torch.nn.functional as f
import chess
import numpy as np


class SimpleChessNN(nn.Module):
    def __init__(self):
        super(SimpleChessNN, self).__init__()
        self.fc1 = nn.Linear(773, 256)
        self.fc2 = nn.Linear(256, 128)
        self.fc3 = nn.Linear(128, 1)

    def forward(self, x):
        x = f.relu(self.fc1(x))
        x = f.relu(self.fc2(x))
        return torch.tanh(self.fc3(x))


def board_to_tensor(board: chess.Board) -> torch.Tensor:
    tensor = np.zeros((64, 12), dtype=np.float32)
    for square, piece in board.piece_map().items():
        idx = piece.piece_type - 1 + (6 if not piece.color else 0)
        tensor[square][idx] = 1.0

    extras = np.array([
        float(board.turn),
        float(board.has_kingside_castling_rights(chess.WHITE)),
        float(board.has_queenside_castling_rights(chess.WHITE)),
        float(board.has_kingside_castling_rights(chess.BLACK)),
        float(board.has_queenside_castling_rights(chess.BLACK))
    ], dtype=np.float32)

    flat_tensor = np.concatenate([tensor.flatten(), extras])
    return torch.tensor(flat_tensor)


def nn_minimax(board, depth, model, maximizing):
    if depth == 0 or board.is_game_over():
        with torch.no_grad():
            score = model(board_to_tensor(board))
        return score.item(), None

    best_move = None
    best_score = -float("inf") if maximizing else float("inf")

    for move in board.legal_moves:
        board.push(move)
        score, _ = nn_minimax(board, depth - 1, model, not maximizing)
        board.pop()

        if maximizing and score > best_score:
            best_score = score
            best_move = move
        elif not maximizing and score < best_score:
            best_score = score
            best_move = move

    return best_score, best_move


def simulate_self_play_game(model, depth=1, max_moves=100):
    board = chess.Board()
    move_count = 0

    while not board.is_game_over() and move_count < max_moves:
        maximizing = board.turn
        _, move = nn_minimax(board, depth, model, maximizing)
        if move is None:
            break
        board.push(move)
        move_count += 1

    return board.result()  # ex: "1-0", "0-1", "1/2-1/2"


def self_play(model, num_games=10, depth=1):
    results = {"1-0": 0, "0-1": 0, "1/2-1/2": 0}
    for i in range(num_games):
        print(f"🎮 Partie {i+1}/{num_games}...")
        result = simulate_self_play_game(model, depth)
        results[result] += 1
    return results


if __name__ == "__main__":
    model = SimpleChessNN()
    results = self_play(model, num_games=10, depth=1)
    print("\n📊 Résultats des parties auto-jouées :")
    for k, v in results.items():
        print(f"{k} : {v}")
