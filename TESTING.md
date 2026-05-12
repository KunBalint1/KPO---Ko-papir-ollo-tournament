# Session Management Tesztelési Útmutató

## 🧪 Egységtesztelés

### 1. Szoba Létrehozás Tesztelése

#### Test 1.1: Alapvető Szoba Létrehozás

```javascript
// Browser Console-ban (F12 → Console)

// 1. Socket státuszának ellenőrzése
console.log("Socket csatlakozva?", window.socket.connected);
// Várt: true

// 2. Szoba létrehozása
window.createMultiplayerRoom("TestPlayer1", "1v1");

// 3. Event figyelem
setTimeout(() => {
    // Szerver /rooms endpointjának megtekintése
    fetch('http://localhost:5500/rooms')
        .then(r => r.json())
        .then(d => {
            console.log("Szobák:", d);
            // Várt: TestPlayer1 szoba megjelenik
        });
}, 1000);
```

#### Test 1.2: Szoba Kód Normalizálása

```python
# server.py-ban futtatás közben

# Terminal/CMD-ben:
curl http://localhost:5500/rooms

# JSON kimenete:
# {
#   "rooms": [
#     {
#       "code": "192.168.1.25",
#       "host": "TestPlayer1",
#       "players": ["TestPlayer1"],
#       "status": "waiting",
#       "type": "1v1"
#     }
#   ],
#   "total": 1
# }

# Validációs szempont:
# ✅ code: csak az IP (normalizálás működik)
# ✅ host: a játékos neve
# ✅ players: array 1 elemmel
# ✅ status: "waiting"
```

---

### 2. Szobához Csatlakozás Tesztelése

#### Test 2.1: Sikeres Csatlakozás

```javascript
// Szoba Létrehozása (Player1)

// Browser 1 Console:
window.createMultiplayerRoom("Player1", "1v1");

// Várkozás 2 másodpercre...

// Szobához Csatlakozás (Player2)

// Browser 2 Console:
window.joinMultiplayerRoom("192.168.1.25", "Player2");

// Várt esemény: Browser 2-ben
// → Socket event: "room_joined"
// → Átirányítás: game.html?room=192.168.1.25&player=Player2

// Szobák ellenőrzése:
curl http://localhost:5500/rooms

# Várt kimenet:
# {
#   "rooms": [
#     {
#       "code": "192.168.1.25",
#       "host": "Player1",
#       "players": ["Player1", "Player2"],
#       "status": "active",
#       "type": "1v1"
#     }
#   ],
#   "total": 1
# }
```

#### Test 2.2: Szoba Megtelt - Harmadik Játékos

```javascript
// Browser 3 Console - Harmadik játékos próbálkozása:

window.joinMultiplayerRoom("192.168.1.25", "Player3");

// Várt hiba:
// socket.on('error', {message: "Szoba megtelt (max. 2 játékos)"})

// Console ellenőrzés:
console.log("Hibáztam? Igencsak! 😅");
```

#### Test 2.3: Duplikált Név Ellenőrzés

```javascript
// Browser 2 Console - Player1 nevet próbálunk felhasználni:

window.joinMultiplayerRoom("192.168.1.25", "Player1");

// Várt hiba:
// socket.on('error', {message: "Ez a játékos név már foglalt a szobában"})
```

---

### 3. Session Management Tesztelése

#### Test 3.1: Session Inicializálása

```javascript
// Browser Console-ban (F12 → Console)

// Szoba létrehozása után:
window.createMultiplayerRoom("Player1", "1v1");

// 1 másodperc múlva:
setTimeout(() => {
    const session = window.sessionManager.getSession();
    console.log("Session adatok:", session);
    
    // Várt kimenet:
    // {
    //   roomCode: "192.168.1.25",
    //   playerName: "Player1",
    //   sessionId: "session_1715xxx_xxxxxxx",
    //   createdAt: "2026-05-12T..."
    // }
}, 1000);
```

#### Test 3.2: Session Lekérése localStorage-ből

```javascript
// Browser Console-ban

// sessionStorage megtekintése:
console.log(sessionStorage.getItem('kpo_session_data'));

// Várt kimenet:
// {"roomCode":"192.168.1.25","playerName":"Player1","sessionId":"session_...","createdAt":"..."}

// Session objektum lekérése:
const session = JSON.parse(sessionStorage.getItem('kpo_session_data'));
console.log(session);
```

#### Test 3.3: Session Törlése

