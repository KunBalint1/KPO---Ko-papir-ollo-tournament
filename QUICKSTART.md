# Gyors Kezdési Útmutató - KPO Multiplayer

## ⚡ 5 Perc Alatt Csatlakozás

### Szerver Oldal (Host)

#### 1. Szerver Indítása

```bash
# Terminal/CMD megnyitása a projekt könyvtárban
cd C:\Users\...\KPO---Ko-papir-ollo-tournament

# Szerver indítása
python server.py
```

**Output várható:**
```
============================================================
🎮 KÒ, PAPÍR, OLLÓ - MULTIPLAYER SZERVER
============================================================
🚀 Socket.IO szerver indítása port 5500 (debug=False)...
📍 LAN cím: http://192.168.1.25:5500
🌐 Csatlakozás böngészőből: http://192.168.1.25:5500/tobbjatekos.html
📊 Szobák megtekintése: http://192.168.1.25:5500/rooms
============================================================
```

#### 2. Szoba Létrehozása

1. Nyisd meg böngészőt: `http://localhost:5500/tobbjatekos.html`
2. Kattints: **"🏠 Szoba Létrehozása"**
3. Add meg a nevet (pl. "Player1")
4. Válaszd: "1v1" típust
5. Kattints: **"Létrehozás"**
6. Másolj le az IP-t (pl. `192.168.1.25`)

#### 3. IP Megosztása

Írd meg az ellenfélnek:
```
IP: 192.168.1.25
Port: 5500
```

---

### Kliens Oldal (Vendég)

#### 1. Csatlakozás a Szobához

1. Nyisd meg böngészőt: `http://szerver_ip:5500/tobbjatekos.html`
   - Vagy: `http://192.168.1.25:5500/tobbjatekos.html`

2. Kattints: **"🔑 Szobához Csatlakozás"**

3. Add meg az adatokat:
   - Játékos neve: (pl. "Player2")
   - Host IP: (amit a host küldött, pl. "192.168.1.25")

4. Kattints: **"Csatlakozás"**

#### 2. Játék Elkezdése

- Mindkét játékos a game.html oldalra kerül
- Kattintsatok: **"Kő", "Papír"** vagy **"Olló"** gombot
- Az eredmény azonnal megjelenik

---

## 🎯 Tipikus Forgatókönyvek

### 1. Lokális Játék (Ugyanaz a Gép)

```
Host: http://localhost:5500/tobbjatekos.html
Kliens: http://localhost:5500/tobbjatekos.html

(Ugyanaz a gép - fejlesztéshez jó)
```

### 2. LAN Játék (Különböző Gépek Ugyanazon Hálózaton)

```
Host: 
  1. Szerver indítása
  2. http://localhost:5500/tobbjatekos.html
  3. Szoba létrehozása
  4. IP megosztása

Kliens:
  1. http://192.168.1.25:5500/tobbjatekos.html
  2. Szobához csatlakozás az IP-vel
```

### 3. Internet Játék (Router Port Forwarding)

```
Host:
  1. Szerver indítása (port 5500)
  2. Router beállítások: Port Forward 5500 → Host PC
  3. IP megosztása: (Public IP vagy domain)

Kliens:
  1. http://public_ip:5500/tobbjatekos.html
  2. Szobához csatlakozás a public IP-vel
```

---

## 🔍 Ellenőrzési Lépések

### Ellenőrzés: Szerver Működik-e?

```bash
# Terminal/CMD-ben:
curl http://localhost:5500/host-info

# Vagy böngészőben:
# http://localhost:5500/host-info

# Várt válasz:
# {
#   "lan_ip": "192.168.1.25",
#   "port": 5500,
#   "suggested_url": "http://192.168.1.25:5500"
# }
```

### Ellenőrzés: Szobák Listája

```bash
# Böngészőben:
# http://localhost:5500/rooms

# Várt válasz:
# {
#   "rooms": [
#     {
#       "code": "192.168.1.25",
#       "host": "Player1",
#       "players": ["Player1"],
#       "status": "waiting",
#       "type": "1v1"
#     }
#   ],
#   "total": 1
# }
```

### Ellenőrzés: Hálózat Kapcsolat

```bash
# Windows - IP meghatározása:
ipconfig

# Keress: IPv4 Address: 192.168.x.x

# Windows - Ping teszt:
ping 192.168.1.25

# Windows - Port tesztelése:
Test-NetConnection -ComputerName 192.168.1.25 -Port 5500

# macOS/Linux - IP meghatározása:
ifconfig

# macOS/Linux - Ping teszt:
ping 192.168.1.25
```

---

## ⚠️ Gyakori Hibák és Gyors Megoldásuk

