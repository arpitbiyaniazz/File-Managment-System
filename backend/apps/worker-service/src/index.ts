// ============================================
// Worker Service — Entry Point
// ============================================
// Asynchronous background event processor (RabbitMQ Consumers).
// ============================================

import { createLogger } from '@file-manager/shared-utils';
import { setupTopology } from './services/topology.service';
import { startSearchConsumer } from './consumers/search.consumer';
import { startStorageConsumer } from './consumers/storage.consumer';
import { startAuditConsumer } from './consumers/audit.consumer';

const logger = createLogger('worker-service');

async function main() {
  try {
    logger.info('🚀 Booting Worker Service...');

    const { channel } = await setupTopology();

    // Start all 3 consumers
    await startSearchConsumer(channel);
    await startStorageConsumer(channel);
    await startAuditConsumer(channel);

    logger.info('✅ Worker Service initialized & consuming queues');
  } catch (error) {
    logger.error('Worker Service boot failed', { error });
    process.exit(1);
  }
}

main();
