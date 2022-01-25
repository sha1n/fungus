import { Environment, createEnvironment } from '..';
import { createLogger } from '../lib/logger';
import { EchoService } from './EchoService';

const logger = createLogger('main');

async function configureEnvironment(): Promise<Environment> {
  logger.info('configuring environment services...');

  const storageService = new EchoService('storage-srv');
  const mqService = new EchoService('mq-service');
  const configService = new EchoService('config-srv');
  const authService = new EchoService('auth-srv');
  const appService = new EchoService('app-srv');

  return createEnvironment(
    {
      ConfigService: {
        service: configService,
        dependsOn: [storageService, mqService]
      },
      App: {
        service: appService,
        dependsOn: [configService, authService]
      },
      AuthService: {
        service: authService,
        dependsOn: [configService]
      }
    },
    'demo-env'
  );
}

export async function main(): Promise<void> {
  const env = await configureEnvironment();

  const ctx = await env.start();

  logger.info(`environment services: ${Array.from(ctx.services.values()).join(', ')}`);

  await env.stop();
  logger.info('environment stopped');
}

// eslint-disable-next-line no-floating-promise/no-floating-promise
main();
