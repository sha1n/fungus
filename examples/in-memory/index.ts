import { createEnvironment, Environment } from '../../lib/Environment';
import { Logger } from '../../lib/logger';
import createEchoService from '../EchoService';
import run from '../demoRunner';

function configureEnvironment(logger: Logger): Environment {
  logger.info('configuring environment services...');

  const storageService = createEchoService('storage-srv');
  const mqService = createEchoService('mq-service');
  const configService = createEchoService('config-srv');
  const authService = createEchoService('auth-srv');
  const appService = createEchoService('app-srv');

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

run(configureEnvironment);
