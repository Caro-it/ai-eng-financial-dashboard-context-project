# Verificación del contrato API para las specs del frontend

Fecha: **2026-10-05**. Previo a escribir specs o tipos: aquí solo se contrasta el brief del PM con la API.

**Fuentes (únicas):**
- `frontend/specs/openapi.snapshot.json`: esquema de la API en vivo, descargado de `/openapi.json` el 2026-10-05. Se cita con JSON Pointer (RFC 6901), donde `/` dentro de una ruta se escribe `~1`. Ejemplo: `#/paths/~1api~1metrics~1alerts/get/parameters/0` = primer parámetro de `GET /api/metrics/alerts`.
- Código del repo, citado como `archivo:línea`. Solo se usa para lo que el esquema no expresa (semántica de cálculo, formato de `period`, filtros).

**No** se ha arrancado el backend ni ejecutado nada.

**Leyenda de estado**

Según `.agents/rules/docs-and-verification.md` §2, solo la ejecución real cuenta como ✅. En este documento:

| Marca | Significado |
|---|---|
| ✅ ejecutado | Demostrado con una respuesta real del backend en vivo. Cita la llamada `E#` de la sección 5. |
| ✅ | Lo que dice el brief coincide con el esquema o el código. **Verificado por lectura (agente)**, sin respuesta real. Se confirma con las llamadas de la sección 4. |
| ❌ | El brief no coincide con el esquema o el código. |
| ❓ | Ni el esquema ni el código lo responden. Hay que comprobarlo con una respuesta real o preguntar al PM. |

---

## 1. Endpoints: parámetros y respuesta

Notas comunes a todos los endpoints:
- **Fechas.** Todos los `format: date` son fechas ISO `YYYY-MM-DD` (`backend/app/routes.py:23`, `:34-35`, `:250-251`).
- **Filtro de fechas.** `start_date` y `end_date` son **inclusivos** (`>=` y `<=`, `routes.py:116-121`). Si se omiten ambos, no se filtra (`routes.py:112-113`).
- **Datos.** Son mock y se regeneran con `seed=42` y fechas relativas a `date.today()` (`routes.py:94-104`). El rango de fechas cambia cada día.
- **Parámetros desconocidos.** Ningún parámetro del esquema declara `additionalProperties` ni rechazo de parámetros extra. Qué pasa si se envía uno que no existe (p. ej. `business_type` a `/api/metrics`) → ❓, ver sección 4.
- **422.** Un valor de query fuera del enum o del rango devuelve 422 con `HTTPValidationError` en los endpoints que lo declaran (ver "Errores" abajo).

### 1.1 `GET /api/metrics`

Parámetros (`#/paths/~1api~1metrics/get/parameters`):

| # | Nombre | Tipo | Obligatorio | Default | Mín / máx | Evidencia |
|---|---|---|---|---|---|---|
| 0 | `start_date` | `string` (`format: date`) \| `null` | no | ninguno declarado (código: `None`, `routes.py:250`) | — | `…/parameters/0` |
| 1 | `end_date` | `string` (`format: date`) \| `null` | no | ninguno declarado (código: `None`, `routes.py:251`) | — | `…/parameters/1` |
| 2 | `category` | `"suppliers"` \| `"sales"` \| `"operational"` \| `"administrative"` \| `"others"` \| `null` | no | ninguno declarado (código: `None`, `routes.py:252`) | — | `…/parameters/2` |
| 3 | `operation_type` | `"income"` \| `"outcome"` \| `null` | no | ninguno declarado (código: `None`, `routes.py:253`) | — | `…/parameters/3` |

**No acepta `business_type`** (no aparece en `…/parameters`; firma en `routes.py:248-254`).

Respuesta 200: `array` de `FinancialMovement` (`#/paths/~1api~1metrics/get/responses/200/content/application~1json/schema`). Viene ordenada por `create_date` ascendente (`routes.py:259`).

`FinancialMovement` (`#/components/schemas/FinancialMovement`):

| Campo | Tipo | Obligatorio | Admite null | Evidencia |
|---|---|---|---|---|
| `create_date` | `string`, `format: date` | sí | no | `…/FinancialMovement/properties/create_date`, `…/required` |
| `amount` | `number` | sí | no | `…/properties/amount` |
| `operation_type` | `"income"` \| `"outcome"` | sí | no | `…/properties/operation_type` |
| `category` | `"suppliers"` \| `"sales"` \| `"operational"` \| `"administrative"` \| `"others"` | sí | no | `…/properties/category` |
| `business_type` | `"B2B"` \| `"B2C"` | sí | no | `…/properties/business_type` |

`amount` siempre es positivo, también en `outcome`: el signo no lo da el importe, sino `operation_type` (`routes.py:80`, `:83`). El esquema no lo dice.

