# Contrato de datos: filtro de fechas, alertas y B2B vs B2C

Este documento es el punto de entrada para implementar tres funcionalidades del dashboard:
1. un filtro de fechas;
2. una tabla de alertas de gasto;
3. una página de ingresos B2B vs B2C.

Está escrito para que una sesión nueva lo implemente sin hacer preguntas, leyendo esta carpeta y esos archivos (los de la tabla "Archivos del repo que hay que leer antes de implementar", al final de la §1). Aquí no hay código React ni `fetch`: solo el contrato. El detalle de cada componente está en `components.md`, y la evidencia de cada afirmación, en `verification.md`.

**Cómo se cita la evidencia:**
- **`E1`…`E10`:** llamadas reales a la API en vivo, en Codespaces. E1–E6 se hicieron el 2026-10-05 y E7–E10 el 2026-10-06 (`verification.md` §5).
- **`V 2.x`:** fila de la tabla de desajustes de `verification.md` §2.
- **`V §x`:** sección de `verification.md`.
- **`C §x`:** sección de `components.md`.

**Grado de verificación:**
- **✅ ejecutado:** demostrado con una respuesta real.
- **Por esquema / por código:** leído en `openapi.snapshot.json` o en `backend/app/routes.py`, pero no ejecutado.
- **❓:** sin verificar. Todo lo ❓ está en la §6.

---

## 1. Qué hay en esta carpeta

Léelos en este orden:

| # | Archivo | Qué contiene | Para qué lo usas |
|---|---|---|---|
| 1 | `README.md` | Este contrato: endpoints, tipos, parámetros, ejemplos, casos límite y decisiones. | Visión completa antes de implementar. |
| 2 | `components.md` | Spec de cada componente: nombre y archivo, responsabilidad, tabla de props, reglas y renderizado condicional (cargando / error / vacío / con datos). | Implementar cada componente. |
| 3 | `api-types.ts` | Tipos de **respuesta**: `OperationType`, `BusinessType`, `Category`, `GroupBy`, `FacetsResponse`, `AlertEntry`, `AlertsResponse`, `CategoryEntry`, `TopCategoriesResponse`. Cada propiedad lleva su JSDoc. | Importarlos con `import type`. |
| 4 | `param-types.ts` | Tipos de **parámetros de query**: `DateRangeFilter`, `AlertsParams` y `TopCategoriesParams`. | Importarlos con `import type`. |
| 5 | `verification.md` | Evidencia. Contiene: §1, el contrato por endpoint según el esquema; §2, los desajustes con el brief; §3, dónde hace `fetch` hoy el frontend; §4, las llamadas pendientes; §5, la evidencia en vivo E1–E10; §6, las decisiones D1 / D1.a. | Consultarlo cuando una regla necesite justificación. |
| — | `openapi.snapshot.json` | El esquema OpenAPI 3.1 de la API en vivo, descargado de `/openapi.json` el 2026-10-05. | Fuente de verdad de nombres, tipos, defaults y límites. |
| — | `tsconfig.json` | Configuración de TypeScript solo para los `.ts` de esta carpeta (ver §2). | Comprobar los tipos. |

Los archivos de **tipos** son solo tipos: no contienen funciones, `fetch` ni componentes.

### Archivos del repo que hay que leer antes de implementar

Rutas relativas a la raíz del repo. Los números de línea son los del commit `5e8829a`.

| Ruta | Motivo |
|---|---|
| `frontend/src/App.tsx` | Único sitio con `fetch` y estado de datos (`:15-43`). Define `API_BASE_URL` (`:13`) y `fetchFinancialData` (`:15-21`), que es el patrón de petición que se copia. Tiene el bloque de error (`:51-55`) y el orden actual de secciones: cabecera (`:49`), KPIs (`:57-59`) y gráficos (`:61-67`). Ahí se insertan los componentes nuevos (§3.1, "Disposición"). |
| `frontend/src/lib/financial-types.ts` | `FinancialMovement` (`:5-11`), el tipo de respuesta de `/api/metrics`. También declara `OperationType`, `Category` y `BusinessType` (`:1-3`) con los mismos literales que `api-types.ts`. |
| `frontend/src/lib/financial-utils.ts` | `formatCurrency` (`:69-76`) para toda columna "Moneda" y `formatPercent` (`:78-80`) para todo porcentaje. `computeKPIs` y `computeMonthlyData` (`:21-67`) calculan los KPIs y gráficos actuales a partir de `/api/metrics`. |
| `.agents/rules/frontend.md` | Reglas de obligado cumplimiento: datos solo en `App.tsx` (§1), prop `loading?` con `Skeleton` (§1), sin años literales (§2), colores solo con tokens CSS (§3), no editar `components/ui/` (§4), nombres e imports (§5), y build + lint + test para cerrar (§6). |
| `API_BASE_URL` | Se define en `frontend/src/App.tsx:13` como `import.meta.env.VITE_API_BASE_URL ?? ""`. Vacío por defecto (`frontend/.env.example:1-4`): la ruta relativa `/api` la reenvía el proxy de Vite al backend (`frontend/vite.config.ts:11-15`). |
| `frontend/src/components/dashboard/` | Componentes existentes que sirven de modelo: `kpi-row.tsx` (prop `loading`, `formatCurrency`), `income-outcome-chart.tsx` (Recharts, skeleton `:50-62`, estado vacío `:73-75`). |

