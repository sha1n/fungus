type ServiceId = string;

interface EnvContext {
  readonly name: string;
  readonly services: ReadonlyMap<ServiceId, ServiceDescriptor>;
}

interface ServiceDescriptor extends Identifiable {
  readonly id: ServiceId;
  readonly meta: unknown;
}

interface Service extends Identifiable {
  start(ctx: EnvContext): Promise<unknown>;

  stop(ctx: EnvContext): Promise<void>;
}

interface Identifiable {
  readonly id: string;
}

export { ServiceId, EnvContext, ServiceDescriptor, Service, Identifiable };
