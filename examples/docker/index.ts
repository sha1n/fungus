import { createEnvironment, Environment } from '../../lib/Environment';
import { Logger } from '../../lib/logger';
import createEchoService from '../EchoService';
import run from '../run';
import createDockerizedService, { createDockerVolumeService } from './dockerized';

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
      'mysql-data': '/opt/test'
    },
    env: {
      MYSQL_ALLOW_EMPTY_PASSWORD: '1'
    }
  });
  const mysqlVolumeService = createDockerVolumeService({
    name: 'mysql-data',
    remove: true
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

  return createEnvironment(
    {
      Database: {
        service: mysqlService,
        dependsOn: [mysqlVolumeService]
      },
      App: {
        service: createEchoService('app1-srv'),
        dependsOn: [mysqlService, nginxService]
      },
      App2: {
        service: createEchoService('app2-srv')
      }
    },
    'demo-env'
  );
}

run(configureEnvironment);