---

## 2. Cómo comprobar los tipos

`npx tsc --noEmit` a secas, ejecutado desde `frontend/`, **no revisa esta carpeta**:
- `frontend/tsconfig.json` tiene `"files": []` y solo `references`. Sin `-b`, no comprueba ningún archivo.
- `frontend/tsconfig.app.json` solo incluye `"src"`, y `frontend/tsconfig.node.json`, solo `vite.config.ts`.
- Por eso `npm run build` (`tsc -b`) tampoco comprueba `specs/`.

El comando real, desde `frontend/`, es este:

```
npx tsc --noEmit -p specs/tsconfig.json
```

Usa `specs/tsconfig.json`, que tiene `strict: true`, `verbatimModuleSyntax: true` e `include: ["*.ts"]`. Comprueba `api-types.ts` y `param-types.ts`. Para ver qué archivos entran, añade `--listFilesOnly`.

Necesita TypeScript instalado en `frontend/node_modules`: el proyecto fija `~6.0.2`. Si no está instalado, `npx` usaría otra versión o la descargaría.

---

## 3. Contrato por funcionalidad

### Reglas comunes a las tres

- **Formato de fechas:** `YYYY-MM-DD`. Si un parámetro no tiene valor, se **omite** de la query string; nunca se envía `''` ni `null` (`C §0.4`).
- **Filtro de fechas:** `start_date` es inclusivo, ✅ ejecutado (E6: con `start_date=2026-06-01`, el primer registro es del `2026-06-01`). `end_date` es inclusivo solo por código (`V §1`): E10 demuestra que filtra, pero no había registros en el día límite. Si se omiten los dos, no se filtra.
- **Rutas de componentes:** las rutas de `components.md` (`components/dashboard/…`) son relativas a `frontend/src/`. Esa carpeta existe y ya contiene `components/dashboard/` y `components/ui/`.
- **Moneda:** toda columna o valor "en moneda" se formatea con `formatCurrency` (`frontend/src/lib/financial-utils.ts:69-76`: USD, `en-US`, sin decimales; `103378.98` → `$103,379`). Es la función que usa hoy el dashboard (`kpi-row.tsx:16`, `income-outcome-chart.tsx:42`).
- **Porcentajes:** todo porcentaje se formatea con `formatPercent` (`frontend/src/lib/financial-utils.ts:78-80`), que recibe el valor ya multiplicado por 100 y muestra 1 decimal sin espacio (`102.0%`).
- **Inputs con borrador:** `DateFilter` y `ThresholdInput` guardan internamente el texto que escribe el usuario (borrador). La prop `value` es el valor **aplicado**. Un valor inválido se queda en el input, con su mensaje de error, y no se emite. Si `value` cambia desde fuera, el borrador se sincroniza con `value` y se borra el error (`C §0.5`).
- **Carga de datos:** las peticiones las hace `App.tsx`, o un módulo de `lib/` que `App.tsx` invoque. Los componentes reciben datos y `loading` por props (`C §0.1`).
- **Patrón de petición:** es el actual (`V §3`). Se usa `API_BASE_URL` + ruta, se lanza un error si `!response.ok` y el JSON se tipa sin validarlo en runtime.
- **Petición más reciente:** ante cambios rápidos de filtro, solo se aplica la respuesta de la petición más reciente de cada recurso (D-F).
- **Estados:** hay cuatro, y **error y vacío son distintos** (`C §0.2`):

  | Estado | Condición |
  |---|---|
  | Cargando | Petición en curso |
  | Error | Fallo de red o status no 2xx, incluido el 422 |
  | Vacío | 200 con `[]`. **No es un error** (✅ ejecutado, E3 y E5). |
  | Con datos | 200 con al menos un elemento |

- **Validación de la UI:** un rango invertido o un umbral fuera de rango **no llaman a la API**. Muestran un mensaje junto al input y no se confunden con el estado Error (`C §0.3`).
- **Respuestas en array:** `alerts` y `categories/top` devuelven arrays directos, sin objeto envoltorio (✅ ejecutado, E2 y E4).

---

### 3.1 Funcionalidad 1: filtro de fechas en el dashboard

