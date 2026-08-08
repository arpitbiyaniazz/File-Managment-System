# Module 6: Message Queue & Workers — RabbitMQ Event-Driven Architecture

## Goal

Build an **Asynchronous Event-Driven Architecture** using **RabbitMQ** to decouple microservices, offload heavy background tasks, and handle system events asynchronously.

Currently, file uploads and metadata changes are processed synchronously. With RabbitMQ, services publish events (e.g., `file.created`, `file.deleted`), and background workers consume these events to perform indexing, audit logging, and storage accounting without blocking HTTP responses.

---

## Architecture & Topology

```mermaid
graph TD
    subgraph "Publishers (Producer Services)"
        FS[File Service :3002] -->|publish 'file.created' / 'file.deleted'| Ex
        MS[Metadata Service :3003] -->|publish 'folder.created' / 'folder.deleted'| Ex
        AS[Auth Service :3001] -->|publish 'user.registered'| Ex
    end

    subgraph "RabbitMQ Broker (:5672)"
        Ex[Topic Exchange: filemanager.events]
        
        Ex -->|routing: file.*, folder.*| Q1[Queue: search_indexing_queue]
        Ex -->|routing: file.created, file.deleted| Q2[Queue: storage_stats_queue]
        Ex -->|routing: #| Q3[Queue: audit_log_queue]

        Q1 -.->|on failure| DLX[Dead Letter Exchange: filemanager.dlx]
        DLX --> DLQ[Queue: dead_letter_queue]
    end

    subgraph "Consumers (Worker Service)"
        Q1 -->|consume| W1[Search Indexing Worker]
        Q2 -->|consume| W2[Storage Quota Worker]
        Q3 -->|consume| W3[Audit Log Worker]
        
        W1 -->|upsert/delete| ES[(Elasticsearch)]
        W2 -->|update storageUsed| PG[(PostgreSQL)]
        W3 -->|log event| AL[(Console / Audit Log)]
    end
```

> [!IMPORTANT]
> **System Design Concept: Asynchronous Decoupling & Dead Letter Queues**
> 
> - **Publisher Non-blocking**: When a file is uploaded, `file-service` returns HTTP 201 immediately after saving to MinIO/DB, then emits a `file.created` event.
> - **At-Least-Once Delivery**: Messages require manual acknowledgment (`channel.ack(msg)`). If a worker crashes, RabbitMQ re-queues the message.
> - **Dead Letter Queue (DLQ)**: If a message fails processing after max retries, it is routed to `filemanager.dlq` for manual inspection rather than poisoning the queue.

---

## Message Schemas & Routing Keys

### Routing Key: `file.created`
```json
{
  "eventId": "uuid",
  "eventType": "FILE_CREATED",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "payload": {
    "fileId": "uuid",
    "originalName": "report.pdf",
    "storageKey": "userId/uuid.pdf",
    "mimeType": "application/pdf",
    "size": 1048576,
    "ownerId": "uuid",
    "folderId": null
  }
}
```

### Routing Key: `file.deleted`
```json
{
  "eventId": "uuid",
  "eventType": "FILE_DELETED",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "payload": {
    "fileId": "uuid",
    "ownerId": "uuid",
    "size": 1048576
  }
}
```

---

## Implementation Plan

### Phase 1: Infrastructure & Shared AMQP Utilities
- Start `fm-rabbitmq` container (`rabbitmq:3-management-alpine` on ports 5672 / 15672)
- Install `amqplib` and `@types/amqplib` in `@file-manager/shared-utils`
- Build a resilient RabbitMQ publisher helper (`RabbitMQClient`) with auto-reconnect logic

### Phase 2: Create `worker-service` App
- Create `apps/worker-service` monorepo workspace package
- Setup RabbitMQ topology (Exchange: `filemanager.events`, Queues: `search_indexing_queue`, `storage_stats_queue`, `audit_log_queue`, and DLX)
- Implement consumers & message handlers:
  - **Search Worker**: Calls `elasticService.indexDocument()` or `deleteDocument()`
  - **Storage Worker**: Recalculates user storage in DB
  - **Audit Worker**: Logs structured event metrics

### Phase 3: Integrate Producers into Microservices
- Update `file-service` to publish `file.created` and `file.deleted` events
- Update `metadata-service` to publish `folder.created` and `folder.deleted` events

### Phase 4: Verification & E2E Testing
- Verify RabbitMQ Management UI (`http://localhost:15672`)
- Test publishing `file.created` event -> verify Search Service automatically indexes the file into Elasticsearch
- Test publishing `file.deleted` event -> verify file is auto-removed from Elasticsearch
- Test Dead Letter Queue (DLQ) behavior on invalid messages

---

Please review and approve this implementation plan!
