[![CI](https://github.com/sha1n/fungus/actions/workflows/ci.yml/badge.svg)](https://github.com/sha1n/fungus/actions/workflows/ci.yml)
[![Coverage](https://github.com/sha1n/fungus/actions/workflows/coverage.yml/badge.svg)](https://github.com/sha1n/fungus/actions/workflows/coverage.yml)
![GitHub](https://img.shields.io/github/license/sha1n/fungus)
![npm type definitions](https://img.shields.io/npm/types/@sha1n/fungus)
![npm](https://img.shields.io/npm/v/@sha1n/fungus)


```
                       .-'~~~-.
                     .'o  oOOOo`.
                    :~~~-.oOo   o`.
                     `. \ ~-.  oOOo.
                       `.; / ~.  OO:
                       .'  ;-- `.o.'
                      ,'  ; ~~--'~
                      ;  ;
_______\|/__________\\;_\\//___\|/________

```

# Fungus 🍄
Designed to harness backend integration testing environments, `Fungus` is a simple controller for starting and stopping multiple stateful services of virtually any kind, as long as they have `start` and `stop` semantics. A `Fungus` environment allows you to declare dependencies between services, so they can start up in the correct order and shut down in the correct order. It uses graph algorithms to minimize startup time and ensure clean shutdown.

- [Fungus 🍄](#fungus-)
  - [Features](#features)
  - [Usage](#usage)
    - [Docker Services Demo](#docker-services-demo)
    - [In-Memory Services Demo](#in-memory-services-demo)
  - [Install](#install)

## Features
- Simple and lean API surface. Very easy to adopt or experiment with. The [`Service`](./lib/types.ts) interface is all you really have to implement.
- Easy to extend. The [`Docker`](./examples/docker/dockerized.ts) example shows how easy it is to create a generic docker based service and use it to control containers.
- A `RuntimeContext` API gives you access to metadata that is provided by any service in your environment. This is handy when you need to configure a service based on its dependencies. For example, you use a random database port and you want your app to get it before it starts up. The same context object is passed to all the services on startup and returned by the environment start method, so you can use it from the application or test.

## Usage
Here is a simple examples of how you create an environment and interact with it. For full working examples, see the demos [here](./examples).

```ts
// create services (implement the Service interface)
const storageService = createConfigService('my-config-service-id');
const mqService = ...;
const configService = ...;
const authService = ...;
const appService = ...;

// create an environment from a dependency map (keys names don't matter)
const env = createEnvironment(
  {
    ConfigService: {
      service: configService,
      dependsOn: [storageService, mqService]
    },
    App: {
      service: appService,
      dependsOn: [configService, authService]
    },
    AuthService: {
      service: authService,
      dependsOn: [configService]
    }
  },
  'my-env'
);

// start all the services in order (topological)
const context = await env.start();
const configServiceUrl = context.catalog.get('my-config-service-id').url;
    
  ...

// finally - stop all service in reverse order
await env.stop();

```

### Docker Services Demo
- A demo that uses Docker based services can be found [here](examples/docker/index.ts). This implementation relies on your shell environment and requires a Docker client and an available Docker daemon.
  
```
yarn install && yarn run docker-demo
```

### In-Memory Services Demo
- An in-memory services demo code can be found [here](examples/in-memory/index.ts).

```
yarn install && yarn run simple-demo
```

<hr>
<img src="docs/images/demo_800.gif" width="100%">

## Install
```
yarn add @sha1n/fungus
```
or 
```
npm i @sha1n/fungus
```