import { createEnvironment, Environment } from '../../lib/Environment';
import { Logger } from '../../lib/logger';
import createEchoService from '../EchoService';
import run from '../run';
import createDockerizedService, { createDockerVolumeService } from './dockerized';

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
      MYSQL_DATABASE: 'testdb',
      MYSQL_ROOT_PASSWORD: 'password'
    }
  });
  const mysqlVolumeService = createDockerVolumeService({
    name: 'mysql-data',
    remove: true
  });
  const mongoService = createDockerizedService({
    image: 'mongo:5.0.5',
    name: 'mongodb',
    remove: true,
    daemon: true,
    ports: {
      '27017': '27017'
    },
    volumes: {
      'mongo-data': '/data/db'
    },
    env: {
      MONGO_INITDB_ROOT_USERNAME: 'root',
      MONGO_INITDB_ROOT_PASSWORD: 'password'
    }
  });
  const mongoVolumeService = createDockerVolumeService({
    name: 'mongo-data',
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
      MySQL: {
        service: mysqlService,
        dependsOn: [mysqlVolumeService]
      },
      MongoDB: {
        service: mongoService,
        dependsOn: [mongoVolumeService]
      },
      App: {
        service: createEchoService('app1-srv'),
        dependsOn: [mysqlService, nginxService]
      },
      App2: {
        service: createEchoService('app2-srv'),
        dependsOn: [mongoService]
      }
    },
    'demo-env'
  );
}

run(configureEnvironment);
