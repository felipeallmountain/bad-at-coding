# Project Documentation & Architecture Overview

> **Project Name:** bad-at-coding  
> **Author:** Felipe Vega  
> **Repository:** `bad-at-coding`

---

## 1. Executive Summary

**bad-at-coding** is an interactive, creative web application and personal portfolio. It features an interactive 3D WebGL canvas background powered by Three.js, a custom client-side Single Page Application (SPA) routing & transition system, server-side HTML rendering using Pug templates, and static prerendering support for production deployments.

The project combines Express.js with Vite in middleware mode during development, allowing seamless SSR/HMR, while using Vite build manifests and static pre-rendering scripts for optimized production delivery on static hosts like Netlify.

---

## 2. Technology Stack

### Backend & Server Infrastructure

- **Runtime:** Node.js (configured as ES Module via `"type": "module"` in `package.json`).
- **Framework:** Express.js v5 (`express`).
- **Language / Transpiler:** TypeScript (`typescript`), dev execution via `tsx watch`, server compilation via `tsc -p tsconfig.server.json`.
- **Environment Management:** `dotenv`.

### Frontend & Graphics

- **Client Scripting:** TypeScript (`app/main.ts`).
- **3D Graphics & Rendering:** Three.js (`three` v0.185.1) - Renders an interactive 3D WebGL background grid (`app/composables/grid3d.ts`).
- **Animation & Timelines:** GSAP (`gsap` v3.15.0).
- **Animation Loop:** Tempus (`tempus` - unified RAF ticker).
- **Debug Tools:** Lil-gui (`lil-gui` v0.21.0) for live 3D tweaking in development.
- **Event Bus:** Nanoevents (`nanoevents` v9.1.0) for internal decoupled event communication.

### Templating & HTML Rendering

- **Templating Engine:** Pug (`pug` v3.0.4).
- **Plugins:** `vite-plugin-pug`, `pug-plugin`.
- **Pages Structure:** Central layout in `views/base.pug` with individual views in `views/pages/` (`home.pug`, `fail-cases.pug`, `who-i-am-not.pug`, `annoy-me.pug`).

### Styling & Design Tokens

- **Preprocessor:** SCSS / SASS (`sass` v1.100.0).
- **Structure:** Modular architecture in `styles/`:
  - Design tokens, typography (`_typography.scss`), variables, decorators (`_decorators.scss`), layout colors (`_layout-colors.scss`), and spacing (`_layout-spacing.scss`).
  - Base rules, layout components, and page-specific stylesheets.

### Build System, Bundling & Quality

- **Bundler & Dev Server:** Vite v8 (`vite`) operating in custom middleware mode (`middlewareMode: true`) during development.
- **Prerendering / SSG:** Custom static prerendering script (`prerender.js`) compiling Pug templates and resolving assets via Vite's production `.vite/manifest.json`.
- **Linting & Formatting:** ESLint v10 (`eslint`, `@eslint/js`, `@eslint/css`, `typescript-eslint`), Prettier (`prettier`, `@prettier/plugin-pug`).

---

## 3. Architecture & Key Patterns

```
                                +-------------------+
                                |   Express Server  |
                                |    (index.ts)     |
                                +---------+---------+
                                          |
                   +----------------------+----------------------+
                   | (Development)                               | (Production)
                   v                                             v
        +--------------------+                         +-------------------+
        |  Vite Dev Server   |                         | Static Manifest & |
        | (middlewareMode)   |                         |  Dist Files / SSG |
        +---------+----------+                         +---------+---------+
                  |                                              |
                  +-----------------------+----------------------+
                                          |
                                          v
                                +-------------------+
                                |  Pug Templates    |
                                |   (views/pages)   |
                                +---------+---------+
                                          |
                                          v
                                +-------------------+
                                |  Client SPA App   |
                                |   (app/main.ts)   |
                                | - 3D WebGL Grid   |
                                | - Router & Transitions|
                                +-------------------+
```

### Hybrid Express + Vite SSR / SSG Pipeline

1. **Development Environment:**
   - Express runs `src-server/renderer.ts`, initializing Vite in `middlewareMode`.
   - Incoming requests render Pug templates dynamically and pass HTML through `viteServer.transformIndexHtml()`, giving full HMR and module resolution for TS/SCSS.