Errores: 422 → `HTTPValidationError` (`#/paths/~1api~1metrics/get/responses/422`).

### 1.2 `GET /api/metrics/facets`

Parámetros: **ninguno**. La operación no tiene clave `parameters` (`#/paths/~1api~1metrics~1facets/get`).

Respuesta 200: `MetricsFacets` (`#/paths/~1api~1metrics~1facets/get/responses/200/content/application~1json/schema` → `#/components/schemas/MetricsFacets`):

| Campo | Tipo | Obligatorio | Admite null | Evidencia |
|---|---|---|---|---|
| `operation_types` | `array` de `"income"` \| `"outcome"` | sí | no | `#/components/schemas/MetricsFacets/properties/operation_types` |
| `business_types` | `array` de `"B2B"` \| `"B2C"` | sí | no | `…/properties/business_types` |
| `categories` | `array` de `"suppliers"` \| `"sales"` \| `"operational"` \| `"administrative"` \| `"others"` | sí | no | `…/properties/categories` |
| `min_date` | `string`, `format: date` | sí | no | `…/properties/min_date` |
| `max_date` | `string`, `format: date` | sí | no | `…/properties/max_date` |

`required` incluye los 5 campos (`#/components/schemas/MetricsFacets/required`).

Semántica (código):
- Se calcula sobre **todo** el dataset, sin filtros (`routes.py:262-265`).
- `min_date` / `max_date` son la primera y la última `create_date` (`routes.py:151`, `:156-157`).
- Los arrays salen ordenados alfabéticamente (`routes.py:153-155`).

Errores: solo se declara `200` (`#/paths/~1api~1metrics~1facets/get/responses`). No hay 422 porque no hay parámetros.

### 1.3 `GET /api/metrics/alerts`

Parámetros (`#/paths/~1api~1metrics~1alerts/get/parameters`):

| # | Nombre | Tipo | Obligatorio | Default | Mín / máx | Evidencia |
|---|---|---|---|---|---|---|
| 0 | `threshold` | `number` | no | `0.3` | `minimum: 0` (inclusivo en OpenAPI 3.1; código `ge=0`). **Sin máximo.** | `…/parameters/0/schema`; `routes.py:344` |
| 1 | `group_by` | `"day"` \| `"week"` \| `"month"` | no | `"month"` | — | `…/parameters/1/schema`; `routes.py:345` |
| 2 | `start_date` | `string` (`format: date`) \| `null` | no | ninguno declarado (código: `None`) | — | `…/parameters/2` |
| 3 | `end_date` | `string` (`format: date`) \| `null` | no | ninguno declarado (código: `None`) | — | `…/parameters/3` |
| 4 | `business_type` | `"B2B"` \| `"B2C"` \| `null` | no | ninguno declarado (código: `None`) | — | `…/parameters/4` |

**No acepta `category` ni `operation_type`** (no están en `…/parameters`; el código pasa `None`, `routes.py:355-357`).

Respuesta 200: `array` de `MetricsAlert` (`#/paths/~1api~1metrics~1alerts/get/responses/200/content/application~1json/schema` → `#/components/schemas/MetricsAlert`):

| Campo | Tipo | Obligatorio | Admite null | Evidencia |
|---|---|---|---|---|
| `period` | `string` | sí | no | `#/components/schemas/MetricsAlert/properties/period` |
| `outcome_total` | `number` | sí | no | `…/properties/outcome_total` |
| `baseline_average` | `number` | sí | no | `…/properties/baseline_average` |
| `increase_ratio` | `number` | sí | no | `…/properties/increase_ratio` |

`required` incluye los 4 campos (`#/components/schemas/MetricsAlert/required`).

Semántica (código; el esquema solo dice `string` / `number`):
- **`period`**: formato según `group_by`. `month` → `"YYYY-MM"`; `week` → `"YYYY-Www"` (semana ISO); `day` → `"YYYY-MM-DD"` (`routes.py:169-175`).
- **`outcome_total`**: suma de `amount` de los `outcome` del período, redondeada a 2 decimales (`routes.py:177`, `:234`).
- **`baseline_average`**: media de `outcome` de **todos los períodos anteriores** dentro del rango filtrado. No es una ventana de 3 (`routes.py:224-227`, `:239`). Redondeo a 2 decimales (`:235`).
- **`increase_ratio`**: `(outcome - baseline) / baseline`. Es una **fracción**, no un porcentaje: `0.35` = +35 % (`routes.py:229`). Redondeo a 4 decimales (`:236`).
- **Cuándo hay alerta**: solo si `increase_ratio > threshold` (estricto, `routes.py:230`) y `baseline > 0` (`:228`). El primer período del rango nunca genera alerta (`:226`).
- **Orden**: las alertas salen en orden cronológico de `period` (`routes.py:186`, `:225`).

