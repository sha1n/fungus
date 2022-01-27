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
An experimental library for starting and stopping multi-service environments correctly and efficiently based on declared dependencies between them.

- [Fungus 🍄](#fungus-)
  - [Install](#install)
  - [Example](#example)
  - [Demo](#demo)

## Install
```
yarn add @sha1n/fungus
```
or 
```
npm i @sha1n/fungus
```

## Example

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
const runtimeContext = await env.start();
const configServiceUrl = runtimeContext.services.get('my-config-service-id').url;
    
  ...

// finally - stop all service in reverse order
await env.stop();

```

## Demo
- The dockerised services demo code can be found [here](examples/docker/index.ts). 
  
```
yarn run docker-demo
```


- The in-memory services demo code can be found [here](examples/in-memory/index.ts).

```
yarn run simple-demo
```

<hr>
<img src="docs/images/demo_800.gif" width="100%">
