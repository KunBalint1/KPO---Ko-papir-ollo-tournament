# Session Management Dokumentáció

## Áttekintés

A KPO alkalmazás egy fejlett session management rendszert használ a multiplayer szobákhoz. Ez biztosítja a megbízható szobakezelést és automatikus újracsatlakozást.

## Architektúra

### Szerver Oldali (server.py)

#### Szoba Kezelés

```python
rooms = {}          # Szobák in-memory tárolása
sessions = {}       # Session adatok
rooms_lock = Lock() # Thread-safe operációkhoz
```

Minden szoba szerkezete:

```python
{
    'code': '192.168.1.25',           # Szoba kódja (IP alapú)
    'host': 'Player1',                 # Host játékos neve
    'host_ip': '192.168.1.25',         # Host IP címe
    'type': '1v1',                     # Mérkőzés típusa
    'created': '2026-05-12T...',       # Létrehozás időpontja
    'players': [                       # Csatlakozott játékosok
        {
            'name': 'Player1',
            'isHost': True,
            'sid': 'socket_id_1',      # Socket.IO session ID
            'connected': True
        },
        {
            'name': 'Player2',
            'isHost': False,
            'sid': 'socket_id_2',
            'connected': True
        }
    ],
    'scores': {'player1': 0, 'player2': 0},
    'choices': {'player1': None, 'player2': None},
    'current_round': 1,
    'status': 'active',                # waiting, active, finished
    'game_history': []
}
```

#### Socket.IO Események

##### 1. `create_room`

**Kliens küld:**
```javascript
socket.emit('create_room', {
    player_name: 'Player1',
    game_type: '1v1',
    room_identifier: '192.168.1.25'
});
```

**Szerver válasza:**
```javascript
emit('room_created', {
    room_code: '192.168.1.25',
    room_data: { /* szoba adatok */ }
});
```

**Funkció:**
- Új szoba létrehozása
- Player1 automatikus csatlakoztatása
- Host státusz beállítása
- Session inicializálása

##### 2. `join_room`

**Kliens küld:**
```javascript
socket.emit('join_room', {
    room_code: '192.168.1.25',
    player_name: 'Player2'
});
```

**Szerver válasza:**
```javascript
// A csatlakozó játékosnak:
emit('room_joined', {
    room_data: { /* szoba adatok */ }
});

// Minden játékosnak a szobában:
emit('player_joined', {
    player_name: 'Player2',
    room_data: { /* szoba adatok */ }
}, room='192.168.1.25');
```

**Funkció:**
- Második játékos csatlakoztatása
- Név ellenőrzés
- Szoba kapacitás ellenőrzés
- Session inicializálása

##### 3. `make_choice`

**Kliens küld:**
```javascript
socket.emit('make_choice', {
    room_code: '192.168.1.25',
    player_name: 'Player1',
    choice: 'kő'  // kő, papír, olló
});
```

**Szerver válasza:**
```javascript
emit('round_result', {
    choices: {'player1': 'kő', 'player2': 'papír'},
    scores: {'player1': 0, 'player2': 1},
    winner: 'player2',
    current_round: 2,
    game_over: false,
    room_data: { /* szoba adatok */ }
}, room='192.168.1.25');
```

##### 4. `disconnect`

**Automatikus szerver esemény:**
- Játékos lecsatlakozáskor
- `connected` státusz: `False`
- Értesítés küldése a szobában maradt játékosoknak

##### 5. `reconnect_player`

**Kliens küld:**
```javascript
socket.emit('reconnect_player', {
    room_code: '192.168.1.25',
    player_name: 'Player1'
});
```

**Szerver válasza:**
```javascript
emit('room_rejoined', {
    room_data: { /* szoba adatok */ }
});

emit('player_reconnected', {
    player_name: 'Player1',
    room_data: { /* szoba adatok */ }
}, room='192.168.1.25');
```

### Kliens Oldali (multiplayer.js)

#### Session Manager Objektum

```javascript
const sessionManager = {
    currentSession: null,
    
    // Session inicializálása
    initSession(roomCode, playerName) {
        this.currentSession = {
            roomCode: roomCode,
            playerName: playerName,
            sessionId: this.generateSessionId(),
            createdAt: new Date().toISOString()
        };
        sessionStorage.setItem('kpo_session_data', JSON.stringify(this.currentSession));
    },
    
    // Session lekérése
    getSession() { ... },
    
    // Session törlése
    clearSession() { ... },
    
    // Session ID generálása
    generateSessionId() { ... }
};
```

#### Socket Kezelők

