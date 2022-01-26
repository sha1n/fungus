import { createEnvironment, Environment } from '../..';
import { Logger } from '../../lib/logger';
import { EchoService } from '../EchoService';
import run from '../runner';

function configureEnvironment(logger: Logger): Environment {
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

run(configureEnvironment);
