// ============================================
// Search Indexing Consumer Worker
// ============================================
// Processes file.created, file.deleted, folder.created, folder.deleted events
// and automatically syncs Elasticsearch search index.
// ============================================

import amqp from 'amqplib';
import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { QUEUES } from '../services/topology.service';
import { createLogger } from '@file-manager/shared-utils';

const logger = createLogger('search-worker');
const esClient = new Client({ node: config.elasticsearch.node });
const INDEX_NAME = config.elasticsearch.index;

export async function startSearchConsumer(channel: amqp.Channel): Promise<void> {
  logger.info(`Starting Search Consumer on queue [${QUEUES.SEARCH_INDEXING}]`);

  // Prefetch 5 messages at a time for backpressure management
  await channel.prefetch(5);

  channel.consume(QUEUES.SEARCH_INDEXING, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const { routingKey, payload } = event;

      logger.info(`[Search Worker] Received event [${routingKey}]`, { eventId: event.eventId });

      switch (routingKey) {
        case 'file.created': {
          await esClient.index({
            index: INDEX_NAME,
            id: payload.fileId,
            document: {
              id: payload.fileId,
              itemType: 'FILE',
              name: payload.originalName,
              ownerId: payload.ownerId,
              mimeType: payload.mimeType,
              size: payload.size,
              folderId: payload.folderId || null,
              createdAt: event.timestamp,
              updatedAt: event.timestamp,
            },
            refresh: 'wait_for',
          });
          logger.info(`[Search Worker] Auto-indexed file [${payload.fileId}]`);
          break;
        }

        case 'file.deleted': {
          await esClient.delete({
            index: INDEX_NAME,
            id: payload.fileId,
            refresh: 'wait_for',
          }).catch((err) => {
            if (err.meta?.statusCode !== 404) throw err;
          });
          logger.info(`[Search Worker] Auto-removed file [${payload.fileId}] from index`);
          break;
        }

        case 'folder.created': {
          await esClient.index({
            index: INDEX_NAME,
            id: payload.folderId,
            document: {
              id: payload.folderId,
              itemType: 'FOLDER',
              name: payload.name,
              ownerId: payload.ownerId,
              folderId: payload.parentId || null,
              createdAt: event.timestamp,
              updatedAt: event.timestamp,
            },
            refresh: 'wait_for',
          });
          logger.info(`[Search Worker] Auto-indexed folder [${payload.folderId}]`);
          break;
        }

        case 'folder.deleted': {
          await esClient.delete({
            index: INDEX_NAME,
            id: payload.folderId,
            refresh: 'wait_for',
          }).catch((err) => {
            if (err.meta?.statusCode !== 404) throw err;
          });
          logger.info(`[Search Worker] Auto-removed folder [${payload.folderId}] from index`);
          break;
        }

        default:
          logger.debug(`[Search Worker] Ignored unhandled routing key [${routingKey}]`);
      }

      // Acknowledge message processing completion
      channel.ack(msg);
    } catch (error) {
      logger.error('[Search Worker] Error processing message', { error });
      // Reject message without requeue so it gets routed to Dead Letter Queue (DLQ)
      channel.nack(msg, false, false);
    }
  });
}
