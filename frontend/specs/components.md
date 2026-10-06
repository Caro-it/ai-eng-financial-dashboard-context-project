# Especificación de componentes: filtro de fechas, alertas y B2B vs B2C

Fecha: **2026-10-06**. Solo es una especificación: aquí no hay código React, JSX ni `fetch`.

**Fuentes:**
- `frontend/specs/api-types.ts`: tipos de respuesta.
- `frontend/specs/param-types.ts`: tipos de parámetros.
- `frontend/specs/verification.md`: evidencia. Se cita como `V §x.y` (sección), `V 2.x` (fila de la tabla de desajustes), `V E#` (llamada en vivo), `V §4 #n` (llamada pendiente) y `V D#` (decisión).

**Leyenda.** "✅ ejecutado" significa que hay una respuesta real en vivo (`V E#`). "Esquema" o "código" significa que solo se ha verificado por lectura. ❓ significa que no está verificado: todo lo ❓ se recoge en la [lista de pendientes](#pendientes-) del final.

---

## 0. Reglas comunes

### 0.1 Dónde se cargan los datos

Ningún componente de esta spec llama a la API. Las peticiones las hace `App.tsx`, o un módulo de `lib/` que `App.tsx` invoque, y los resultados llegan por props. Cada componente recibe `loading?: boolean` y pinta su propio skeleton (`.agents/rules/frontend.md` §1).

Las peticiones siguen el patrón actual (`V §3`):
- `fetch` nativo sobre `API_BASE_URL` + ruta.
- Si `!response.ok`, se lanza un error.
- El JSON se tipa sin validar en runtime.

Ante cambios rápidos de filtro, solo se aplica la respuesta de la petición más reciente de cada recurso y las anteriores se descartan. El mecanismo queda a criterio de la implementación (decisión D-F).

### 0.2 Los cuatro estados de renderizado

Todo componente que pinta datos de la API distingue estos cuatro estados, en este orden de prioridad:

| Estado | Condición | Evidencia |
|---|---|---|
| Cargando | `loading === true` | `.agents/rules/frontend.md` §1 |
| Error | La petición falló: error de red o status no 2xx, incluido el 422. Llega como `error: string`. | 422 → `HTTPValidationError` (`V §1.7`) |
| Vacío | Status 200 con `[]`. **No es un error.** | `[]` con 200 ✅ ejecutado (`V E3`, `V E5`) |
| Con datos | Status 200 con al menos un elemento | `V E2`, `V E4` |

### 0.3 Errores de validación de la UI

Son errores que detecta la propia UI, como un rango de fechas invertido o un umbral fuera de rango:
- No se llama a la API.
- El mensaje se muestra junto al input que lo provoca.
- No se confunden con el estado "Error" de una petición.

### 0.4 Cómo se componen los parámetros

- Un parámetro sin valor se **omite** de la query string. Nunca se envía `''` ni `null`.
- Las fechas van en `YYYY-MM-DD` (`V §1`, "Notas comunes").
- Todos los parámetros se tipan con `param-types.ts`.

---

## 1. Funcionalidad 1: filtro de fechas en el dashboard

### 1.1 Componentes

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `DateFilter` | `components/dashboard/date-filter.tsx` | Pinta dos inputs de fecha opcionales y el texto del rango disponible. Valida que el inicio no sea posterior al fin y emite un `DateRangeFilter` válido. No conoce los endpoints. |

> El componente no se llama `DateRangeFilter` para no chocar con el tipo del mismo nombre de `param-types.ts`.

### 1.2 Props de `DateFilter`

| Prop | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `value` | `DateRangeFilter` | sí | Rango aplicado ahora. Si a una propiedad le falta valor, su input aparece vacío. |
| `onChange` | `(range: DateRangeFilter) => void` | sí | Se llama al cambiar cualquiera de los dos inputs, sin botón "Aplicar", y **solo** si el rango resultante es válido (D-A). Cada input vacío se omite como propiedad del objeto. |
| `facets` | `FacetsResponse \| null` | sí | Respuesta de `/api/metrics/facets`. De aquí solo se usan `min_date` y `max_date`. Es `null` mientras carga o si falla. |
| `facetsLoading` | `boolean` | opcional | `true` mientras carga facets. |
| `facetsError` | `string \| null` | opcional | Mensaje de error si falla facets. |

### 1.3 Endpoints

`DateFilter` no llama a nada. `App.tsx` hace estas peticiones:

| Petición | Parámetros | Cuándo | Evidencia |
|---|---|---|---|
| `GET /api/metrics/facets` | ninguno (el endpoint no acepta parámetros) | Una vez, al montar `App.tsx` | `V §1.2`; ✅ ejecutado `V E1` |
| `GET /api/metrics` | `start_date?`, `end_date?` (`DateRangeFilter`) | Al montar y cada vez que `onChange` emite | `V §1.1`; `start_date` ✅ ejecutado `V E6` |
| `GET /api/metrics/alerts` | `DateRangeFilter` + `threshold` (ver §2.3) | Igual que la anterior | `V §1.3`; fechas en `/alerts` ✅ ejecutado `V E9` (`V 2.1b`) |

### 1.4 Reglas

1. **Dos inputs opcionales.** Envían `start_date` y `end_date` en `YYYY-MM-DD`. Un input vacío significa omitir ese parámetro (`V §1`, "Notas comunes": si se omiten ambos, no se filtra; código `routes.py:112-113`).
2. **Un solo input relleno.** Se envía solo ese parámetro:
   - Solo `start_date`: devuelve desde esa fecha, incluida, hasta el final de los datos. ✅ ejecutado (`V E6`: el último `create_date` coincide con `max_date` de `V E1`).
   - Solo `end_date`: devuelve desde el principio hasta esa fecha, incluida. ✅ ejecutado (`V E10`: el primer `create_date` coincide con `min_date` de `V E1`). La inclusividad del extremo final, solo por código (`routes.py:116-121`, `V §1`).
3. **Rango disponible.** Junto a los inputs se muestra el texto "Datos disponibles del `min_date` al `max_date`", tomado de `facets`. Nunca se usan fechas literales: el mock regenera las fechas respecto a hoy (`V §1`, "Notas comunes"; `V 2.2`, ✅ ejecutado `V E1`; `.agents/rules/frontend.md` §2).
4. **Rango invertido.** Si `start_date` es posterior a `end_date`, no se llama a `onChange` ni a la API, y se muestra un error de validación junto a los inputs. Las dos fechas tienen el formato `YYYY-MM-DD`, así que se pueden comparar como texto. Esta regla es necesaria porque la API no valida el orden: el código filtra sin comprobarlo (`V 2.1c`), y qué responde la API con un rango invertido es ❓.
5. **Si falla facets.** Los inputs siguen funcionando y el texto del rango se sustituye por un aviso. Facets no condiciona el filtro: `/api/metrics` acepta las fechas sin consultar facets (`V §1.1`).
6. **Alcance del filtro.** El rango aplicado se envía a **todas** las peticiones de datos del dashboard, incluida `/api/metrics/alerts` (`V 2.1b`: `/alerts` acepta `start_date` y `end_date` según el esquema). No se envía a `/facets`, que no acepta parámetros (`V §1.2`). El rango es propio del dashboard: la página B2B vs B2C tiene el suyo y no lo comparten. Ambas vistas empiezan con los dos inputs vacíos (D-B).
7. **Fechas fuera de los datos.** Un rango sin datos no es un error: la API devuelve `[]` (✅ ejecutado `V E5`). Si `/api/metrics` devuelve `[]`, el dashboard muestra un único mensaje "Sin datos en el rango seleccionado" en lugar de los KPIs y gráficos existentes. `DateFilter` sigue visible para poder cambiar el rango (D-E). La tabla de alertas muestra su propio estado vacío (§2.4, regla 5).

### 1.5 Renderizado condicional de `DateFilter`

Los inputs están siempre habilitados. Lo que cambia según el estado es el texto del rango:

| Estado | Texto del rango | Inputs |
|---|---|---|
| Cargando (`facetsLoading`) | Skeleton en lugar del texto | Habilitados |
| Error (`facetsError`) | Aviso: "No se pudo cargar el rango disponible" | Habilitados (regla 5) |
| Vacío | No aplica: `min_date` y `max_date` son obligatorios y no nulos (`V §1.2`) | — |
| Con datos | "Datos disponibles del `min_date` al `max_date`" | Habilitados |
| Validación (regla 4) | Sin cambios | Mensaje de error junto a los inputs; no se emite `onChange` |

---

## 2. Funcionalidad 2: tabla de alertas

### 2.1 Componentes

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `ThresholdInput` | `components/dashboard/threshold-input.tsx` | Input numérico del umbral. Valida que esté entre 0.01 y 1.0 y emite solo valores válidos. |
| `AlertsTable` | `components/dashboard/alerts-table.tsx` | Pinta las alertas en 4 columnas y sus estados cargando, error, vacío y con datos. |

### 2.2 Props

**`ThresholdInput`**

| Prop | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `value` | `number` | sí | Umbral aplicado ahora, como fracción (`AlertsParams.threshold`). `App.tsx` lo inicializa a `0.3`. |
| `onChange` | `(threshold: number) => void` | sí | Se llama solo con un valor en [0.01, 1.0]. |

**`AlertsTable`**

| Prop | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `alerts` | `AlertsResponse \| null` | sí | Respuesta de `/api/metrics/alerts`. Es `null` antes de la primera respuesta o si hay error. |
| `threshold` | `number` | sí | Umbral con el que se hizo la petición. Se muestra en el mensaje del estado vacío. |
| `loading` | `boolean` | opcional | `true` mientras la petición está en curso. |
| `error` | `string \| null` | opcional | Mensaje si la petición falló. |

### 2.3 Endpoint

`GET /api/metrics/alerts`, con parámetros tipados como `AlertsParams`:

| Parámetro | Valor enviado | Evidencia |
|---|---|---|
| `threshold` | El valor de `ThresholdInput`, **siempre explícito**. Así el umbral del mensaje vacío es el que usó la API. | `V §1.3` #0 |
| `start_date` / `end_date` | Los del filtro de la Funcionalidad 1, si los hay | `V §1.3` #2-3; ✅ ejecutado `V E9` (`V 2.1b`) |
| `group_by` | **No se envía.** Se usa el default `"month"`. | `V §1.3` #1 (esquema) |
| `business_type` | **No se envía.** Mezcla B2B y B2C. | `V §1.3` #4 |

### 2.4 Reglas

1. **Columnas, en este orden.** La respuesta se pinta en el orden de la API (cronológico por `period`, `V §1.3` por código), sin reordenar.

   | Rótulo | Campo de `AlertEntry` | Formato | Evidencia |
   |---|---|---|---|
   | Período | `period` | Tal cual. Con `group_by=month` es `YYYY-MM`. | ✅ ejecutado `V E2`; `V 2.3a` |
   | Gasto del período | `outcome_total` | Moneda | ✅ ejecutado `V E2`; `V 2.3b` |
   | Media de períodos anteriores | `baseline_average` | Moneda | `V 2.3c` |
   | Incremento % | `increase_ratio` × 100 | Porcentaje. `formatPercent` (`src/lib/financial-utils.ts:78-79`) espera el valor ya multiplicado. | ✅ ejecutado `V E2` (1.0201 → ~102 %); `V 2.3d` |

2. **Rótulo de la tercera columna.** **No** se rotula "media móvil de 3 períodos". La API calcula la media de **todos** los períodos anteriores del rango filtrado (`V 2.3c`, ❌ respecto al brief; solo por código `routes.py:224-227`). Por eso, cambiar `start_date` cambia este valor. La UI muestra `baseline_average` tal como lo devuelve la API, rotulado "Media de períodos anteriores", y el frontend no recalcula una media móvil de 3. Queda como pregunta para el PM, sin bloquear la implementación (D-G).
3. **Umbral validado por la UI.** El input acepta valores de 0.01 a 1.0, con 0.3 por defecto. La API solo exige un mínimo de 0 y no tiene máximo: `threshold=50` devuelve 200 con `[]` (✅ ejecutado `V E3`; `V 2.4a`). Con un valor fuera de rango, o un input vacío o no numérico:
   - no se llama a `onChange` ni a la API;
   - se muestra un error de validación junto al input;
   - la tabla conserva el último resultado válido, con su `threshold`.
4. **Escala del umbral.** El umbral es una fracción en la misma escala que `increase_ratio`: 0.3 = 30 % (✅ ejecutado `V E2` + `V E3`; `V 2.4c`). Si el input se muestra en %, la conversión ×100 / ÷100 la hace la UI antes de emitir `onChange`.
5. **Estado vacío explícito.** Si la respuesta es `[]`, la tabla no desaparece: mantiene la cabecera y muestra "Ningún período supera el umbral del {threshold × 100} %" (✅ ejecutado `V E3`: `[]` con 200).
6. **Caso límite: un solo período.** Un rango que abarca un solo mes nunca produce alertas, porque el primer período no tiene baseline (`V §1.3`, por código `routes.py:226`). Se muestra el estado vacío normal, no un error. En vivo → ❓ (`V §4` #11).
7. **Filtro de fechas.** Cuando cambia el rango de la Funcionalidad 1, se repite la petición con el `threshold` vigente (§1.4, regla 6).
8. **Caso límite: alertas que desaparecen al filtrar.** Al acotar el rango de fechas pueden desaparecer alertas que se veían sin filtro: el baseline solo usa los períodos del rango, y el primer período del rango no tiene baseline. No es un error: si no queda ninguna, se muestra el estado vacío normal (regla 5). ✅ ejecutado `V E9`: con `start_date=2026-06-01`, `[]`, cuando sin filtro `2026-06` y `2026-08` eran alertas.

### 2.5 Renderizado condicional

**`AlertsTable`**

| Estado | Qué se pinta |
|---|---|
| Cargando | Cabecera de 4 columnas y filas skeleton |
| Error | Bloque de error con `error`, sin filas |
| Vacío (`[]`) | Cabecera y una fila de mensaje con el umbral (regla 5) |
| Con datos | Cabecera y una fila por `AlertEntry` |

**`ThresholdInput`**

| Estado | Qué se pinta |
|---|---|
| Normal | El input con el valor vigente |
| Validación | Mensaje "El umbral debe estar entre 0.01 y 1.0" junto al input (regla 3) |

---

## 3. Funcionalidad 3: página B2B vs B2C

### 3.1 Componentes

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `BusinessTypeComparison` | `components/dashboard/business-type-comparison.tsx` | Compone la página: `DateFilter`, dos `CategoryIncomePanel` en paralelo y debajo `BusinessTypeTotalsChart`. Solo recibe datos por props. |
| `DateFilter` | El mismo de la Funcionalidad 1 | Lo reutiliza con las mismas props (§1.2). |
| `CategoryIncomePanel` | `components/dashboard/category-income-panel.tsx` | Tabla de ingresos por categoría de un `business_type`, con el porcentaje calculado en frontend. |
| `BusinessTypeTotalsChart` | `components/dashboard/business-type-totals-chart.tsx` | Gráfico único con el total de ingresos de B2B frente al de B2C. |

**Navegación (D-C).** No hay router ni dependencias nuevas. `App.tsx` mantiene un estado de vista con dos valores, `'dashboard'` y `'comparison'`, y un selector con dos botones para cambiar de una a otra. La vista inicial es `'dashboard'`.

### 3.2 Props

**`BusinessTypeComparison`**

| Prop | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `dateRange` | `DateRangeFilter` | sí | Rango aplicado; se pasa a `DateFilter`. Es propio de esta vista, no se comparte con el dashboard y empieza vacío (D-B). |
| `onDateRangeChange` | `(range: DateRangeFilter) => void` | sí | Se pasa a `DateFilter`. |
| `facets` | `FacetsResponse \| null` | sí | Se pasa a `DateFilter`. |
| `facetsLoading` | `boolean` | opcional | Se pasa a `DateFilter`. |
| `facetsError` | `string \| null` | opcional | Se pasa a `DateFilter`. |
| `b2bCategories` | `TopCategoriesResponse \| null` | sí | Respuesta de la llamada B2B. |
| `b2bLoading` | `boolean` | opcional | — |
| `b2bError` | `string \| null` | opcional | — |
| `b2cCategories` | `TopCategoriesResponse \| null` | sí | Respuesta de la llamada B2C. |
| `b2cLoading` | `boolean` | opcional | — |
| `b2cError` | `string \| null` | opcional | — |

**`CategoryIncomePanel`**

| Prop | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `businessType` | `BusinessType` | sí | `'B2B'` o `'B2C'`. Sirve para el título del panel. |
| `categories` | `TopCategoriesResponse \| null` | sí | Filas que devolvió la API. |
| `loading` | `boolean` | opcional | — |
| `error` | `string \| null` | opcional | — |

**`BusinessTypeTotalsChart`**

| Prop | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `b2bTotal` | `number \| null` | sí | Suma de `total_amount` de `b2bCategories`. Vale `0` si la respuesta es `[]` y `null` si no hay respuesta. |
| `b2cTotal` | `number \| null` | sí | Igual, para B2C. |
| `loading` | `boolean` | opcional | `true` si alguna de las dos peticiones está en curso. |
| `error` | `string \| null` | opcional | Mensaje si falla cualquiera de las dos peticiones. Indica qué grupo (B2B, B2C o ambos) no se pudo cargar (D-D). |

### 3.3 Endpoint

Se hacen dos peticiones **en paralelo** a `GET /api/metrics/categories/top`, una por panel, con parámetros tipados como `TopCategoriesParams`:

| Parámetro | Panel B2B | Panel B2C | Evidencia |
|---|---|---|---|
| `operation_type` | `'income'`, **siempre explícito** | `'income'`, **siempre explícito** | El default de la API es `"outcome"` (`V §1.4` #0, esquema; `V 2.5a`) |
| `business_type` | `'B2B'` | `'B2C'` | Enum en mayúsculas (`V §1.4` #4; `V 2.5c`). Filtra de verdad: ✅ ejecutado `V E8` = `V E4` + `V E7` |
| `limit` | `5` | `5` | Entero 1–20 (`V §1.4` #1; `V 2.5b`) |
| `start_date` / `end_date` | Los del `DateFilter`, si los hay | Igual | `V §1.4` #2-3; aceptados ✅ ejecutado `V E5` |

No se usan `/api/metrics/b2b` ni `/b2c`: devuelven movimientos crudos, y `categories/top` con `business_type` ya da los totales por categoría (`V 2.7`).

### 3.4 Reglas

1. **Paneles independientes.** Cada panel hace su propia llamada y tiene su propio estado. Uno puede estar cargando, con error o vacío mientras el otro tiene datos.
2. **Tabla por panel.** Tiene tres columnas: Categoría (`category`), Total de ingresos (`total_amount`, en moneda) y Porcentaje. Las filas van en el orden de la API, descendente por `total_amount` (✅ ejecutado `V E4`).
3. **Porcentaje calculado en frontend.** Es `total_amount / Σ total_amount de las filas devueltas × 100`. La API no lo devuelve (✅ ejecutado `V E4`; `V 2.6`; decisión `V D1`).
   - **Supuesto documentado:** esa suma es el total real del grupo mientras el número de categorías de `/facets` sea ≤ `limit`. Hoy son 5 (✅ ejecutado `V E1`) y `limit = 5`, así que se cumple (`V D1.a`).
   - Si facets llegara a tener más de 5 categorías, el porcentaje sería sobre las filas mostradas y no sobre el total del grupo. Esta condición depende del mock, no del contrato (`V 2.6`).
4. **Filas sin relleno.** Se pintan las filas que lleguen, de 0 a 5, sin rellenar huecos con categorías a 0.
   - La API no devuelve categorías sin movimientos en el rango (`V §1.4`, por código `routes.py:195-198`).
   - Puede devolver menos filas que `limit`: B2B income devolvió 2 filas, `sales` y `others` (✅ ejecutado `V E4`).
   - El mock solo genera `sales` y `others` para income (`V §1.4`, por código).
5. **Vacío por panel.** Con 0 filas, el panel muestra su estado vacío y **no calcula porcentaje**. Con al menos 1 fila, el denominador es > 0, porque no hay filas con total 0 (regla 4).
6. **Origen de las categorías.** El brief pide sacarlas de facets, pero facets devuelve una lista plana y global, sin separar por `business_type` (✅ ejecutado `V E1`; `V 2.2`). Resolución: las categorías de cada panel salen de **`categories/top`**, y facets solo se usa para el texto del rango de fechas de `DateFilter`.
7. **Gráfico de totales.** El total de cada grupo es la suma de `total_amount` de las filas de su panel (regla 3).
   - Si **ambos** totales son 0, se muestra un estado vacío en lugar del gráfico.
   - Si **solo uno** es 0, el gráfico se muestra con ese valor a 0.
8. **Filtro de fechas.** Se reutiliza `DateFilter` con las mismas reglas de la Funcionalidad 1 (§1.4). Un cambio de rango válido relanza las dos llamadas. El rango de esta vista es independiente del del dashboard (D-B).

### 3.5 Renderizado condicional

**`CategoryIncomePanel`** (un panel; el otro es independiente)

| Estado | Qué se pinta |
|---|---|
| Cargando | Título del panel y filas skeleton |
| Error | Título y bloque de error con `error` |
| Vacío (`[]`) | Título y mensaje "Sin ingresos {businessType} en el rango seleccionado". Sin columna de porcentaje calculada. |
| Con datos | Título y tabla de 1 a 5 filas con categoría, total y porcentaje |

**`BusinessTypeTotalsChart`**

| Estado | Qué se pinta |
|---|---|
| Cargando (alguna petición en curso) | Skeleton del gráfico |
| Error (falla cualquiera de las dos peticiones) | Mensaje de error con `error`, que indica qué grupo no se pudo cargar. No se pinta un gráfico parcial (D-D). |
| Vacío (`b2bTotal === 0` y `b2cTotal === 0`) | Mensaje de estado vacío en lugar del gráfico |
| Con datos (al menos un total > 0) | Gráfico con las dos barras. La de valor 0 se pinta a 0. |

---

## Pendientes ❓

### No verificado en vivo

Las llamadas de referencia están en `V §4`.

| # | Afirmación de esta spec | Dónde se usa | Estado actual | Cómo cerrarlo |
|---|---|---|---|---|
| P1 | Solo `end_date` devuelve desde el principio hasta esa fecha, incluida | §1.4 regla 2 | ✅ Cerrado: ✅ ejecutado `V E10` (con `end_date=2025-12-31`: del `min_date` 2025-10-02 al 2025-12-27). Salvedad: no hay registros en el día límite, así que la inclusividad de `end_date` sigue solo por código. | — (inclusividad: `V §4` #1 con una fecha que tenga registros) |
| P2 | `start_date` y `end_date` filtran en `/alerts` | §1.4 regla 6, §2.3 | ✅ Cerrado: ✅ ejecutado `V E9` (`V 2.1b`) | — |
| P3 | Respuesta de la API con un rango invertido. No afecta a la UI, que lo bloquea antes. | §1.4 regla 4 | ❓ (`V 2.1c`) | `V §4` #2 |
| P4 | `baseline_average` es una media acumulada y no móvil de 3 | §2.4 regla 2 | ❌ frente al brief. Verificado por código, coherente con la ejecución (`V E9`). Ni `V E2` ni `V E9` distinguen por sí solos una media acumulada de una móvil de 3. | `V §4` #12 |
| P5 | Un rango de un solo período devuelve `[]` | §2.4 regla 6 | Solo por código | `V §4` #11 |
| P6 | `business_type` filtra de verdad en `categories/top` | §3.3, §3.4 regla 1 | ✅ Cerrado: ✅ ejecutado `V E8` = `V E4` + `V E7`, céntimo a céntimo (`V 2.5c`) | — |
| P7 | Las categorías y totales de **B2C** income | §3.4 reglas 4-5 | ✅ Cerrado: ✅ ejecutado `V E7` (`sales` y `others`, 2 filas) | — |
| P8 | Forma real del 422. Hoy el bloque de error muestra un mensaje genérico. | §0.2 | ❓ (`V §1.7`) | `V §4` #4 |

### Decisiones tomadas

| # | Decisión | Motivo | Afecta a |
|---|---|---|---|
| D-A | `DateFilter` emite `onChange` al cambiar cualquiera de los dos inputs, sin botón "Aplicar", y solo si el rango resultante es válido. | Un paso menos para el usuario. La validación del rango (§1.4, regla 4) evita peticiones con un rango invertido. | §1.2 |
| D-B | Cada vista tiene su propio rango de fechas: el dashboard y la página B2B vs B2C no lo comparten. Ambas empiezan con los dos inputs vacíos. | Las vistas son independientes; inputs vacíos = sin filtro, que es el comportamiento actual de la API (`V §1`, "Notas comunes"). | §1.4 regla 6, §3.2, §3.4 regla 8 |
| D-C | Sin router ni dependencias nuevas. `App.tsx` mantiene un estado de vista `'dashboard'` \| `'comparison'` y un selector con dos botones. La vista inicial es `'dashboard'`. | `package.json` no tiene router y `App.tsx` es una sola vista (`V §3`). Solo se añaden dependencias cuando el cambio lo necesita (`.agents/rules/environment.md` §2). | §3.1 |
| D-D | Si falla cualquiera de las dos peticiones, `BusinessTypeTotalsChart` no pinta un gráfico parcial: muestra un mensaje de error que indica qué grupo no se pudo cargar. Se añade la prop `error: string \| null`. | Un gráfico con un solo grupo daría una comparación engañosa. | §3.2, §3.5 |
| D-E | Si `/api/metrics` devuelve `[]` por el filtro, el dashboard muestra un único mensaje "Sin datos en el rango seleccionado" en lugar de los KPIs y gráficos existentes. `DateFilter` sigue visible. | Los KPIs y gráficos actuales no tienen estado vacío. Con `DateFilter` visible se puede salir del rango vacío. | §1.4 regla 7 |
| D-F | Ante cambios rápidos de filtro, solo se aplica la respuesta de la petición más reciente; las anteriores se descartan. El mecanismo queda a criterio de la implementación. | No hay `AbortController` (`V §3`): una respuesta antigua que llegue tarde podría pisar a la nueva. | §0.1 (y por tanto §1.3, §2.3, §3.3) |
| D-G | La UI muestra `baseline_average` tal como lo devuelve la API, rotulado "Media de períodos anteriores". El frontend no recalcula una media móvil de 3. Queda como pregunta para el PM, sin bloquear la implementación. | La API calcula una media acumulada (`V 2.3c`). La ventana del baseline sigue pendiente con el PM (`V`, "Pendiente de decisión del PM"). | §2.4 regla 2 |
