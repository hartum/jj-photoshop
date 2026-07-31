# Graph Report - .  (2026-07-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 147 nodes · 142 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- devDependencies
- backend/package.json
- plugins
- TheWelcome.vue
- frontend/package.json
- tsconfig.app.json
- dependencies
- scripts
- devDependencies
- .prettierrc.json
- tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `scripts` - 10 edges
2. `plugins` - 6 edges
3. `packageManager` - 4 edges
4. `include` - 4 edges
5. `compilerOptions` - 4 edges
6. `typescript` - 3 edges
7. `vue` - 3 edges
8. `env` - 2 edges
9. `categories` - 2 edges
10. `scripts` - 2 edges

## Surprising Connections (you probably didn't know these)
- `plugins` --extends--> `eslint`  [EXTRACTED]
  .oxlintrc.json → frontend/package.json

## Import Cycles
- None detected.

## Communities (15 total, 2 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.06
Nodes (31): eslint-config-prettier, eslint-plugin-oxlint, eslint-plugin-vue, devDependencies, eslint-config-prettier, eslint-plugin-oxlint, eslint-plugin-vue, jiti (+23 more)

### Community 1 - "backend/package.json"
Cohesion: 0.12
Nodes (15): author, description, devEngines, packageManager, keywords, license, main, name (+7 more)

### Community 2 - "plugins"
Cohesion: 0.12
Nodes (14): eslint, eslint, typescript, useCounterStore, categories, correctness, env, browser (+6 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.14
Nodes (13): dependencies, pinia, vue, vue-router, engines, node, name, private (+5 more)

### Community 5 - "tsconfig.app.json"
Cohesion: 0.15
Nodes (12): compilerOptions, noUncheckedIndexedAccess, paths, tsBuildInfoFile, exclude, extends, include, env.d.ts (+4 more)

### Community 6 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, fastify, @fastify/cors, @fastify/jwt, @prisma/client, zod, fastify, @fastify/cors (+3 more)

### Community 7 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, build-only, dev, format, lint, lint:eslint, lint:oxlint (+2 more)

### Community 8 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, prisma, tsx, @types/node, typescript, @types/node, @types/node, prisma (+1 more)

### Community 9 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, $schema, semi, singleQuote

## Knowledge Gaps
- **73 isolated node(s):** `$schema`, `unicorn`, `oxc`, `browser`, `correctness` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `devDependencies`, `plugins`, `frontend/package.json`?**
  _High betweenness centrality (0.457) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `backend/package.json`?**
  _High betweenness centrality (0.278) - this node is a cross-community bridge._
- **Why does `typescript` connect `plugins` to `devDependencies`?**
  _High betweenness centrality (0.259) - this node is a cross-community bridge._
- **What connects `$schema`, `unicorn`, `oxc` to the rest of the system?**
  _73 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `plugins` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._