**Componentes:** `DateFilter` (`C §1`). No se llama `DateRangeFilter` para no chocar con el tipo del mismo nombre.

**Endpoints:**

| Método y ruta | Cuándo | Tipo de petición | Tipo de respuesta |
|---|---|---|---|
| `GET /api/metrics/facets` | Una vez, al montar `App.tsx` | Sin parámetros: el endpoint no acepta ninguno (`V §1.2`) | `FacetsResponse` (`api-types.ts`) |
| `GET /api/metrics` | Al montar y cada vez que `DateFilter` emite | `DateRangeFilter` (`param-types.ts`) | `FinancialMovement[]`. Es el tipo existente de `src/lib/financial-types.ts:5-11` (`V §3`). |
| `GET /api/metrics/alerts` | Igual que `/api/metrics` | `AlertsParams` (ver §3.2) | `AlertsResponse` |

**Parámetros (`DateRangeFilter`).** Se envían a `/api/metrics` y a `/api/metrics/alerts`, nunca a `/facets`:

| Nombre | Tipo | Obligatorio | Default | Lo que impone la API | Lo que impone la UI |
|---|---|---|---|---|---|
| `start_date` | `string` | opcional | ninguno: si se omite, no hay límite inferior | `format: date`, ISO `YYYY-MM-DD`. El esquema admite `null` (`V §1.1`). Inclusivo, ✅ ejecutado (E6). | Input vacío → se omite el parámetro. Sin `min`/`max`: se puede elegir cualquier fecha. Si hay dos fechas, `start_date` ≤ `end_date`; si no, error de validación y no se llama. |
| `end_date` | `string` | opcional | ninguno: si se omite, no hay límite superior | Igual que `start_date`. Filtra, ✅ ejecutado (E10). Inclusivo solo por código. | Igual que `start_date`. |

La API **no** valida el orden de las fechas (`V 2.1c`); por eso lo valida la UI.

**Reglas clave** (`C §1.4`):
- **Emisión:** `DateFilter` emite `onChange` al cambiar cualquier input, sin botón "Aplicar", y solo con un rango válido (D-A).
- **Rango disponible:** junto a los inputs se muestra "Datos disponibles del `min_date` al `max_date`", tomado de `facets`. **Nunca** se usan fechas literales: el mock regenera las fechas respecto a hoy (`V §1`).
- **Alcance:** el rango es propio del dashboard y afecta a `/api/metrics` y a `/api/metrics/alerts`. La página B2B vs B2C tiene su propio rango. Las dos vistas empiezan con los inputs vacíos (D-B).
- **Sin límites en los inputs:** no se usan `min` ni `max`. Se puede elegir cualquier fecha; un rango sin datos da el estado vacío (E5).
- **Disposición del dashboard** (D-K), de arriba abajo: cabecera actual (`App.tsx:49`), `DateFilter`, KPIs (`App.tsx:57-59`), gráficos existentes (`App.tsx:61-67`), `ThresholdInput` y `AlertsTable`. Con el mensaje "Sin datos en el rango seleccionado", que sustituye a KPIs y gráficos, `DateFilter`, `ThresholdInput` y `AlertsTable` siguen visibles.
- **Carga y error de `/api/metrics`:** se mantiene el comportamiento actual de `App.tsx`:
  - Cargando: `loading` es `true` (`App.tsx:26`) y `KPIRow`, `IncomeOutcomeChart` y `ProfitPercentChart` pintan su skeleton (`App.tsx:58`, `:65-66`).
  - Error: se muestra el bloque de error encima de los KPIs (`App.tsx:51-55`) con el texto "No se pudo cargar la informacion financiera. Revisa la API de backend." (`App.tsx:36-38`). Los KPIs muestran `—` (`kpi-row.tsx:16`) y los gráficos, "No data available to display" (`income-outcome-chart.tsx:73-75`). Un error **no** muestra "Sin datos en el rango seleccionado".
  - Hoy la petición se hace una sola vez, al montar (`App.tsx:29-43`). Con el filtro se relanza, y cada petición pasa por esos mismos estados: `loading` a `true` al empezar y el error de la petición anterior se descarta.

**Ejemplo en vivo:**

Petición E1: `GET /api/metrics/facets` → 200.

```json
{
  "operation_types": ["income", "outcome"],
  "business_types": ["B2B", "B2C"],
  "categories": ["administrative", "operational", "others", "sales", "suppliers"],
  "min_date": "2025-10-02",
  "max_date": "2026-09-28"
}
```

Petición E10: `GET /api/metrics?end_date=2025-12-31` → 200. Es un array de `FinancialMovement`. El primer `create_date` es igual a `min_date` (E1).

