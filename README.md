# In/Out Board

A real-time employee in/out status board for internal use. Employees can update their status, assign company vehicles, and leave comments from any browser on the network. An admin page handles employee and vehicle management, logo upload, and other configuration.

## Features

- Real-time updates via WebSocket — all open browsers stay in sync
- Status tracking: IN / OUT / OFF (with optional comment and estimated return time)
- Company vehicle assignment per employee
- Bulk editing of multiple employees at once
- Dark mode
- Admin page protected by password

---

## Quick Start (Local)

```bash
npm install
npm start
```

The app runs at http://localhost:3000. The admin page is at http://localhost:3000/admin.html (default password: `admin`).

> **Note:** A warning is printed at startup if `ADMIN_PASSWORD` is not set. Always set a real password before exposing the app on a network.

---

## Docker Deployment

### Build and run with Docker Compose

```bash
# 1. Copy and edit the environment variables
cp .env.example .env   # then edit ADMIN_PASSWORD and COOKIE_SECRET

# 2. Start
docker compose up -d
```

The app will be available at http://your-server:3000.

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ADMIN_PASSWORD` | Yes | `admin` | Password for the admin page |
| `COOKIE_SECRET` | Recommended | random (per restart) | Secret used to sign the session cookie. Set this so sessions survive container restarts. |
| `DATA_DIR` | No | app root | Directory where `inoutboard.db` is stored. Set by docker-compose automatically. |
| `PORT` | No | `3000` | HTTP port to listen on |

### Persistent Data

Two paths need to survive container restarts. `docker-compose.yml` handles this with named volumes:

| Path in container | What it holds |
|---|---|
| `/data` | SQLite database (`inoutboard.db`) |
| `/app/public/images` | Uploaded logo (`logo.png`) |

If you prefer bind mounts (e.g. to back up to a host directory):

```yaml
volumes:
  - ./data:/data
  - ./images:/app/public/images
```

### Putting it behind a reverse proxy

For HTTPS (recommended), proxy port 3000 through nginx or Caddy. WebSocket connections use the same port — ensure your proxy passes the `Upgrade` header:

**nginx example:**
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

---

## Development

```bash
npm install
npm start          # starts the server with auto-restart on crash (use nodemon for watch mode)
node seed.js       # optional: seed the database with sample employees
```

The server logs every request to stdout:
```
2026-02-21T14:00:00.000Z GET / 200 3ms
2026-02-21T14:00:00.012Z GET /employees 200 1ms
```

---

## Project Structure

```
server.js          # Express + WebSocket server
db.js              # SQLite setup and migrations
public/
  index.html       # Main board (read/write status for all staff)
  admin.html       # Admin page (add/remove employees & vehicles, upload logo)
  admin-login.html # Admin login page
  images/          # Uploaded images (volume-mounted in production)
seed.js            # Dev seed script
```
