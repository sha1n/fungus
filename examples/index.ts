import { retryAround, simpleRetryPolicy, TimeUnit } from '@sha1n/about-time';
import http from 'http';
import { Environment, EnvironmentContext, Service } from '..';
import { createLogger, Logger } from '../lib/logger';
import startEchoServer from './echo-server';

const logger = createLogger('demo-flow');

type DemoServiceMeta = {
  host: string;
  port: number;
  url: string;
  toString: () => string;
};

class DemoService implements Service {
  private logger: Logger;
  private stopHttpServer: () => Promise<void>;
  private url: string;

  constructor(readonly id: string) {
    this.logger = createLogger(this.toString());
  }

  toString(): string {
    return `service-${this.id}`;
  }

  async start(ctx: EnvironmentContext): Promise<DemoServiceMeta> {
    this.logger.info(`start called with context of env: ${ctx.name}`);
    this.logger.info(
      `available services: ${Array.from(ctx.services.values())
        .map(s => s.meta)
        .join(', ')}`
    );

    this.logger.info(`staring ${this.toString()}...`);
    const { stop, address, port } = await startEchoServer();

    this.stopHttpServer = stop;
    this.url = `http://${address}:${port}`;

    await retryAround(() => isAlive(this.url), simpleRetryPolicy(3, 1, { units: TimeUnit.Seconds }));

    return {
      host: address,
      port: port,
      url: this.url,
      toString: () => {
        return `[${this.id} -> ${this.url}]`;
      }
    };
  }

  async stop(ctx: EnvironmentContext): Promise<void> {
    this.logger.info(`stop called with context of env: ${ctx.name}`);
    if (this.stopHttpServer) {
      this.logger.info(`stopping ${this.toString()}...`);
      await this.stopHttpServer();
    }
  }
}

async function isAlive(url: string): Promise<boolean> {
  logger.info(`checking whether '${url}' is alive`);
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      if (!res.statusCode && res.statusCode !== 200) {
        reject(new Error(`Server returned status ${res.statusCode}`));
      }

      resolve(true);
    });
  });
}

async function configureEnvironment(environment: Environment): Promise<Environment> {
  logger.info('configuring environment services...');

  const serviceA = new DemoService('A');
  const serviceB = new DemoService('B');
  const serviceC = new DemoService('C');
  const serviceD = new DemoService('D');
  const serviceE = new DemoService('E');

  environment.register(serviceC, [serviceA, serviceB]);
  environment.register(serviceE, [serviceC, serviceD]);
  environment.register(serviceD, [serviceC]);
  environment.register(serviceC);

  return environment;
}

export async function main(): Promise<void> {
  const env = new Environment('demo-envr');
  await configureEnvironment(env)
    .then(env => {
      logger.info('starting environment...');
      return env.start();
    })
    .then(ctx => {
      logger.info('environment started');
      logger.info(
        `environment services: ${Array.from(ctx.services.values())
          .map(s => s.meta)
          .join(', ')}`
      );
    })
    .then(() => {
      logger.info('stopping environment...');
      return env.stop();
    })
    .then(() => {
      logger.info('environment stopped');
    })
    .catch(logger.error);
}
