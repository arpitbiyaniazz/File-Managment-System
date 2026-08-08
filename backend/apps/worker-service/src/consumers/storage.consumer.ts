// ============================================
// Storage Quota Consumer Worker
// ============================================
// Asynchronously updates user's total storage usage in PostgreSQL
// on file upload and deletion events.
// ============================================

import amqp from 'amqplib';
import { prisma } from '@file-manager/database';
import { QUEUES } from '../services/topology.service';
import { createLogger } from '@file-manager/shared-utils';

const logger = createLogger('storage-worker');

export async function startStorageConsumer(channel: amqp.Channel): Promise<void> {
  logger.info(`Starting Storage Consumer on queue [${QUEUES.STORAGE_STATS}]`);

  await channel.prefetch(5);

  channel.consume(QUEUES.STORAGE_STATS, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const { routingKey, payload } = event;

      logger.info(`[Storage Worker] Received event [${routingKey}]`, { eventId: event.eventId });

      if (routingKey === 'file.created') {
        const { ownerId, size } = payload;
        await prisma.user.update({
          where: { id: ownerId },
          data: {
            storageUsed: {
              increment: BigInt(size || 0),
            },
          },
        });
        logger.info(`[Storage Worker] Incremented storage for user [${ownerId}] by +${size} bytes`);
      } else if (routingKey === 'file.deleted') {
        const { ownerId, size } = payload;
        if (size) {
          await prisma.user.update({
            where: { id: ownerId },
            data: {
              storageUsed: {
                decrement: BigInt(size),
              },
            },
          });
          logger.info(`[Storage Worker] Decremented storage for user [${ownerId}] by -${size} bytes`);
        }
      }

      channel.ack(msg);
    } catch (error) {
      logger.error('[Storage Worker] Error processing storage event', { error });
      channel.nack(msg, false, false);
    }
  });
}
