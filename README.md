# KPO---Ko-papir-ollo-tournament

Egy egyszerű Kő-Papír-Olló játék webes megvalósítása.

## Többjátékos mód

A többjátékos mód mostantól támogatja a több gépen történő játékot!

### Szerver indítása

1. Telepítsd a szükséges Python könyvtárakat:
   ```bash
   pip install flask flask-socketio python-socketio
   ```

2. Indítsd el a szervert:
   ```bash
   python server.py
   ```

3. A szerver elérhető lesz a `http://localhost:5000` címen.

### Játék több gépen

1. Egy játékos hozza létre a szobát a `tobbjatekos.html` oldalon
2. A másik játékos csatlakozzon ugyanazon a hálózaton, és használja a kapott szoba kódot
3. A játék valós időben szinkronizálódik minden csatlakozott eszközön

### Fontos megjegyzések

- A szervernek futnia kell mindkét játékos gépén vagy egy központi gépen
- Minden játékosnak ugyanazon a hálózaton kell lennie
- A játék automatikusan szinkronizál minden változást