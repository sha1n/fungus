# Fungus 🍄

## Project Overview
Fungus is a lightweight dependency-based service graph controller library for Node.js. It is designed to orchestrate the startup and shutdown of multiple stateful services (e.g., databases, message queues, backend services) ensuring they respect dependency orders. It uses a Directed Acyclic Graph (DAG) to manage dependencies, optimizing for parallel startup where possible and ensuring clean, reverse-order shutdown.

**Key Features:**
-   **Dependency Management:** Define services and their dependencies; Fungus handles the rest.
-   **Runtime Context:** Shared context available to all services during lifecycle events.
-   **Extensible:** Simple `Service` interface makes it easy to integrate any stateful component (Docker containers, in-memory mocks, etc.).

## Tech Stack
-   **Language:** TypeScript / Node.js (>= 24)
-   **Package Manager:** `pnpm`
-   **Testing:** Jest, `ts-jest`
-   **Linting/Formatting:** ESLint, Prettier

## Architecture
-   **`lib/`**: Core library source code.
    -   `types.ts`: Defines core interfaces (`Service`, `Environment`, `RuntimeContext`).
    -   `ServiceController.ts`: Wraps user-defined services to handle state transitions and event propagation.
    -   `env.ts`: Contains logic for `createEnvironment` and topological sorting.
-   **`test/`**: Unit tests using Jest.
-   **`examples/`**: Demo implementations (Docker, In-memory).

## Building and Running

### Prerequisites
-   Node.js (version defined in `.nvmrc` or `package.json`, >=24)
-   pnpm (`corepack enable` or `npm i -g pnpm`)

### Key Commands
| Command | Description |
| :--- | :--- |
| `pnpm install` | Install dependencies. |
| `pnpm build` | Compile TypeScript to `dist/`. |
| `pnpm test` | Run tests (Jest) and linting. |
| `pnpm run lint` | Run ESLint with auto-fix. |
| `pnpm run clean` | Remove the `dist` directory. |
| `pnpm run docker-demo` | Run the Docker-based example (requires Docker). |
| `pnpm run simple-demo` | Run the in-memory service example. |

## Development Conventions

-   **Testing:** The project maintains high test coverage using Jest. Tests are located in `test/` and generally follow the naming pattern `*.spec.ts`.
-   **Style:** Code style is enforced via ESLint and Prettier. Run `pnpm run lint` before committing.
-   **CI:** GitHub Actions (`.github/workflows/ci.yml`) run build and tests on push/PR to `master`.
-   **Release:** Releases are automated via scripts (`pnpm run release`).