Errores: 422 → `HTTPValidationError` (`#/paths/~1api~1metrics~1alerts/get/responses/422`).

### 1.4 `GET /api/metrics/categories/top`

Parámetros (`#/paths/~1api~1metrics~1categories~1top/get/parameters`):

| # | Nombre | Tipo | Obligatorio | Default | Mín / máx | Evidencia |
|---|---|---|---|---|---|---|
| 0 | `operation_type` | `"income"` \| `"outcome"` (**no** admite `null`) | no | `"outcome"` | — | `…/parameters/0/schema`; `routes.py:289` |
| 1 | `limit` | `integer` | no | `5` | `minimum: 1`, `maximum: 20` | `…/parameters/1/schema`; `routes.py:290` |
| 2 | `start_date` | `string` (`format: date`) \| `null` | no | ninguno declarado (código: `None`) | — | `…/parameters/2` |
| 3 | `end_date` | `string` (`format: date`) \| `null` | no | ninguno declarado (código: `None`) | — | `…/parameters/3` |
| 4 | `business_type` | `"B2B"` \| `"B2C"` \| `null` | no | ninguno declarado (código: `None`) | — | `…/parameters/4` |

**No acepta `category`** (no está en `…/parameters`; `routes.py:300` pasa `category=None`).

Respuesta 200: `array` de `TopCategoryItem` (`#/paths/~1api~1metrics~1categories~1top/get/responses/200/content/application~1json/schema` → `#/components/schemas/TopCategoryItem`):

| Campo | Tipo | Obligatorio | Admite null | Evidencia |
|---|---|---|---|---|
| `category` | `"suppliers"` \| `"sales"` \| `"operational"` \| `"administrative"` \| `"others"` | sí | no | `#/components/schemas/TopCategoryItem/properties/category` |
| `operation_type` | `"income"` \| `"outcome"` | sí | no | `…/properties/operation_type` |
| `total_amount` | `number` | sí | no | `…/properties/total_amount` |

`required` incluye los 3 campos (`#/components/schemas/TopCategoryItem/required`).

Semántica (código):
- Orden descendente por `total_amount` (`routes.py:200`), cortado a `limit` (`:207`).
- Solo salen categorías con movimientos en el rango: no hay filas con 0 (`routes.py:195-198`).
- El mock solo genera `sales`/`others` para `income` (`routes.py:79`) y `suppliers`/`operational`/`administrative`/`others` para `outcome` (`routes.py:17`, `:82`). Por tanto, como mucho hay 2 filas de `income` y 4 de `outcome`.

Errores: 422 → `HTTPValidationError` (`#/paths/~1api~1metrics~1categories~1top/get/responses/422`).

### 1.5 `GET /api/metrics/b2b`

Parámetros (`#/paths/~1api~1metrics~1b2b/get/parameters`): son los mismos 4 que `/api/metrics`, con los mismos tipos y defaults:

| # | Nombre | Tipo | Obligatorio | Default | Mín / máx |
|---|---|---|---|---|---|
| 0 | `start_date` | `string` (`format: date`) \| `null` | no | ninguno declarado | — |
| 1 | `end_date` | `string` (`format: date`) \| `null` | no | ninguno declarado | — |
| 2 | `category` | enum de categorías \| `null` | no | ninguno declarado | — |
| 3 | `operation_type` | `"income"` \| `"outcome"` \| `null` | no | ninguno declarado | — |

Respuesta 200: `array` de `FinancialMovement` (`#/paths/~1api~1metrics~1b2b/get/responses/200/content/application~1json/schema`), con el mismo schema de la tabla 1.1. Viene ordenada por `create_date` (`routes.py:375`).

Semántica: son los movimientos crudos, ya filtrados a `business_type == "B2B"` (`routes.py:369-371`). No agrega nada.

Errores: 422 → `HTTPValidationError` (`…/responses/422`).

### 1.6 `GET /api/metrics/b2c`

Es idéntico a 1.5 (`#/paths/~1api~1metrics~1b2c/get/parameters/0..3`, `…/responses/200`, `…/responses/422`), pero filtrado a `business_type == "B2C"` (`routes.py:385-387`).

### 1.7 Schemas de error (resueltos)

`HTTPValidationError` (`#/components/schemas/HTTPValidationError`):
- `detail`: `array` de `ValidationError`.
- **Opcional**: no hay `required`.

`ValidationError` (`#/components/schemas/ValidationError`):

| Campo | Tipo | Obligatorio | Admite null |
|---|---|---|---|
| `loc` | `array` de (`string` \| `integer`) | sí | no |
| `msg` | `string` | sí | no |
| `type` | `string` | sí | no |
| `input` | sin tipo declarado (cualquiera) | no | ❓ sin tipo, no se puede afirmar |
| `ctx` | `object` | no | no declarado |

