type ServiceId = string;

class RuntimeContext {
  private readonly serviceMap: Map<ServiceId, ServiceMetadata> = new Map();

  constructor(readonly name: string) {}

  register(metadata: ServiceMetadata): void {
    this.serviceMap.set(metadata.id, metadata);
  }

  get services(): ReadonlyMap<ServiceId, ServiceMetadata> {
    return this.serviceMap;
  }
}

interface ServiceMetadata extends Identifiable {
  readonly id: ServiceId;
}

interface Service extends Identifiable {
  start(ctx: RuntimeContext): Promise<ServiceMetadata>;
  stop(ctx: RuntimeContext): Promise<void>;
}

interface Identifiable {
  readonly id: string;
}

type DependencyRecord = { service: Service; dependsOn?: Service[] };

type DependencyMap = {
  [key: ServiceId]: DependencyRecord;
};

export { ServiceId, RuntimeContext, ServiceMetadata, Service, Identifiable, DependencyMap, DependencyRecord };
