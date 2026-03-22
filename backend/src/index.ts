import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

/**
 * {{PLUGIN_DISPLAY_NAME}} API Server
 *
 * CUSTOMIZE:
 * - Replace class name and log messages
 * - Add WebSocket server if needed
 * - Add database initialization
 */
class PluginServer {
  private app: Express;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.server.corsOrigins,
      credentials: true,
    }));
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.path}`, { ip: req.ip });
      next();
    });

    logger.info('Middleware setup complete');
  }

  private setupRoutes(): void {
    // Health check (no namespace)
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'healthy', timestamp: new Date() });
    });
    this.app.get('/healthz', (_req, res) => {
      res.json({ status: 'ok' });
    });

    // CUSTOMIZE: Set your API namespace
    this.app.use('/{{PLUGIN_SLUG}}/api', routes);

    logger.info('Routes mounted successfully');
  }

  private setupErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      const port = config.server.port;
      this.app.listen(port, () => {
        logger.info(`{{PLUGIN_DISPLAY_NAME}} API server started on port ${port}`);
        logger.info(`Environment: ${config.server.nodeEnv}`);
        logger.info(`API Base URL: http://localhost:${port}/{{PLUGIN_SLUG}}/api`);
      });

      logger.info('='.repeat(60));
      logger.info('{{PLUGIN_DISPLAY_NAME}} is ready!');
      logger.info('='.repeat(60));
    } catch (error) {
      logger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down gracefully...');
    logger.info('Shutdown complete');
    process.exit(0);
  }
}

const server = new PluginServer();
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());
server.start().catch((error) => {
  logger.error('Fatal error during startup', { error });
  process.exit(1);
});

export default server;
