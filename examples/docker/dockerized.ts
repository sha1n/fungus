import child_process from 'child_process';
import { v4 as uuid } from 'uuid';
import { createLogger } from '../../lib/logger';
import { Service, ServiceMetadata } from '../../lib/types';

const logger = createLogger('dockerized-service');

type DockerOptions = {
  image: string;
  name?: string;
  remove?: boolean;
  ports?: { [key: string]: string };
  volumes?: { [key: string]: string };
  env?: { [key: string]: string };
  cmd?: string;
  network?: string;
  daemon?: boolean;
};

type ContainerMetadata = {
  name?: string;
  ports?: { [key: string]: string };
  volumes?: { [key: string]: string };
  network?: string;
  toString: () => string;
} & ServiceMetadata;

function createDockerizedService(opts: DockerOptions): Service {
  const name = opts.name || uuid();

  return {
    id: name,
    start: async (): Promise<ContainerMetadata> => {
      await executeCommand(interpret(name, opts));

      return {
        id: name,
        name,
        ports: opts.ports,
        volumes: opts.volumes,
        network: opts.network,
        toString: () => `[container:${name}]`
      };
    },
    stop: async () => {
      await executeCommand(`docker kill ${name}`);
    }
  };
}

function interpret(name: string, opts: DockerOptions): string {
  const command = ['docker', 'run', '--name', name];

  if (opts.daemon) {
    command.push('-d');
  }

  if (opts.remove) {
    command.push('--rm');
  }

  if (opts.network) {
    command.push('--network', opts.network);
  }

  const appendArgs = (flag: string, index: { [key: string]: string }, delim: string) => {
    if (index) {
      for (const key of Object.keys(index)) {
        command.push(flag, `${key}${delim}${index[key]}`);
      }
    }
  };

  appendArgs('-e', opts.env, '=');
  appendArgs('-v', opts.volumes, ':');
  appendArgs('-p', opts.ports, ':');

  command.push(opts.image);

  return command.join(' ');
}

async function executeCommand(cmd: string): Promise<number> {
  logger.debug('Running: %s', cmd);
  return new Promise<number>((resolve, reject) => {
    const p = child_process.spawn(cmd, { stdio: 'inherit', shell: true });

    p.on('error', reject);
    p.on('exit', code => {
      resolve(code);
    });
    p.on('close', code => {
      resolve(code);
    });
  });
}

export { DockerOptions, ContainerMetadata };
export default createDockerizedService;
