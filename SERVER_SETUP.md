# 🎮 KPO Tournament - Server Setup

## Lokális fejlesztésben

### 1. Függőségek telepítése
```bash
pip install -r requirements.txt
```

### 2. Server futtatása
```bash
python server.py
```

A szerver a `http://localhost:5000` címen lesz elérhető.

---

## 🌐 Rackhost / Produkció

### Opció 1: SSH-n keresztül futtatás (ajánlott)

#### 1. SSH csatlakozás
```bash
ssh username@your-domain.com
```

#### 2. Projekt mappához navigálás
```bash
cd /path/to/KPO---Ko-papir-ollo-tournament
```

#### 3. Függőségek telepítése (Python 3 szükséges)
```bash
pip3 install -r requirements.txt
```

#### 4. Server futtatása produkciós módban
```bash
PORT=8000 python3 server.py
```

**vagy** háttérben, hogy ne szakadjon meg az SSH kilépésekor:
```bash
nohup python3 server.py > server.log 2>&1 &
```

#### 5. A domain beállítása
A rackhost control panelen (cPanel, Plesk, stb.) állítsd be a proxy-t:
- **Forward port 5000 → 8000** vagy az általad választott portra
- Vagy állítsd be a weboldal root-ját, hogy a Flask szerverre proxy-zzon

---

### Opció 2: Supervisor/Systemd (hosszú időre)

#### Systemd service (Linux)

Fájl: `/etc/systemd/system/kpo-tournament.service`

```ini
[Unit]
Description=KPO Tournament Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/project
Environment="PORT=5000"
Environment="DEBUG=False"
ExecStart=/usr/bin/python3 /path/to/project/server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Szerver indítása:
```bash
sudo systemctl start kpo-tournament
sudo systemctl enable kpo-tournament  # Auto-start
sudo systemctl status kpo-tournament  # Ellenőrzés
```

---

## 🐛 Hibakeresés

### Port már használatban van
```bash
lsof -i :5000  # Linux/Mac
netstat -ano | findstr :5000  # Windows
```

Kill process:
```bash
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows
```

### Nincs modul hiba
```bash
python3 -m pip install --upgrade pip
pip3 install -r requirements.txt --force-reinstall
```

### Socket.IO polling nem működik
- Ellenőrizd: `multiplayer.js` tartalmazza-e `transports: ['polling', 'websocket']`
- A domain konfigurációja engedélyezi-e a long-polling-ot

---

## 📝 Environment variables

- `PORT` - Port szám (default: 5000)
- `DEBUG` - Debug mód (default: False)

Pl:
```bash
PORT=8000 DEBUG=True python3 server.py
```

---

## ✅ Ellenőrzés

A szerver futása után:
```bash
curl http://localhost:5000/leaderboard
```

Vagy böngészőn:
```
http://your-domain.com:5000/leaderboard
```

Sikeres response: JSON leaderboard adatok
