# Module 7: Caching Layer — Redis Caching & Invalidation Strategy

## Goal

Implement a **Distributed Caching Layer** using **Redis** to reduce database read load, provide sub-millisecond API response times for folder/file browsing, and enforce centralized token blacklisting and rate limiting.

Browsing folder hierarchies and file details accounts for ~80% of system traffic. By implementing the **Cache-Aside (Read-Through)** pattern combined with **Event-Driven Cache Invalidation**, we ensure high read performance with strong cache consistency.

---

## Architecture & Caching Strategy

```mermaid
graph TD
    subgraph "Client Requests"
        C[Client / Frontend] -->|GET /api/metadata/folders/:id/contents| MS[Metadata Service]
    end

    subgraph "Read-Through (Cache-Aside)"
        MS -->|1. Check Cache| R[(Redis Cache :6379)]
        R -.->|2a. Cache Hit (sub-ms)| MS
        MS -->|2b. Cache Miss| PG[(PostgreSQL)]
        PG -.->|3. Return Data| MS
        MS -.->|4. Populate Cache (TTL 5m)| R
    end

    subgraph "Event-Driven Cache Invalidation"
        MQ[RabbitMQ 'filemanager.events'] -->|file/folder mutative events| CW[Cache Worker / Subscriber]
        CW -->|DEL filemanager:folder:{id}| R
    end
```

> [!IMPORTANT]
> **System Design Concept: Cache-Aside & Event-Driven Invalidation**
> 
> - **Cache-Aside (Read-Through)**: Applications check Redis before querying PostgreSQL.
> - **Event-Driven Invalidation**: When a file/folder is renamed, moved, or deleted, an event is published to RabbitMQ. The worker invalidates the corresponding Redis key immediately, avoiding stale data reads.
> - **Cache Stampede Prevention**: Short TTLs (e.g., 300s) combined with atomic cache set operations protect the system against thundering herd problems.

---

## Redis Key Naming Conventions & TTLs

| Key Pattern | Data Type | TTL | Description |
|-------------|-----------|-----|-------------|
| `fm:folder:{id}:contents` | JSON String | 300s (5m) | Folder subfolders & files list |
| `fm:file:{id}` | JSON String | 600s (10m) | Single file metadata record |
| `fm:user:{userId}:quota` | String/Hash | 300s (5m) | User storage limit and usage |
| `fm:auth:blacklist:{jti}` | String ("1") | Exp time | Blacklisted JWT tokens |
| `fm:ratelimit:{ip}:{endpoint}` | Counter | 60s (1m) | Rate limiting counter |

---

## Implementation Plan

### Phase 1: Shared Redis Client & Caching Utility
- Start `fm-redis` Docker container (Port 6379)
- Enhance `packages/shared-utils/src/redis.ts` with `ioredis` connection manager, `getCache`, `setCache`, `delCache`, and pattern deletion (`delByPattern`)
- Provide graceful fallback (if Redis is unreachable, pass through to DB without crashing)

### Phase 2: Cache-Aside Integration in Metadata Service
- Integrate Redis cache into `folder.service.ts`:
  - `getFolderContents()`: Read from Redis -> DB fallback -> Set Redis cache
  - `getFile()`: Read from Redis -> DB fallback -> Set Redis cache
- Benchmark response latency (Cache Hit vs. Cache Miss)

### Phase 3: Event-Driven Cache Invalidation
- Add Cache Invalidation consumer to `apps/worker-service` or `metadata-service`:
  - On `file.created` / `file.deleted` -> Invalidate parent folder cache
  - On `folder.created` / `folder.deleted` -> Invalidate parent folder cache
  - On folder move/rename -> Invalidate folder cache & parent folder cache

### Phase 4: Verification & E2E Latency Testing
- Test Cache Miss vs. Cache Hit latency
- Verify cache invalidation when a new file/folder is added or removed
- Verify Redis failure fallback (shut down Redis container, ensure API still works seamlessly via PostgreSQL)

---

Please review and approve this implementation plan!
