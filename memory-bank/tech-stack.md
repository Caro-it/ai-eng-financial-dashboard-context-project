# Tech stack

Stack tecnológico con evidencia `ruta:línea`. Los comandos del proyecto no se repiten aquí: la única fuente es [`.agents/rules/environment.md`](../.agents/rules/environment.md) §1.

**Estado:** ✅ = verificado ejecutando (fila de [`verification.md`](../verification.md)) · **lectura** = leído por un agente · ❓ = sin comprobar.

Las versiones de `package.json` son rangos (`^`, `~`). La versión instalada real depende del lockfile y de `npm install` (ver `docs/findings.md` DX-4).

---

## Lenguajes

| Lenguaje | Dónde | Evidencia | Estado |
|---|---|---|---|
| Python 3.13 | backend | `backend/Dockerfile:1` (`python:3.13-slim`) | lectura |
| TypeScript `~6.0.2` | frontend | `frontend/package.json:39` | lectura |
| Node 24 (runtime del frontend) | frontend | `frontend/Dockerfile:1` (`node:24-alpine`) | lectura |

## Backend

| Componente | Evidencia | Estado |
|---|---|---|
| FastAPI | `backend/requirements.txt:1`, `backend/app/main.py:1`, `:6` | ✅ responde en el 8000 (`verification.md` #5, #7) |
| uvicorn con `--reload` | `backend/requirements.txt:2`, `backend/Dockerfile:12` | lectura (`verification.md` #3) |
| debugpy en el 5678, envolviendo a uvicorn | `backend/requirements.txt:3`, `backend/Dockerfile:12` | ✅ puerto reenviado (#2) · ❓ attach (#26) |
| Pydantic (modelos de respuesta, vía FastAPI) | `backend/app/routes.py:22-27` | lectura |
| CORS abierto (`allow_origins=["*"]`, `allow_credentials=True`) | `backend/app/main.py:7-13` | lectura (`verification.md` #8) |
| Todo el código de la API está en un solo archivo | `backend/app/routes.py`, montado en `backend/app/main.py:14` | lectura |
| Versiones de Python sin fijar | `backend/requirements.txt:1-6` | lectura (`docs/findings.md` DX-4) |

## Frontend

| Componente | Evidencia | Estado |
|---|---|---|
| React `^19.2.4` | `frontend/package.json:19-20` | lectura |
| Vite `^8.0.4` + `@vitejs/plugin-react` | `frontend/package.json:30`, `:41`, `frontend/vite.config.ts:8` | ✅ dev server en el 5173 (`verification.md` #14) |
| Proxy de Vite: `/api` → `http://backend:8000` | `frontend/vite.config.ts:11-15` | lectura (`verification.md` #13) |
| Alias `@/` → `src/` | `frontend/vite.config.ts:18-21`, `frontend/tsconfig.app.json:12-14` | lectura |
| Tailwind CSS v4 (`@tailwindcss/vite`) con tokens CSS en `index.css` | `frontend/package.json:26`, `:38`, `frontend/vite.config.ts:8`, `frontend/src/index.css:5-76` | lectura (`docs/findings.md` ARQ-9) |
| Recharts `^3.8.1` (gráficos) | `frontend/package.json:21` | lectura |
| Componentes generados por shadcn en `components/ui/` (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`) | `frontend/components.json`, `frontend/package.json:16-18`, `:22`; `frontend/src/lib/utils.ts:1-6` | lectura (`docs/findings.md` ARQ-11) |
| URL del backend configurable con `VITE_API_BASE_URL` (opcional) | `frontend/.env.example:1-4`, `frontend/src/App.tsx:13` | lectura (`verification.md` #12) |

## Infra y entorno

| Componente | Evidencia | Estado |
|---|---|---|
| Docker Compose con 2 servicios (`frontend`, `backend`) y sin base de datos | `docker-compose.yml:2`, `:14` | lectura (`verification.md` #1) |
| Puertos 5173, 8000 y 5678 | `docker-compose.yml:7`, `:19-20` | ✅ (`verification.md` #2) |
| Hot reload con bind mounts; `node_modules` en volumen anónimo | `docker-compose.yml:8-10`, `:21-22` | lectura (`docs/findings.md` DX-2, DX-3) |
| Entorno de ejecución verificado: solo GitHub Codespaces | `verification.md` (nota de entorno), #24 | ✅ Codespaces · ❓ local |
| CI | no existe `.github/` (`docs/findings.md` TST-4) | lectura |

## Tooling: tests, lint y tipos

| Herramienta | Evidencia | Estado |
|---|---|---|
| pytest + pytest-cov + httpx (`TestClient`) | `backend/requirements.txt:4-6`, `backend/tests/test_routes.py:9`, `backend/tests/conftest.py:5-7` | ❓ nunca ejecutado (`verification.md` #21) |
| Vitest `^4.1.4` + `@vitest/coverage-v8` | `frontend/package.json:11-13`, `:31`, `:42` | ❓ nunca ejecutado (`verification.md` #22) |
| ESLint 9 + `typescript-eslint` + plugins de React | `frontend/package.json:9`, `:25`, `:33-35`, `:40` | ❓ nunca ejecutado (`environment.md` §1) |
| `npm run build` = `tsc -b && vite build` (es el único typecheck) | `frontend/package.json:8`; `docs/findings.md` DX-8 | ❓ nunca ejecutado (`environment.md` §1) |
| `tsconfig.app.json` sin `"strict"` declarado | `frontend/tsconfig.app.json:2-26` | ❓ valor efectivo sin comprobar (`docs/findings.md` DX-7) |
| Formateador (Prettier u otro) | no hay config en el repo (`docs/findings.md` NAM-4) | lectura |
