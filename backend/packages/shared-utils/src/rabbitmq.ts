// ============================================
// RabbitMQ Publisher Utility
// ============================================
// Shared publisher helper for all microservices.
// Publishes events to the 'filemanager.events' Topic Exchange.
// ============================================

import amqp from 'amqplib';
import { createLogger } from './logger';

const logger = createLogger('rabbitmq-publisher');

export const EXCHANGE_NAME = 'filemanager.events';
export const DLX_EXCHANGE_NAME = 'filemanager.dlx';

export const ROUTING_KEYS = {
  FILE_CREATED: 'file.created',
  FILE_DELETED: 'file.deleted',
  FOLDER_CREATED: 'folder.created',
  FOLDER_DELETED: 'folder.deleted',
  USER_REGISTERED: 'user.registered',
} as const;

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

/**
 * Get or create RabbitMQ channel.
 */
async function getChannel(): Promise<amqp.Channel> {
  if (channel) return channel;

  try {
    if (!connection) {
      const conn: any = await amqp.connect(RABBITMQ_URL);
      connection = conn;
      conn.on('error', (err: any) => {
        logger.error('RabbitMQ connection error', { error: err });
        connection = null;
        channel = null;
      });
      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        connection = null;
        channel = null;
      });
    }

    const createdChannel = await (connection as any).createChannel();
    await createdChannel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    channel = createdChannel;
    logger.info('RabbitMQ publisher channel initialized');
    return createdChannel;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ broker', { error, url: RABBITMQ_URL });
    throw error;
  }
}

/**
 * Publish an event to the RabbitMQ Topic Exchange.
 */
export async function publishEvent<T = any>(routingKey: string, payload: T): Promise<boolean> {
  try {
    const ch = await getChannel();
    const messageBuffer = Buffer.from(
      JSON.stringify({
        eventId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        routingKey,
        timestamp: new Date().toISOString(),
        payload,
      })
    );

    const published = ch.publish(EXCHANGE_NAME, routingKey, messageBuffer, {
      persistent: true,
      contentType: 'application/json',
    });

    if (published) {
      logger.info(`Published event [${routingKey}]`, { routingKey });
    } else {
      logger.warn(`Failed to buffer event [${routingKey}]`);
    }

    return published;
  } catch (error) {
    logger.error(`Error publishing event [${routingKey}]`, { error, routingKey });
    return false;
  }
}
