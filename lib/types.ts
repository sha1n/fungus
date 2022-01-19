export type ServiceID = string;

export interface EnvironmentContext {
  readonly name: string;
  readonly services: ReadonlyMap<ServiceID, ServiceDescriptor>;
}

export interface ServiceDescriptor extends Identifiable {
  readonly id: ServiceID;
  readonly meta: unknown;
}

export interface Service extends Identifiable {
  start(ctx: EnvironmentContext): Promise<unknown>;

  stop(ctx: EnvironmentContext): Promise<void>;
}

export interface Identifiable {
  readonly id: string;
}
