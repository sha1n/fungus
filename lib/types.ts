type ServiceId = string;

class RuntimeContext {
  private readonly serviceMap: Map<ServiceId, ServiceDescriptor<unknown>> = new Map();

  constructor(readonly name: string) {}

  query<T>(id: ServiceId): void | ServiceDescriptor<T> {
    const descriptor = this.serviceMap.get(id);

    return descriptor ? (descriptor as ServiceDescriptor<T>) : undefined;
  }

  register<T>(descriptor: ServiceDescriptor<T>): void {
    this.serviceMap.set(descriptor.id, descriptor);
  }

  get services(): ReadonlyMap<ServiceId, ServiceDescriptor<unknown>> {
    return this.serviceMap;
  }
}

interface ServiceDescriptor<T> extends Identifiable {
  readonly id: ServiceId;
  readonly meta: T;
}

interface Service<T> extends Identifiable {
  start(ctx: RuntimeContext): Promise<T>;
  stop(ctx: RuntimeContext): Promise<void>;
}

interface Identifiable {
  readonly id: string;
}

export { ServiceId, RuntimeContext, ServiceDescriptor, Service, Identifiable };
