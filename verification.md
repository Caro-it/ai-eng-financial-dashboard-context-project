# Verificación del proyecto

Registro de qué afirmaciones sobre la arquitectura del repo están comprobadas, cómo y por quién.

**Leyenda de estado**

- ✅ Verificado ejecutando la app (`docker compose up --build` en GitHub Codespaces).
- **verificado por lectura (agente)**: comprobado solo leyendo archivos, sin ejecutar nada.
- ❌ Contradicho por la ejecución (se indica la corrección).
- ❓ Nadie lo ha comprobado todavía.

> Entorno: la ejecución solo está verificada en **GitHub Codespaces**. En el Windows local no hay Docker instalado, así que no hay verificación local.

## Cómo ejecutar

| Paso | Comando / URL | Evidencia |
|---|---|---|
| Levantar todo | `docker compose up --build` | `README.md:42`, `docker-compose.yml:1-22` |
| Frontend (dashboard) | http://localhost:5173 | `docker-compose.yml:7`, `frontend/Dockerfile:12`, `README.md:48` |
| Backend (API) | http://localhost:8000 | `docker-compose.yml:19`, `backend/Dockerfile:12`, `README.md:49` |
| Documentación de la API | http://localhost:8000/docs | `README.md:50` (FastAPI en `backend/app/main.py:6`) |
| Healthcheck | http://localhost:8000/health | `backend/app/routes.py:243-245` |
| Debugger (debugpy) | puerto 5678 | `docker-compose.yml:20`, `backend/Dockerfile:12` |
| Tests backend | `pytest` dentro de `backend/` (sin verificar) | `backend/requirements.txt:4-5`, `backend/tests/test_routes.py` |
| Tests frontend | `npm run test` dentro de `frontend/` (sin verificar) | `frontend/package.json:11` |
| Override de la URL del backend (opcional) | copiar `frontend/.env.example` a `.env` y definir `VITE_API_BASE_URL` | `frontend/.env.example:1-4`, `README.md:45-46` |

En Codespaces, las URLs `localhost` se sustituyen por las URLs de los puertos reenviados.

## Tabla de afirmaciones

