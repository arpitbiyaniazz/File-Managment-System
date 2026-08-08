// ============================================
// Cache Invalidation Consumer Worker
// ============================================
// Listens to domain events on RabbitMQ and invalidates
// stale Redis cache keys in real-time.
// ============================================

import amqp from 'amqplib';
import { QUEUES } from '../services/topology.service';
import { createLogger, delCache, delByPattern } from '@file-manager/shared-utils';

const logger = createLogger('cache-worker');

export async function startCacheConsumer(channel: amqp.Channel): Promise<void> {
  // Bind queue to Exchange for cache invalidation events
  const queueName = 'cache_invalidation_queue';
  
  try {
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, 'filemanager.events', 'file.*');
    await channel.bindQueue(queueName, 'filemanager.events', 'folder.*');

    logger.info(`Starting Cache Invalidation Consumer on queue [${queueName}]`);
    await channel.prefetch(10);

    channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString());
        const { routingKey, payload } = event;

        logger.info(`[Cache Worker] Received event [${routingKey}]`, { eventId: event.eventId });

        const ownerId = payload.ownerId;
        if (ownerId) {
          // Invalidate user folder contents cache
          await delByPattern(`fm:folder:${ownerId}:*`);
        }

        if (payload.fileId) {
          // Invalidate file metadata cache
          await delCache(`fm:file:${payload.fileId}`);
        }

        channel.ack(msg);
      } catch (error) {
        logger.error('[Cache Worker] Error invalidating cache', { error });
        channel.nack(msg, false, false);
      }
    });
  } catch (error) {
    logger.error('Failed to setup cache invalidation consumer', { error });
  }
}