```json
[
  { "create_date": "2025-10-02", "amount": 10178.62, "operation_type": "income",  "category": "sales",     "business_type": "B2B" },
  { "create_date": "2025-12-27", "amount": 886.43,   "operation_type": "outcome", "category": "suppliers", "business_type": "B2C" }
]
```

Solo se muestran el primer y el último elemento de la respuesta; se omiten los intermedios.

**Casos límite:**

| Situación | Qué devuelve la API | Qué muestra la UI |
|---|---|---|
| Solo `start_date` relleno | 200, desde esa fecha, incluida, hasta el final de los datos. ✅ ejecutado (E6: con `start_date=2026-06-01`, el primero es `2026-06-01` y el último `2026-09-28`, igual a `max_date`). | Datos filtrados. Se envía solo `start_date`. |
| Solo `end_date` relleno | 200, desde el principio de los datos hasta esa fecha. ✅ ejecutado (E10). La inclusividad del día límite, solo por código. | Datos filtrados. Se envía solo `end_date`. |
| Rango invertido (`start_date` > `end_date`) | No se llama. Qué respondería la API es ❓; por código, no valida el orden (`V 2.1c`). | Mensaje "La fecha de inicio no puede ser posterior a la fecha de fin" junto a los inputs. No se emite `onChange` ni se llama a la API. Las fechas `YYYY-MM-DD` se pueden comparar como texto. |
| Rango sin datos (por ejemplo, años futuros) | 200 con `[]`, no 422. ✅ ejecutado (E5). | Un único mensaje, "Sin datos en el rango seleccionado", en lugar de los KPIs y gráficos. `DateFilter` sigue visible. La tabla de alertas muestra su propio estado vacío (D-E). |
| Falla `/facets` | Error de red o status no 2xx | Los inputs **siguen funcionando**. El texto del rango se sustituye por "No se pudo cargar el rango disponible". |
| `/facets` cargando | — | Skeleton en lugar del texto del rango. Los inputs, habilitados. |

---

### 3.2 Funcionalidad 2: tabla de alertas

**Componentes:** `ThresholdInput` y `AlertsTable` (`C §2`).

**Endpoint:** `GET /api/metrics/alerts`.
- **Tipo de petición:** `AlertsParams` (`param-types.ts`), que extiende `DateRangeFilter`.
- **Tipo de respuesta:** `AlertsResponse` = `AlertEntry[]` (`api-types.ts`).

**Parámetros:**

| Nombre | Tipo | Obligatorio | Default de la API | Lo que impone la API | Lo que impone la UI |
|---|---|---|---|---|---|
| `threshold` | `number` | opcional en la API, **siempre se envía** | `0.3` (por esquema) | Mínimo `0`, inclusivo. **Sin máximo**: `threshold=50` → 200 con `[]` (✅ ejecutado, E3). Fracción en la misma escala que `increase_ratio` (✅ ejecutado, E2 + E3). | Valores de **0.01 a 1.0**, 0.3 por defecto. El input se muestra y se edita como **fracción** (`0.3`), con paso `0.01`, y se envía tal cual. Emite al perder el foco o al pulsar Enter, no en cada tecla, sin debounce. Fuera de rango, vacío o no numérico → error junto al input y no se llama. |
| `group_by` | `GroupBy` | opcional | `"month"` (por esquema) | `"day"` \| `"week"` \| `"month"` | **No se envía.** Se usa el mensual. |
| `start_date` | `string` | opcional | ninguno | Ver §3.1. Filtra en `/alerts`, ✅ ejecutado (E9). | El del filtro del dashboard |
| `end_date` | `string` | opcional | ninguno | Ver §3.1 | El del filtro del dashboard |
| `business_type` | `BusinessType` | opcional | ninguno: mezcla B2B y B2C | `"B2B"` \| `"B2C"`. El esquema admite `null`, que equivale a omitirlo. | **No se envía** |

`/alerts` **no** acepta `category` ni `operation_type`: siempre mira el gasto (`outcome`) total (`V 2.8`).

**Cuándo se pide** (D-I):
- Al montar `App.tsx` y cada vez que cambia el rango del dashboard, con el `threshold` vigente.
- Cada vez que `ThresholdInput` emite un umbral nuevo. Un cambio de umbral relanza **solo** `/api/metrics/alerts`, no `/api/metrics`.
- `AlertsTable.threshold` es el umbral de la **última petición lanzada**. Mientras esa petición carga, la tabla muestra su skeleton.

**Columnas** (`C §2.4`):

| Rótulo | Campo | Formato |
|---|---|---|
| Período | `period` | Tal cual (`YYYY-MM`) |
| Gasto del período | `outcome_total` | `formatCurrency` |
| Media de períodos anteriores | `baseline_average` | `formatCurrency`. **No** se rotula "media móvil de 3 períodos" (D-G). |
| Incremento % | `increase_ratio` × 100 | `formatPercent` (`src/lib/financial-utils.ts:78-80`) espera el valor ya multiplicado y muestra 1 decimal |