| # | Afirmación | Evidencia (ruta:línea) | Estado | Cómo se verificó / corrección |
|---|---|---|---|---|
| 1 | Compose define dos servicios: `frontend` y `backend`. No hay base de datos. | `docker-compose.yml:2`, `docker-compose.yml:14` | verificado por lectura (agente) | Lectura de `docker-compose.yml`. |
| 2 | Se publican los puertos 5173 (frontend), 8000 (API) y 5678 (debugpy). | `docker-compose.yml:7`, `docker-compose.yml:19-20` | ✅ | Codespaces reenvió los tres puertos. |
| 3 | El backend es FastAPI servido por uvicorn en el 8000, envuelto por debugpy en el 5678, con `--reload`. | `backend/Dockerfile:12`, `backend/app/main.py:6` | verificado por lectura (agente) | Lectura. El servicio en el 8000 respondió (ver #5), pero el uso de debugpy no se probó. |
| 4 | El backend usa la imagen `python:3.13-slim` y el frontend `node:24-alpine`. | `backend/Dockerfile:1`, `frontend/Dockerfile:1` | verificado por lectura (agente) | Lectura de los Dockerfiles. |
| 5 | `GET /health` devuelve `{"status":"ok"}`. | `backend/app/routes.py:243-245` | ✅ | Probado en Codespaces sobre el puerto 8000. |
| 6 | El backend no tiene ruta raíz (`GET /`). | `backend/app/routes.py` (no hay `@router.get("/")`), `backend/app/main.py:14` | ✅ | `GET /` en el 8000 devuelve `404 {"detail":"Not Found"}`. Coincide con el mapa, que no listaba ruta raíz. |
| 7 | La API expone 9 endpoints: `/health`, `/api/metrics`, `/facets`, `/summary`, `/categories/top`, `/comparison`, `/alerts`, `/b2b`, `/b2c`. | `backend/app/routes.py:243, 248, 262, 268, 287, 305, 342, 362, 378` | ✅ | `/docs` carga y muestra 9 endpoints. |
| 8 | CORS permite `allow_origins=["*"]` con `allow_credentials=True`. | `backend/app/main.py:7-13` | verificado por lectura (agente) | Lectura. Comportamiento CORS no probado. |
| 9 | Los datos son mock: se regeneran en cada request con `seed=42`, 12 meses × 30 movimientos, con fechas relativas a `date.today()`. | `backend/app/routes.py:65-68`, `backend/app/routes.py:94-104` | verificado por lectura (agente) | Lectura del código. |
| 10 | Cadena de entrada del frontend: `index.html` → `src/main.tsx` → `App.tsx`. | `frontend/index.html:10-11`, `frontend/src/main.tsx:6-10` | verificado por lectura (agente) | Lectura. |
| 11 | El frontend usa Vite, React 19, TypeScript, Recharts, Tailwind v4 y Vitest. | `frontend/package.json:7, 11, 19-21, 26, 39, 41-42` | verificado por lectura (agente) | Lectura de `package.json`. |
| 12 | El frontend llama a `${VITE_API_BASE_URL ?? ""}/api/metrics` al montarse. | `frontend/src/App.tsx:13`, `frontend/src/App.tsx:16`, `frontend/src/App.tsx:29-30` | verificado por lectura (agente) | Lectura. El resultado funcional está en #14. |
| 13 | El proxy de Vite reenvía `/api` a `http://backend:8000`. | `frontend/vite.config.ts:11-15` | verificado por lectura (agente) | Lectura. Que funcione dentro de Docker se deduce de #14, pero el tráfico del proxy no se inspeccionó. |
| 14 | El dashboard carga en el 5173 con datos del backend. | `frontend/src/App.tsx:29-43` | ✅ | Probado en Codespaces: el dashboard muestra datos. |
| 15 | El frontend solo consume `/api/metrics`; los otros 8 endpoints no se usan. | `frontend/src/App.tsx:16` (único `fetch` en `src/`) | verificado por lectura (agente) | `grep` de `fetch`, `/api` e `import.meta.env` en `frontend/src`. |
| 16 | `src/lib/mock-data.ts` no lo importa ningún archivo. | `frontend/src/lib/mock-data.ts:3` | verificado por lectura (agente) | `grep` de imports en `frontend/src`. |
| 17 | La cabecera muestra un periodo fijo de 2024, pero el backend genera fechas relativas a hoy. | `frontend/src/App.tsx:49`, `frontend/src/components/dashboard/dashboard-header.tsx:7`, `backend/app/routes.py:97` | ✅ | Discrepancia confirmada visualmente en Codespaces. Es un defecto conocido, todavía sin corregir. |
| 18 | El tipo TS `FinancialMovement` replica a mano el modelo Pydantic. | `frontend/src/lib/financial-types.ts:5-11`, `backend/app/routes.py:22-27` | verificado por lectura (agente) | Comparación manual de campos. |
| 19 | La agregación mensual está duplicada en backend y frontend. | `backend/app/routes.py:161-187`, `frontend/src/lib/financial-utils.ts:36-67` | verificado por lectura (agente) | Lectura. |
| 20 | `AGENTS.md` exige `.agents/rules`, `.agents/skills` y `memory-bank/`. Existen `.agents/rules/` (5 archivos) y `memory-bank/` (3 archivos); solo falta `.agents/skills/`. | `AGENTS.md:6-15` | verificado por lectura (agente) | `ls` de los tres directorios: `.agents/rules/` y `memory-bank/` existen; `.agents/skills/` no. **Actualizado:** antes decía que no existía ninguno, algo que era cierto antes de las Fases 3 y 4. |
| 21 | Los tests del backend (pytest) pasan. | `backend/tests/test_routes.py:9-174` | ❓ | Nadie los ha ejecutado. |
| 22 | Los tests del frontend (Vitest) pasan. | `frontend/package.json:11`, `frontend/src/lib/financial-utils.test.ts` | ❓ | Nadie los ha ejecutado. |
| 23 | La app funciona fuera de Docker (`npm run dev` + uvicorn en el host). | `frontend/vite.config.ts:13` | ❓ | Sin verificar. Probablemente falla, porque `backend` no resuelve fuera de la red de Compose. No hay Docker local para comparar. |
| 24 | La ejecución funciona en local (Windows). | — | ❓ | No hay Docker instalado en el Windows local. Solo está verificado en Codespaces. |
| 25 | `depends_on` garantiza que el backend esté listo antes que el frontend. | `docker-compose.yml:11-12` | ❓ | No hay healthcheck en compose, así que solo ordena el arranque. No se probó una condición de carrera. |
| 26 | El debugger en el 5678 acepta conexiones (attach). | `backend/Dockerfile:12` | ❓ | El puerto se reenvía (#2), pero nadie hizo attach. |
| 27 | La regla R-12 (respetar el estilo del archivo que se edita) no está en `.agents/rules` porque su destino, `code-style.md`, no existe. Por eso no le llega a ningún agente. | `.agents/rules/frontend.md:9`, `.agents/rules/frontend.md:83-87`, `docs/findings.md:86` | ❌ | Afirmación incorrecta del agente, que solo miró el destino declarado en la fila R-12 de `docs/findings.md`. **Corrección:** R-12 sí está en `frontend.md:85-87`, comprobado por la usuaria con `Select-String`, y `frontend.md:9` la lista como origen. El destino de R-12 en `docs/findings.md` se corrigió a `frontend.md`. |

## Contradicciones con el mapa anterior

Ninguna. Todas las verificaciones en Codespaces coinciden con lo leído en los archivos. El 404 en `GET /` confirma que no existe ruta raíz, algo que el mapa ya reflejaba al no listarla.

## Validación de reglas (Fase 3)

Prueba de que las reglas de `.agents/rules` dirigen el trabajo del agente sin que nadie las mencione en el prompt.

**Tarea dada:** añadir al README una nota con la URL del healthcheck y aclarar que la raíz `/` de la API devuelve 404. El prompt nombraba solo `README.md`, se dio con contexto limpio (`/clear`) y no mencionaba las reglas.

**Reglas que dirigieron el trabajo**

| Regla | Qué hizo el agente por ella |
|---|---|
| `docs-and-verification.md` §2 | Sacó los valores de la nota de filas ya verificadas en este archivo: #5 (`GET /health` → `{"status":"ok"}`) y #6 (`GET /` → `404 {"detail":"Not Found"}`), las dos ✅ en Codespaces. |
| `docs-and-verification.md` §3 | Editó también `README.es.md`, sin que se lo pidieran, traducido y en la misma posición. Comprobó el resultado con `git diff --stat` (3 líneas añadidas en cada README) y `grep -c "^## "` (3 secciones en ambos). |
| `environment.md` §3 | Trató las URLs del README como parte del contrato del entorno y usó el puerto 8000 publicado en `docker-compose.yml:19`. |

**Evidencia:**
- `git diff README.md README.es.md` muestra el mismo bloque en las dos versiones, justo después de la línea de la documentación de la API.
- Los textos `{"status":"ok"}` y `404 {"detail":"Not Found"}` son los mismos que registran las filas #5 y #6.

**Resultado:** pasó a la primera, sin correcciones.

**Limitación:** esta tarea solo ejercitó `docs-and-verification.md` y `environment.md`. Las reglas `api-contract.md`, `backend.md` y `frontend.md` no se han probado.

**Estado:** cambios sin commit.
