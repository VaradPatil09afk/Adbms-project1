# UniSphere — Multi-Campus University Intelligence Platform

UniSphere is a runnable portfolio implementation of a distributed university data platform. It has a React portal, a FastAPI API, campus operational stores, central document/graph stores, a Kafka/Debezium CDC topology, dashboard provisioning, and safe AI-style analytics interfaces.

## Run it now (demo mode)

The API deliberately starts with a SQLite campus-store fallback. This makes the app usable without Docker while retaining the same REST contract as the distributed deployment.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Demo accounts are `admin@unisphere.edu` / `admin123`, `faculty@unisphere.edu` / `faculty123`, and `student@unisphere.edu` / `student123`.

## Full distributed topology

```bash
cp .env.example .env
docker compose up --build
```

This starts PostgreSQL (Pune and Bengaluru), MySQL (Mumbai legacy), MongoDB, Neo4j, Kafka + Kafka Connect/Debezium, the API, UI, and Grafana. The API runs on `:8000`, UI on `:5173`, Neo4j Browser on `:7474`, Grafana on `:3000`, Kafka Connect on `:8083`.

Register the included CDC connectors after the stack is healthy:

```bash
curl -X POST http://localhost:8083/connectors -H 'Content-Type: application/json' \
  --data @infrastructure/connectors/pune-postgres.json
curl -X POST http://localhost:8083/connectors -H 'Content-Type: application/json' \
  --data @infrastructure/connectors/mumbai-mysql.json
```

## Architecture and consistency

Campus operational records are authoritative in campus PostgreSQL/MySQL stores. Debezium captures their changes into Kafka. Consumers project events into MongoDB (document/search projection) and Neo4j (relationship projection). The central hub is **eventually consistent**: a newly committed campus record can take a short time to appear in search, graphs, and dashboards. This makes adding a campus an operational change (database + connector) rather than a central-schema change.

The app never exposes database credentials to the browser. Role-bound JWT-style signed tokens protect APIs. The assistant uses intent routing and parameterized repository calls; it has read-only tools and cannot issue free-form SQL or mutate enrollment data.

## Project layout

- `backend/` — FastAPI API, auth, campus repository, analytics/chat/search services
- `frontend/` — Vite + React role-based portal
- `infrastructure/` — initialization scripts, Debezium connector configs, Grafana provisioning
- `docker-compose.yml` — local multi-service distributed stack

## API highlights

`POST /api/auth/login`, `GET /api/campuses`, `GET|POST /api/students`, `GET|POST /api/courses`, `POST /api/enrollments`, `GET /api/analytics/overview`, `GET /api/analytics/risk`, `GET /api/search?q=`, `POST /api/assistant/query`, and `GET /api/graph/prerequisites/{course_code}`.

`POST /api/intelligence/train` refits the transparent dropout-risk baseline from stored academic signals. In production it should be scheduled, versioned and governed, but the in-app version demonstrates the full feature/inference flow safely.
