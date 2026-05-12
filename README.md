# KPO - Kő, Papír, Olló Verseny

Egy egyszerű Kő-Papír-Olló játék webes megvalósítása haladó session management rendszerrel.

## Funkciók

- 🎮 **Egyjátékos módok**: Könnyű, Közepes, Nehéz
- 👥 **Multiplayer**: LAN vagy internetes játék
- 💾 **Leaderboard**: Teljesítménytárolás
- 🔄 **Session Management**: Automatikus szobakezelés és újracsatlakozás
- 📡 **Socket.IO**: Valós idejű szinkronizáció

## Telepítés

### Szükségletek

- Python 3.7+
- Flask és Flask-SocketIO

### Lépések

1. Klónozd vagy töltsd le a projektet
2. Telepítsd a szükséges könyvtárakat:
   ```bash
   pip install -r requirements.txt
   ```

3. Indítsd el a szervert:
   ```bash
   python server.py
   ```

4. Nyisd meg böngészőben:
   ```
   http://localhost:5500
   ```

## Multiplayer Módó Használata

### Session Management Rendszer

Az alkalmazás automatikus session management rendszert használ:

- **Session ID**: Minden szoba kapcsolat egyedi session ID-val rendelkezik
- **Szoba Kódok**: IP-cím alapú szoba azonosítás
- **Automatikus Újracsatlakozás**: Ha a játékos lecsatlakozik, automatikusan újra tud csatlakozni
- **Error Handling**: Részletes hibaüzenetek és visszajelzés

### Szoba Létrehozása

1. Nyisd meg a **Többjátékos** oldalt
2. Kattints a **"🏠 Szoba Létrehozása"** gombra
3. Add meg a játékos nevét
4. Válaszd ki a mérkőzés típusát (1v1, Best of 3, Best of 5)
5. A szoba IP kódja megjelenik - ezt add meg az ellenfélnek

### Szobához Csatlakozás

1. Nyisd meg a **Többjátékos** oldalt
2. Kattints a **"🔑 Szobához Csatlakozás"** gombra
3. Add meg a játékos nevét
4. Add meg a **host IP címét** (amit az ellenfél adott meg)
5. Kattints a **"Csatlakozás"** gombra

### Szerver Beállítása LAN-on

1. Ha saját szervert szeretnél futtatni, add meg az IP-t:
   - Lépj a **"LAN szerver cim"** mezőbe
   - Add meg az IP-t (pl. `192.168.1.25:5500`)
   - Kattints a **"Szerver mentese"** gombra

2. A szerver debug endpointa: `http://{LAN_IP}:5500/rooms`

## Szerver Debug

A szerver indítása során megjelenik:
```
==============================================================
🎮 KÒ, PAPÍR, OLLÓ - MULTIPLAYER SZERVER
==============================================================
🚀 Socket.IO szerver indítása port 5500 (debug=False)...
📍 LAN cím: http://192.168.1.25:5500
🌐 Csatlakozás böngészőből: http://192.168.1.25:5500/tobbjatekos.html
📊 Szobák megtekintése: http://192.168.1.25:5500/rooms
==============================================================
```

### Elérhető Endpointok

- `GET /` - Főoldal
- `GET /tobbjatekos.html` - Multiplayer lobby
- `GET /game.html` - Játék oldala
- `GET /leaderboard` - Leaderboard adatok
- `POST /save-score` - Pontszám mentése
- `GET /host-info` - Szerver LAN információ
- `GET /rooms` - Aktív szobák listája (debug)

## Socket.IO Események

### Kliens → Szerver

- `create_room` - Új szoba létrehozása
- `join_room` - Szobához csatlakozás
- `make_choice` - Választás küldése (kő/papír/olló)
- `reconnect_player` - Játékos újracsatlakoztatása

### Szerver → Kliens

- `room_created` - Szoba sikeresen létrehozva
- `room_joined` - Szobához sikeresen csatlakozva
- `player_joined` - Új játékos csatlakozat
- `round_result` - Kör eredménye
- `player_disconnected` - Játékos lecsatlakozat
- `error` - Hiba történt

## Session Kezelés

A kliens oldali session manager a `sessionStorage` API-t használja:

```javascript
// Session inicializálása
sessionManager.initSession(roomCode, playerName);

// Session lekérése
const session = sessionManager.getSession();

// Session törlése
sessionManager.clearSession();
```

## Leaderboard

- **GET** `/leaderboard?difficulty=konnyu` - Könnyű módú rekordok
- **GET** `/leaderboard?difficulty=kozepes` - Közepes módú rekordok
- **GET** `/leaderboard?difficulty=nehez` - Nehéz módú rekordok
- **POST** `/save-score` - Új pont mentése

## Hibakezelés

Az alkalmazás részletes hibaüzeneteket biztosít:

- "Szoba nem talált" - Az adott szoba kód nem létezik
- "Szoba megtelt" - Már 2 játékos van a szobában
- "Név már foglalt" - Az adott nevet már használja másik játékos
- "A szerver nem érhető el" - Socket.IO kapcsolat probléma

## Hibaelhárítás

### Nem tudom csatlakozni a szerverhez

1. Ellenőrizd, hogy a `server.py` fut-e
2. Nézd meg a szerver LAN IP címét az indítási üzenetben
3. Ellenőrizd a tűzfal beállítások
4. Próbálj meg localhost-ról először: `http://localhost:5500`

### Szobához nem tudok csatlakozni

1. Ellenőrizd, hogy a szoba kódja helyes
2. Nézd meg a szerver `/rooms` endpointot
3. Ellenőrizd a kliens console-ban az error üzeneteket (F12)
4. Próbálj meg újra csatlakozni

### A játék nem szinkronizálódik

1. Ellenőrizd az internet sebességet
2. Nézd meg a böngésző console-ban a Socket.IO üzeneteket
3. Próbálj meg oldalt frissíteni (F5)

## Fájlstruktúra

```
├── server.py                 # Python szerver
├── game.html                 # Játék oldala
├── tobbjatekos.html          # Multiplayer lobby
├── game.js                   # Játék logika
├── multiplayer.js            # Session & Socket.IO kezelés
├── style.css                 # Stílusok
├── socket.io.min.js          # Socket.IO kliens könyvtár
└── leaderboard.json          # Leaderboard adatok
```

## Technológiák

- **Backend**: Flask + Flask-SocketIO
- **Frontend**: HTML5, CSS3, JavaScript
- **Realtime**: Socket.IO
- **Adattárolás**: JSON (Leaderboard)

## Megfigyelések

- Maximum 2 játékos lehet egyszerre egy szobában
- A szobák in-memory tárolva vannak (szerver újraindítás után törlődnek)
- Session adatok böngésző session storage-ban tárolódnak
- A szoba kódja az IP cím alapján generálódik

## Szerző

KPO Fejlesztési Csapat

## Licenc

MIT License