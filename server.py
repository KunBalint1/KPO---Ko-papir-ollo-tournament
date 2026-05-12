from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms as socketio_rooms
import random
import string
from datetime import datetime
import json
import os
import socket as pysocket
from threading import Lock

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    ping_timeout=60,
    ping_interval=25,
    transports=['polling', 'websocket']
)

# Store rooms in memory (in production, use a database)
rooms = {}
sessions = {}  # Store session data
rooms_lock = Lock()  # Lock for thread-safe room operations
LEADERBOARD_FILE = 'leaderboard.json'

def load_leaderboard():
    """Load leaderboard from JSON file"""
    if os.path.exists(LEADERBOARD_FILE):
        try:
            with open(LEADERBOARD_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_leaderboard(leaderboard):
    """Save leaderboard to JSON file"""
    with open(LEADERBOARD_FILE, 'w') as f:
        json.dump(leaderboard, f, indent=2)

def get_lan_ip():
    """Get best-effort LAN IP address of this host."""
    test_socket = pysocket.socket(pysocket.AF_INET, pysocket.SOCK_DGRAM)
    try:
        # No outbound traffic is required; connect is used for interface discovery.
        test_socket.connect(('8.8.8.8', 80))
        return test_socket.getsockname()[0]
    except Exception:
        try:
            return pysocket.gethostbyname(pysocket.gethostname())
        except Exception:
            return '127.0.0.1'
    finally:
        test_socket.close()

def normalize_room_identifier(room_code):
    """Normalize a room identifier to a plain host IP string."""
    if not room_code:
        return ''

    value = str(room_code).strip()
    value = value.replace('http://', '').replace('https://', '')
    value = value.split('/')[0]
    if ':' in value:
        value = value.split(':', 1)[0]
    if value in ('localhost', '127.0.0.1', '::1'):
        value = get_lan_ip()
    return value

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
    try:
        player_name = data.get('player_name', '').strip()
        game_type = data.get('game_type', '1v1')

        if not player_name:
            emit('error', {'message': 'Játékos neve hiányzik'})
            return

        requested_identifier = normalize_room_identifier(data.get('room_identifier', ''))
        room_code = requested_identifier or get_lan_ip()

        with rooms_lock:
            # Check if room already exists
            if room_code in rooms:
                emit('error', {'message': f'Szoba már létezik ezzel az IP-vel: {room_code}'})
                return

            rooms[room_code] = {
                'code': room_code,
                'host': player_name,
                'host_ip': room_code,
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
        
        print(f"✓ Szoba létrehozva: {room_code} (host: {player_name})")
        
        emit('room_created', {
            'room_code': room_code,
            'room_data': rooms[room_code]
        })
        
    except Exception as e:
        print(f"✗ Hiba szoba létrehozásakor: {e}")
        emit('error', {'message': f'Szoba létrehozási hiba: {str(e)}'})

@socketio.on('join_room')
def handle_join_room(data):
    try:
        room_code = normalize_room_identifier(data.get('room_code', ''))
        player_name = data.get('player_name', '').strip()

        if not room_code or not player_name:
            emit('error', {'message': 'Szoba kódja vagy játékos neve hiányzik'})
            return

        with rooms_lock:
            if room_code not in rooms:
                print(f"✗ Szoba nem talált: {room_code} (elérhető: {list(rooms.keys())})")
                emit('error', {'message': f'Szoba nem talált: {room_code}'})
                return

            room = rooms[room_code]

            # Check if player is already in the room (reconnect case)
            existing_player_index = None
            for i, p in enumerate(room['players']):
                if p['name'] == player_name:
                    existing_player_index = i
                    break
            
            if existing_player_index is not None:
                # Player is reconnecting
                room['players'][existing_player_index]['sid'] = request.sid
                room['players'][existing_player_index]['connected'] = True
                join_room(room_code)
                print(f"✓ Játékos újracsatlakoztat: {player_name} -> {room_code}")
                emit('room_joined', {
                    'room_data': room
                })
                return

            # New player joining
            if len(room['players']) >= 2:
                print(f"✗ Szoba megtelt: {room_code}")
                emit('error', {'message': 'Szoba megtelt (max. 2 játékos)'})
                return

            # Check if another player has the same name (only for new players)
            if any(p['name'] == player_name for p in room['players']):
                print(f"✗ Név már foglalt: {player_name}")
                emit('error', {'message': 'Ez a játékos név már foglalt a szobában'})
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

        print(f"✓ Játékos csatlakoztat: {player_name} -> {room_code}")
        
        # Notify all players in the room
        socketio.emit('player_joined', {
            'player_name': player_name,
            'room_data': room
        }, room=room_code)

        # Send room data to the joining player
        emit('room_joined', {
            'room_data': room
        })
        
    except Exception as e:
        print(f"✗ Hiba szobához való csatlakozáskor: {e}")
        emit('error', {'message': f'Csatlakozási hiba: {str(e)}'})

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
    """Handle player disconnection"""
    try:
        with rooms_lock:
            for room_code, room in list(rooms.items()):
                for player in room['players']:
                    if player['sid'] == request.sid:
                        player['connected'] = False
                        print(f"✓ Játékos lecsatlakoztat: {player['name']} -> {room_code}")
                        socketio.emit('player_disconnected', {
                            'player_name': player['name']
                        }, room=room_code)
                        break
    except Exception as e:
        print(f"✗ Hiba lecsatlakozáskor: {e}")

@socketio.on('reconnect_player')
def handle_reconnect(data):
    """Handle player reconnection"""
    try:
        room_code = normalize_room_identifier(data.get('room_code', ''))
        player_name = data.get('player_name', '').strip()

        if not room_code or not player_name:
            emit('error', {'message': 'Szoba kódja vagy játékos neve hiányzik'})
            return

        with rooms_lock:
            if room_code not in rooms:
                emit('error', {'message': f'Szoba nem talált: {room_code}'})
                return

            room = rooms[room_code]
            for player in room['players']:
                if player['name'] == player_name:
                    player['sid'] = request.sid
                    player['connected'] = True
                    join_room(room_code)
                    print(f"✓ Játékos újracsatlakoztat: {player_name}")
                    socketio.emit('player_reconnected', {
                        'player_name': player_name,
                        'room_data': room
                    }, room=room_code)
                    emit('room_rejoined', {
                        'room_data': room
                    })
                    return

            emit('error', {'message': 'Játékos nem talált a szobában'})
    except Exception as e:
        print(f"✗ Hiba újracsatlakozáskor: {e}")
        emit('error', {'message': f'Újracsatlakozási hiba: {str(e)}'})

@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get all leaderboard entries sorted by time"""
    difficulty = request.args.get('difficulty', None)
    leaderboard = load_leaderboard()
    
    if difficulty:
        leaderboard = [entry for entry in leaderboard if entry.get('difficulty') == difficulty]
    
    # Sort by time (ascending) and then by date (descending)
    leaderboard.sort(key=lambda x: (x.get('time', float('inf')), -x.get('timestamp', 0)))
    
    return jsonify(leaderboard[:100])  # Return top 100

@app.route('/save-score', methods=['POST'])
def save_score():
    """Save a new score to the leaderboard"""
    data = request.json
    
    if not all(key in data for key in ['player_name', 'time', 'difficulty']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    leaderboard = load_leaderboard()
    
    new_entry = {
        'player_name': data['player_name'],
        'time': data['time'],  # in seconds
        'difficulty': data['difficulty'],
        'timestamp': int(datetime.now().timestamp())
    }
    
    leaderboard.append(new_entry)
    save_leaderboard(leaderboard)
    
    return jsonify({'success': True, 'entry': new_entry}), 201

@app.route('/host-info', methods=['GET'])
def host_info():
    """Return host LAN info for easier multiplayer setup on local network."""
    lan_ip = get_lan_ip()
    port = request.host.split(':')[-1] if ':' in request.host else str(os.environ.get('PORT', 5500))

    return jsonify({
        'lan_ip': lan_ip,
        'port': int(port),
        'suggested_url': f'http://{lan_ip}:{port}'
    })

@app.route('/rooms', methods=['GET'])
def get_rooms():
    """Debug endpoint to see all active rooms"""
    with rooms_lock:
        room_list = []
        for code, room in rooms.items():
            room_list.append({
                'code': room['code'],
                'host': room['host'],
                'players': [p['name'] for p in room['players']],
                'status': room['status'],
                'type': room['type']
            })
    return jsonify({'rooms': room_list, 'total': len(room_list)})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5500))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    lan_ip = get_lan_ip()
    
    print("\n" + "="*60)
    print("🎮 KÒ, PAPÍR, OLLÓ - MULTIPLAYER SZERVER")
    print("="*60)
    print(f"🚀 Socket.IO szerver indítása port {port} (debug={debug})...")
    print(f"📍 LAN cím: http://{lan_ip}:{port}")
    print(f"🌐 Csatlakozás böngészőből: http://{lan_ip}:{port}/tobbjatekos.html")
    print(f"📊 Szobák megtekintése: http://{lan_ip}:{port}/rooms")
    print("="*60 + "\n")
    
    # Production-ready Socket.IO server
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=debug,
        use_reloader=False,  # Disable reloader in production
        log_output=True
    )