| Hiba | Megoldás |
|------|----------|
| "Szoba nem talált" | Ellenőrizd az IP-t a `/rooms` endpointban |
| "A szerver nem érhető el" | Indítsd el a `python server.py` parancsot |
| "Szoba megtelt" | Már van 2 játékos - hozz létre új szobát |
| "Név már foglalt" | Adj meg másik játékos nevet |
| "WebSocket connection closed" | Szerver újraindítás vagy hálózati probléma |
| "Nem tudom csatlakozni másik gépről" | Ping teszt: `ping 192.168.1.x` |

---

## 📱 Mobilról Játszás

### Android

1. Nyisd meg a böngészőt (Chrome/Firefox)
2. Írja be az URL-t: `http://192.168.1.25:5500/tobbjatekos.html`
3. Szoba létrehozása/csatlakozás ugyanúgy

### iOS

1. Nyisd meg a Safarit
2. Írja be az URL-t: `http://192.168.1.25:5500/tobbjatekos.html`
3. Szoba létrehozása/csatlakozás ugyanúgy

**Megjegyzés:** HTTPS-hez Self-signed tanúsítvány szükséges

---

## 🛠️ Fejlesztői Módó

### Debug Konzol Megnyitása

```
Chrome/Edge: F12
Firefox: F12
Safari: Cmd+Option+I
```

### Console Parancsok

```javascript
// Socket státusza
console.log(window.socket.connected);

// Session adatok
console.log(sessionManager.getSession());

// Szobák listázása
fetch('http://localhost:5500/rooms')
  .then(r => r.json())
  .then(d => console.log(d));

// Szerver info
fetch('http://localhost:5500/host-info')
  .then(r => r.json())
  .then(d => console.log(d));
```

---

## 📊 Performance Tippek

### Ajánlott Konfiguráció

```
Szerver:
- CPU: 2+ cores
- RAM: 512MB+
- Network: 10Mbps+

Kliens:
- Modern böngésző (Chrome 90+, Firefox 88+, Safari 14+)
- Stabil WiFi vagy Ethernet
- Rendes LED jelű hálózat
```

### Teljesítmény Optimálása

```bash
# Szerver indítása production módban
set DEBUG=false
python server.py

# Socket.IO transports beállítása
# - WebSocket (jobb)
# - Polling (fallback)
```

---

## 🔐 Biztonsági Tippek

### Fejlesztésnél

```javascript
// DevTools Console-ban:

// CORS problémáknál (CSAK fejlesztéshez!):
// Chrome indítása special módban
// chrome --disable-web-security

// vagy
// Szerver CORS beállítása
socketio = SocketIO(
    app,
    cors_allowed_origins="*",  // ⚠️ Csak dev!
    ...
)
```

### Production-nál

```python
# server.py-ban:

socketio = SocketIO(
    app,
    cors_allowed_origins=[
        "https://yourdomain.com",
        "https://www.yourdomain.com"
    ],
    # WebSocket csak HTTPS-en
    transports=['websocket'],
    # Rate limiting
    # SSL certifikát
)
```

---

## 📚 Dokumentáció Linkek

- **Teljes Dokumentáció**: `README.md`
- **Session Management**: `SESSION_MANAGEMENT.md`
- **Hibaelhárítás**: `TROUBLESHOOTING.md`
- **Socket.IO Docs**: https://socket.io/docs/
- **Flask-SocketIO**: https://python-socketio.readthedocs.io/

---

## 🚀 Telepítés Szerverre

### Raspberry Pi / Linux VPS

```bash
# 1. Python & pip telepítése
sudo apt-get update
sudo apt-get install python3 python3-pip

# 2. Projekt lemásolása
git clone <repo-url>
cd KPO---Ko-papir-ollo-tournament

# 3. Függőségek telepítése
pip3 install -r requirements.txt

# 4. Szerver indítása (screen session-ben)
screen -S kpo-server
python3 server.py

# 5. Detach: Ctrl+A+D
```

### Systemd Service (Linux)

```ini
# /etc/systemd/system/kpo-game.service
[Unit]
Description=KPO Game Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/kpo-game
ExecStart=/usr/bin/python3 /home/kpo-game/server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Aktiválás
sudo systemctl enable kpo-game
sudo systemctl start kpo-game
sudo systemctl status kpo-game
```

---

## 📞 Support

Ha problémád van:

1. **Console hibák ellenőrzése** (F12 → Console)
2. **Network tab megtekintése** (F12 → Network)
3. **TROUBLESHOOTING.md** olvasása
4. **`/rooms` endpoint** megtekintése

---

**Boldog játékot! 🎮🎯**

*Utolsó frissítés: 2026-05-12*
