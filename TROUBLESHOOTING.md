# Hibaelhárítási Útmutató - KPO Multiplayer

## Szoba Csatlakozási Problémák

### ❌ Probléma: "Szoba nem talált"

#### Lehetséges Okok:

1. **Helytelen szoba kód**
   - Az IP-cím nem egyezik meg

2. **Szoba lejárt**
   - Szerver újraindítás után szobák törlődnek

3. **Más hálózaton van**
   - Ugyanazon LAN-on kell lenni

#### Megoldási Lépések:

```bash
# 1. Szobák megtekintése
curl http://192.168.1.25:5500/rooms

# 2. Host IP ellenőrzése
# - Windows: ipconfig
# - macOS: ifconfig
# - Linux: ip addr

# 3. Szerver újraindítása
python server.py

# 4. Firewall engedélyezése (Windows)
# - Settings > Firewall > Allow app through firewall
# - Python.exe engedélyezése a porton: 5500
```

#### Kliens Ellenőrzése:

```javascript
// Browser Console-ban (F12 -> Console):

// 1. Socket kapcsolat állapota
console.log(window.socket.connected);

// 2. Session adatok
console.log(sessionManager.getSession());

// 3. Szerver cím
console.log(window.getCurrentMultiplayerServer());
```

---

### ❌ Probléma: "Szoba megtelt"

#### Okok:

- Már 2 játékos van a szobában
- Harmadik játékos próbál csatlakozni

#### Megoldás:

1. **Új szoba létrehozása**
   - Kattints "Szoba Létrehozása" gombra

2. **Várakozás**
   - Várd meg, hogy valaki lecsatlakozzon

3. **Szobák kezelése**
   ```bash
   # Szobák listázása
   curl http://192.168.1.25:5500/rooms
   ```

---

### ❌ Probléma: "Név már foglalt"

#### Okok:

- Ugyanaz a név van már a szobában
- Játékos újracsatlakozása során

#### Megoldás:

1. **Másik nevet válassz**
   - Adj meg egy másik játékos nevet

2. **Név ellenőrzése**
   ```javascript
   // Console-ban:
   const session = sessionManager.getSession();
   console.log(`Jelenlegi név: ${session.playerName}`);
   ```

---

## Szerver Kapcsolati Problémák

### ❌ Probléma: "A szerver nem érhető el"

#### Lehetséges Okok:

1. **Szerver nem fut**
   ```bash
   # Ellenőrizd a szerver státuszát
   # CMD/Powershell-ben:
   netstat -ano | findstr :5500
   ```

2. **Rossz port**
   - Alapértelmezett port: 5500
   - Environment variable: `PORT`

3. **Socket.IO nem csatlakozik**
   - WebSocket/Polling problémái

4. **Tűzfal blokkolja**
   - Windows Defender/3rd party antivirus

#### Megoldási Lépések:

```bash
# 1. Szerver indítása
cd /path/to/project
python server.py

# 2. Port rendelkezésre állásának ellenőrzése (Windows)
netstat -ano | findstr :5500

# 3. Szerver elérhetőségének tesztelése
curl http://localhost:5500/host-info

# 4. Debug módban indítás
set DEBUG=true
python server.py
```

#### Kliens Oldali Ellenőrzés:

```javascript
// Browser Console-ban (F12 -> Console tab):

// 1. Socket.IO betöltésének ellenőrzése
console.log(typeof io);  // 'function' = OK

// 2. Socket státusza
console.log(window.socket);

// 3. Hálózati kérések megtekintése
// Network tab -> Kiváló Socket.IO kapcsolatokat

// 4. Server cím
console.log(resolveServerUrl());
```

---

### ❌ Probléma: "WebSocket connection closed"

#### Okok:

1. **Szerver nem elérhető**
2. **Proxy/Firewall probléma**
3. **Socket.IO timeout**

#### Megoldás:

```javascript
// Socket reconnection beállítása
const socket = io('http://localhost:5500', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ['polling', 'websocket']  // Polling fallback
});

// Event listeners
socket.on('connect_error', (error) => {
    console.error('Hiba:', error);
});

socket.on('disconnect', (reason) => {
    console.log('Szerver lecsatlakozva:', reason);
});
```

---

## Hálózati Problémák

### ❌ Probléma: "Nem tudom csatlakozni más eszközről"

#### Okok:

1. **Eltérő hálózat**
   - WiFi vs Ethernet
   - Különböző WiFi hálózatok

