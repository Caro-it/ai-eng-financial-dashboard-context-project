---
name: dashboard-pre-merge-check
description: Checklist previo a merge del dashboard financiero (frontend Vite + backend FastAPI en Docker Compose). Úsala antes de abrir o aprobar un PR que toque frontend/, docker-compose.yml o los Dockerfiles, o cuando la app muestre "No se pudo cargar la informacion financiera". Valida build, lint y tests dentro del contenedor, descarta fallos de red del entorno, compara con la línea base y registra el resultado en verification.md.
---

# Dashboard pre-merge check

## Objetivo

Decidir si una rama del dashboard está lista para merge sin empeorar la línea base, distinguiendo un fallo real del código de un fallo de red del entorno (Codespaces).

## Inputs

- Rama con los cambios, con `docker compose up --build` levantado (`docker-compose.yml:1-22`). Si cambiaron `package.json` o `requirements.txt`: `docker compose up --build -V` (`.agents/rules/environment.md:53`).
- Acceso a http://localhost:5173 (en Codespaces, la URL del puerto reenviado; `verification.md:28`).
- Navegador con Lighthouse y la extensión axe DevTools para el paso 4.

Si el entorno no tiene Docker (`verification.md` #24), **para aquí**: no hay verificación posible y se registra como ❓ (`.agents/rules/docs-and-verification.md:35`).

## Pasos

### 1. Validación automática, solo dentro del contenedor

Los comandos solo son válidos dentro del contenedor `frontend` (`.agents/rules/environment.md:15-35`, `.agents/rules/frontend.md:103-108`):

```bash
docker compose exec frontend npm run build   # tsc -b && vite build (frontend/package.json:8)
docker compose exec frontend npm run lint    # eslint . (frontend/package.json:9)
docker compose exec frontend npm run test    # vitest run (frontend/package.json:11)
```

No ejecutes `npm install` como arreglo genérico (`.agents/rules/environment.md:57`) ni des nada por bueno porque el dashboard cargue en `:5173` (`.agents/rules/frontend.md:111`).

### 2. Si la app no carga datos: comprobar la red antes de dar el código por roto

Síntoma conocido en Codespaces: la petición a `/api/metrics` hace timeout y aparece el bloque de error con "No se pudo cargar la informacion financiera. Revisa la API de backend." (`frontend/src/App.tsx:45-48`, pintado en `:61-69`).

```bash
# Red entre contenedores: el hostname "backend" solo existe en la red de Compose (docker-compose.yml:14)
docker compose exec frontend wget -qO- -T 5 http://backend:8000/health
# esperado: {"status":"ok"}  (backend/app/routes.py:243-245, verification.md #5)

# Proxy de Vite /api -> http://backend:8000 (frontend/vite.config.ts:11-15)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/api/metrics
# esperado: 200
```

- Si `wget` hace timeout, el problema es la red del entorno, no el código. Arreglo **temporal del entorno, que no se commitea** ni se documenta como paso de instalación:
  ```bash
  sudo iptables -I FORWARD -j ACCEPT
  sudo sysctl -w net.bridge.bridge-nf-call-iptables=0
  ```
  No los ejecutes por tu cuenta: muéstralos y pide confirmación explícita a una persona antes de aplicarlos. Después, repite los dos comandos de comprobación.
- **Nunca** cambies `target: "http://backend:8000"` (`frontend/vite.config.ts:13`) a `localhost` ni a otra cosa para "arreglarlo": rompe Compose y Codespaces (`.agents/rules/environment.md:24`). Comprueba con `git diff frontend/vite.config.ts` que `server.proxy` no cambia (`.agents/rules/environment.md:41`).
- Si `wget` y `curl` responden bien y la app sigue fallando, entonces sí es un fallo del código.

### 3. Comparar con la línea base

La salida de los tres comandos del paso 1 no puede empeorar esta línea base, medida en el commit `e57cf40`. La fuente de verdad es `verification.md`: si registra una línea base más reciente, manda esa.

| Métrica | Línea base | Fuente |
|---|---|---|
| Build | sin advertencias | salida de `npm run build` |
| Chunk principal | < 500 kB (hoy **187.74 kB**) | Recharts va en un chunk diferido: `lazy()` + `Suspense` en `frontend/src/App.tsx:12-21`, `:84-89` (commit `b96a275`) |
| Lint | 0 errores | salida de `npm run lint` |
| Tests | **13 pasando** | `frontend/src/lib/financial-utils.test.ts` (commit `e57cf40`) |

Un aviso de Vite de chunk > 500 kB, o un import estático de un componente de gráfico en `App.tsx`, cuenta como regresión.

### 4. Comprobaciones manuales en la app (http://localhost:5173)

- [ ] Los datos cargan: KPIs y gráficos con valores, sin el bloque `role="alert"` (`frontend/src/App.tsx:61-69`).
- [ ] Los gráficos aparecen sin salto de layout: el fallback de `Suspense` reserva `h-[414px]` (`frontend/src/App.tsx:84-89`) y el skeleton interno `h-[280px]` (`income-outcome-chart.tsx:58`, `profit-percent-chart.tsx:59`).
- [ ] Con Tab el foco llega a cada gráfico y las flechas mueven el tooltip.
- [ ] Lighthouse → Accessibility = **100**.
- [ ] axe DevTools → **0** incidencias.

### 5. Registrar el resultado

Según `.agents/rules/docs-and-verification.md:24-42`:

- Cita la salida real de cada comando; no marques ✅ nada que solo hayas leído o inferido (`:38`).
- Actualiza en `verification.md` la fila correspondiente con estado, cómo se verificó y entorno (Codespaces, etc.) — p. ej. #22 (tests de frontend, `verification.md:55`) — y la columna "Estado" de la tabla de comandos de `.agents/rules/environment.md:29-36` la primera vez que un comando ❓ se ejecute (`:38`).
- Lo que no se pudo ejecutar queda en ❓ con el motivo; no se borran filas ❓ (`.agents/rules/docs-and-verification.md:35`, `:39`).
- No registres el arreglo de `iptables`/`sysctl` como cambio del repo; si lo usaste, menciónalo solo como condición del entorno en "cómo se verificó".

## Output esperado

Un informe breve con:

1. Veredicto: **LISTO PARA MERGE** / **NO LISTO** / **NO VERIFICABLE** (sin Docker).
2. Resultado de build, lint y test con el extracto de salida relevante (advertencias, tamaño del chunk principal, nº de tests).
3. Tabla línea base vs. actual del paso 3.
4. Resultado de red (`wget`, `curl`) y si hizo falta el arreglo temporal del entorno.
5. Checklist manual del paso 4 marcada.
6. Diff de `verification.md` (y de `.agents/rules/environment.md` si cambió un estado ❓).

## Criterios de aceptación

- Los tres comandos del paso 1 terminan con código 0 dentro del contenedor.
- Build sin advertencias y chunk principal < 500 kB.
- Lint sin errores; 13 tests o más pasando (línea base de `e57cf40`, salvo que `verification.md` registre una más reciente, que manda), ninguno fallando ni omitido respecto a la base.
- `wget` a `http://backend:8000/health` devuelve `{"status":"ok"}` y `curl` a `localhost:5173/api/metrics` devuelve `200`.
- Todos los puntos del paso 4 cumplidos (Accessibility 100, axe 0).
- `git diff frontend/vite.config.ts` no toca `server.proxy`, y el diff no contiene cambios de `iptables`/`sysctl` ni de `package-lock.json` sin cambio en `package.json` (`.agents/rules/environment.md:62`).
- `verification.md` actualizado con entorno y evidencia.

## Fuera de alcance

- Backend: `docker compose exec backend pytest` y sus tests (`verification.md` #21) tienen su propia verificación.
- Ejecutar fuera de Docker (`npm run dev` en el host, `verification.md` #23) o en un entorno local sin Docker.
- Corregir defectos conocidos que no son regresión de la rama, como el periodo "2024" hardcodeado (`frontend/src/App.tsx:59`, `verification.md` #17).
- Cambiar el entorno de forma permanente (Dockerfiles, `docker-compose.yml`, proxy) para resolver el problema de red de Codespaces.
- Hacer commit, merge o push.