Las filas se pintan en el orden de la API, cronológico por `period` (por código), sin reordenar.

**Qué significa cada campo:**
- **`baseline_average`:** es la media de **todos** los períodos anteriores dentro del rango filtrado, no una media móvil de 3. Lo verifica el código, y es coherente con E9.
- **`increase_ratio`:** es `(outcome_total − baseline_average) / baseline_average`. Es una **fracción**: `0.35` = 35 %.

**Ejemplo en vivo:**

Petición E2: `GET /api/metrics/alerts?threshold=0.3&group_by=month` → 200. `group_by=month` es el default, así que equivale a la petición que hace la UI, `?threshold=0.3`.

```json
[
  { "period": "2025-12", "outcome_total": 103378.98, "baseline_average": 51174.1,  "increase_ratio": 1.0201 },
  { "period": "2026-03", "outcome_total": 88076.9,   "baseline_average": 56456.19, "increase_ratio": 0.5601 },
  { "period": "2026-06", "outcome_total": 80212.01,  "baseline_average": 57857.4,  "increase_ratio": 0.3864 },
  { "period": "2026-08", "outcome_total": 82189.37,  "baseline_average": 60357.08, "increase_ratio": 0.3617 }
]
```

En la UI, la primera fila se ve así: Período `2025-12`, Gasto `$103,379` y Media `$51,174` (`formatCurrency` de `103378.98` y `51174.1`), Incremento `102.0%` (`1.0201 × 100` con `formatPercent`).

**Casos límite:**

| Situación | Qué devuelve la API | Qué muestra la UI |
|---|---|---|
| Ningún período supera el umbral | 200 con `[]`. ✅ ejecutado (E3, con `threshold=50`). | La tabla **no desaparece**: mantiene la cabecera y muestra "Ningún período supera el umbral del {Math.round(threshold × 100)} %"; con `0.3`, "Ningún período supera el umbral del 30 %". |
| Umbral fuera de 0.01–1.0, vacío o no numérico | No se llama. La API aceptaría valores > 1 (E3); con valores < 0 se espera un 422 (por esquema, ❓ en vivo). | Error "El umbral debe estar entre 0.01 y 1.0" junto al input. La tabla conserva el último resultado válido con su umbral. |
| Rango de un solo período (por ejemplo, un solo mes) | 200 con `[]`: el primer período del rango no tiene baseline. Por código; ❓ en vivo. | El estado vacío normal, no un error. |
| Alertas que desaparecen al acotar el rango | Con `start_date=2026-06-01` → 200 con `[]`. Sin filtro, `2026-06` y `2026-08` eran alertas (E2). ✅ ejecutado (E9). El baseline solo usa períodos del rango, y `2026-06` pasa a ser el primero, sin baseline. | El estado vacío normal, no un error. |
| Incremento **exactamente igual** al umbral | El período **no** genera alerta: la comparación es estricta, `increase_ratio > threshold`. Por código (`V 2.4c`). | Ese período no aparece. La comparación se hace antes de redondear `increase_ratio` a 4 decimales (`V §1.3`), así que puede aparecer una fila cuyo valor redondeado parezca igual al umbral. |
| Falla la petición (red, 5xx, 422) | Error | Bloque de error con el mensaje, sin filas. No es el estado vacío. |

---

### 3.3 Funcionalidad 3: página B2B vs B2C

**Componentes** (`C §3`):
- `BusinessTypeComparison`: compone la página.
- `DateFilter`: el mismo de la Funcionalidad 1, con un rango propio de esta vista.
- Dos `CategoryIncomePanel` en paralelo.
- `BusinessTypeTotalsChart` debajo de los paneles.

**Navegación:** no hay router ni dependencias nuevas. `App.tsx` tiene un estado de vista, `'dashboard'` \| `'comparison'`, con un selector de dos botones, y la vista inicial es `'dashboard'` (D-C).

**Cuándo se pide** (D-J):
- Las dos llamadas a `categories/top` se lanzan la **primera vez** que se entra en la vista `'comparison'`, no al montar `App.tsx`.
- Al cambiar de vista se conservan los datos y el rango de cada vista. No se vuelve a pedir hasta que cambie el rango de esa vista.
- `App.tsx` hace las peticiones y pasa las respuestas a `BusinessTypeComparison`. Este deriva `b2bTotal`, `b2cTotal` y el `error` del gráfico a partir de `b2bCategories`, `b2cCategories`, `b2bError` y `b2cError` (`C §3.4`, regla 9).

