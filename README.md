# File Management & Storage System

A production-grade file management system following microservices architecture, built for learning system design principles used by Google Drive, Dropbox, and OneDrive.

## Architecture

```
Frontend (React + Vite)  →  API Gateway (Nginx)  →  Microservices  →  Infrastructure
     :5173                       :80                 :3001-3004        PostgreSQL, Redis,
                                                                       MinIO, RabbitMQ,
                                                                       Elasticsearch
```

### Two-Project Structure

| Project | Purpose | Tech |
|---------|---------|------|
| `backend/` | Monorepo with all microservices | Node.js, Express, TypeScript |
| `frontend/` | React single-page application | React, TypeScript, Vite |

### Backend Services

| Service | Port | Responsibility |
|---------|------|----------------|
| Auth Service | 3001 | Registration, login, JWT, RBAC |
| File Service | 3002 | Upload, download, file operations |
| Metadata Service | 3003 | File metadata, folders, permissions |
| Search Service | 3004 | Full-text search, indexing |

### Infrastructure

| Technology | Port | Purpose |
|------------|------|---------|
| Nginx | 80 | API Gateway — routes to services |
| PostgreSQL | 5432 | Relational database for metadata |
| Redis | 6379 | Caching, sessions, rate limiting |
| MinIO | 9000/9001 | S3-compatible object storage |
| RabbitMQ | 5672/15672 | Message queue for async tasks |
| Elasticsearch | 9200 | Full-text search engine |

## Quick Start

### Prerequisites
- Node.js >= 18
- pnpm >= 8 (`npm install -g pnpm`)
- Docker & Docker Compose

### Backend Development

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.example .env

# 4. Build shared packages
pnpm build

# 5. Start infrastructure (PostgreSQL, Redis, MinIO)
docker-compose up -d postgres redis minio

# 6. Start all services in dev mode (with hot reload)
pnpm dev
```

### Frontend Development

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start dev server (proxies /api/* to backend)
npm run dev

# 4. Open http://localhost:5173
```

### Full Stack with Docker

```bash
# Start everything
cd backend
docker-compose up -d

# Check health
./infrastructure/scripts/health-check.sh
```

## Project Structure

```
├── backend/                    # Backend monorepo
│   ├── apps/                   # Microservices
│   │   ├── auth-service/       # :3001
│   │   ├── file-service/       # :3002
│   │   ├── metadata-service/   # :3003
│   │   └── search-service/     # :3004
│   ├── packages/               # Shared code
│   │   ├── shared-types/       # TypeScript interfaces
│   │   ├── shared-utils/       # Logger, errors, responses
│   │   └── shared-config/      # Shared configs
│   ├── workers/                # Background processors
│   ├── infrastructure/         # Docker, Nginx, scripts
│   ├── docker-compose.yml
│   └── turbo.json
│
└── frontend/                   # React app
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/           # API client
    │   ├── types/              # API contract types
    │   └── styles/
    └── vite.config.ts
```

## Module Progress

- [x] Module 1: Project Foundation & Architecture
- [x] Module 2: Authentication Service
- [x] Module 3: Database & ORM (Prisma)
- [x] Module 4: File Service (MinIO) & Metadata Service
- [x] Module 5: Search Service (Elasticsearch)
- [x] Module 6: Message Queue & Workers
- [ ] Module 7: Caching (Redis)
- [ ] Module 8: Frontend UI
- [ ] Module 9: Production Hardening

## License

Private — Educational Project
