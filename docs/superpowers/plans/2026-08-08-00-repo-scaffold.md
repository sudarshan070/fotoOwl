# Repo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the pnpm + Turborepo monorepo skeleton so the three parallel build plans (media-core, media-react, media-ui-react) can start immediately against real package boundaries and shared tooling.

**Architecture:** A single pnpm workspace (`packages/*`, `apps/*`) orchestrated by Turborepo for cached `build`/`test`/`lint`/`typecheck` tasks. Every package gets its own `package.json` + `tsconfig.json` extending a shared root config. No implementation code is written in this plan — only scaffolding.

**Tech Stack:** pnpm workspaces, Turborepo, TypeScript, ESLint, Vitest (test runner, configured but empty), Prettier.

## Global Constraints

- Dependency direction: `app → wrappers → core`, and separately `app → components`. Wrappers and components never import each other; components never import core; core never imports either.
- `media-core` must be pure TypeScript — no React, no DOM, no React Native imports.
- Scope for this implementation pass is web-only: `media-core`, `media-react`, `media-ui-react`, `apps/web`. No `media-native`/`media-ui-native` packages are created (see `DECISIONS.md`).

---

### Task 1: pnpm workspace + Turborepo root config

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `tsconfig.base.json`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc.json`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a workspace root that `pnpm install` and `pnpm turbo run <task>` succeed against once packages exist. Later tasks' `package.json` files reference `"workspace:*"` for internal deps.

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "fotoowl-media-sdk",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.6.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.18.0",
    "@typescript-eslint/parser": "^7.18.0",
    "prettier": "^3.3.0"
  },
  "packageManager": "pnpm@9.7.0"
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 3: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "storybook-static/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 5: Create `.eslintrc.cjs` with the boundary-enforcing rule**

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { es2020: true, node: true },
  overrides: [
    {
      files: ['packages/media-core/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', { patterns: ['react', 'react-native', 'react-dom'] }]
      }
    },
    {
      files: ['packages/media-ui-react/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', { patterns: ['*media-core*', '*media-react*'] }]
      }
    },
    {
      files: ['packages/media-react/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', { patterns: ['*media-ui-react*'] }]
      }
    }
  ]
};
```

- [ ] **Step 6: Create `.prettierrc.json`**

```json
{
  "singleQuote": true,
  "semi": true,
  "printWidth": 100,
  "trailingComma": "none"
}
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
dist/
storybook-static/
.turbo/
*.log
.env
.env.local
```

- [ ] **Step 8: Verify the workspace installs**

Run: `pnpm install`
Expected: completes with no errors (no packages exist yet, so this just validates the root files are syntactically valid).

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .eslintrc.cjs .prettierrc.json .gitignore
git commit -m "chore: scaffold pnpm + turborepo monorepo root"
```

---

### Task 2: Package skeletons for all four packages + the web app

**Files:**
- Create: `packages/media-core/package.json`, `packages/media-core/tsconfig.json`, `packages/media-core/src/index.ts`
- Create: `packages/media-react/package.json`, `packages/media-react/tsconfig.json`, `packages/media-react/src/index.ts`
- Create: `packages/media-ui-react/package.json`, `packages/media-ui-react/tsconfig.json`, `packages/media-ui-react/src/index.ts`
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`

**Interfaces:**
- Consumes: root `tsconfig.base.json` from Task 1.
- Produces: import paths `media-core`, `media-react`, `media-ui-react` resolvable via `workspace:*` from any other package, so Tasks in the media-core/media-react/media-ui-react plans can `pnpm add media-core --workspace` style reference each other from Task 1 of their own plans onward.

- [ ] **Step 1: `packages/media-core/package.json`**

```json
{
  "name": "media-core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: `packages/media-core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: `packages/media-core/src/index.ts`**

```typescript
export {};
```

- [ ] **Step 4: `packages/media-react/package.json`**

```json
{
  "name": "media-react",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "dependencies": {
    "media-core": "workspace:*"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "jsdom": "^25.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 5: `packages/media-react/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

- [ ] **Step 6: `packages/media-react/src/index.ts`**

```typescript
export {};
```

- [ ] **Step 7: `packages/media-ui-react/package.json`**

```json
{
  "name": "media-ui-react",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "jsdom": "^25.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 8: `packages/media-ui-react/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

- [ ] **Step 9: `packages/media-ui-react/src/index.ts`**

```typescript
export {};
```

- [ ] **Step 10: `apps/web/package.json`**

```json
{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "media-core": "workspace:*",
    "media-react": "workspace:*",
    "media-ui-react": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 11: `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 12: Verify install resolves the workspace packages**

Run: `pnpm install`
Expected: completes with no errors; `pnpm ls -r --depth -1` lists `media-core`, `media-react`, `media-ui-react`, `web`.

- [ ] **Step 13: Commit**

```bash
git add packages apps
git commit -m "chore: scaffold media-core, media-react, media-ui-react, apps/web package skeletons"
```

---

## Handoff

Once both tasks are committed, the three parallel plans can start immediately and independently:

- `docs/superpowers/plans/2026-08-08-01-media-core.md`
- `docs/superpowers/plans/2026-08-08-02-media-react.md`
- `docs/superpowers/plans/2026-08-08-03-media-ui-react.md`

`2026-08-08-04-web-app-integration.md` depends on all three of those being complete.
