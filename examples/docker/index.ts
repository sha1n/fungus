import http from 'http';
import { createEnvironment } from '../../lib/env';
import { Logger } from '../../lib/logger';
import { Environment } from '../../lib/types';
import run from '../demoRunner';
import createContainerService, { createVolumeService, dockerExec } from './docker';

function configureEnvironment(logger: Logger): Environment {
  logger.info('configuring environment services...');

  const mysqlVolumeService = createVolumeService({
    name: 'mysql-data',
    remove: true
  });
  const mysqlService = createContainerService({
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
  const proxyService = createContainerService({
    image: 'nginx',
    name: 'proxy',
    remove: true,
    daemon: true,
    ports: {
      '8083': '80'
    },
    healthCheck: {
      check: isAlive('http://localhost:8083')
    }
  });
  const app1 = createContainerService({
    image: 'sha1n/hako',
    name: 'echo-app',
    remove: true,
    daemon: true,
    ports: {
      '8081': '8080'
    },
    healthCheck: {
      check: isAlive('http://localhost:8081/echo')
    }
  });
  const app2 = createContainerService({
    image: 'sha1n/dummy-loader',
    name: 'loader-app',
    remove: true,
    daemon: true,
    ports: {
      '8082': '8080'
    },
    healthCheck: {
      check: isAlive('http://localhost:8082/health')
    }
  });

  return createEnvironment(
    {
      MySQL: {
        service: mysqlService,
        dependsOn: [mysqlVolumeService]
      },
      AppService1: {
        service: app1,
        dependsOn: [mysqlService, proxyService]
      },
      AppService2: {
        service: app2,
        dependsOn: [mysqlService, app1]
      }
    },
    'demo-env'
  );
}

function isAlive(url: string): () => Promise<void> {
  return () => {
    return new Promise((resolve, reject) => {
      const request = http.get(url, res => {
        if (!res.statusCode && res.statusCode !== 200) {
          reject(new Error(`Server returned status ${res.statusCode}`));
        }
        resolve();
      });

      request.on('error', reject);
      request.setTimeout(100, () => {
        reject(new Error('Timeout'));
      });
    });
  };
}

run(configureEnvironment);
