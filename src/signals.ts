import { logger } from './logger.js';

export function registerSignalHandlers(): void {
  // プロセス終了時のクリーンアップ
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}
