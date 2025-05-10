import random
import string

class GameManager:
    def __init__(self):
        self.rooms = {}
    
    def generate_room_code(self):
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    def create_room(self, host_name):
        room_code = self.generate_room_code()
        while room_code in self.rooms:
            room_code = self.generate_room_code()
        
        self.rooms[room_code] = {
            'host': None,
            'players': [],
            'game_state': 'waiting',
            'impostor': None,
            'votes': {},
            'alive_players': []
        }
        
        return room_code
    
    def room_exists(self, room_code):
        return room_code in self.rooms
    
    def add_player(self, room_code, player_name, player_id):
        player = {
            'id': player_id,
            'name': player_name,
            'is_host': len(self.rooms[room_code]['players']) == 0,
            'is_alive': True
        }
        
        self.rooms[room_code]['players'].append(player)
        if player['is_host']:
            self.rooms[room_code]['host'] = player_id
    
    def get_host_sid(self, room_code):
        return self.rooms[room_code]['host']
    
    def get_players(self, room_code):
        return [{'id': p['id'], 'name': p['name']} for p in self.rooms[room_code]['players']]
    
    def get_alive_players(self, room_code):
        return [{'id': p['id'], 'name': p['name']} 
                for p in self.rooms[room_code]['players'] if p['is_alive']]
    
    def start_game(self, room_code):
        players = self.rooms[room_code]['players']
        self.rooms[room_code]['game_state'] = 'playing'
        self.rooms[room_code]['alive_players'] = [p['id'] for p in players]
        
        # Scegli un impostore casuale
        impostor = random.choice(players)
        self.rooms[room_code]['impostor'] = impostor
    
    def get_impostor(self, room_code):
        impostor_id = self.rooms[room_code]['impostor']['id']
        for p in self.rooms[room_code]['players']:
            if p['id'] == impostor_id:
                return p
        return None
    
    def add_vote(self, room_code, voter_id, voted_player_id):
        self.rooms[room_code]['votes'][voter_id] = voted_player_id
    
    def all_votes_in(self, room_code):
        alive_players = self.rooms[room_code]['alive_players']
        votes = self.rooms[room_code]['votes']
        
        # Controlla che tutti i giocatori vivi abbiano votato
        return all(player_id in votes for player_id in alive_players)
    
    def process_votes(self, room_code):
        votes = self.rooms[room_code]['votes']
        vote_count = {}
        
        for player_id, voted_id in votes.items():
            vote_count[voted_id] = vote_count.get(voted_id, 0) + 1
        
        # Trova il giocatore con più voti
        eliminated_id = max(vote_count.items(), key=lambda x: x[1])[0]
        
        # Elimina il giocatore
        for player in self.rooms[room_code]['players']:
            if player['id'] == eliminated_id:
                player['is_alive'] = False
                self.rooms[room_code]['alive_players'].remove(eliminated_id)
                return player
        
        return None
    
    def check_game_over(self, room_code):
        alive_players = self.rooms[room_code]['alive_players']
        impostor = self.rooms[room_code]['impostor']
        
        # L'impostore è stato eliminato o è l'ultimo rimasto
        return (impostor['id'] not in alive_players or 
                len(alive_players) <= 1)
    
    def get_winner(self, room_code):
        alive_players = self.rooms[room_code]['alive_players']
        impostor = self.rooms[room_code]['impostor']
        
        if impostor['id'] in alive_players:
            return {'name': impostor['name'], 'is_impostor': True}
        else:
            # Restituisce i nomi dei giocatori rimanenti
            winners = [p['name'] for p in self.rooms[room_code]['players'] 
                      if p['id'] in alive_players]
            return {'names': winners, 'is_impostor': False}
    
    def player_in_room(self, player_id, room_code):
        return any(p['id'] == player_id for p in self.rooms[room_code]['players'])
    
    def remove_player(self, player_id, room_code):
        self.rooms[room_code]['players'] = [
            p for p in self.rooms[room_code]['players'] if p['id'] != player_id
        ]
    
    def get_all_rooms(self):
        return list(self.rooms.keys())
