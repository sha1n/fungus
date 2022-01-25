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
  - [Demo](#demo)
  - [Install](#install)

## Demo
The demo code can be found [here](examples/index.ts)

```ts
// create services (implement the Service interface)
const storageService = new ConfigService('my-config-service-id');
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
env.start()
  .then(ctx => {
    // do whatever you need to do here...

    const configServiceUrl = ctx.services.get('my-config-service-id').url;
    
    ...
  })
  .finally(() => {
    // stop all service in reverse order
    return env.stop();
  });
```

<hr>
<img src="docs/images/demo_800.gif" width="100%">

## Install
```
yarn install && yarn run demo
```
or 
```
npm i && npm run demo
```
