import { createEnvironment, Environment } from '../..';
import { Logger } from '../../lib/logger';
import { EchoService } from '../EchoService';
import run from '../runner';
import createDockerizedService from './dockerized';

function configureEnvironment(logger: Logger): Environment {
  logger.info('configuring environment services...');

  const mysqlService = createDockerizedService({
    image: 'mysql:8',
    name: 'mysql',
    remove: true,
    daemon: true,
    ports: {
      '3306': '3306'
    },
    volumes: {
      test: '/opt/test'
    },
    env: {
      MYSQL_ALLOW_EMPTY_PASSWORD: '1'
    }
  });
  const nginxService = createDockerizedService({
    image: 'nginx',
    name: 'proxy',
    remove: true,
    daemon: true,
    ports: {
      '80': '80'
    }
  });
  const appService = new EchoService('app-srv');

  return createEnvironment(
    {
      App: {
        service: appService,
        dependsOn: [mysqlService, nginxService]
      }
    },
    'demo-env'
  );
}

run(configureEnvironment);
