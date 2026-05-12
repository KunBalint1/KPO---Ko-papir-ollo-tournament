
// Socket.IO connection
// Use the current host but with port 5000
let socket;

function initSocket() {
    if (socket && socket.connected) {
        console.log('Socket already initialized and connected');
        return;
    }

    if (typeof io !== 'undefined') {
        let serverUrl = window.location.origin;

        // If we are running locally from localhost, keep using port 5000.
        // For a real domain, the app and Socket.IO server should be served from the same origin,
        // or the domain should proxy /socket.io to the socket server.
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            serverUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
        }

        socket = io(serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });
        console.log('Socket.IO initialized', serverUrl);
    } else {
        console.error('Socket.IO not loaded');
        setTimeout(initSocket, 100);
    }
}

initSocket();

// Room management
let currentRoom = null;
let currentPlayer = null;

function createMultiplayerRoom(hostName, gameType = '1v1') {
    socket.emit('create_room', {
        player_name: hostName,
        game_type: gameType
    });
}

function joinMultiplayerRoom(roomCode, playerName) {
    socket.emit('join_room', {
        room_code: roomCode,
        player_name: playerName
    });
}

function makeChoice(roomCode, playerName, choice) {
    socket.emit('make_choice', {
        room_code: roomCode,
        player_name: playerName,
        choice: choice
    });
}

function reconnectPlayer(roomCode, playerName) {
    socket.emit('reconnect_player', {
        room_code: roomCode,
        player_name: playerName
    });
}

// Socket event handlers
socket.on('room_created', (data) => {
    console.log('Room created:', data.room_code);
    currentRoom = data.room_code;
    currentPlayer = data.room_data.players[0].name;

    // Store in localStorage for page navigation
    localStorage.setItem('currentRoom', data.room_code);
    localStorage.setItem('currentPlayer', currentPlayer);

    // Show success message and redirect
    showStatus(document.getElementById('createStatus'),
               `Szoba létrehozva! Kód: ${data.room_code}`, 'success');

    setTimeout(() => {
        window.location.href = `game.html?room=${data.room_code}&player=${encodeURIComponent(currentPlayer)}`;
    }, 1500);
});

socket.on('room_joined', (data) => {
    console.log('Room joined:', data.room_data.code);
    currentRoom = data.room_data.code;
    currentPlayer = data.room_data.players.find(p => p.sid === socket.id)?.name ||
                   data.room_data.players[1].name; // fallback

    localStorage.setItem('currentRoom', currentRoom);
    localStorage.setItem('currentPlayer', currentPlayer);

    showStatus(document.getElementById('joinStatus'), 'Csatlakozás sikeres!', 'success');

    setTimeout(() => {
        window.location.href = `game.html?room=${currentRoom}&player=${encodeURIComponent(currentPlayer)}`;
    }, 1500);
});

socket.on('player_joined', (data) => {
    console.log('Player joined:', data.player_name);
    // This will be handled in game.html
});

socket.on('error', (data) => {
    console.error('Socket error:', data.message);
    alert('Hiba: ' + data.message);
});

socket.on('connect', () => {
    console.log('Connected to server');
    // Auto-reconnect logic has been moved to game.html
    // This prevents infinite reconnect loops on the menu page
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Utility functions
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function validateRoomCode(code) {
    return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
}

// Keep some utility functions for backward compatibility
function getRoomData(roomCode) {
    // This is now handled server-side
    return null;
}

function updateRoomScore(roomCode, playerIndex, points) {
    // This is now handled server-side
}

function updatePlayerChoice(roomCode, playerIndex, choice) {
    // This is now handled server-side
}

function isRoomFull(roomCode) {
    // This is now handled server-side
    return false;
}

function isRoomActive(roomCode) {
    // This is now handled server-side
    return true;
}

function deleteRoom(roomCode) {
    // This is now handled server-side
}

// Game logic (keep for local use if needed)
function determineWinner(choice1, choice2) {
    if (choice1 === choice2) return 'draw';

    const wins = {
        'kő': 'olló',
        'papír': 'kő',
        'olló': 'papír'
    };

    return wins[choice1] === choice2 ? 'player1' : 'player2';
}

function getRoundResult(choice1, choice2) {
    const result = determineWinner(choice1, choice2);
    
    const messages = {
        'draw': '🤝 Döntetlen!',
        'player1': '🎉 Az 1. játékos nyert!',
        'player2': '🎉 A 2. játékos nyert!'
    };
    
    return {
        result: result,
        message: messages[result]
    };
}

// Quick match helpers
function findQuickMatch(excludeRoomCode = null) {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('room_')) {
            const roomCode = key.replace('room_', '');
            if (roomCode === excludeRoomCode) continue;
            
            const room = getRoomData(roomCode);
            if (room && room.quickMatch && room.players.length === 1 && room.status === 'waiting') {
                return roomCode;
            }
        }
    }
    return null;
}

function getAllActiveRooms() {
    const rooms = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('room_')) {
            const roomCode = key.replace('room_', '');
            const room = getRoomData(roomCode);
            if (room && room.status === 'waiting') {
                rooms.push({
                    code: roomCode,
                    host: room.host,
                    type: room.type,
                    players: room.players.length
                });
            }
        }
    }
    return rooms;
}

// Analytics
function recordGameResult(roomCode, winner, rounds) {
    const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
    stats[roomCode] = {
        winner: winner,
        rounds: rounds,
        date: new Date().toISOString()
    };
    localStorage.setItem('gameStats', JSON.stringify(stats));
}