```javascript
// Browser Console-ban

// Session törlése:
window.sessionManager.clearSession();

// Ellenőrzés:
console.log(sessionStorage.getItem('kpo_session_data'));
// Várt: null
```

---

### 4. Újracsatlakozás Tesztelése

#### Test 4.1: Szimulált Hálózati Probléma

```javascript
// Browser Console-ban (Player már csatlakozva)

// 1. Socket lecsatlakoztatása
window.socket.disconnect();
console.log("Socket lecsatlakozva");

// 2. Csatlakozási állapot ellenőrzése
console.log("Csatlakozva?", window.socket.connected);  // false

// 3. Reconnect
// A socket automatikusan próbál újracsatlakozni

// 4. Újracsatlakozás ellenőrzése (5 másodperc múlva)
setTimeout(() => {
    console.log("Újracsatlakozva?", window.socket.connected);  // true
}, 5000);

// 5. Session még mindig megvan?
setTimeout(() => {
    const session = window.sessionManager.getSession();
    console.log("Session:", session);  // Még mindig megvan
}, 5000);
```

#### Test 4.2: Aktív Oldal Újracsatlakozása

```javascript
// game.html oldal nyitva, majd:

// 1. Network kapcsolat szimulálása (DevTools Network tab → Offline)
// Chrome DevTools: F12 → Network → Offline checkbox

// 2. Az alkalmazás lecsatlakozik

// 3. Visszakapcsolás (Offline checkbox kikapcsolása)

// 4. Socket automatikusan újracsatlakozik
// Console: "Újracsatlakozva"

// 5. Szoba adatok betöltődnek
// Game UI frissül
```

---

## 🔗 Integrációs Tesztelés

### Test Suite 1: Teljes Szoba Létrehozás → Játék → Szobatörlés

```
Lépés 1: Player1 szoba létrehozása
├─ HTTP: GET /rooms → 0 szoba
├─ Action: createMultiplayerRoom("Player1", "1v1")
├─ Event: room_created
├─ Ellenőrzés: /rooms → 1 szoba
└─ ✅ Pass

Lépés 2: Player2 csatlakozása
├─ Action: joinMultiplayerRoom("192.168.1.25", "Player2")
├─ Event: room_joined
├─ Ellenőrzés: /rooms → players: ["Player1", "Player2"]
└─ ✅ Pass

Lépés 3: Választások küldése (makeChoice)
├─ Player1: makeChoice("192.168.1.25", "Player1", "kő")
├─ Player2: makeChoice("192.168.1.25", "Player2", "papír")
├─ Event: round_result
├─ Ellenőrzés: scores: {player1: 0, player2: 1}
└─ ✅ Pass

Lépés 4: Lecsatlakozás
├─ Player1 lecsatlakozik
├─ Event: player_disconnected (Player2-nek)
├─ Ellenőrzés: /rooms → players: [{name: "Player1", connected: false}, ...]
└─ ✅ Pass
```

### Test Suite 2: Újracsatlakozás Forgatókönyv

```
Lépés 1: Szoba Létrehozása + Csatlakozás
├─ Player1: createMultiplayerRoom
├─ Player2: joinMultiplayerRoom
└─ ✅ Mindketten csatlakoztak

Lépés 2: Hálózati Probléma Szimuláció
├─ DevTools: Network Offline
├─ Ellenőrzés: socket.connected = false
└─ ✅ Socket lecsatlakozva

Lépés 3: Hálózat Helyreállítása
├─ DevTools: Network Online
├─ Automat: socket reconnect
├─ Event: player_reconnected
└─ ✅ Újracsatlakozva

Lépés 4: Szoba Adatok Betöltése
├─ Ellenőrzés: game.html UI frissül
├─ Score: helyesen megjelenik
└─ ✅ Szoba szinkronizálva
```

---

## 🔍 Manuális Tesztelési Lépések

### Teszt A: Szoba Csatlakozás Munkafolyama

**Előfeltétel:**
- Szerver fut: `python server.py`
- Böngészők nyitva: http://localhost:5500/tobbjatekos.html

**Lépések:**

1. ✅ **Szoba Létrehozása**
   - Browser 1: "🏠 Szoba Létrehozása"
   - Név: "Player1"
   - Típus: "1v1"
   - Kattints: "Létrehozás"
   - Ellenőrzés: Sikerüzenet + IP megjelenik

2. ✅ **IP Másolása**
   - Console-ban (F12): IP kód megjelenik
   - Másolás: `192.168.1.25`

