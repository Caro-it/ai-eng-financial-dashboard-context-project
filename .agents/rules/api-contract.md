# Contrato API backend ↔ frontend

**Alcance:** cualquier cambio que toque la forma de los datos que viajan entre servicios:

- Modelos Pydantic y alias `Literal` en `backend/app/routes.py`.
- Tipos en `frontend/src/lib/financial-types.ts`.
- Rutas nuevas o renombradas en `backend/app/routes.py`.
- Llamadas `fetch` del frontend.

Origen: `docs/findings.md` (ARQ-1, ARQ-2, NAM-1, NAM-6) → R-01, R-02, R-03.

---

## 1. Los dos lados del contrato cambian en el mismo cambio

**Por qué:** el contrato está escrito dos veces, a mano:

- `FinancialMovement` en Pydantic (`backend/app/routes.py:22-27`) y en TS (`frontend/src/lib/financial-types.ts:5-11`).
- Los literales están en `backend/app/routes.py:11-14` y en `frontend/src/lib/financial-types.ts:1-3`.

El frontend no valida la respuesta: `response.json()` se devuelve directamente como `FinancialMovement[]` (`frontend/src/App.tsx:15-20`). Si un campo se renombra en un solo lado, TS compila sin errores y el dashboard recibe `undefined`.

**Haz**
- Si añades, renombras o eliminas un campo de un modelo Pydantic que consume el frontend, aplica el mismo cambio en `financial-types.ts` en el mismo cambio.
- Mantén los nombres de campo del wire en **snake_case** (`create_date`, `operation_type`, `business_type`). La conversión a camelCase solo se hace en tipos derivados del frontend (`KPIMetrics`, `MonthlyDataPoint`).
- Si el frontend pasa a consumir `/api/metrics/summary`, mapea de forma explícita `net` (backend, `routes.py:42`) → `profit` (frontend, `financial-types.ts:16`).

**No hagas**
- No cambies un modelo de `routes.py` dando por hecho que "TS avisará": no avisará.
- No pases los campos del wire a camelCase en un solo lado.

**Cómo comprobar**
- Compara a ojo la lista de campos de cada `class ...(BaseModel)` modificada con la `interface` del mismo nombre en `financial-types.ts`.
- Comprueba en `/docs` del backend (verificado ✅ en `verification.md` #7) que el schema coincide con el tipo TS.

## 2. Solo el vocabulario de dominio existente

**Por qué:** los valores válidos son `Literal` en el backend (`backend/app/routes.py:11-14`), así que FastAPI responde 422 a cualquier otro valor de query (`routes.py:252-253`). El frontend usa los mismos valores, también en las variantes visuales (`frontend/src/components/dashboard/kpi-card.tsx:11`).

**Haz**
- Usa solo `income` / `outcome`, las categorías `suppliers`, `sales`, `operational`, `administrative`, `others`, y `B2B` / `B2C`.
- Si de verdad hace falta un valor nuevo, añádelo al `Literal` del backend y a la unión TS en el mismo cambio (sección 1).

**No hagas**
- No introduzcas sinónimos (`expense`, `revenue`, `cost`, `b2b` en minúsculas) en código, parámetros ni nombres de variantes.

**Cómo comprobar**
- `grep -rniE "expense|revenue" backend/app frontend/src` no devuelve resultados.

## 3. Los endpoints que consume el frontend van bajo `/api/`

**Por qué:** el proxy de Vite solo reenvía el prefijo `/api` a `http://backend:8000` (`frontend/vite.config.ts:11-15`). Hoy todas las rutas de datos cumplen esto (`backend/app/routes.py:248-378`); `/health` (`routes.py:243`) es la única excepción y el frontend no la usa.

**Haz**
- Declara cualquier ruta nueva para el frontend como `@router.get("/api/...")`.
- Llama desde el frontend con `${API_BASE_URL}/api/...`, siguiendo el patrón de `frontend/src/App.tsx:13-16`.

**No hagas**
- No crees rutas de datos en la raíz ni con otro prefijo.
- No añadas entradas nuevas al `proxy` de `vite.config.ts` para tapar una ruta mal prefijada.

**Cómo comprobar**
- `grep -n '@router.get("' backend/app/routes.py`: toda ruta salvo `/health` empieza por `/api/`.
