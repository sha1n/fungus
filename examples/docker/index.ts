import { createEnvironment, Environment } from '../../lib/Environment';
import { Logger } from '../../lib/logger';
import createEchoService from '../EchoService';
import run from '../run';
import createDockerizedService, { createDockerVolumeService, dockerExec } from './dockerized';

function configureEnvironment(logger: Logger): Environment {
  logger.info('configuring environment services...');

  const mysqlService = createDockerizedService({
    image: 'mysql:8.0.28',
    name: 'mysql',
    remove: true,
    daemon: true,
    ports: {
      '3306': '3306'
    },
    volumes: {
      'mysql-data': '/var/lib/mysql'
    },
    env: {
      MYSQL_ALLOW_EMPTY_PASSWORD: '1'
    },
    healthCheck: {
      check: async () => {
        await dockerExec('mysql', 'mysql -hlocalhost -P3306 -uroot');
      }
    }
  });
  const mysqlVolumeService = createDockerVolumeService({
    name: 'mysql-data',
    remove: true
  });
  const proxyService = createDockerizedService({
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
      MySQL: {
        service: mysqlService,
        dependsOn: [mysqlVolumeService]
      },
      AppService1: {
        service: createEchoService('app-srv-1'),
        dependsOn: [mysqlService, proxyService]
      },
      AppService2: {
        service: createEchoService('app-srv-2'),
        dependsOn: [mysqlService]
      }
    },
    'demo-env'
  );
}

run(configureEnvironment);
