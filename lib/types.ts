export type ServiceID = string;

export interface EnvContext {
  readonly name: string;
  readonly services: ReadonlyMap<ServiceID, ServiceDescriptor>;
}

export interface ServiceDescriptor extends Identifiable {
  readonly id: ServiceID;
  readonly meta: unknown;
}

export interface Service extends Identifiable {
  start(ctx: EnvContext): Promise<unknown>;

  stop(ctx: EnvContext): Promise<void>;
}

export interface Identifiable {
  readonly id: string;
}
