# Docker Setup Design

**Date:** 2026-04-17
**Project:** Reddit Clone
**Scope:** Containerize backend and frontend for dev and prod environments

---

## Overview

Run the backend (Node/Express) and frontend (React/Vite) in Docker containers using multi-stage Dockerfiles. Dev includes a local MongoDB container for offline support. Prod connects to MongoDB Atlas.

---

## File Structure

```
REDDIT CLONE/
├── backend/
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile
│   └── .dockerignore
├── docker-compose.yml        # dev
├── docker-compose.prod.yml   # prod
```

---

## Approach

Multi-stage Dockerfiles — one `Dockerfile` per service with named stages (`dev`, `prod`). Docker builds only the stage requested by compose. No code duplication, no dev tools leaking into prod images.

---

## Backend Dockerfile

```dockerfile
# Stage 1 - dev
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# Stage 2 - prod
FROM node:20-alpine AS prod
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
CMD ["npm", "start"]
```

- `alpine` base keeps the image small (~50MB)
- Dev installs all dependencies including nodemon
- Prod omits dev dependencies (no nodemon, jest, supertest)

---

## Frontend Dockerfile

```dockerfile
# Stage 1 - dev
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev", "--", "--host"]

# Stage 2 - builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 3 - prod
FROM nginx:alpine AS prod
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

- Dev uses Vite dev server with `--host` to expose it outside the container
- Prod uses Nginx to serve the built static files — no Node runtime needed
- Builder stage compiles the React app; its output is copied into the Nginx image

---

## docker-compose.yml (dev)

```yaml
services:
  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build:
      context: ./backend
      target: dev
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "5000:5000"
    env_file: ./backend/.env
    depends_on:
      - mongo

  frontend:
    build:
      context: ./frontend
      target: dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      - VITE_PROXY_TARGET=http://backend:5000

volumes:
  mongo_data:
```

- Local files are mounted into containers so edits reflect instantly (hot reload)
- `node_modules` anonymous volume prevents local modules from overwriting the container's
- `mongo_data` named volume persists the local database between restarts
- `MONGO_URI` in `backend/.env` points to `mongodb://mongo:27017/redditclone`

---

## docker-compose.prod.yml (prod)

```yaml
services:
  backend:
    build:
      context: ./backend
      target: prod
    ports:
      - "5000:5000"
    env_file: ./backend/.env

  frontend:
    build:
      context: ./frontend
      target: prod
    ports:
      - "80:80"
```

- No mongo service — `MONGO_URI` in `backend/.env` points to MongoDB Atlas
- Frontend served on port 80 via Nginx
- No volume mounts — prod images are self-contained

---

## .dockerignore Files

**backend/.dockerignore**
```
node_modules
.env
coverage
.claude
```

**frontend/.dockerignore**
```
node_modules
.env
dist
```

---

## Environment Variables

Dev `backend/.env` additions:
```
MONGO_URI=mongodb://mongo:27017/redditclone
```

Prod `backend/.env` uses the existing Atlas URI.

**Frontend proxy:** The frontend uses relative URLs (`/api/...`) so all API calls go through Vite's proxy. The proxy target must be environment-configurable:

- Outside Docker: `http://localhost:5000`
- Inside Docker dev container: `http://backend:5000` (Docker service name)

`vite.config.js` will be updated to read the target from `process.env.VITE_PROXY_TARGET`:

```js
proxy: {
  '/api': {
    target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
    changeOrigin: true,
  }
}
```

`frontend/.env` (new file, for local dev outside Docker — not committed):
```
VITE_PROXY_TARGET=http://localhost:5000
```

Docker Compose sets `VITE_PROXY_TARGET=http://backend:5000` via environment in `docker-compose.yml`.

**Note:** `vite.config.js` currently has a bug — proxy points to port `5001` instead of `5000`. This will be fixed as part of implementation.

---

## Usage

```bash
# Dev
docker compose up

# Prod
docker compose -f docker-compose.prod.yml up --build
```

---

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| MongoDB in dev | Docker container | Works offline |
| MongoDB in prod | Atlas | Managed, reliable, already configured |
| Dockerfile strategy | Multi-stage | No duplication, clean separation |
| Frontend prod server | Nginx | No Node runtime needed for static files |
| Base image | node:20-alpine | Small, secure |
