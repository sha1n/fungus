import { retryAround, simpleRetryPolicy, TimeUnit, RetryPolicy } from '@sha1n/about-time';
import child_process from 'child_process';
import { v4 as uuid } from 'uuid';
import { createLogger } from '../../lib/logger';
import { Service, ServiceMetadata } from '../../lib/types';

const logger = createLogger('docker-service');

type DockerContainerOptions = {
  image: string;
  name?: string;
  remove?: boolean;
  ports?: { [key: string]: string };
  volumes?: { [key: string]: string };
  env?: { [key: string]: string };
  cmd?: string;
  network?: string;
  daemon?: boolean;
  healthCheck?: {
    check: () => Promise<void>;
    retryPolicy?: RetryPolicy;
  };
};

type DockerVolumeOptions = {
  name?: string;
  remove?: boolean;
};

type ContainerMetadata = {
  name?: string;
  ports?: { [key: string]: string };
  volumes?: { [key: string]: string };
  network?: string;
  toString: () => string;
} & ServiceMetadata;

function createDockerizedService(opts: DockerContainerOptions): Service {
  const name = opts.name || uuid();
  let started = false;

  return {
    id: name,
    start: async (): Promise<ContainerMetadata> => {
      logger.debug('starting container %s...', name);
      await executeCommand(interpret(name, opts));
      started = true;
      logger.debug('container %s started', name);

      if (opts?.healthCheck) {
        logger.info('waiting for container %s to pass health check...', name);
        await retryAround(
          async () => {
            logger.info('checking health of container %s...', name);
            await opts.healthCheck.check();
          },

          opts.healthCheck?.retryPolicy || simpleRetryPolicy(10, 1, { units: TimeUnit.Second })
        );
        logger.info('container %s is ready', name);
      }

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
      if (started) {
        logger.debug('stopping container %s...', name);
        await executeCommand(`docker stop ${name}`);
        logger.debug('container %s stopped', name);
      }
    }
  };
}

function createDockerVolumeService(opts?: DockerVolumeOptions): Service {
  const volumeName = opts?.name || uuid();
  let started = false;

  return {
    id: volumeName,
    start: async (): Promise<ContainerMetadata> => {
      logger.debug('creating docker volume %s...', volumeName);
      await executeCommand(`docker volume create ${volumeName}`);
      started = true;
      logger.debug('volume %s started', volumeName);

      return {
        id: volumeName,
        toString: () => `[volume:${volumeName}]`
      };
    },
    stop: async () => {
      if (started && opts?.remove) {
        logger.debug('deleting volume %s...', volumeName);
        await executeCommand(`docker volume remove --force ${volumeName}`);
        logger.debug('volume %s removed', volumeName);
      }
    }
  };
}

function interpret(name: string, opts: DockerContainerOptions): string {
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

async function dockerExec(container: string, command: string): Promise<number> {
  const dockerCommand = `docker exec ${container} ${command}`;

  return executeCommand(dockerCommand);
}

async function executeCommand(cmd: string): Promise<number> {
  logger.debug('running: %s', cmd);
  return new Promise<number>((resolve, reject) => {
    const p = child_process.spawn(cmd, { stdio: 'inherit', shell: true });
    const onExit = (code: number) => {
      if (code !== 0) {
        reject(new Error(`Command exit code: ${code}`));
      }
      resolve(code);
    };

    p.on('error', reject);
    p.on('exit', onExit);
    p.on('close', onExit);
  });
}

export { DockerContainerOptions, ContainerMetadata, DockerVolumeOptions, createDockerVolumeService, dockerExec };
export default createDockerizedService;