```javascript
socket.on('connect', () => {
    console.log('Kapcsolódva:', socket.id);
    
    // Mentett szesszió lekérése és újracsatlakozás
    const session = sessionManager.getSession();
    if (session && !isLobbyPage) {
        reconnectPlayer(session.roomCode, session.playerName);
    }
});

socket.on('room_created', (data) => {
    // Session inicializálása
    sessionManager.initSession(data.room_code, playerName);
    
    // Átirányítás a játék oldalra
    window.location.href = `game.html?room=${data.room_code}&player=${playerName}&session=${sessionManager.currentSession.sessionId}`;
});

socket.on('room_joined', (data) => {
    // Session inicializálása
    sessionManager.initSession(roomCode, playerName);
    
    // Átirányítás a játék oldalra
    window.location.href = `game.html?room=${roomCode}&player=${playerName}&session=${sessionManager.currentSession.sessionId}`;
});

socket.on('error', (data) => {
    // Hibaüzenet megjelenítése
    console.error('Szerver hiba:', data.message);
});
```

## Munkafolyamat

### 1. Szoba Létrehozása

```
[Kliens]                          [Szerver]
   |                                 |
   ├─ Emit 'create_room'────────────>|
   |                                 |
   |  [Szerver logika:]              |
   |  1. Szoba létrehozása          |
   |  2. Player1 hozzáadása          |
   |  3. join_room() Socket.IO call |
   |                                 |
   |<────── Emit 'room_created' ────|
   |                                 |
   ├─ Session inicializálása        |
   ├─ URL generálása session ID-val |
   └─ game.html oldalra átirányítás |
```

### 2. Szobához Csatlakozás

```
[Kliens]                          [Szerver]
   |                                 |
   ├─ Emit 'join_room'──────────────>|
   |                                 |
   |  [Szerver logika:]              |
   |  1. Szoba kód validálása       |
   |  2. Kapacitás ellenőrzés       |
   |  3. Név ellenőrzés             |
   |  4. Player2 hozzáadása          |
   |  5. join_room() Socket.IO call |
   |                                 |
   |<────── Emit 'room_joined' ─────|
   |<─ Broadcast 'player_joined' ───|
   |                                 |
   ├─ Session inicializálása        |
   ├─ URL generálása session ID-val |
   └─ game.html oldalra átirányítás |
```

### 3. Játék Közben

```
[Player1]                [Player2]                [Szerver]
   |                        |                        |
   ├─ Emit 'make_choice'───────────────────────────>|
   |  (kő)                  |                        |
   |                        |                        |
   |                        ├─ Emit 'make_choice'──>|
   |                        |  (papír)               |
   |                        |                        |
   |                        | [Szerver logika:]     |
   |                        | 1. Mindkét választás  |
   |                        | 2. Nyertese meghatározása
   |                        | 3. Pont frissítése    |
   |                        |                        |
   |<────── Emit 'round_result' ─────────────────────|
   |                        |                        |
   |<────── Emit 'round_result' ─────────────────────|
   |                        |                        |
   ├─ UI frissítése        ├─ UI frissítése        |
   └─ Eredmény megjelenítése└─ Eredmény megjelenítése
```

### 4. Lecsatlakozás és Újracsatlakozás

```
[Kliens]                          [Szerver]
   |                                 |
   ├─ Lecsatlakozik (Network hiba)  |
   |                                 |
   |                         [Szerver logika:]
   |                         1. 'disconnect' event
   |                         2. connected = false
   |                         3. Másik játékosnak értesítés
   |                                 |
   ├─ Újra csatlakozik               |
   |                                 |
   ├─ Session memóriából lekérés    |
   ├─ Emit 'reconnect_player'───────>|
   |                                 |
   |  [Szerver logika:]              |
   |  1. Játékos keresése szobában  |
   |  2. SID frissítése              |
   |  3. connected = true            |
   |                                 |
   |<──── Emit 'room_rejoined' ─────|
   |<─ Broadcast 'player_reconnected'|
   |                                 |
   └─ Játék folytatódása            |
```

## Hibaesetek

### 1. Szoba Nem Talált

**Hibaüzenet:** "Szoba nem talált: 192.168.1.25"

**Okok:**
- Szoba kódja helytelen
- Szoba lejárt (szerver újraindítás)
- Szoba IP-je másik

**Megoldás:**
- Ellenőrizd a szoba kódját
- Indítsd újra a szervert
- Nézd meg a `/rooms` endpoint-ot

### 2. Szoba Megtelt