`required: ["loc", "msg", "type"]` (`#/components/schemas/ValidationError/required`).

**Ningún campo de respuesta de los 6 endpoints admite `null`.** El único `anyOf` con `null` en una respuesta es `MetricsComparison.delta_pct`, que está fuera del alcance (`#/components/schemas/MetricsComparison/properties/delta_pct`).

---

## 2. Desajustes entre el brief del PM y la API real

| # | Punto del brief | Realidad (esquema / código) | Evidencia | Estado |
|---|---|---|---|---|
| 2.1 | Parámetros de fecha de inicio y fin | Se llaman `start_date` y `end_date`, son ISO `YYYY-MM-DD`, opcionales e inclusivos. | `#/paths/~1api~1metrics/get/parameters/0` y `/1`; `routes.py:116-121` | ✅ ejecutado `start_date`, inclusivo (E6) · ✅ ejecutado `end_date` filtra (E10) · inclusividad de `end_date` solo por lectura |
| 2.1b | Qué endpoints aceptan fechas | Las aceptan `/api/metrics`, `/alerts`, `/categories/top`, `/b2b` y `/b2c`. **`/facets` no** acepta ninguna. Fuera del alcance: `/summary` las acepta opcionales y `/comparison` obligatorias. | `…~1alerts/get/parameters/2-3`; `…~1categories~1top/get/parameters/2-3`; `…~1b2b/get/parameters/0-1`; `…~1b2c/get/parameters/0-1`; `#/paths/~1api~1metrics~1facets/get` sin `parameters`; `#/paths/~1api~1metrics~1comparison/get/parameters/0/required` = `true` | ✅ · ✅ ejecutado en `/alerts` (E9) · `/b2b` y `/b2c` solo por lectura |
| 2.1c | Qué pasa con `start_date > end_date` o un rango fuera de los datos | El código filtra sin validar el orden, así que debería devolver `[]`, no 422. El esquema no lo dice. | `routes.py:107-122` | ✅ ejecutado rango fuera de los datos → `[]` (E5) · ❓ rango invertido (confirmar en §4) |
| 2.2 | `/facets` devuelve las fechas más antigua y más reciente | Sí: `min_date` y `max_date`, `string` `format: date`, obligatorios y no nulos. Son del dataset completo; no se pueden filtrar por `business_type` ni por nada. | `#/components/schemas/MetricsFacets/properties/min_date`, `/max_date`, `/required`; `routes.py:156-157`, `:262-265` | ✅ ejecutado (E1, E6) |
| 2.3a | Alertas: columna "período" | Campo `period` (`string`). Formato `YYYY-MM` con el `group_by=month` por defecto. | `#/components/schemas/MetricsAlert/properties/period`; `routes.py:169-175` | ✅ ejecutado (E2) |
| 2.3b | Alertas: columna "outcome registrado" | Campo `outcome_total` (`number`), suma de outcomes del período. | `#/components/schemas/MetricsAlert/properties/outcome_total`; `routes.py:234` | ✅ ejecutado (E2) |
| 2.3c | Alertas: columna "media móvil de 3 períodos" | El campo es `baseline_average`, pero **no** es una media móvil de 3: es la media de **todos** los períodos anteriores del rango filtrado. Cambiar `start_date` cambia el baseline. | `#/components/schemas/MetricsAlert/properties/baseline_average`; `routes.py:224-227`, `:239` | ❌ · verificado por código, coherente con la ejecución (E9: el baseline solo usa períodos del rango, pero no distingue acumulada de móvil de 3) |
| 2.3d | Alertas: columna "incremento porcentual" | El campo es `increase_ratio`, una **fracción** (`0.35` = 35 %) con 4 decimales. Para mostrarlo como porcentaje, el frontend tiene que multiplicar por 100. | `#/components/schemas/MetricsAlert/properties/increase_ratio`; `routes.py:229`, `:236` | ❌ (no es porcentaje) · ✅ ejecutado (E2) |
| 2.4a | `threshold`: rango 0.01 a 1.0 | La API acepta `>= 0`, sin máximo. `0` y `5` son válidos para la API; si se quiere el rango del brief, hay que limitarlo en la UI. | `#/paths/~1api~1metrics~1alerts/get/parameters/0/schema/minimum` = `0`, sin `maximum`; `routes.py:344` (`ge=0`) | ❌ · ✅ ejecutado sin máximo (E3) · mínimo 0 solo por lectura |
| 2.4b | `threshold`: default 0.3 | `default: 0.3`. | `#/paths/~1api~1metrics~1alerts/get/parameters/0/schema/default` | ✅ |
| 2.4c | `threshold` como fracción o porcentaje | Es una fracción, igual que `increase_ratio`: `0.3` = 30 %. Comparación estricta `>`. | `routes.py:229-230` | ✅ ejecutado (E2 + E3) · comparación estricta `>` solo por código |
| 2.5a | `categories/top`: valores de `operation_type` | `"income"` \| `"outcome"`, default `"outcome"`. No admite `null`, así que no se pueden pedir ambos a la vez. | `#/paths/~1api~1metrics~1categories~1top/get/parameters/0/schema` | ✅ |
| 2.5b | `categories/top`: límites de `limit` | Entero de 1 a 20, default 5. | `#/paths/~1api~1metrics~1categories~1top/get/parameters/1/schema` | ✅ |
| 2.5c | `categories/top`: parámetro para filtrar B2B / B2C | `business_type` = `"B2B"` \| `"B2C"` \| `null`. Sin el parámetro, mezcla ambos. Los valores van en mayúsculas. | `#/paths/~1api~1metrics~1categories~1top/get/parameters/4`; `routes.py:296-298` | ✅ ejecutado (E4 + E7 = E8) |
| 2.6 | ¿La API devuelve el % sobre el total del grupo? | **No.** `TopCategoryItem` solo tiene `category`, `operation_type` y `total_amount`; **hay que calcularlo en el frontend**. Ojo con el denominador: la respuesta se corta a `limit`, así que la suma de las filas solo es el total del grupo si `limit` ≥ nº de categorías con datos (máx. 4 en outcome y 2 en income, por el mock). Con el default `limit=5` hoy cubre todas, pero eso depende del mock, no del contrato. | `#/components/schemas/TopCategoryItem/properties`; `routes.py:200-208`, `:17`, `:79` | ❌ si el brief asume que lo da la API · ✅ ejecutado: sin campo de % y con menos filas que `limit` (E4) · denominador decidido (sección 6) |
| 2.7 | El brief no menciona `/b2b` ni `/b2c`: solo nombra `categories/top` y `facets` | `/b2b` y `/b2c` devuelven **movimientos crudos** (`FinancialMovement[]`) de un solo tipo de negocio, con filtros de fecha, `category` y `operation_type`; no agregan. `categories/top` devuelve **totales agregados por categoría**, filtrables con `business_type`. Para un ranking B2B/B2C basta `categories/top?business_type=…`. `/b2b` y `/b2c` solo hacen falta si se necesitan movimientos individuales de un segmento, porque `/api/metrics` no acepta `business_type`. | `#/paths/~1api~1metrics~1b2b/get/responses/200/…/schema` (`FinancialMovement`); `#/paths/~1api~1metrics~1categories~1top/get/responses/200/…/schema` (`TopCategoryItem`); `#/paths/~1api~1metrics/get/parameters` (sin `business_type`); `routes.py:369-371`, `:385-387` | ✅ por esquema · no se usan: el brief no los pide y `categories/top` ya agrega por categoría |
| 2.8 | Filtrar alertas por categoría u `operation_type` | No es posible: `/alerts` solo acepta `threshold`, `group_by`, fechas y `business_type`. Siempre mira el outcome total. | `#/paths/~1api~1metrics~1alerts/get/parameters`; `routes.py:355-357` | ❓ (el brief no lo menciona; anotado por si aparece) |

