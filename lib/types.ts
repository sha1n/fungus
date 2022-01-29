type ServiceId = string;

type RuntimeContext = {
  readonly name: string;
  readonly serviceCatalog: ReadonlyMap<ServiceId, ServiceMetadata>;
  readonly shuttingDown: boolean;
};

interface ServiceMetadata {
  readonly id: ServiceId;
}

interface Service {
  readonly id: ServiceId;
  start(ctx: RuntimeContext): Promise<ServiceMetadata>;
  stop(ctx: RuntimeContext): Promise<void>;
}

type DependencyRecord = { service: Service; dependsOn?: Service[] };

type DependencyMap = {
  [key: ServiceId]: DependencyRecord;
};

export { ServiceId, RuntimeContext, ServiceMetadata, Service, DependencyMap, DependencyRecord };
