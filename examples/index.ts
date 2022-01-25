import { Environment, createEnvironment } from '..';
import { createLogger } from '../lib/logger';
import { EchoService } from './EchoService';

const logger = createLogger('demo-flow');

async function configureEnvironment(): Promise<Environment> {
  logger.info('configuring environment services...');

  const serviceA = new EchoService('A');
  const serviceB = new EchoService('B');
  const serviceC = new EchoService('C');
  const serviceD = new EchoService('D');
  const serviceE = new EchoService('E');

  return createEnvironment(
    {
      A: {
        service: serviceC,
        dependencies: [serviceA, serviceB]
      },
      E: {
        service: serviceE,
        dependencies: [serviceC, serviceD]
      },
      D: {
        service: serviceD,
        dependencies: [serviceC]
      },
      C: {
        service: serviceC
      }
    },
    'demo-envr'
  );
}

export async function main(): Promise<void> {
  const env = await configureEnvironment();

  const ctx = await env.start();

  logger.info(`environment services: ${Array.from(ctx.services.values()).join(', ')}`);

  await env.stop();
  logger.info('environment stopped');
}