---

## 3. Dónde hace fetch hoy el frontend

| Archivo:línea | Qué hace |
|---|---|
| `frontend/src/App.tsx:13` | `const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";` Por defecto usa una ruta relativa que pasa por el proxy de Vite. |
| `frontend/src/App.tsx:15-21` | `fetchFinancialData()`: `fetch(\`${API_BASE_URL}/api/metrics\`)` sin parámetros. Si `!response.ok`, lanza `Error` con el status. Devuelve `response.json()` tipado como `FinancialMovement[]` **sin validar en runtime**. |
| `frontend/src/App.tsx:29-43` | `useEffect([], …)`: llama a `fetchFinancialData`, deriva KPIs y datos mensuales en cliente (`computeKPIs`, `computeMonthlyData`) y gestiona `loading` / `error`. |
| `frontend/src/App.tsx:51-55` | Muestra el bloque de error si falla la petición. |
| `frontend/vite.config.ts:11-15` | El proxy reenvía `/api` → `http://backend:8000`. |
| `frontend/.env.example:1-4` | `VITE_API_BASE_URL` vacío por defecto. |
| `frontend/src/lib/financial-types.ts:5-11` | Tipo TS `FinancialMovement`, escrito a mano. Coincide campo a campo con `#/components/schemas/FinancialMovement`, salvo `create_date`, que en TS es `string` sin marca de formato. |

**Patrón:**
- Una única función `async` local en `App.tsx` por recurso.
- Usa `fetch` nativo y una URL construida con `API_BASE_URL` + ruta `/api/...`.
- Lanza un error si `!ok` y hace un cast implícito del JSON.
- Se llama desde un `useEffect` en `App.tsx` y los datos bajan por props.

