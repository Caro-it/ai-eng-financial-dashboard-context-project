# Entorno: Docker Compose, dependencias, puertos y comandos

**Alcance:**
- `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`.
- `backend/requirements.txt`, `frontend/package.json`, `frontend/package-lock.json`.
- El bloque `server` de `frontend/vite.config.ts` y la configuración CORS de `backend/app/main.py`.
- Cualquier comando que se ejecute contra el proyecto.

Este archivo es **la única fuente de los comandos** del proyecto; el resto de reglas remiten aquí.

Origen: `docs/findings.md` (DX-1, DX-2, DX-3, DX-4, DX-5, DX-6, ARQ-12) → R-17, R-18, R-19.

---

## 1. El entorno soportado es Docker Compose

**Por qué:** la única forma de ejecución documentada es `docker compose up --build` (`README.md:39-43`). El proxy apunta al hostname `backend` (`frontend/vite.config.ts:13`), que solo existe dentro de la red de Compose (`docker-compose.yml:14`). La ejecución solo está verificada en GitHub Codespaces; en el Windows local de la autora no hay Docker (`verification.md` #23-24).

**Haz**
- Ejecuta los comandos dentro de los contenedores, con los de la tabla de abajo.
- Si el entorno no tiene Docker, dilo explícitamente y no des el cambio por verificado.

**No hagas**
- No cambies `target: "http://backend:8000"` a `localhost` para que funcione `npm run dev` en el host: se rompe Compose y Codespaces.
- No asumas que el agent puede ejecutar nada en la máquina Windows local de la autora.

**Comandos**

| Acción | Comando | Estado |
|---|---|---|
| Levantar todo | `docker compose up --build` | ✅ en Codespaces (`verification.md` #2) |
| Tests backend | `docker compose exec backend pytest` | ❓ sin verificar |
| Tests frontend | `docker compose exec frontend npm run test` | ❓ sin verificar |
| Build y typecheck frontend | `docker compose exec frontend npm run build` | ❓ sin verificar |
| Lint frontend | `docker compose exec frontend npm run lint` | ❓ sin verificar |
| Reconstruir tras cambiar dependencias | `docker compose up --build -V` | ❓ sin verificar |

Cuando ejecutes por primera vez un comando marcado ❓, registra el resultado en `verification.md` y actualiza esta tabla.

**Cómo comprobar**
- `git diff frontend/vite.config.ts` no toca `server.proxy`.

## 2. Código con hot reload; dependencias con rebuild

**Por qué:**
- Ambos servicios montan el código con bind mounts (`docker-compose.yml:8-9`, `:21-22`) y recargan solos: `uvicorn --reload` en `backend/Dockerfile:12` y `vite` en `frontend/Dockerfile:12`.
- Las dependencias se instalan en el build (`backend/Dockerfile:5-6`, `frontend/Dockerfile:5-6`).
- `node_modules` vive en un volumen anónimo (`docker-compose.yml:10`) que puede sobrevivir a un rebuild normal.
- Las dependencias de Python no tienen versión fijada (`backend/requirements.txt:1-6`), y el frontend usa `npm install` en vez de `npm ci` (`frontend/Dockerfile:6`), lo que puede reescribir el lockfile.

**Haz**
- Para cambios de código, no reconstruyas; el cambio se recarga solo.
- Si cambias `package.json` o `requirements.txt`, reconstruye con `docker compose up --build -V`. La opción `-V` renueva el volumen anónimo de `node_modules`.
- Añade dependencias solo cuando el cambio lo necesite y menciónalas en el resumen del cambio.

**No hagas**
- No ejecutes `npm install` ni `pip install` como "arreglo" genérico de un error.
- No incluyas en el diff cambios de `package-lock.json` que no correspondan a una dependencia añadida a propósito.
- No quites el volumen `/app/node_modules` de `docker-compose.yml`.

**Cómo comprobar**
- Si `git diff --stat` incluye `frontend/package-lock.json`, `frontend/package.json` también tiene que cambiar.

## 3. Puertos, `CMD` y CORS son parte del contrato del entorno

**Por qué:**
- Puertos publicados: 5173 para el frontend (`docker-compose.yml:7`), 8000 para la API y 5678 para el debugger (`docker-compose.yml:19-20`). Los tres están confirmados como reenviados (`verification.md` #2).
- `debugpy` envuelve a uvicorn en el `CMD` (`backend/Dockerfile:12`).
- CORS está abierto (`backend/app/main.py:7-13`). Con el proxy no hace falta, pero sí en el modo `VITE_API_BASE_URL` (`frontend/.env.example:1-4`).
- El README publica las URLs (`README.md:48-50`, `README.es.md:48-50`).

**Haz**
- Si cambias un puerto, el `CMD` o la config de CORS, actualiza en el mismo cambio `docker-compose.yml`, el Dockerfile, ambos README y `verification.md`, según `docs-and-verification.md`.
- Mantén `debugpy --listen 0.0.0.0:5678` envolviendo a uvicorn al editar el `CMD` del backend.

**No hagas**
- No "simplifiques" el `CMD` del backend quitando `debugpy`.
- No cierres CORS sin comprobar antes el escenario `VITE_API_BASE_URL`.
- No añadas autenticación basada en cookies con `allow_origins=["*"]` + `allow_credentials=True` sin restringir antes los orígenes.

**Cómo comprobar**
- `grep -nE "5173|8000|5678" docker-compose.yml backend/Dockerfile frontend/Dockerfile README.md README.es.md` muestra los mismos puertos en todos los archivos.
