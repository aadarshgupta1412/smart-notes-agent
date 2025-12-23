# Docker Setup

## Quick Start

```bash
# Start everything
docker-compose up

# Access:
# - Backend:  http://localhost:8000
# - Frontend: http://localhost:3000
# - API Docs: http://localhost:8000/docs
```

**Stop:** Press `Ctrl+C` or run `docker-compose down`

---

## What It Does

Creates 2 containers:
1. **Backend** - FastAPI app on port 8000
2. **Frontend** - Static HTML on port 3000 (nginx)

---

## Requirements

1. **Docker installed** - [Get Docker](https://docs.docker.com/get-docker/)
2. **`.env` file** with `GEMINI_API_KEY`

---

## Common Commands

```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop and remove containers
docker-compose down

# Rebuild after code changes
docker-compose up --build
```

---

## Troubleshooting

**Backend won't start:**
- Check `.env` file exists with valid `GEMINI_API_KEY`
- Check logs: `docker-compose logs backend`

**Port already in use:**
- Stop other services on ports 8000 or 3000
- Or change ports in `docker-compose.yml`

**Changes not reflected:**
- Rebuild: `docker-compose up --build`
