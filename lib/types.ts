type ServiceId = string;

type RuntimeContext = {
  readonly name: string;
  readonly serviceCatalog: ReadonlyMap<ServiceId, ServiceMetadata>;
  readonly shuttingDown: boolean;
};

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
