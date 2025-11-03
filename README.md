# Miniverse

[![Verify](https://github.com/Tera-Dark/Miniverse/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/Tera-Dark/Miniverse/actions/workflows/verify.yml)

## Project health checks

Use the verification helpers to run the same pipeline locally and in CI:

```bash
npm run verify
```

This command installs dependencies with `npm ci`, lints, typechecks, runs the Vitest test suite, and builds the project. The workflow `Verify` runs the same steps on pushes to `main`, pull requests, or manual dispatches and posts a concise status comment on pull requests.

For a concise local summary, run:

```bash
npm run report
```

The reporter prints a pass/fail table with durations for each stage. When dependencies are already installed, you can re-run the checks quickly with:

```bash
npm run verify:ci
```

## Testing

The project uses [Vitest](https://vitest.dev) with the DOM Testing Library and `@testing-library/jest-dom` extensions. The shared setup in `src/test/setup.ts` registers the matchers and performs automatic cleanup after each test so that DOM helpers such as `screen`, `toBeInTheDocument`, and `toHaveClass` are available globally.

- Run the entire suite once with:

  ```bash
  npm test
  ```

- Start Vitest in watch mode while developing with:

  ```bash
  npm run test:watch
  ```

To add new tests, colocate them near the feature under test (e.g., `src/components/__tests__`). Unit tests should cover self-contained utilities and rendering helpers, while integration tests can span multiple modules to exercise user flows through the composed DOM. Both types rely on jsdom, so prefer Testing Library queries over manual selectors to better reflect user interactions.