**Endpoint:** `GET /api/metrics/categories/top`, **dos peticiones en paralelo**, una por panel.
- **Tipo de petición:** `TopCategoriesParams` (`param-types.ts`), que extiende `DateRangeFilter`.
- **Tipo de respuesta:** `TopCategoriesResponse` = `CategoryEntry[]` (`api-types.ts`).

Además, `GET /api/metrics/facets` (`FacetsResponse`) se usa solo para el texto del rango de `DateFilter`. No se usan `/api/metrics/b2b` ni `/api/metrics/b2c` (`V 2.7`).

**Parámetros:**

| Nombre | Tipo | Obligatorio | Default de la API | Lo que impone la API | Lo que impone la UI |
|---|---|---|---|---|---|
| `operation_type` | `OperationType` | opcional en la API, **siempre se envía** | **`"outcome"`** (por esquema) | `"income"` \| `"outcome"`. **No** admite `null`. | Siempre `'income'`, explícito en los dos paneles |
| `business_type` | `BusinessType` | opcional | ninguno: mezcla ambos | `"B2B"` \| `"B2C"`, en mayúsculas. El esquema admite `null`, que equivale a omitirlo. Filtra de verdad, ✅ ejecutado (E8 = E4 + E7). | `'B2B'` en un panel y `'B2C'` en el otro |
| `limit` | `number` (entero) | opcional | `5` (por esquema) | Mínimo 1, máximo 20 | Siempre `5` |
| `start_date` | `string` | opcional | ninguno | Ver §3.1. Las fechas se aceptan en `categories/top` (✅ ejecutado, E5). | El del filtro de esta vista |
| `end_date` | `string` | opcional | ninguno | Ver §3.1 | El del filtro de esta vista |

`categories/top` **no** acepta `category` (`V §1.4`).

**Tabla por panel:**
- **Columnas:** Categoría (`category`), Total de ingresos (`total_amount`, con `formatCurrency`) y Porcentaje (con `formatPercent`, 1 decimal, igual que en alertas).
- **Orden:** el de la API, descendente por `total_amount` (✅ ejecutado, E4).
- **Filas:** se pintan las que lleguen, de 0 a 5, **sin rellenar** categorías a 0. La API nunca devuelve filas con total 0 (por código).

**Porcentaje:** se calcula **en el frontend**, porque la API no lo da (✅ ejecutado, E4; `V D1`). La fórmula es `total_amount / Σ total_amount de las filas devueltas × 100`. Supuesto documentado (`V D1.a`):
- Esa suma es el total real del grupo mientras `/facets` tenga **5 categorías o menos**, como `limit`. Hoy tiene 5 (✅ ejecutado, E1).
- Si tuviera más, el porcentaje sería sobre las filas mostradas, no sobre el total.

**Gráfico:** compara el total de B2B con el de B2C. Cada total es la suma de `total_amount` de su panel.
- **Librería:** Recharts, ya instalado (`frontend/package.json:21`, `"recharts": "^3.8.1"`) y usado por los gráficos actuales (`income-outcome-chart.tsx:5-14`). Se usa `BarChart` con **barras verticales** (el `layout` por defecto de Recharts) y **dos barras**, B2B y B2C. No se añaden dependencias.
- **Prioridad de estados:** cargando, error, vacío y con datos. Si un panel falló y el otro sigue cargando, se muestra **cargando**. Si algún total es `null` sin `loading` ni `error`, también se trata como cargando.
- **Textos de error** (D-D): "No se pudieron cargar los ingresos de B2B", "No se pudieron cargar los ingresos de B2C" o "No se pudieron cargar los ingresos de B2B y B2C".

**Ejemplo en vivo:**

Petición E4: `GET /api/metrics/categories/top?operation_type=income&business_type=B2B&limit=5` → 200.

```json
[
  { "category": "sales",  "operation_type": "income", "total_amount": 557903.97 },
  { "category": "others", "operation_type": "income", "total_amount": 57636.75 }
]
```

Petición E7: la misma con `business_type=B2C` → 200. Devuelve `sales` `574193.41` y `others` `68412.74`.

Así se ve en la UI:

| Panel | Categoría | Total (`formatCurrency`) | % sobre el total del panel (`formatPercent`) |
|---|---|---|---|
| B2B (total 615540.72) | sales | `$557,904` | `90.6%` |
| | others | `$57,637` | `9.4%` |
| B2C (total 642606.15) | sales | `$574,193` | `89.4%` |
| | others | `$68,413` | `10.6%` |

Cálculo: `557903.97 / 615540.72 × 100` = 90.636 → `90.6%`; `57636.75 / 615540.72 × 100` = 9.364 → `9.4%`; `574193.41 / 642606.15 × 100` = 89.354 → `89.4%`; `68412.74 / 642606.15 × 100` = 10.646 → `10.6%`.

Gráfico: B2B 615540.72 frente a B2C 642606.15 (`$615,541` frente a `$642,606`).

