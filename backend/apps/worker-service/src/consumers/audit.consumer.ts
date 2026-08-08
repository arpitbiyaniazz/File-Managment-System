// ============================================
// Audit Log Consumer Worker
// ============================================
// Asynchronously logs system events for monitoring and metrics.
// ============================================

import amqp from 'amqplib';
import { QUEUES } from '../services/topology.service';
import { createLogger } from '@file-manager/shared-utils';

const logger = createLogger('audit-worker');

export async function startAuditConsumer(channel: amqp.Channel): Promise<void> {
  logger.info(`Starting Audit Consumer on queue [${QUEUES.AUDIT_LOG}]`);

  await channel.prefetch(10);

  channel.consume(QUEUES.AUDIT_LOG, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      logger.info(`[AUDIT EVENT] [${event.routingKey}]`, {
        eventId: event.eventId,
        timestamp: event.timestamp,
        payload: event.payload,
      });

      channel.ack(msg);
    } catch (error) {
      logger.error('[Audit Worker] Error logging event', { error });
      channel.nack(msg, false, false);
    }
  });
}
