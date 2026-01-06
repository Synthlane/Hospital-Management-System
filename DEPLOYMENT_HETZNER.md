### HMS Hetzner Deployment Guide (Step 0 → Production + Redeploy via GitHub)

This document describes how the Hospital Management System (HMS) at **`https://hms.synthlane.com`** is deployed on a Hetzner server using **Docker Compose** and an existing **Dockerized Nginx reverse-proxy** (`synthlane-nginx`).

It is written so you can redeploy **safely** (without breaking other services) and update the deployment by pulling new code from GitHub.

---

### Step 0 — Requirements / Assumptions

- **Server**: Linux Hetzner VPS.
- **DNS**:
  - `hms.synthlane.com` → server public IP (A record).
  - (Optional) `api.hms.synthlane.com` is **not used** in this deployment because the wildcard cert `*.synthlane.com` does **not** cover `api.hms.synthlane.com`.
- **Reverse proxy**: There is an existing Docker container named **`synthlane-nginx`** already bound to ports 80/443.
- **TLS certificate**: wildcard cert file mounted inside `synthlane-nginx` at:
  - `/etc/nginx/certs/synthlane-cert.pem`
- **HMS runtime ports on the host**:
  - **Frontend**: `3000` (container serves static site via Nginx)
  - **Backend**: `8103` (Medplum server)

---

### Step 1 — Install required server packages

SSH to your server:

```bash
ssh root@YOUR_SERVER_IP
```

Install Docker and git (if not already installed):

```bash
apt-get update -y
apt-get install -y git ca-certificates curl

# Docker (Debian/Ubuntu typical)
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

Verify:

```bash
docker --version
docker compose version
git --version
```

---

### Step 2 — Clone the repo (safe GitHub usage)

**Do not** embed tokens in URLs (they leak easily). Use a public repo URL or an SSH deploy key.

Example (public repo):

```bash
cd /opt
git clone https://github.com/aditigarg4545/Hospital-Management-System.git hms
cd /opt/hms
```

If you want to deploy into a new folder for safety:

```bash
cd /opt
git clone https://github.com/aditigarg4545/Hospital-Management-System.git hms_new
```

---

### Step 3 — Create the production config files

This deployment uses:
- `/opt/hms/docker-compose.hms.yml`
- `/opt/hms/medplum.config.docker.json`
- `/opt/hms/packages/app/.env`

#### 3.1 Frontend env

Create `/opt/hms/packages/app/.env`:

```bash
cat > /opt/hms/packages/app/.env <<'EOF'
MEDPLUM_BASE_URL=https://hms.synthlane.com/
MEDPLUM_CLIENT_ID=
GOOGLE_CLIENT_ID=
RECAPTCHA_SITE_KEY=
MEDPLUM_REGISTER_ENABLED=true
EOF
```

#### 3.2 Backend config

Create a **valid JSON** `/opt/hms/medplum.config.docker.json`.
This file includes the signing key.

```bash
python3 - <<'PY'
import json
from pathlib import Path

repo = Path("/opt/hms")
pem = (repo / "synthhms_private.pem").read_text()

cfg = {
  "port": 8103,
  "baseUrl": "https://hms.synthlane.com",
  "appBaseUrl": "https://hms.synthlane.com",
  "supportEmail": "support@synthhms.com",
  "signingKeyId": "synthhms-prod-key",
  "signingKey": pem,
  "signingKeyPassphrase": "",
  "maxJsonSize": "1mb",
  "maxBatchSize": "50mb",
  "allowedOrigins": "https://hms.synthlane.com",
  "introspectionEnabled": True,
  "registerEnabled": True,
  "database": {
    "host": "postgres",
    "port": 5432,
    "dbname": "synthhms",
    "username": "admin",
    "password": "abcdEF@12"
  },
  "redis": {
    "host": "redis",
    "port": 6379,
    "password": "medplum"
  },
  "binaryStorage": "file:binary"
}