**Casos límite:**

| Situación | Qué devuelve la API | Qué muestra la UI |
|---|---|---|
| Un panel vacío y el otro con datos | 200 con `[]` en uno y filas en el otro. Los paneles son independientes. | El panel vacío muestra "Sin ingresos {businessType} en el rango seleccionado" y no calcula porcentaje. El otro, su tabla. El gráfico se muestra con el grupo vacío a 0. |
| Ambos paneles vacíos | 200 con `[]` en las dos peticiones (por ejemplo, un rango sin datos, E5) | Los dos paneles en estado vacío. En el gráfico, un **estado vacío en lugar del gráfico**. |
| Menos de 5 filas | 200 con menos filas que `limit`. ✅ ejecutado (E4 y E7: 2 filas, `sales` y `others`). Por código, el mock solo genera `sales` y `others` para income. | Se pintan solo las filas recibidas, sin huecos ni relleno. El porcentaje se calcula sobre esas filas. |
| Falla una de las dos peticiones | Error en una y 200 en la otra | El panel que falló muestra su bloque de error y el otro, sus datos. `BusinessTypeTotalsChart` **no** pinta un gráfico parcial: muestra "No se pudieron cargar los ingresos de B2B" (o "de B2C", o "de B2B y B2C") (D-D). Si el otro panel sigue cargando, el gráfico muestra cargando hasta que termine. |
| Se omite `operation_type` | Se aplica el default `"outcome"` y devuelve **categorías de gasto**, no de ingresos. Por esquema (`V 2.5a`); ❓ en vivo. | Nunca debe ocurrir: la UI envía siempre `operation_type=income`. Si se olvida, los paneles mostrarían gastos con el rótulo de ingresos. |
| `business_type` en minúsculas (`b2b`) | Se espera un 422, porque no está en el enum (por esquema; ❓ en vivo). | Nunca debe ocurrir: la UI envía `'B2B'` / `'B2C'`, tipados como `BusinessType`. |

---

## 4. Desajustes entre el brief del PM y la API

| Qué dice o asume el brief | Qué hace la API | Cómo lo resuelve la spec | Evidencia |
|---|---|---|---|
| Alertas: columna "media móvil de 3 períodos" | `baseline_average` es la media de **todos** los períodos anteriores del rango | Se muestra tal cual, rotulada "Media de períodos anteriores". No se recalcula. Sigue como pregunta para el PM (D-G). | `V 2.3c` (❌, por código, coherente con E9) |
| Alertas: "incremento porcentual" | `increase_ratio` es una **fracción** (0.35 = 35 %) | La UI multiplica por 100 | `V 2.3d`; ✅ ejecutado (E2) |
| `threshold` de 0.01 a 1.0 | Mínimo 0, sin máximo | El rango lo valida la UI; fuera de él, no se llama | `V 2.4a`; ✅ ejecutado (E3) |
| La API devuelve el % por categoría sobre el total del grupo | No hay campo de porcentaje | Se calcula en el frontend sobre la suma de las filas devueltas, con el supuesto de ≤ 5 categorías | `V 2.6`, `V D1`, `V D1.a`; ✅ ejecutado (E4) |
| Sacar de `/facets` las categorías de cada grupo (B2B / B2C) | `/facets` devuelve una lista **plana y global**, sin separar por `business_type` | Las categorías de cada panel salen de `categories/top`; facets solo da el rango de fechas | `V 2.2`; ✅ ejecutado (E1) |
| El brief no menciona `/b2b` ni `/b2c`: solo nombra `categories/top` y `facets` | `/api/metrics/b2b` y `/api/metrics/b2c` existen y devuelven movimientos crudos, sin agregar | No se usan: `categories/top?business_type=…` ya agrega por categoría | `V 2.7` |
| Ranking de ingresos por categoría | El default de `operation_type` en `categories/top` es `"outcome"` | Se envía siempre `operation_type=income` | `V 2.5a` (por esquema) |

---

## 5. Decisiones tomadas