2. **Production Environment:**
   - Client scripts & styles are compiled by `vite build` into `dist/` with a manifest located at `dist/.vite/manifest.json`.
   - `prerender.js` reads the manifest and pre-compiles all Pug views into static HTML files (`index.html`, `fail-cases.html`, etc.) in `dist/`.
   - `netlify.toml` configures hosting and clean path redirects.

### Client-Side SPA Architecture

- **`app/main.ts`**: Main entry point initializing `Tempus`, the 3D WebGL grid, preloader, router, navbar, and navigation handlers.
- **Navigation & Router (`app/composables/navigation.ts`, `router.ts`)**: Custom client-side router fetching page fragments and swapping DOM content with smooth GSAP animations without reloading the window.
- **3D WebGL Grid (`app/composables/grid3d.ts`)**: Custom Three.js scene setup managing interactive grid geometry, camera control, lighting, and performance-optimized rendering.

---

## 4. Directory Structure

```
bad-at-coding/
├── app/                      # Client-side TypeScript codebase
│   ├── composables/          # Functional client modules (grid3d, router, navigation, preloader, etc.)
│   ├── utlis/                # Utility helpers (link handling, DOM helpers)
│   └── main.ts               # Client application entry point
├── src-server/               # Express server source files
│   ├── config.ts             # Environment & path configurations
│   ├── middleware.ts         # Express middlewares (error handling, 404s)
│   ├── renderer.ts           # Pug rendering engine (Vite dev middleware integration / prod manifest loading)
│   └── routes.ts             # Express routes & health check endpoints
├── views/                    # Pug view templates
│   ├── base.pug              # Master HTML layout file
│   ├── mixins/               # Reusable Pug mixins
│   └── pages/                # Individual page templates (home, fail-cases, who-i-am-not, annoy-me)
├── styles/                   # SASS / SCSS stylesheet architecture
│   ├── base/                 # Base reset and global styles
│   ├── layout/               # Structural component layouts
│   ├── pages/                # Page-specific styling
│   ├── variables/            # Color, grid, and breakpoint tokens
│   └── main.scss             # Primary SASS import bundle
├── fonts/                    # Web font assets (Big Shoulders Stencil, JetBrains Mono)
├── llm/                      # AI / LLM documentation & context repository
│   ├── README.md             # This project documentation document
│   └── walkthrough.md        # Session walkthrough log documenting changes & verification
├── dist/                     # Production build output directory (Vite bundle + pre-rendered HTML)
├── server/                   # Compiled server JavaScript output (`tsc` target)
├── index.ts                  # Server entry script
├── prerender.js              # SSG static HTML pre-renderer script
├── vite.config.js            # Vite configuration file
├── tsconfig.json             # Client & general TypeScript configuration
├── tsconfig.server.json      # Express server TypeScript build configuration
├── eslint.config.js          # ESLint flat configuration
├── netlify.toml              # Netlify deployment & redirect settings
└── package.json              # Project dependencies and script declarations
```

---

## 5. Development & Execution Scripts

| Command            | Description                                                                           |
| :----------------- | :------------------------------------------------------------------------------------ |
| `npm run dev`      | Launches server in watch mode using `tsx` on `index.ts` with Vite middleware enabled. |
| `npm run build`    | Compiles server TypeScript, executes Vite client build, and runs `prerender.js`.      |
| `npm start`        | Starts Express in production mode (`NODE_ENV=production node server/index.js`).       |
| `npm run lint`     | Runs ESLint analysis across the repository.                                           |
| `npm run lint:fix` | Runs ESLint and automatically fixes formatting/syntax issues.                         |
| `npm run format`   | Runs Prettier across all project files.                                               |

---

## 6. Guidelines for AI / LLM Assistants

When contributing or refactoring this codebase:

1. **Preserve Path Fingerprinting:** Ensure any modifications to `src-server/renderer.ts` or `prerender.js` correctly handle Vite's `.vite/manifest.json` mapping for static assets.
2. **TypeScript Strictness:** Always maintain clean TypeScript interfaces for composables in `app/composables/`.
3. **Pug & SCSS Sync:** Changes in `views/pages/` must be paired with corresponding SCSS in `styles/pages/` and registered in `prerender.js` if new pages are added.
4. **Client Router Integration:** New routes should be supported by both server routes (`src-server/routes.ts`) and client navigation (`app/composables/navigation.ts`).
5. **Session Walkthrough Persistence:** At the end of every task/session, always save or update the current session's `walkthrough.md` in the project `llm/` directory (`llm/walkthrough.md`).
