type ServiceId = string;

type RuntimeContext = {
  readonly name: string;
  readonly catalog: ReadonlyMap<ServiceId, ServiceMetadata>;
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

interface ServiceSpec {
  service: Service;
  dependsOn?: Service[];
}

interface Environment {
  readonly name: string;
  start(): Promise<RuntimeContext>;
  stop(): Promise<void>;
}

export type { ServiceSpec, Environment, Service, ServiceId, ServiceMetadata, RuntimeContext };
