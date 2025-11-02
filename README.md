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
