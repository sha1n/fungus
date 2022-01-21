import http from 'http';
import { createLogger } from '../lib/logger';
import { sleep } from '@sha1n/about-time';

const logger = createLogger('echo-serv');

function randomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

type ServerHandle = {
  address: string;
  port: number;
  stop: () => Promise<void>;
};

export default function start(): Promise<ServerHandle> {
  logger.info('Starting HTTP server...');

  return new Promise<ServerHandle>(resolve => {
    const server = http
      .createServer(function (request, response) {
        response.writeHead(200);
        request.on('data', function (message) {
          response.write(message);
        });
        request.on('end', function () {
          response.end();
        });
      })
      .listen(0, 'localhost', () => {
        const { address, port } = server.address() as any;
        logger.info('HTTP server listening on localhost:%s', port);

        const stop = () =>
          new Promise<void>(resolve => {
            server.close(); // good enough for the demo
            sleep(randomInt(100, 1000)) // making it feel more real
              .then(resolve);
          });

        sleep(randomInt(1000, 3000)) // making it feel more real
          .then(() => resolve({ address, port, stop }));
      });
  });
}
