from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from game_logic import GameManager
import random
import os

app = Flask(__name__, template_folder='../client')
app.config['SECRET_KEY'] = os.urandom(24)
socketio = SocketIO(app, cors_allowed_origins="*")

games = GameManager()

@socketio.on('create_room')
def handle_create_room(data):
    room_code = games.create_room(data['host_name'])
    emit('room_created', {'room_code': room_code}, room=request.sid)

@socketio.on('join_room')
def handle_join_room(data):
    room_code = data['room_code']
    player_name = data['player_name']
    
    if not games.room_exists(room_code):
        emit('error', {'message': 'Room does not exist'})
        return
    
    player_id = request.sid
    games.add_player(room_code, player_name, player_id)
    emit('player_joined', {'player_name': player_name}, room=games.get_host_sid(room_code))
    emit('welcome', {
        'players': games.get_players(room_code),
        'is_host': False
    }, room=player_id)

@socketio.on('start_game')
def handle_start_game(data):
    room_code = data['room_code']
    if not games.room_exists(room_code):
        emit('error', {'message': 'Room does not exist'})
        return
    
    games.start_game(room_code)
    impostor = games.get_impostor(room_code)
    
    # Invia a tutti la stessa canzone tranne all'impostore
    for player in games.get_players(room_code):
        if player['id'] == impostor['id']:
            emit('play_song', {'song': 'impostor_song.mp3'}, room=player['id'])
        else:
            emit('play_song', {'song': 'normal_song.mp3'}, room=player['id'])
    
    # Avvia il timer per la votazione
    socketio.sleep(30)
    emit('start_voting', {'players': games.get_alive_players(room_code)}, room=room_code)

@socketio.on('submit_vote')
def handle_submit_vote(data):
    room_code = data['room_code']
    voter_id = request.sid
    voted_player_id = data['voted_player_id']
    
    games.add_vote(room_code, voter_id, voted_player_id)
    
    if games.all_votes_in(room_code):
        eliminated_player = games.process_votes(room_code)
        emit('vote_result', {
            'eliminated_player': eliminated_player['name'],
            'was_impostor': eliminated_player['id'] == games.get_impostor(room_code)['id']
        }, room=room_code)
        
        if games.check_game_over(room_code):
            winner = games.get_winner(room_code)
            emit('game_over', {'winner': winner}, room=room_code)
        else:
            # Inizia un nuovo round
            socketio.sleep(5)
            handle_start_game({'room_code': room_code})

@socketio.on('disconnect')
def handle_disconnect():
    for room_code in games.get_all_rooms():
        if games.player_in_room(request.sid, room_code):
            games.remove_player(request.sid, room_code)
            emit('player_left', {'player_id': request.sid}, room=games.get_host_sid(room_code))
            break

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
