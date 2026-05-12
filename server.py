from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import random
import string
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# Store rooms in memory (in production, use a database)
rooms = {}

def generate_room_code():
    """Generate a unique 6-character room code"""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if code not in rooms:
            return code

def determine_winner(choice1, choice2):
    """Determine the winner of a round"""
    if choice1 == choice2:
        return 'draw'

    wins = {
        'kő': 'olló',
        'papír': 'kő',
        'olló': 'papír'
    }

    if wins[choice1] == choice2:
        return 'player1'
    else:
        return 'player2'

@socketio.on('create_room')
def handle_create_room(data):
    player_name = data['player_name']
    game_type = data.get('game_type', '1v1')

    room_code = generate_room_code()

    rooms[room_code] = {
        'code': room_code,
        'host': player_name,
        'type': game_type,
        'created': datetime.now().isoformat(),
        'players': [{
            'name': player_name,
            'isHost': True,
            'sid': request.sid,
            'connected': True
        }],
        'scores': {'player1': 0, 'player2': 0},
        'choices': {'player1': None, 'player2': None},
        'current_round': 1,
        'status': 'waiting',
        'game_history': []
    }

    join_room(room_code)
    emit('room_created', {
        'room_code': room_code,
        'room_data': rooms[room_code]
    })

@socketio.on('join_room')
def handle_join_room(data):
    room_code = data['room_code'].upper()
    player_name = data['player_name']

    if room_code not in rooms:
        emit('error', {'message': 'Room not found'})
        return

    room = rooms[room_code]

    # Check if player is already in the room (reconnect case)
    existing_player_index = None
    for i, p in enumerate(room['players']):
        if p['name'] == player_name:
            existing_player_index = i
            break
    
    if existing_player_index is not None:
        # Player is reconnecting, just update their SID
        room['players'][existing_player_index]['sid'] = request.sid
        room['players'][existing_player_index]['connected'] = True
        join_room(room_code)
        emit('room_joined', {
            'room_data': room
        })
        return

    # New player joining
    if len(room['players']) >= 2:
        emit('error', {'message': 'Room is full'})
        return

    # Check if another player has the same name (only for new players)
    if any(p['name'] == player_name for p in room['players']):
        emit('error', {'message': 'Player name already taken'})
        return

    # Add player to room
    room['players'].append({
        'name': player_name,
        'isHost': False,
        'sid': request.sid,
        'connected': True
    })

    room['status'] = 'active'

    join_room(room_code)

    # Notify all players in the room
    emit('player_joined', {
        'player_name': player_name,
        'room_data': room
    }, room=room_code)

    # Send room data to the joining player
    emit('room_joined', {
        'room_data': room
    })

@socketio.on('make_choice')
def handle_make_choice(data):
    room_code = data['room_code']
    player_name = data['player_name']
    choice = data['choice']

    if room_code not in rooms:
        emit('error', {'message': 'Room not found'})
        return

    room = rooms[room_code]

    # Find player index
    player_index = None
    for i, player in enumerate(room['players']):
        if player['name'] == player_name:
            player_index = i + 1
            break

    if player_index is None:
        emit('error', {'message': 'Player not found in room'})
        return

    # Update choice
    room['choices'][f'player{player_index}'] = choice

    # Check if both players have made choices
    if room['choices']['player1'] and room['choices']['player2']:
        # Determine winner
        winner = determine_winner(room['choices']['player1'], room['choices']['player2'])

        # Update scores
        if winner == 'player1':
            room['scores']['player1'] += 1
        elif winner == 'player2':
            room['scores']['player2'] += 1

        # Add to game history
        room['game_history'].append({
            'round': room['current_round'],
            'choices': room['choices'].copy(),
            'winner': winner
        })

        # Reset choices for next round
        room['choices'] = {'player1': None, 'player2': None}
        room['current_round'] += 1

        # Check if game is over (for best of series)
        game_over = False
        if room['type'] == 'best_of_3':
            if room['scores']['player1'] == 2 or room['scores']['player2'] == 2:
                game_over = True
        elif room['type'] == 'best_of_5':
            if room['scores']['player1'] == 3 or room['scores']['player2'] == 3:
                game_over = True

        if game_over:
            room['status'] = 'finished'

        # Notify all players
        emit('round_result', {
            'choices': room['choices'],
            'scores': room['scores'],
            'winner': winner,
            'current_round': room['current_round'],
            'game_over': game_over,
            'room_data': room
        }, room=room_code)
    else:
        # Notify that choice was made
        emit('choice_made', {
            'player_name': player_name,
            'room_data': room
        }, room=room_code)

@socketio.on('disconnect')
def handle_disconnect():
    # Find the room this player was in and mark as disconnected
    for room_code, room in rooms.items():
        for player in room['players']:
            if player['sid'] == request.sid:
                player['connected'] = False
                emit('player_disconnected', {
                    'player_name': player['name']
                }, room=room_code)
                break

@socketio.on('reconnect_player')
def handle_reconnect(data):
    room_code = data['room_code']
    player_name = data['player_name']

    if room_code in rooms:
        room = rooms[room_code]
        for player in room['players']:
            if player['name'] == player_name:
                player['sid'] = request.sid
                player['connected'] = True
                join_room(room_code)
                emit('player_reconnected', {
                    'player_name': player_name,
                    'room_data': room
                }, room=room_code)
                emit('room_rejoined', {
                    'room_data': room
                })
                break

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)