**Detalles:**
- No hay cliente HTTP, ni construcción de query strings, ni `AbortController`.
- Ningún otro archivo de `frontend/src` contiene `fetch`: `grep -rln fetch frontend/src` → solo `App.tsx`.
- Reglas aplicables: `.agents/rules/frontend.md` §1 (fetch solo en `App.tsx` o en `lib/`) y `.agents/rules/api-contract.md` §1 y §3.

---

## 4. Llamadas para confirmar a mano en `/docs`

Las fechas se mueven cada día (`routes.py:97`), así que **no uses fechas literales**:
- Ejecuta primero la llamada 0.
- Sustituye `{MIN}` y `{MAX}` por `min_date` y `max_date` de su respuesta.
- `{MES_INTERMEDIO_INI}` y `{MES_INTERMEDIO_FIN}` son el día 1 y el último día de un mes entre `{MIN}` y `{MAX}`.
- En `/docs` (Swagger UI), cada URL corresponde a rellenar esos parámetros en "Try it out". La URL completa aparece en el campo "Request URL" de la respuesta.

Anota en cada fila el status y un extracto de la respuesta.

| # | Llamada | Qué confirma |
|---|---|---|
| 0 | `GET /api/metrics/facets` | Forma real de `MetricsFacets` (2.2); valores de `min_date` / `max_date` para el resto. |
| **Fechas** | | |
| 1 | `GET /api/metrics?start_date={MES_INTERMEDIO_INI}&end_date={MES_INTERMEDIO_FIN}` | Los extremos son inclusivos y solo devuelve ese rango (2.1). |
| 2 | `GET /api/metrics?start_date={MAX}&end_date={MIN}` | Rango invertido: ¿`[]` o 422? (2.1c) |
| 3 | `GET /api/metrics?start_date={MAX}` con `{MAX}` + 1 día | Rango sin datos → `[]` esperado (caso vacío). |
| 4 | `GET /api/metrics?start_date=2026/01/01` | Formato de fecha inválido → 422 y forma real de `HTTPValidationError` (1.7). |
| 5 | `GET /api/metrics?business_type=B2B` | ¿Ignora el parámetro desconocido y devuelve B2B + B2C, o da error? (1.1, 2.7) |
| **Alertas** | | |
| 6 | `GET /api/metrics/alerts` | Defaults (`threshold=0.3`, `group_by=month`), formato de `period` y `increase_ratio` como fracción (2.3, 2.4). |
| 7 | `GET /api/metrics/alerts?threshold=0` | Mínimo inclusivo aceptado (2.4a). |
| 8 | `GET /api/metrics/alerts?threshold=-0.1` | Por debajo del mínimo → 422 esperado. |
| 9 | `GET /api/metrics/alerts?threshold=5` | Sin máximo → 200, probablemente `[]` (2.4a, caso vacío). |
| 10 | `GET /api/metrics/alerts?threshold=0.01` y `?threshold=1` | Extremos del brief: el número de alertas cambia (2.4a). |
| 11 | `GET /api/metrics/alerts?start_date={MES_INTERMEDIO_INI}&end_date={MES_INTERMEDIO_FIN}` | Un solo período → `[]`, porque no hay baseline (caso vacío, 2.3c). |
| 12 | `GET /api/metrics/alerts?start_date={MIN}` y luego `?start_date={MES_INTERMEDIO_INI}` | Para el mismo `period`, el `baseline_average` cambia según el inicio del rango: confirma que es acumulado y no móvil de 3 (2.3c). |
| 13 | `GET /api/metrics/alerts?business_type=B2C` | El filtro de negocio cambia las alertas. |
| 14 | `GET /api/metrics/alerts?group_by=week` | Formato `YYYY-Www` de `period`. |
| **Top categorías** | | |
| 15 | `GET /api/metrics/categories/top` | Defaults (`outcome`, `limit=5`), orden descendente y número real de filas (2.5, 2.6). |
| 16 | `GET /api/metrics/categories/top?operation_type=income&limit=20` | Cuántas categorías de income existen de verdad (2.6). |
| 17 | `GET /api/metrics/categories/top?limit=0` y `?limit=21` | Fuera de rango → 422 (2.5b). |
| 18 | `GET /api/metrics/categories/top?operation_type=outcome&business_type=B2B` y la misma con `B2C` | Filtro de negocio (2.5c). La suma de las dos debería igualar la llamada 15 si `limit` cubre todas las categorías. |
| 19 | `GET /api/metrics/categories/top?business_type=b2b` | Minúsculas → 422 esperado (2.5c). |
| 20 | `GET /api/metrics/categories/top?start_date={MAX}&end_date={MIN}` | Caso vacío → `[]` esperado. |
| **B2B / B2C** | | |
| 21 | `GET /api/metrics/b2b` y `GET /api/metrics/b2c` | Todos los `business_type` coinciden con el segmento y el número de filas suma lo mismo que `GET /api/metrics` (2.7). |
| 22 | `GET /api/metrics/b2b?category=sales&operation_type=income&start_date={MES_INTERMEDIO_INI}&end_date={MES_INTERMEDIO_FIN}` | Combinación de filtros. |
| 23 | `GET /api/metrics/b2c?start_date={MAX}&end_date={MIN}` | Caso vacío → `[]` esperado. |

