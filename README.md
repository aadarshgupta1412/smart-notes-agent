# Smart Notes Agent

An AI-powered note management backend built with FastAPI and Google Gemini API. Create notes, manage them with full CRUD operations, and leverage an intelligent agent that can list and summarize your notes using natural language.

## ✨ Features

- **Full CRUD for Notes** - Create, Read, Update, Delete operations
- **AI Agent** - Natural language queries powered by Google Gemini API
- **Streaming Support** - Real-time agent thought process visualization
- **Production-Ready** - Eager singleton initialization, comprehensive error handling
- **Docker Support** - Complete containerization with docker-compose
- **Testing UI** - Beautiful single-page interface for testing all endpoints

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Start everything
docker-compose up

# Access the application
# Backend:  http://localhost:8000
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

**Backend (Port 8000):**
```bash
# 1. Install dependencies
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 2. Create .env file in project root
echo "GEMINI_API_KEY=your_api_key_here" > .env
# Get your API key from: https://makersuite.google.com/app/apikey

# 3. Run the backend
uvicorn app.main:app --reload
```

**Frontend (Port 3000):**
```bash
# In a new terminal
cd frontend
python3 -m http.server 3000

# Or simply open the file directly
open frontend/index.html
```

**Access:**
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Frontend UI: http://localhost:3000

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notes` | POST | Create a note |
| `/notes` | GET | List all notes |
| `/notes/{id}` | GET | Get specific note |
| `/notes/{id}` | PUT | Update note |
| `/notes/{id}` | DELETE | Delete note |
| `/agent/ask` | POST | Query agent (standard) |
| `/agent/ask/stream` | POST | Query agent (streaming) |

## 🧪 Quick Test

```bash
# Create a note
curl -X POST http://localhost:8000/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Hello World"}'

# Ask the agent
curl -X POST http://localhost:8000/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"query":"list my notes"}'
```

## 🏗️ Architecture

**Clean Architecture with:**
- **Repository Pattern** - Easy database migration (currently in-memory)
- **Eager Singleton Initialization** - Zero cold start, fail-fast on errors
- **Layered Design** - Router → Service → Repository
- **Comprehensive Error Handling** - Graceful API failure handling with retries

## 📚 Documentation

- **[Original Specification](documentation/smart-note-agent.md)** - Assignment requirements
- **[API Testing Guide](documentation/TEST_ALL_ENDPOINTS.md)** - cURL examples for all endpoints
- **[Docker Setup](documentation/DOCKER.md)** - Container deployment guide

## 🛠️ Tech Stack

- **Backend:** FastAPI, Python 3.13
- **AI:** Google Gemini API (gemini-2.5-flash)
- **Storage:** In-memory (repository pattern for easy DB migration)
- **Frontend:** Vanilla HTML/CSS/JS with Tailwind
- **Deployment:** Docker & Docker Compose

## 📝 Configuration

Create a `.env` file in the project root directory:

```bash
# Create .env file
cat > .env << EOF
GEMINI_API_KEY=your_gemini_api_key_here
EOF
```

**Get your free API key:** https://makersuite.google.com/app/apikey

**Important:** The `.env` file must be in the **project root** (`smart-notes-agent/`), not in subdirectories.

## 🧪 Testing UI

A beautiful testing interface is included at `frontend/index.html`:
- Test all CRUD operations
- Try AI agent queries
- See streaming responses in real-time
- No build process required

## 🐛 Troubleshooting

**Server won't start?**
- Check `GEMINI_API_KEY` in `.env`
- Ensure Python 3.10+ installed
- Verify port 8000 is available

**AI not working?**
- Verify API key is valid
- Check logs for specific errors

## 📦 Project Structure

```
smart-notes-agent/
├── app/                    # Backend application
│   ├── models/            # Pydantic models
│   ├── repositories/      # Data access layer (Repository Pattern)
│   ├── routers/           # API endpoints
│   └── services/          # Business logic & AI integration
├── frontend/              # Testing UI (single HTML file)
├── tests/                 # Pytest test suite
├── documentation/         # API docs & guides
├── Dockerfile            # Docker configuration
└── docker-compose.yml    # Docker Compose setup
```

## 🧪 Tests

Run the test suite:
```bash
pytest -v
```

Tests cover: CRUD operations, Agent routing, Streaming, Repository Pattern. See [`tests/README.md`](tests/README.md) for details.

## 📄 License

Educational/Assessment Project

---

**Built with ❤️ using FastAPI and Google Gemini AI**
