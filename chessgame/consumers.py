import json
from channels.generic.websocket import AsyncWebsocketConsumer

from chessgame.ai.ai_random import get_random_move

waiting_players = []  # Liste des joueurs en attente


class MatchmakingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        # Retirer le joueur de la file d'attente s'il ferme la connexion
        if self in waiting_players:
            waiting_players.remove(self)

    async def receive(self, text_data, **kwargs):
        data = json.loads(text_data)

        if data["action"] == "search":
            if self in waiting_players:
                # Évite les doublons si le joueur clique plusieurs fois sur "Rechercher"
                return

            if waiting_players:
                opponent = waiting_players.pop(0)
                game_id = f"game_{id(self)}_{id(opponent)}"

                # Informer les deux joueurs qu'ils ont trouvés une partie
                await self.send(text_data=json.dumps({
                    "action": "match_found",
                    "game_id": game_id,
                    "role": "white"
                }))
                await opponent.send(text_data=json.dumps({
                    "action": "match_found",
                    "game_id": game_id,
                    "role": "black"
                }))
            else:
                waiting_players.append(self)
                await self.send(text_data=json.dumps({"action": "waiting"}))

        elif data["action"] == "leave_queue":
            if self in waiting_players:
                waiting_players.remove(self)
                await self.send(text_data=json.dumps({"action": "left_queue"}))


class ChessConsumer(AsyncWebsocketConsumer):
    players = {}

    async def connect(self):
        await self.accept()

        if len(self.players) % 2 == 0:
            self.players[self.channel_name] = "w"
        else:
            self.players[self.channel_name] = "b"

        await self.channel_layer.group_add("chess_game", self.channel_name)

        await self.send(text_data=json.dumps({
            "type": "assign_color",
            "color": self.players[self.channel_name]
        }))

        print(f"✅ Joueur {self.players[self.channel_name]} connecté !")

    async def disconnect(self, close_code):
        if self.channel_name in self.players:
            del self.players[self.channel_name]
        await self.channel_layer.group_discard("chess_game", self.channel_name)
        print("❌ Joueur déconnecté")

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data["type"] == "move":
            source = data["source"]
            target = data["target"]

            print(f"📡 Diffusion mouvement : {source} -> {target}")

            await self.channel_layer.group_send(
                "chess_game",
                {
                    "type": "broadcast_move",
                    "source": source,
                    "target": target
                }
            )

            # Partie contre une IA
            if "vs-bot" in self.scope["path"]:
                game_fen = data.get("fen")
                if game_fen:
                    move = get_random_move(game_fen)
                    if move:
                        await self.channel_layer.group_send(
                            "chess_game",
                            {
                                "type": "broadcast_move",
                                "source": move.uci()[:2],
                                "target": move.uci()[2:]
                            }
                        )

    async def broadcast_move(self, event):
        await self.send(text_data=json.dumps({
            "type": "move",
            "source": event["source"],
            "target": event["target"]
        }))
