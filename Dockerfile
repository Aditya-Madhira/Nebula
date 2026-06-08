# ========================================================
# Stage 1: Build the React frontend static assets
# ========================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ========================================================
# Stage 2: Spin up the Python backend server
# ========================================================
FROM python:3.11-slim
WORKDIR /app

# Install base packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ ./

# Copy compiled React assets into backend's dist directory
COPY --from=frontend-builder /frontend/dist ./dist

# Expose production port
EXPOSE 8000

# Start FastAPI production server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
