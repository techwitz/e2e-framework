# Contributing to @open-test/playwright-core

Thanks for considering a contribution. This package is meant to stay a **generic, product-agnostic**
Playwright engine — the single rule that matters most for a PR to be accepted:

## The one hard rule: no product coupling

Nothing in `src/` may import or hardcode knowledge of any specific application — no product/company
names, no hardcoded storage keys, ports, or URLs beyond generic localhost defaults, no assumptions
about a particular app's state shape. If your use case needs app-specific behavior, it belongs in
your own domain package built on top of this one (see this repo's `packages/lxp` for an example of
that pattern), not in `core`.

A quick self-check before opening a PR:

```bash
grep -rniE "bien|lxp" src   # should return nothing (or your own equivalent product-name grep)
```

## Local setup

```bash
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm build       # tsc -p tsconfig.json, emits to dist/
```

## Making a change

1. Fork and branch from `main`.
2. Keep changes scoped — one module/concern per PR where possible.
3. Run `pnpm typecheck` before opening a PR; it must pass clean.
4. If you're adding a new module (e.g. a new AI provider adapter, a new data provider), follow the
   existing pattern: one class per file, exported via that directory's `index.ts` barrel, and
   registered in the top-level `src/index.ts` if the directory itself is new.
5. Update `README.md`'s module table if you're adding a new top-level directory.

## Reporting bugs / requesting features

Open an issue with a minimal reproduction (a failing test or a short code snippet is best). For
security-sensitive issues, please don't open a public issue — see the repository's security policy.
