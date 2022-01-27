import { sleep } from '@sha1n/about-time';
import http from 'http';
import { AddressInfo } from 'net';
import { createLogger } from '../lib/logger';

const logger = createLogger('echo-serv');

function realisticPauseTime(): number {
  if (process.env['DEMO']) {
    const min = 1000;
    const max = 3000;
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  return 0;
}

type ServerHandle = {
  scheme: string;
  address: string;
  port: number;
  stop: () => Promise<void>;
};

export default function start(): Promise<ServerHandle> {
  logger.info('starting HTTP server...');

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
        const { address, port } = server.address() as AddressInfo;
        logger.info('HTTP server listening on localhost:%s', port);

        const stop = () =>
          new Promise<void>(resolve => {
            server.close(); // good enough for the demo
            sleep(realisticPauseTime()) // making it feel more real
              .then(resolve);
          });

        sleep(realisticPauseTime()) // making it feel more real
          .then(() => resolve({ scheme: 'http', address, port, stop }));
      });
  });
}
