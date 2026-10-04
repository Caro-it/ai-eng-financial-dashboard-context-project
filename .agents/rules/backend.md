# Backend: handlers, datos mock y tests

**Alcance:** `backend/app/**` y `backend/tests/**`. Aplica al añadir o cambiar endpoints, filtros, generación de datos o tests de pytest.

Esta regla no cubre:
- La forma de los datos y los prefijos de ruta → `api-contract.md`.
- Los comandos para ejecutar tests → `environment.md`.

Origen: `docs/findings.md` (ARQ-3, ARQ-4, ARQ-5, TST-1, TST-2) → R-04, R-05, R-06.

---

## 1. Los filtros viven en `filter_movements`, no en el handler

**Por qué:**
- El patrón establecido es que los handlers sean finos y compongan helpers puros (`backend/app/routes.py:107-240`, `:248-259`). Los tests importan esos helpers directamente (`backend/tests/test_routes.py:6`).
- La excepción es el filtro `business_type`, copiado inline en 4 handlers (`routes.py:278-280`, `:296-298`, `:312-314`, `:351-353`) en vez de estar en `filter_movements` (`routes.py:125-143`). Por eso `/api/metrics` no lo acepta (`routes.py:248-254`), aunque `/summary` sí.

**Haz**
- Añade cualquier filtro nuevo como parámetro de `filter_movements` y pásalo desde cada handler que deba soportarlo.
- Si tocas un handler que tiene el bloque `business_type` inline, puedes moverlo a `filter_movements`, siempre que se mantenga el comportamiento de todos los endpoints afectados.
- Mantén con los mismos nombres e imports los helpers que usan los tests (`filter_movements_by_date`, `generate_mock_movements`).

**No hagas**
- No añadas un quinto `if business_type is not None:` ni ningún otro filtro inline en un handler.
- No metas lógica de agregación dentro de una función decorada con `@router.get`.

**Cómo comprobar**
- `grep -c "business_type is not None" backend/app/routes.py` devuelve **4 o menos**.
- Cada filtro nuevo aparece en la firma de `filter_movements`.

## 2. Una sola fuente de datos mock, con el seed fijo

**Por qué:**
- Cada handler regenera los datos con `generate_mock_movements(seed=42)`, en 8 llamadas (`routes.py:255, 264, 277, 295, 311, 350, 370, 386`).
- `random.seed()` modifica el estado **global** del módulo `random` (`routes.py:95-96`).
- Las fechas son relativas a `date.today()` (`routes.py:65-68`, `:97`), así que el conjunto de datos cambia cada día.

**Haz**
- Obtén los datos en cada handler nuevo con `generate_mock_movements(seed=42)`.
- Si alguna vez hay que cambiar el seed, cambia las 8 llamadas a la vez (o extráelo a una constante en el mismo cambio).
- Mantén las fechas generadas relativas a `date.today()`.

**No hagas**
- No uses un seed distinto en un solo endpoint: los endpoints dejarían de cuadrar entre sí.
- No llames a `random.seed` fuera de `generate_mock_movements`, ni uses `random` en otro punto que dependa de ese estado global.
- No introduzcas años o fechas absolutas en la generación.

**Cómo comprobar**
- `grep -rn "random.seed" backend/app` devuelve solo `routes.py:96`.
- `grep -o "seed=[0-9]*" backend/app/routes.py | sort -u` devuelve una sola línea.

## 3. Los tests comprueban propiedades y fallan cuando el comportamiento falla

**Por qué:** como los datos se mueven con la fecha (sección 2), los tests existentes comprueban propiedades y sacan las fechas de la propia respuesta (`backend/tests/test_routes.py:36-49`, `:52-59`). Pero hay aserciones que no fallan aunque el endpoint esté roto:
- `/comparison` usa fechas fijas de 2025 y solo comprueba las claves (`test_routes.py:157-170`).
- `/alerts` solo valida dentro de `if payload:` (`:182`).
- `/summary` por semana solo hace `assert payload` (`:133-141`).

**Haz**
- Comprueba filtros, orden, claves, signos y relaciones entre campos (por ejemplo, `net == income - outcome`).
- Obtén las fechas o los rangos a partir de una llamada previa (`/api/metrics` o `/api/metrics/facets`), como en `test_routes.py:37-43`.
- Nombra los tests `test_<sujeto>_<comportamiento>` y usa el `client = TestClient(app)` del módulo (`test_routes.py:9`).
- Al tocar un endpoint con una aserción débil, refuerza su test para que falle si el comportamiento se rompe.

**No hagas**
- No compruebes importes concretos ni fechas literales que dependan de `date.today()`.
- No condiciones las aserciones a que la respuesta no esté vacía (`if payload:`). Si los datos pueden ser vacíos, fuerza un caso que no lo sea.

**Cómo comprobar**
- `grep -nE "if payload|\"20[0-9]{2}-" backend/tests/test_routes.py` no muestra coincidencias nuevas respecto a `:160` y `:182`.
- Ejecuta pytest (comando en `environment.md`) y registra el resultado según `docs-and-verification.md`.
