import { Environment } from '../lib/types';
import { createLogger, Logger } from '../lib/logger';

const logger = createLogger('main');

function registerInterruptHandler(env: Environment) {
  process.on('SIGINT', () => {
    env.stop().then(
      () => {
        process.exit(0);
      },
      err => {
        logger.error(err);
        process.exit(1);
      }
    );
  });
}

export async function run(createEnv: (logger: Logger) => Environment): Promise<void> {
  const env = createEnv(logger);

  registerInterruptHandler(env);

  try {
    const ctx = await env.start();

    logger.info(`environment services: ${Array.from(ctx.serviceCatalog.values()).join(', ')}`);

    await env.stop();
    logger.info('environment stopped');
  } catch (e) {
    logger.error('oops! something went wrong...');
    logger.error(e);
  }
}

export default run;