3. ✅ **Szobához Csatlakozás (Másik Böngészőből)**
   - Browser 2: "🔑 Szobához Csatlakozás"
   - Játékos neve: "Player2"
   - Host IP: "192.168.1.25"
   - Kattints: "Csatlakozás"
   - Ellenőrzés: Sikerüzenet + game.html betöltödik

4. ✅ **Mindkét Játékos a Játék Oldalon**
   - Browser 1 & 2: game.html nyitva
   - Ellenőrzés: Mindkét játékos neve látható

5. ✅ **Választások és Eredmény**
   - Player1: Kattints "Kő"
   - Player2: Kattints "Papír"
   - Ellenőrzés: "Player2 nyert" üzenet

---

### Teszt B: Error Kezelés

**Teszt: Helytelen szoba kód**

1. Browser: "🔑 Szobához Csatlakozás"
2. Játékos neve: "TestPlayer"
3. Host IP: "999.999.999.999"
4. Kattints: "Csatlakozás"
5. Ellenőrzés: Hiba üzenet: "Szoba nem talált: 999.999.999.999"

**Teszt: Harmadik játékos csatlakozás**

1. Browser 1 & 2: Szoba szobában csatlakozva
2. Browser 3: "🔑 Szobához Csatlakozás"
3. Ugyanaz az IP megadása
4. Kattints: "Csatlakozás"
5. Ellenőrzés: Hiba üzenet: "Szoba megtelt (max. 2 játékos)"

---

### Teszt C: Console Debug

**Parancsok tesztelése:**

```javascript
// 1. Socket státusza
window.socket.connected
// Várt: true

// 2. Session adatok
window.sessionManager.getSession()
// Várt: session objektum

// 3. Szobák listázása
fetch('http://localhost:5500/rooms').then(r => r.json()).then(console.log)
// Várt: aktív szobák

// 4. Szerver info
fetch('http://localhost:5500/host-info').then(r => r.json()).then(console.log)
// Várt: LAN IP és port
```

---

## 📊 Test Matrica

| Teszt | Leírás | Várt Hasil | Státusz |
|-------|--------|-----------|---------|
| T1.1 | Szoba Létrehozása | room_created event | ⬜ |
| T1.2 | Szoba Kód Normalizálása | IP-alapú szoba | ⬜ |
| T2.1 | Sikeres Csatlakozás | room_joined event | ⬜ |
| T2.2 | Szoba Megtelt Hiba | error event | ⬜ |
| T2.3 | Duplikált Név Hiba | error event | ⬜ |
| T3.1 | Session Inicializálása | session objektum | ⬜ |
| T3.2 | Session Lekérése | sessionStorage | ⬜ |
| T3.3 | Session Törlése | null | ⬜ |
| T4.1 | Szimulált Lecsatlakozás | reconnect | ⬜ |
| T4.2 | Aktív Oldal Reconnect | UI frissül | ⬜ |

---

## 🐛 Debug Parancsok

### Szerver Debug

```bash
# Szobák listázása
curl http://localhost:5500/rooms

# Szerver info
curl http://localhost:5500/host-info

# Leaderboard
curl http://localhost:5500/leaderboard

# Server error log
# Check terminal output
```

### Kliens Debug

```javascript
// Socket info
io.Socket.prototype._print = function() {
    console.log('Socket Debug:', {
        connected: this.connected,
        id: this.id,
        rooms: this.rooms,
        events: this.listeners
    });
};

// Session dump
function debugSession() {
    console.group('KPO Session Debug');
    console.log('Socket:', window.socket);
    console.log('Session:', sessionManager.getSession());
    console.log('Server URL:', getCurrentMultiplayerServer());
    console.group();
}

// Network requests
fetch('http://localhost:5500/rooms')
    .then(r => r.json())
    .then(d => console.table(d.rooms));
```

---

## ✅ Tesztelési Checklist

Szoba Csatlakozás Validálása:

- [ ] Szoba létrehozása működik
- [ ] Session inicializálódik
- [ ] IP normalizálódik
- [ ] Szobához csatlakozás működik
- [ ] Player2 látható az oldalon
- [ ] Játék szinkronizálódik
- [ ] Lecsatlakozás kezelödik
- [ ] Újracsatlakozás működik
- [ ] Error üzenetek megjelennek
- [ ] Console logok informáak
- [ ] /rooms endpoint működik
- [ ] /host-info endpoint működik

---

**Utolsó frissítés:** 2026-05-12
**Verzió:** 1.0
**Szerző:** KPO QA Team
