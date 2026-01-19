/**
 * Process Cleanup Utility
 *
 * Handles graceful shutdown and resource cleanup for services.
 */

/**
 * Register cleanup handlers for graceful shutdown
 * @param {Object} resources - Resources to clean up
 * @param {Object} logger - Logger instance
 */
export function registerCleanupHandlers(resources, logger) {
  const cleanup = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      // Close database connections
      if (resources.database) {
        logger.info('Closing database connection...');
        resources.database.close();
      }

      // Close Redis connections
      if (resources.redis) {
        logger.info('Closing Redis connection...');
        await resources.redis.quit();
      }

      // Stop job queue processing
      if (resources.jobQueue) {
        logger.info('Stopping job queue...');
        resources.jobQueue.stop();
      }

      // Close HTTP server
      if (resources.server) {
        logger.info('Closing HTTP server...');
        await new Promise((resolve) => {
          resources.server.close(resolve);
        });
      }

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  };

  // Handle various termination signals
  process.on('SIGTERM', () => cleanup('SIGTERM'));
  process.on('SIGINT', () => cleanup('SIGINT'));
  process.on('SIGHUP', () => cleanup('SIGHUP'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    cleanup('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    cleanup('unhandledRejection');
  });
}

export default { registerCleanupHandlers };
