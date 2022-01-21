/* eslint-disable @typescript-eslint/no-explicit-any */
import { debug } from 'debug';

const rootNamespace = 'fungus';

interface Logger {
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

function createLogger(namespace: string): Logger {
  return {
    info: debug(`${rootNamespace}:info:${namespace}`),
    debug: debug(`${rootNamespace}:debug:${namespace}`),
    error: debug(`${rootNamespace}:error:${namespace}`)
  };
}

export { Logger, createLogger };