Cuando las ejecutes, actualiza el estado de las filas de la sección 2 (✅ con la llamada y el entorno, según `.agents/rules/docs-and-verification.md` §2).

---

## Pendiente de decisión del PM (no se resuelve con la API)

- **Ventana del baseline (2.3c).** La API usa una media acumulada. ¿Se acepta ese cálculo, o hay que pedir un cambio de backend para tener una media móvil de 3 períodos?
- **Rango de `threshold` (2.4a).** La API admite valores ≥ 0 sin máximo. ¿El rango 0.01–1.0 se impone solo en la UI?
- ~~**Denominador del % por categoría (2.6).** ¿Sobre el total del `operation_type` en el rango, o solo sobre las filas mostradas (`limit`)?~~ Resuelto: ver sección 6.
- ~~**Uso de `/b2b` y `/b2c` (2.7).** ¿Qué vista del brief los necesita, si `categories/top` ya filtra por `business_type`?~~ Resuelto: el brief no los menciona y no se usan (2.7).

---

## 5. Evidencia en vivo

Llamadas ejecutadas a mano por la autora en `/docs` del backend en vivo (**Codespaces**: E1–E6 el 2026-10-05, E7–E10 el 2026-10-06). Solo se recoge lo que se observó en cada respuesta. El status y los valores se transcriben tal cual.

| # | Llamada | Respuesta observada | Qué demuestra | Filas |
|---|---|---|---|---|
| E1 | `GET /api/metrics/facets` | 200. `operation_types` `["income","outcome"]`, `business_types` `["B2B","B2C"]`, `categories` `["administrative","operational","others","sales","suppliers"]`, `min_date` `"2025-10-02"`, `max_date` `"2026-09-28"`. `categories` es una lista plana, sin separar por `business_type`. | Los nombres `min_date` / `max_date` y la forma de `MetricsFacets` (1.2). Las categorías son globales y salen en orden alfabético (`routes.py:153-155`). | 2.2 |
| E2 | `GET /api/metrics/alerts?threshold=0.3&group_by=month` | 200. Array directo (sin envoltorio) de 4 elementos con `period`, `outcome_total`, `baseline_average` e `increase_ratio`: (1) `"2025-12"`, `103378.98`, `51174.1`, `1.0201`; (2) `"2026-03"`, `88076.9`, `56456.19`, `0.5601`; (3) `"2026-06"`, `80212.01`, `57857.4`, `0.3864`; (4) `"2026-08"`, `82189.37`, `60357.08`, `0.3617`. | Los nombres de los 4 campos y `period` en formato `YYYY-MM`. `increase_ratio` es una fracción: (103378.98 − 51174.1) / 51174.1 = 1.0201; como porcentaje sería ~102. | 2.3a, 2.3b, 2.3d, 2.4c |
| E3 | `GET /api/metrics/alerts?threshold=50&group_by=month` | 200 con `[]`. | La API acepta `threshold` > 1.0, es decir, no tiene máximo. Si no hay alertas, devuelve un array vacío, no un error. Con E2, también que `threshold` va en la misma escala que `increase_ratio`: 1.0201 no supera 50. | 2.4a, 2.4c |
| E4 | `GET /api/metrics/categories/top?operation_type=income&business_type=B2B&limit=5` | 200. Array directo de 2 elementos: `sales` `557903.97` y `others` `57636.75`, con los campos `category`, `operation_type` y `total_amount`. Las dos filas traen `"operation_type": "income"`. | No hay campo de porcentaje. Devuelve menos filas que `limit` y en orden descendente por `total_amount`. | 2.6 |
| E5 | `GET /api/metrics/categories/top?operation_type=income&business_type=B2B&limit=5&start_date=2030-01-01&end_date=2030-12-31` | 200 con `[]`. | Un rango de fechas fuera de los datos devuelve `[]`, no 422. | 2.1c (solo la parte "fuera de los datos") |
| E6 | `GET /api/metrics?start_date=2026-06-01` | 200. Array de objetos con `create_date`, `amount`, `operation_type`, `category` y `business_type`. Primer `create_date`: `"2026-06-01"`. Último: `"2026-09-28"`, igual al `max_date` de E1. | `start_date` es inclusivo. Sin `end_date`, devuelve hasta el final de los datos. Los campos de `FinancialMovement` coinciden con 1.1. | 2.1 (solo `start_date`), 2.2 |
| E7 | `GET /api/metrics/categories/top?operation_type=income&business_type=B2C&limit=5` | 200. Dos filas: `sales` `574193.41` y `others` `68412.74`. | Las categorías y totales de B2C income. Igual que B2B (E4), solo hay `sales` y `others` y menos filas que `limit`. | 2.6 |
| E8 | `GET /api/metrics/categories/top?operation_type=income&limit=5`, sin `business_type` | 200. Dos filas: `sales` `1132097.38` y `others` `126049.49`. | `business_type` filtra de verdad: cada total sin filtro es exactamente B2B (E4) + B2C (E7). `sales`: 557903.97 + 574193.41 = 1132097.38. `others`: 57636.75 + 68412.74 = 126049.49. Sin el parámetro, mezcla ambos. | 2.5c |
| E9 | `GET /api/metrics/alerts?start_date=2026-06-01`, con `threshold` y `group_by` por defecto | 200 con `[]`. Sin filtro, `2026-06` y `2026-08` eran alertas (E2, elementos 3 y 4). | Las fechas filtran en `/alerts`. El baseline solo usa períodos dentro del rango: `2026-06` pasa a ser el primer período, sin baseline, y `2026-08` deja de superar el umbral. **No** distingue por sí sola una media acumulada de una móvil de 3. | 2.1b (`/alerts`), 2.3c (coherente) |
| E10 | `GET /api/metrics?end_date=2025-12-31` | 200. Primer elemento: `create_date` `"2025-10-02"` (igual al `min_date` de facets, E1), `amount` `10178.62`, `operation_type` `"income"`, `category` `"sales"`, `business_type` `"B2B"`. Último: `create_date` `"2025-12-27"`, `amount` `886.43`, `operation_type` `"outcome"`, `category` `"suppliers"`, `business_type` `"B2C"`. | `end_date` filtra. Sin `start_date`, devuelve desde el principio de los datos. **Salvedad:** no hay registros del 2025-12-31, así que la inclusividad del extremo final sigue verificada solo por código (`routes.py:120-121`). | 2.1 (`end_date`) |

