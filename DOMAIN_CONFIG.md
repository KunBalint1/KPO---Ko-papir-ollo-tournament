# KPO Tournament - Domain Proxy Configuration

## cPanel / Apache2 Proxy Setup

Ha cPanel-es a rackhost, és a weboldalad az `index.html` fájlon fut:

### 1. A Flask szerver portja (pl. 5000)
```
SSH: python3 server.py
```

### 2. Apache Proxy Rules

Fájl: `.htaccess` vagy a domain root-jában

```apache
# Enable mod_proxy modules
<IfModule mod_proxy.c>
    ProxyRequests Off
    ProxyPreserveHost On
    
    # Proxy /socket.io és /leaderboard a Flask szerverre
    ProxyPass /socket.io http://127.0.0.1:5000/socket.io
    ProxyPassReverse /socket.io http://127.0.0.1:5000/socket.io
    
    ProxyPass /leaderboard http://127.0.0.1:5000/leaderboard
    ProxyPassReverse /leaderboard http://127.0.0.1:5000/leaderboard
    
    ProxyPass /save-score http://127.0.0.1:5000/save-score
    ProxyPassReverse /save-score http://127.0.0.1:5000/save-score
    
    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/socket.io/(.*)$ "ws://127.0.0.1:5000/socket.io/$1" [P,L]
</IfModule>
```

---

## Nginx Proxy Setup

Ha Nginx-et használsz:

Fájl: `/etc/nginx/sites-available/your-domain.com`

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        # Statikus fájlok (HTML, CSS, JS)
        try_files $uri $uri/ =404;
    }
    
    location /socket.io {
        proxy_pass http://127.0.0.1:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
    
    location /leaderboard {
        proxy_pass http://127.0.0.1:5000/leaderboard;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /save-score {
        proxy_pass http://127.0.0.1:5000/save-score;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 10M;
    }
}
```

Alkalmazás:
```bash
sudo systemctl reload nginx
```

---

## Plesk Setup

1. Az Extensions > PHP Handler-ben jelöld be a Python-t
2. SSH-n keresztül terminálban:
   ```bash
   cd /var/www/vhosts/your-domain.com
   python3 server.py
   ```

---

## DirectAdmin Setup

SSH-n keresztül az SSH terminálban:
```bash
cd /home/username/public_html
python3 server.py
```

---

## Ha a rackhost nem engedi a backgroun processzeket

Egyes shared hosting szolgáltatók nem engedélyezik a Flask alkalmazások futtatását. 
Ebben az esetben:

1. Érdeklődj a host supportjánál, hogy támogatnak-e Python alkalmazásokat
2. Vagy válts egy VPS/Dedicated szerverre (pl. DigitalOcean, Linode, Vultr)
3. Vagy használj Heroku/Railway.app-ot (ingyenes tier van)

---

## Tesztelés

Szerver futása után:
```bash
curl http://your-domain.com/leaderboard
```

Sikeresen működik, ha JSON választ kapsz.
