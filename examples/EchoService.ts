import { retryAround, simpleRetryPolicy, TimeUnit } from '@sha1n/about-time';
import http from 'http';
import { EnvContext, Service } from '..';
import { createLogger, Logger } from '../lib/logger';
import startEchoServer from './echo-server';

type HttpServiceMeta = {
  scheme: string;
  host: string;
  port: number;
  url: string;
  toString: () => string;
};

class EchoService implements Service<HttpServiceMeta> {
  private logger: Logger;
  private stopHttpServer: () => Promise<void>;

  constructor(readonly id: string) {
    this.logger = createLogger(this.toString());
  }

  toString(): string {
    return `service-${this.id}`;
  }

  async start(ctx: EnvContext): Promise<HttpServiceMeta> {
    this.logger.info(`start called with context of env: ${ctx.name}`);
    this.logger.info(
      `available services: ${Array.from(ctx.services.values())
        .map(s => s.meta)
        .join(', ')}`
    );

    this.logger.info(`staring ${this.toString()}...`);
    const { stop, scheme, address, port } = await startEchoServer();

    this.stopHttpServer = stop;
    const url = `${scheme}://${address}:${port}`;

    this.logger.info(`checking whether '${url}' is alive`);
    await retryAround(() => isAlive(url), simpleRetryPolicy(3, 1, { units: TimeUnit.Seconds }));

    return {
      scheme,
      host: address,
      port: port,
      url,
      toString: () => {
        return `[${this.id} -> ${url}]`;
      }
    };
  }

  async stop(ctx: EnvContext): Promise<void> {
    this.logger.info(`stop called with context of env: ${ctx.name}`);
    if (this.stopHttpServer) {
      this.logger.info(`stopping ${this.toString()}...`);
      await this.stopHttpServer();
    }
  }
}

async function isAlive(url: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      if (!res.statusCode && res.statusCode !== 200) {
        reject(new Error(`Server returned status ${res.statusCode}`));
      }

      resolve(true);
    });
  });
}

export { EchoService };
