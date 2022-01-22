type ServiceId = string;

interface EnvContext {
  readonly name: string;
  readonly services: ReadonlyMap<ServiceId, ServiceDescriptor<unknown>>;
}

interface ServiceDescriptor<T> extends Identifiable {
  readonly id: ServiceId;
  readonly meta: T;
}

interface Service<T> extends Identifiable {
  start(ctx: EnvContext): Promise<T>;
  stop(ctx: EnvContext): Promise<void>;
}

interface Identifiable {
  readonly id: string;
}

export { ServiceId, EnvContext, ServiceDescriptor, Service, Identifiable };