(repo / "medplum.config.docker.json").write_text(json.dumps(cfg, indent=2))
print("Wrote /opt/hms/medplum.config.docker.json")
PY
```

---

### Step 4 — Create Docker Compose file (production ports)

Create `/opt/hms/docker-compose.hms.yml`:

```bash
cat > /opt/hms/docker-compose.hms.yml <<'EOF'
services:
  postgres:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: abcdEF@12
      POSTGRES_DB: synthhms
    volumes:
      - hms_pgdata:/var/lib/postgresql/data
      - ./postgres/postgres.conf:/usr/local/etc/postgres/postgres.conf
    command: postgres -c config_file=/usr/local/etc/postgres/postgres.conf

  redis:
    image: redis:7
    restart: always
    command: redis-server --requirepass medplum

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "8103:8103"
    volumes:
      - ./medplum.config.docker.json:/usr/src/medivyx/packages/server/medplum.config.json
      - hms_binary:/usr/src/medivyx/binary
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: .
      dockerfile: packages/app/Dockerfile
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  hms_pgdata:
  hms_binary:
EOF
```

---

### Step 5 — Configure `synthlane-nginx` for `hms.synthlane.com`

Because ports 80/443 are owned by the existing container `synthlane-nginx`, HMS is exposed by adding an Nginx vhost file mounted at:

- Host path: `/data/docker-data/nginx/conf.d/hms.conf`
- Container path: `/etc/nginx/conf.d/hms.conf`

Create/edit `/data/docker-data/nginx/conf.d/hms.conf` (important routes):

- `location /` → frontend on `http://172.17.0.1:3000`
- `location ~ ^/(fhir|auth|oauth|oauth2)/` → backend on `http://172.17.0.1:8103`
- `location ^~ /.well-known/` → backend (OIDC discovery needed for sign-in)

After editing, reload:

```bash
docker exec synthlane-nginx nginx -t
docker exec synthlane-nginx nginx -s reload
```

---

### Step 6 — First deploy (build + run)

From the repo directory:

```bash
cd /opt/hms
DOCKER_CLIENT_TIMEOUT=1800 COMPOSE_HTTP_TIMEOUT=1800 \
  docker compose -p hms -f docker-compose.hms.yml up -d --build
```

Check containers:

```bash
docker compose -p hms -f docker-compose.hms.yml ps
```

---

### Step 7 — Health checks (must pass)

```bash
curl -k -I https://hms.synthlane.com/ | sed -n '1,15p'
curl -k -I https://hms.synthlane.com/fhir/R4/metadata | sed -n '1,15p'
curl -k -I https://hms.synthlane.com/.well-known/openid-configuration | sed -n '1,15p'
curl -k -o /dev/null -w '%{http_code}\n' -X POST https://hms.synthlane.com/oauth2/token
```

Expected:
- `/` → `200`
- `/fhir/R4/metadata` → `200`
- `/.well-known/openid-configuration` → `200` with `application/json`
- `POST /oauth2/token` → typically `400` (without body), **NOT** `405`

---

### Step 8 — Default login (seeded user)

The backend seed creates a default super admin user:

- **Email**: `admin@example.com`
- **Password**: `medplum_admin`

---

### Step 9 — Redeploy with new GitHub changes (recommended flow)

#### 9.1 Pull changes

```bash
cd /opt/hms
git status
git pull --rebase
```

#### 9.2 Rebuild + restart containers

```bash
cd /opt/hms
DOCKER_CLIENT_TIMEOUT=1800 COMPOSE_HTTP_TIMEOUT=1800 \
  docker compose -p hms -f docker-compose.hms.yml up -d --build
```

#### 9.3 Verify

Run the health checks from Step 7.

---

### Step 10 — Zero-surprise upgrades (safe cutover pattern)

If you want a safer deployment:

1. Clone into a new folder:
   - `/opt/hms_new`
2. Build images there:
   - `docker compose -p hms_new_build -f docker-compose.hms.yml build`
3. Cut over quickly:
   - Stop old stack: `docker compose -p hms -f /opt/hms/docker-compose.hms.yml down`
   - Start new stack: `docker compose -p hms -f /opt/hms_new/docker-compose.hms.yml up -d --build`

Rollback is the same in reverse.

---

### Step 11 — Troubleshooting quick fixes

- **405 on `/oauth2/token`**:
  - Nginx is not proxying `/oauth2/*` to backend.
  - Ensure `location ~ ^/(fhir|auth|oauth|oauth2)/` exists in `hms.conf`.
- **Login fails / OIDC discovery broken**:
  - Ensure `location ^~ /.well-known/` proxies to backend.
- **Certificate errors**:
  - Do not use `api.hms.synthlane.com` unless you issue a cert that explicitly covers it.
- **502 from Nginx**:
  - Backend not running or port mismatch. Check:
    - `docker compose -p hms -f docker-compose.hms.yml ps`
    - `docker compose -p hms -f docker-compose.hms.yml logs --tail 200 backend`


