import { retryAround, simpleRetryPolicy, TimeUnit } from '@sha1n/about-time';
import http from 'http';
import { RuntimeContext, Service } from '..';
import { createLogger, Logger } from '../lib/logger';
import startEchoServer from './echoServer';

type HttpServiceMetadata = {
  id: string;
  scheme: string;
  host: string;
  port: number;
  url: string;
  toString: () => string;
};

class EchoService implements Service {
  private logger: Logger;
  private stopHttpServer: () => Promise<void>;

  constructor(readonly id: string) {
    this.logger = createLogger(`echo-${this.id}`);
  }

  async start(ctx: RuntimeContext): Promise<HttpServiceMetadata> {
    this.logger.info(`start called with context of env: ${ctx.name}`);
    this.logger.info(`available services: ${Array.from(ctx.serviceCatalog.values()).join(', ')}`);

    this.logger.info(`staring ${this.id}...`);
    const { stop, scheme, address, port } = await startEchoServer();

    this.stopHttpServer = stop;
    const url = `${scheme}://${address}:${port}`;

    this.logger.info(`checking whether '${url}' is alive`);
    await retryAround(() => this.isAlive(url), simpleRetryPolicy(3, 1, { units: TimeUnit.Seconds }));

    return {
      id: this.id,
      scheme,
      host: address,
      port: port,
      url,
      toString: () => {
        return `[${this.id} -> ${url}]`;
      }
    };
  }

  async stop(ctx: RuntimeContext): Promise<void> {
    this.logger.info(`stop called with context of env: ${ctx.name}`);
    if (this.stopHttpServer) {
      this.logger.info(`stopping ${this.id}...`);
      await this.stopHttpServer();
    }
  }

  async isAlive(url: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = http.get(url, res => {
        if (!res.statusCode && res.statusCode !== 200) {
          reject(new Error(`Server returned status ${res.statusCode}`));
        }
        resolve(true);
      });

      request.setTimeout(100, () => {
        reject(new Error('Timeout'));
      });
    });
  }
}

function createEchoService(id: string): Service {
  return new EchoService(id);
}

export { createEchoService, HttpServiceMetadata };
export default createEchoService;
