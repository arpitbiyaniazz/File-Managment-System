// ============================================
// RabbitMQ Topology Manager
// ============================================
// Asserts exchanges, dead-letter exchanges, queues, and bindings.
// ============================================

import amqp from 'amqplib';
import { config } from '../config';
import { createLogger } from '@file-manager/shared-utils';

const logger = createLogger('rabbitmq-topology');

export const QUEUES = {
  SEARCH_INDEXING: 'search_indexing_queue',
  STORAGE_STATS: 'storage_stats_queue',
  AUDIT_LOG: 'audit_log_queue',
  DEAD_LETTER: 'dead_letter_queue',
} as const;

export async function setupTopology(): Promise<{ connection: amqp.Connection; channel: amqp.Channel }> {
  try {
    const connection = (await amqp.connect(config.rabbitmq.url)) as any;
    const channel = await connection.createChannel();

    // 1. Assert Topic Exchange & Dead Letter Exchange
    await channel.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });
    await channel.assertExchange(config.rabbitmq.dlx, 'topic', { durable: true });

    // 2. Assert Dead Letter Queue & Bind to DLX
    await channel.assertQueue(QUEUES.DEAD_LETTER, { durable: true });
    await channel.bindQueue(QUEUES.DEAD_LETTER, config.rabbitmq.dlx, '#');

    const queueArgs = {
      'x-dead-letter-exchange': config.rabbitmq.dlx,
    };

    // 3. Assert Workers Queues with DLX configuration
    await channel.assertQueue(QUEUES.SEARCH_INDEXING, { durable: true, arguments: queueArgs });
    await channel.assertQueue(QUEUES.STORAGE_STATS, { durable: true, arguments: queueArgs });
    await channel.assertQueue(QUEUES.AUDIT_LOG, { durable: true, arguments: queueArgs });

    // 4. Bind Queues to Exchange with Routing Keys
    // Search Indexing Queue: file & folder lifecycle events
    await channel.bindQueue(QUEUES.SEARCH_INDEXING, config.rabbitmq.exchange, 'file.created');
    await channel.bindQueue(QUEUES.SEARCH_INDEXING, config.rabbitmq.exchange, 'file.deleted');
    await channel.bindQueue(QUEUES.SEARCH_INDEXING, config.rabbitmq.exchange, 'folder.created');
    await channel.bindQueue(QUEUES.SEARCH_INDEXING, config.rabbitmq.exchange, 'folder.deleted');

    // Storage Stats Queue: file created & deleted
    await channel.bindQueue(QUEUES.STORAGE_STATS, config.rabbitmq.exchange, 'file.created');
    await channel.bindQueue(QUEUES.STORAGE_STATS, config.rabbitmq.exchange, 'file.deleted');

    // Audit Log Queue: all events (#)
    await channel.bindQueue(QUEUES.AUDIT_LOG, config.rabbitmq.exchange, '#');

    logger.info('RabbitMQ Topology initialized successfully (Exchanges, Queues & DLX bindings)');

    return { connection, channel };
  } catch (error) {
    logger.error('Failed to setup RabbitMQ topology', { error });
    throw error;
  }
}
