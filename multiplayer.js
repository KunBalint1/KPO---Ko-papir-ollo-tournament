
// Room management
function createMultiplayerRoom(hostName, gameType = '1v1') {
    const roomCode = generateRoomCode();
    const roomData = {
        code: roomCode,
        host: hostName,
        type: gameType,
        created: new Date().toISOString(),
        players: [{ name: hostName, isHost: true }],
        scores: { player1: 0, player2: 0 },
        choices: { player1: null, player2: null },
        currentRound: 1,
        status: 'waiting'
    };
    
    localStorage.setItem(`room_${roomCode}`, JSON.stringify(roomData));
    return roomCode;
}

function joinMultiplayerRoom(roomCode, playerName) {
    const roomData = localStorage.getItem(`room_${roomCode}`);
    if (!roomData) return false;

    const room = JSON.parse(roomData);
    
    if (room.players.length >= 2) return false;
    if (room.players.some(p => p.name === playerName)) return false;

    room.players.push({ name: playerName, isHost: false });
    room.status = 'active';
    localStorage.setItem(`room_${roomCode}`, JSON.stringify(room));
    
    return true;
}

function getRoomData(roomCode) {
    const data = localStorage.getItem(`room_${roomCode}`);
    return data ? JSON.parse(data) : null;
}

function updateRoomScore(roomCode, playerIndex, points) {
    const room = getRoomData(roomCode);
    if (room) {
        const key = `player${playerIndex + 1}`;
        room.scores[key] += points;
        localStorage.setItem(`room_${roomCode}`, JSON.stringify(room));
    }
}

function updatePlayerChoice(roomCode, playerIndex, choice) {
    const room = getRoomData(roomCode);
    if (room) {
        const key = `player${playerIndex + 1}`;
        room.choices[key] = choice;
        localStorage.setItem(`room_${roomCode}`, JSON.stringify(room));
    }
}

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

function isRoomFull(roomCode) {
    const room = getRoomData(roomCode);
    return room && room.players.length >= 2;
}

function isRoomActive(roomCode) {
    const room = getRoomData(roomCode);
    return room && room.status === 'active';
}

function deleteRoom(roomCode) {
    localStorage.removeItem(`room_${roomCode}`);
}

// Game logic
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