| # | Decisión |
|---|---|
| D-A | `DateFilter` emite `onChange` al cambiar cualquier input, sin botón "Aplicar", y solo con un rango válido. |
| D-B | Cada vista (dashboard y B2B vs B2C) tiene su propio rango de fechas. Las dos empiezan con los inputs vacíos. |
| D-C | Sin router ni dependencias nuevas. Estado de vista `'dashboard'` \| `'comparison'` en `App.tsx`, con un selector de dos botones. La vista inicial es `'dashboard'`. |
| D-D | Si falla cualquiera de las dos peticiones B2B/B2C, `BusinessTypeTotalsChart` muestra un error que indica qué grupo falló, nunca un gráfico parcial (prop `error: string \| null`). Textos: "No se pudieron cargar los ingresos de B2B", "… de B2C" y "… de B2B y B2C". Lo compone `BusinessTypeComparison` a partir de `b2bError` y `b2cError`. |
| D-E | Si `/api/metrics` devuelve `[]`, el dashboard muestra un único mensaje, "Sin datos en el rango seleccionado", en lugar de los KPIs y gráficos. `DateFilter`, `ThresholdInput` y `AlertsTable` siguen visibles, y la tabla de alertas mantiene su propio estado vacío (D-K). |
| D-F | Ante cambios rápidos de filtro, solo se aplica la respuesta más reciente. El mecanismo queda a criterio de la implementación. |
| D-G | `baseline_average` se muestra tal cual, rotulado "Media de períodos anteriores". No se recalcula una media móvil de 3. Es una pregunta abierta para el PM que no bloquea. |
| D-H | `DateFilter` y `ThresholdInput` guardan un borrador interno. `value` es el valor aplicado; un valor inválido se queda en el input con su error y no se emite. Si `value` cambia desde fuera, el borrador se sincroniza y se borra el error. |
| D-I | El umbral se muestra y se edita como fracción (`0.3`), con paso `0.01`. `ThresholdInput` emite al perder el foco o al pulsar Enter, sin debounce. Un cambio de umbral relanza solo `/api/metrics/alerts`. |
| D-J | Las llamadas de B2B vs B2C se lanzan la primera vez que se entra en `'comparison'`. Al cambiar de vista se conservan datos y rango de cada vista; solo se vuelve a pedir cuando cambia el rango. |
| D-K | Dashboard, de arriba abajo: `DateFilter`, KPIs, gráficos existentes, `ThresholdInput` y `AlertsTable`. Con "Sin datos en el rango seleccionado", `DateFilter`, `ThresholdInput` y `AlertsTable` siguen visibles. |

Los motivos de cada decisión están en `components.md`, tabla "Decisiones tomadas".

---

## 6. Fuera de alcance y pendientes

### Fuera de alcance

- **Alertas:** no se expone `group_by`, que va fijo en mensual, y no se envía `business_type`.
- **Filtro por categoría u `operation_type` en las alertas:** la API no lo permite (`V 2.8`).
- **Endpoints que no se usan:** `/api/metrics/b2b`, `/api/metrics/b2c` (`V 2.7`), `/api/metrics/summary` y `/api/metrics/comparison` (`V 2.1b`).
- **Media móvil de 3 en el frontend o en el backend:** pendiente de decisión del PM (D-G).
- **Validación del JSON en runtime:** se mantiene el patrón actual, que hace el cast sin validar (`V §3`).

### Pendientes sin verificar en vivo (❓)

Ninguno bloquea la implementación: en todos los casos, la UI ya se comporta de forma segura con lo que dice el código o el esquema.

| Pendiente | Estado | Impacto en la UI | Cómo cerrarlo |
|---|---|---|---|
| Inclusividad del día límite de `end_date` | E10 demuestra que filtra, pero no había registros el 2025-12-31. Solo por código. | Ninguno: la UI envía la fecha tal cual. | `V §4` #1 con una fecha que tenga registros |
| Respuesta de la API con un rango invertido | ❓ (`V 2.1c`) | Ninguno: la UI no llama. | `V §4` #2 |
| `baseline_average` acumulada frente a móvil de 3 | ❌ frente al brief, por código; coherente con E9, pero no lo distingue. | Solo afecta al rótulo, que ya es neutro (D-G). | `V §4` #12 |
| Un rango de un solo período devuelve `[]` | Solo por código | Se muestra el estado vacío normal. | `V §4` #11 |
| Forma real del 422 (`HTTPValidationError`) | ❓ (`V §1.7`) | El bloque de error muestra un mensaje genérico. | `V §4` #4 |
| Mínimo 0 de `threshold` y default 0.3 | Solo por esquema (`V 2.4a`, `V 2.4b`) | Ninguno: la UI envía siempre un valor en 0.01–1.0. | `V §4` #6, #7 y #8 |
| Default `"outcome"` y límites 1–20 de `limit` en `categories/top` | Solo por esquema (`V 2.5a`, `V 2.5b`) | Ninguno: la UI envía siempre `operation_type=income` y `limit=5`. | `V §4` #15 y #17 |
| Las fechas en `/b2b` y `/b2c` | Solo por esquema (`V 2.1b`) | Ninguno: están fuera de alcance. | `V §4` #21 a #23 |

Preguntas abiertas para el PM (`verification.md`, "Pendiente de decisión del PM"):
- **Ventana del baseline:** ¿media acumulada o móvil de 3? La UI no se bloquea por esto (D-G).
- **Rango de `threshold`:** ¿0.01–1.0 solo en la UI? La spec ya lo impone en la UI.