2. **IP cím eltérés**
   - Statikus vs DHCP IP

3. **LAN konfiguráció**
   - Szegmentált hálózatok
   - VLAN elkülönítés

#### Megoldás:

```bash
# 1. Host IP meghatározása (Windows)
ipconfig

# Keress rá erre:
# IPv4 Address: 192.168.x.x

# 2. Host IP meghatározása (macOS/Linux)
ifconfig
# vagy
ip addr

# 3. LAN elérhetőség tesztelése
ping 192.168.1.25

# 4. Port elérhetőség tesztelése (Windows)
Test-NetConnection -ComputerName 192.168.1.25 -Port 5500

# 5. Böngészőből is próbáld
# http://192.168.1.25:5500/host-info
```

#### Szerver Indítása más gépen:

```bash
# 1. Server IP meghatározása
python server.py

# Output:
# 📍 LAN cím: http://192.168.1.25:5500

# 2. Másik gépről a böngészőbe:
# http://192.168.1.25:5500/tobbjatekos.html
```

---

## Session Kezelési Problémák

### ❌ Probléma: Session adatok elvesznek

#### Okok:

1. **SessionStorage törlődik**
   - Böngésző adat törlése
   - Privát mód (InPrivate)

2. **Szerver újraindítása**
   - Szobák in-memory tárolva

#### Megoldás:

```javascript
// Session megőrzése
// 1. SessionStorage helyett LocalStorage:
localStorage.setItem('kpo_session_backup', JSON.stringify(sessionManager.currentSession));

// 2. Szesszió visszaállítása
const backup = JSON.parse(localStorage.getItem('kpo_session_backup'));
if (backup) {
    sessionManager.currentSession = backup;
    sessionStorage.setItem('kpo_session_data', JSON.stringify(backup));
}
```

---

### ❌ Probléma: Automatikus újracsatlakozás nem működik

#### Okok:

1. **Session adatok hiányzanak**
2. **Socket.IO nem csatlakozik**
3. **Szoba már nem létezik**

#### Megoldás:

```javascript
// Console-ban debug:

// 1. Session adatok ellenőrzése
const session = sessionManager.getSession();
console.log('Session:', session);

// 2. Újracsatlakozás manuális triggering
if (session) {
    window.reconnectPlayer(session.roomCode, session.playerName);
}

// 3. Event listeners hozzáadása
socket.on('connect', () => {
    console.log('Kapcsolódva - újracsatlakozás próbája');
});

socket.on('error', (error) => {
    console.error('Socket hiba:', error);
});
```

---

## Játék Szinkronizációs Problémák

### ❌ Probléma: "Játék nem szinkronizálódik"

#### Okok:

1. **Lassú internet**
2. **Socket.IO késések**
3. **Böngésző problémái**

#### Megoldás:

```bash
# 1. Internet sebesség tesztelése
speedtest-cli

# 2. Socket.IO latency tesztelése
# Network tab -> WS -> timing

# 3. Böngésző cache törlése
# Chrome: Ctrl+Shift+Delete
# Firefox: Ctrl+Shift+Delete
# Safari: Develop -> Empty Web Storage
```

#### Kézzel Szinkronizálás:

```javascript
// Browser Console-ban:

// 1. Szoba adatainak frissítése
window.updateRoomData();

// 2. Oldal frissítése
window.location.reload();

// 3. Session jelenlegi állapota
const session = sessionManager.getSession();
console.log('Szoba:', session.roomCode);
console.log('Játékos:', session.playerName);
```

---

## Böngésző Specifikus Problémák

### Chrome

```javascript
// DevTools megnyitása: F12
// Console tab -> Hibák keresése

// Chrome közismert problémái:
// 1. WebSocket blokkolva (CORS)
// 2. Mixed content (HTTP vs HTTPS)
// 3. Service Worker cache
```

**Megoldás:**

```bash
# Cache törlése
Ctrl+Shift+Delete

# CORS problémáinál:
# Chrome indítása --disable-web-security módban (CSAK fejlesztéshez!)
chrome --disable-web-security --user-data-dir="/tmp/chrome-test"
```

### Firefox

```javascript
// DevTools megnyitása: F12
// Console tab -> Hibák keresése

// Firefox közismert problémái:
// 1. WebSocket timeout
// 2. Third-party cookie blokkolás
```

### Safari

