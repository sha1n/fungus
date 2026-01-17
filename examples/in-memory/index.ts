import { createEnvironment } from '../../lib/env';
import { Logger } from '../../lib/logger';
import createEchoService from './EchoService';
import run from '../demoRunner';
import { Environment } from '../../lib/types';

function configureEnvironment(logger: Logger): Environment {
  logger.info('configuring environment services...');

  const storageService = createEchoService('storage-srv');
  const mqService = createEchoService('mq-service');
  const configService = createEchoService('config-srv');
  const authService = createEchoService('auth-srv');
  const appService = createEchoService('app-srv');

  return createEnvironment(
    [
      {
        service: configService,
        dependsOn: [storageService, mqService]
      },
      {
        service: appService,
        dependsOn: [configService, authService]
      },
      {
        service: authService,
        dependsOn: [configService]
      }
    ],
    { name: 'demo-env' }
  );
}

void run(configureEnvironment);