**Qué siguen sin demostrar estas llamadas** (sus filas no cambian):
- **2.1:** que `end_date` sea inclusivo. E10 demuestra que filtra, pero no hay registros en su fecha límite.
- **2.1b:** que las fechas funcionen en `/b2b` y `/b2c`.
- **2.1c:** el rango invertido.
- **2.3c:** la ventana del baseline. En E2, el primer período con alerta (`2025-12`) solo tiene 2 períodos previos desde `min_date` 2025-10-02, así que una media acumulada y una móvil de 3 dan el mismo valor. E9 es coherente con el código, pero tampoco distingue los dos cálculos. Sigue siendo ❌ por código.
- **2.4a:** el mínimo 0.
- **2.4b:** el default 0.3. E2 envía `threshold=0.3` explícito.
- **2.5a / 2.5b:** el default `"outcome"` y los límites de `limit`.
- **2.7:** `/b2b` y `/b2c` no se han llamado.

**Relación con las llamadas de la sección 4:**
- E1 = llamada 0.
- E3 es la variante con `threshold=50` de la llamada 9.
- E5 cubre el caso vacío por fechas futuras; la llamada 20 (rango invertido) sigue pendiente.
- E6 cubre la mitad "inicio inclusivo" de la llamada 1.
- E10 cubre que `end_date` filtra (llamada 1), pero no la inclusividad del extremo final.
- E7 + E8 son la variante `income` de la llamada 18; la llamada 18 con `outcome` sigue pendiente.
- E9 se relaciona con la llamada 12, pero no la sustituye: falta comparar el `baseline_average` de un mismo `period` con dos `start_date` distintos.

---

## 6. Decisiones

| # | Decisión | Motivo / evidencia | Fecha |
|---|---|---|---|
| D1 | El porcentaje por categoría se calcula **en el frontend**, sobre la suma de `total_amount` de las filas devueltas por `/api/metrics/categories/top`. | La API no devuelve porcentaje (E4; `#/components/schemas/TopCategoryItem/properties`). | 2026-10-05 |
| D1.a | Esa suma es el total real del grupo **mientras el número de categorías de `/facets` (hoy 5, E1) sea ≤ `limit`**. | La respuesta se corta a `limit` (`routes.py:207`). | 2026-10-05 |

Nota sobre D1.a: la condición es suficiente, pero más estricta de lo necesario. `/facets.categories` es la lista global (E1). Para un `operation_type` concreto hay menos categorías, por ejemplo 2 en income B2B (E4). Con `limit` < 5, el porcentaje sería sobre las filas mostradas, no sobre el total del grupo.
