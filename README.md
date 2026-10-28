# 🌌 Nebula Anime

Nebula Anime is a high-fidelity, cinematic web application for anime curation and discovery backed by a local SQLite database. The platform offers desktop-optimized immersive visual effects, 3D card physics, clean UI transitions, and an intelligent Otaku Assistant chatbot.

---

## 🚀 Key Features
- **Cinematic Experience**: Immersive splash screen, dynamic starfields, orbital planetary scroll parallax, and interactive 3D perspective card tilt effects.
- **Desktop Only**: Intentionally optimized and protected for desktop monitors (`>= 1024px`) with a premium custom blocker overlay on mobile browsers.
- **Otaku AI Companion**: Chatbot (Ollama cloud LLM) to support database-connected natural queries, reasoning, and anime recommendations.
- **High-Performance Audio**: Procedural interface sound effects (Celesta chimes, synth warp rising tones, ticks) to enhance user interaction.
- **Optimistic UI Updates**: Instantly handles user actions (Like, Dislike, Add to Favorites List) locally and synchronizes state seamlessly with backend services.

---

## 🗄️ Database

Nebula uses a local SQLite file (`backend/nebula.db`, override with `NEBULA_DB_PATH`). Tables are created and the anime catalogue is seeded from `backend/anime.json` automatically on first start. The chatbot uses Ollama cloud via Agno (see `OLLAMA_*` in `.env.example`).

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory based on the `.env.example` file:

```env
# Frontend origin for CORS policy
FRONTEND_ORIGIN=http://localhost:3000

# Optional: SQLite file location
# NEBULA_DB_PATH=/path/to/nebula.db
```

---

## 📦 Local Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- Docker (optional)

### Setup Frontend
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```

### Setup Backend
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Set up a Python virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