**Hibaüzenet:** "Szoba megtelt (max. 2 játékos)"

**Okok:**
- Már 2 játékos van a szobában
- Harmadik játékos próbál csatlakozni

**Megoldás:**
- Hozz létre új szobát
- Várd meg, hogy valaki lecsatlakozzon

### 3. Név Már Foglalt

**Hibaüzenet:** "Ez a játékos név már foglalt a szobában"

**Okok:**
- Ugyanaz a név van már a szobában

**Megoldás:**
- Válassz másik nevet
- Nézd meg a szoba tagjait

### 4. Szerver Nem Elérhető

**Hibaüzenet:** "A szerver nem érhető el. Indítsd a server.py-t..."

**Okok:**
- Szerver nem fut
- Socket.IO kapcsolat probléma
- Tűzfal blokkolja

**Megoldás:**
- Indítsd el a `server.py` fájlt
- Ellenőrizd a tűzfal beállításokat
- Nézd meg a böngésző console-ban az error-okat

## Szerver Debug Endpointok

### 1. Szobák Listázása

```bash
GET http://192.168.1.25:5500/rooms
```

**Válasz:**
```json
{
    "rooms": [
        {
            "code": "192.168.1.25",
            "host": "Player1",
            "players": ["Player1", "Player2"],
            "status": "active",
            "type": "1v1"
        }
    ],
    "total": 1
}
```

### 2. Szerver Információ

```bash
GET http://192.168.1.25:5500/host-info
```

**Válasz:**
```json
{
    "lan_ip": "192.168.1.25",
    "port": 5500,
    "suggested_url": "http://192.168.1.25:5500"
}
```

## Biztonsági Megfigyelések

1. **Session ID**: A session ID-k egyediek és időbélyegzett
2. **Szoba Kódok**: IP-cím alapú (nem titkosított)
3. **Név Ellenőrzés**: Duplikált nevek meg vannak tiltva
4. **Kapacitás**: Maximum 2 játékos
5. **Thread Safety**: Lock-ok biztosítják a szál-biztos operációkat

## Skálázhatóság

### Jelenlegi Korlátok

- **Szobák**: In-memory tárolás (szerver újraindítás után törlődnek)
- **Játékosok**: Maximum 2 / szoba
- **Állékonyság**: Szerver újraindítás után szobák elvesznek

### Jövőbeli Fejlesztések

- Adatbázis integrálása (PostgreSQL, MongoDB)
- Redis session store
- Load balancing több szeverhez
- Szobák perzisztencia
- Session timeout kezelés
- Automata takarítás üres szobák

## Tesztelés

### Manuális Tesztelés

1. **Szoba Létrehozása**
   ```
   - Nyisd meg a tobbjatekos.html oldalt
   - Kattints "Szoba Létrehozása" gombra
   - Add meg a nevet és típust
   - Ellenőrizd az IP-t a console-ban
   ```

2. **Szobához Csatlakozás**
   ```
   - Másik böngészőből/gépről nyisd meg a tobbjatekos.html oldalt
   - Kattints "Szobához Csatlakozás" gombra
   - Add meg a host IP-t
   - Ellenőrizd a sikeres csatlakozást
   ```

3. **Lecsatlakozás/Újracsatlakozás**
   ```
   - Nyisd meg a DevTools Network panelt
   - Szimuláld a hálózati hibát
   - Ellenőrizd az automatikus újracsatlakozást
   ```

### Automatizált Tesztelés

```python
import socketio
import time

# Test kliens
sio = socketio.Client()

# Test: Szoba Létrehozása
sio.connect('http://localhost:5500')
sio.emit('create_room', {
    'player_name': 'TestPlayer1',
    'game_type': '1v1',
    'room_identifier': 'localhost'
})

time.sleep(1)

# Test: Szobához Csatlakozás
sio.emit('join_room', {
    'room_code': 'localhost',
    'player_name': 'TestPlayer2'
})

time.sleep(1)

# Test: Választás Küldése
sio.emit('make_choice', {
    'room_code': 'localhost',
    'player_name': 'TestPlayer1',
    'choice': 'kő'
})

sio.disconnect()
```

## Összefoglalás

A session management rendszer biztosítja:

✅ Megbízható szobakezelést
✅ Automatikus újracsatlakozást
✅ Hibakezelést és error reporting-ot
✅ Thread-safe operációkat
✅ Debug eszközöket
✅ Skálázható architektúrát

Ez a rendszer garantálja, hogy a játékosok zökkenőmentesen tudnak csatlakozni, játszani és újracsatlakozni hálózati problémák esetén.
