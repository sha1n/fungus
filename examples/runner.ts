import { Environment } from '..';
import { createLogger, Logger } from '../lib/logger';

const logger = createLogger('main');

export async function run(createEnv: (logger: Logger) => Environment): Promise<void> {
  const env = createEnv(logger);

  try {
    const ctx = await env.start();

    logger.info(`environment services: ${Array.from(ctx.services.values()).join(', ')}`);

    await env.stop();
    logger.info('environment stopped');
  } catch (e) {
    logger.error('oops! something went wrong...');
    logger.error(e);
  }
}

export default run;
