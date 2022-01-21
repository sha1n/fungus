import { debug } from 'debug';

const rootNamespace = 'fungus';

interface Logger {
  info(message: string, ...args: []): void;
  debug(message: string, ...args: []): void;
  error(message: string, ...args: []): void;
}

function createLogger(namespace: string): Logger {
  return {
    info: debug(`${rootNamespace}:info:${namespace}`),
    debug: debug(`${rootNamespace}:debug:${namespace}`),
    error: debug(`${rootNamespace}:error:${namespace}`)
  };
}

export { Logger, createLogger };