```javascript
// DevTools megnyitása: Cmd+Option+I
// Console tab -> Hibák keresése

// Safari közismert problémái:
// 1. WebSocket támogatás
// 2. SessionStorage problémák
```

---

## Szerver Teljesítményi Problémák

### ❌ Probléma: "Szerver lassú"

#### Okok:

1. **Sok szoba**
   - In-memory tárolás telítődik

2. **Sok Socket.IO event**
   - Broadcast túlterhelés

3. **Python CPU/Memory**

#### Monitoring:

```bash
# 1. CPU/Memory használat (Windows)
Get-Process python | Select-Object Name, Handles, CPU, Memory

# 2. Port figyelés
netstat -ano | findstr :5500

# 3. Python profiling
python -m cProfile server.py
```

#### Optimizálások:

```python
# server.py-ban:

# 1. Message rate limiting
from datetime import datetime, timedelta

last_message_time = {}

def rate_limit(user_id, max_per_second=5):
    now = datetime.now()
    if user_id not in last_message_time:
        last_message_time[user_id] = []
    
    # Remove old timestamps
    last_message_time[user_id] = [
        t for t in last_message_time[user_id] 
        if now - t < timedelta(seconds=1)
    ]
    
    if len(last_message_time[user_id]) >= max_per_second:
        return False
    
    last_message_time[user_id].append(now)
    return True

# 2. Szobák takarítása (üres szobák törlése)
def cleanup_empty_rooms():
    global rooms
    with rooms_lock:
        empty = [code for code, room in rooms.items() 
                 if len(room['players']) == 0]
        for code in empty:
            del rooms[code]
```

---

## Útmutató Szerver Hibakereséhez

### Szerver Console Kimenete Értelmezése:

```
✓ Szoba létrehozva: 192.168.1.25 (host: Player1)
  → Sikeres szoba létrehozás

✗ Szoba nem talált: 192.168.1.25
  → Az IP-cím alapján nincs szoba

✓ Játékos csatlakoztat: Player2 -> 192.168.1.25
  → Sikeres csatlakozás

✗ Szoba megtelt: 192.168.1.25
  → 2 játékos már van a szobában

✓ Játékos lecsatlakoztat: Player1 -> 192.168.1.25
  → Játékos elhagyta a szobát
```

### Debug Logging Aktiválása:

```bash
# Szerver indítása debug módban
export DEBUG=true
python server.py

# Vagy Windows-on:
set DEBUG=true
python server.py
```

---

## Gyors Tippek

### ✅ Szobához Csatlakozás Ellenőrzőlistája:

- [ ] Szerver fut-e? (`python server.py`)
- [ ] Helyes az IP-cím? (`ipconfig` vagy `ifconfig`)
- [ ] Azonos hálózaton van-e? (ping test)
- [ ] Tűzfal engedélyezi-e a portot? (5500)
- [ ] Socket.IO csatlakozik-e? (Network tab)
- [ ] Session adatok megvannak-e? (Console)

### ✅ Game.html Szinkronizáció Ellenőrzőlistája:

- [ ] Mindkét játékos a game.html-en van-e?
- [ ] Azonos szoba kódja van-e?
- [ ] Socket kapcsolat aktív-e?
- [ ] Broadcasting működik-e? (Network tab)

### ✅ Újraindítás Lépési:

1. Szerver leállítása (Ctrl+C)
2. Böngészők lezárása
3. Szerver újraindítása
4. Böngésző újraindítása
5. Cache törlése (Ctrl+Shift+Delete)
6. Oldal frissítése (F5 vagy Ctrl+F5)

---

## Támogatás és Dokumentáció

- **Session Management**: `SESSION_MANAGEMENT.md`
- **README**: `README.md`
- **Server Repo**: `https://github.com/.../KPO`

## Gyakori Kérdések

**K: Miért nem működik a szoba csatlakozás?**
V: Ellenőrizd, hogy a szerver fut-e és a helyes IP-t adtad-e meg.

**K: Szobák törlődnek a szerver újraindítása után?**
V: Igen, az in-memory tárolás miatt. Ez normális működés.

**K: Lehet-e több szobát létrehozni?**
V: Igen, de max 2 játékos egy szobában.

**K: Hogyan debug-olom a Socket.IO event-eket?**
V: DevTools Network tab -> WS (WebSocket) -> Message tab

---

**Utolsó frissítés:** 2026-05-12  
**Verzió:** 1.0  
**Szerzõ:** KPO Fejlesztési Csapat
