# Frontend: componentes, estilos y estilo de código

**Alcance:** `frontend/src/**` y `frontend/components.json`. Aplica al crear o editar componentes, estilos, utilidades de `lib/` o cualquier `.ts`/`.tsx`.

Esta regla no cubre:
- Los tipos que reflejan la API → `api-contract.md`.
- Los comandos de build, lint y test → `environment.md`.

Origen: `docs/findings.md` (ARQ-8, ARQ-9, ARQ-10, ARQ-11, NAM-2, NAM-3, NAM-4, DOC-3, TST-5, DX-8) → R-08, R-09, R-10, R-11, R-12, R-14, R-16.

---

## 1. Los datos se cargan en `App.tsx`; los componentes solo pintan

**Por qué:**
- `App.tsx` es el único sitio con `fetch` y estado de datos (`frontend/src/App.tsx:15-43`).
- Los componentes de `components/dashboard/` reciben datos y `loading` por props y pintan su propio skeleton (`kpi-row.tsx:6-9`, `income-outcome-chart.tsx:16-19`, `:50-62`).
- `StrictMode` (`frontend/src/main.tsx:7`) ejecuta dos veces los efectos en dev, así que un `fetch` en cada componente multiplica las peticiones.

**Haz**
- Añade cualquier carga de datos nueva en `App.tsx`, o en un módulo de datos en `lib/` que `App.tsx` invoque, y pasa el resultado por props.
- Dale a cada componente de dashboard nuevo una prop `loading?: boolean` con su variante `Skeleton`, igual que los existentes.

**No hagas**
- No llames a `fetch`, ni uses `useEffect` para cargar datos, dentro de `components/`.
- No uses `src/lib/mock-data.ts` como fallback cuando falla la API ni como fixture de UI. Hoy no lo importa nadie (`verification.md` #16) y tiene datos fijos de 2024. Un fallo de la API se muestra con el bloque de error de `App.tsx:51-55`.

**Cómo comprobar**
- `grep -rn "fetch(\|useEffect" frontend/src/components` no devuelve resultados.
- `grep -rn "mock-data" frontend/src` no devuelve resultados.

## 2. No hardcodees años ni periodos

**Por qué:** la cabecera muestra "2024" (`frontend/src/App.tsx:49`, y como valor por defecto en `dashboard-header.tsx:7`), pero el backend genera fechas relativas a hoy (`backend/app/routes.py:97`). La discrepancia está confirmada en ejecución (`verification.md` #17).

**Haz**
- Calcula cualquier etiqueta de periodo a partir de los datos recibidos (las fechas mínima y máxima de los movimientos, o `/api/metrics/facets`).

**No hagas**
- No escribas años ni rangos literales en componentes ni en `App.tsx`.
- No copies `"2024 - Full Year"` como patrón.

**Cómo comprobar**
- `grep -rnE "20[0-9]{2}" frontend/src --include=*.tsx` solo devuelve `App.tsx:49` y `dashboard-header.tsx:7`, que son la deuda conocida, mientras no se corrijan.

## 3. Colores solo con tokens CSS

**Por qué:**
- Los colores son variables definidas en `:root` (`frontend/src/index.css:5-40`) y redefinidas en `.dark` (`:42-76`).
- El modo oscuro se fuerza con la clase `dark` en `App.tsx:46` y `@custom-variant dark` (`index.css:3`).
- `@theme inline` (`index.css:78-109`) solo mapea `chart-1..5` (`:100-104`). Los tokens `--chart-income`, `--chart-outcome`, `--chart-profit` y `--*-badge` solo funcionan con `var(...)` (`income-outcome-chart.tsx:104`, `kpi-card.tsx:17`). Una utilidad como `text-chart-income` no existe y no da error.

**Haz**
- Define cada color nuevo como variable en **`:root` y en `.dark`**.
- Consume los tokens con `var(--token)`, ya sea en props de Recharts o en clases arbitrarias `bg-[var(--token)]`. Si quieres una utilidad Tailwind, añade su `--color-<token>: var(--token)` en `@theme inline`.

**No hagas**
- No uses colores literales (hex, `rgb()`, `oklch()` o clases de paleta como `text-blue-500`) en `.tsx`.
- No quites la clase `dark` de `App.tsx:46` como efecto secundario de otro cambio.

**Cómo comprobar**
- `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(|oklch\(|-(red|blue|green|zinc|gray|slate)-[0-9]{2,3}" frontend/src --include=*.tsx` no devuelve resultados.
- `grep -c "^  --<token>" frontend/src/index.css` da 2 para cada token nuevo (uno en `:root` y otro en `.dark`).

## 4. `components/ui/` es código generado por shadcn

**Por qué:** `card.tsx` y `skeleton.tsx` son componentes shadcn (se reconocen por `data-slot`: `components/ui/card.tsx:8`, `components/ui/skeleton.tsx:6`). `components.json:10` declara `"cssVariables": false`, lo que contradice el sistema de tokens de la sección 3. Un `npx shadcn add` con esa config podría generar clases de paleta fija (sin verificar).

**Haz**
- Personaliza los componentes de `ui/` pasando `className` desde `components/dashboard/`, como hace `kpi-card.tsx:39` con `Card`.
- Antes de ejecutar `npx shadcn add`, revisa `components.json` y comprueba que el componente generado cumple la sección 3.

**No hagas**
- No edites a mano los archivos de `components/ui/` para ajustes de un caso concreto.

**Cómo comprobar**
- `git diff --stat frontend/src/components/ui` está vacío, salvo que el cambio consista en añadir un componente shadcn.

## 5. Nombres, imports y estilo de código del archivo

**Por qué:**
- Nombres: archivos en kebab-case con export nombrado en PascalCase (`kpi-card.tsx:34`), el acrónimo `KPI` en mayúsculas (`KPICard`, `KPIRow`, `KPIMetrics` en `financial-types.ts:13`) y props tipadas como `interface <Componente>Props` (`kpi-card.tsx:6`).
- Imports: `verbatimModuleSyntax` (`frontend/tsconfig.app.json:16`) obliga a importar los tipos con `type` (`App.tsx:6-10`, `kpi-card.tsx:4`). Para cruzar carpetas se usa el alias `@/` (`tsconfig.app.json:12-14`).
- Estilo: conviven varios estilos y no hay formateador configurado:
  - Comillas dobles con `;` en `App.tsx`, `lib/financial-utils.ts`, `lib/financial-utils.test.ts`, `vite.config.ts` y `eslint.config.js`.
  - Comillas simples sin `;` en `components/**`, `main.tsx`, `lib/financial-types.ts` y `lib/mock-data.ts`.
  - Comillas dobles sin `;` en `lib/utils.ts`.

**Haz**
- Archivos nuevos en kebab-case (`category-chart.tsx`) con `export function CategoryChart`. Usa `export default` solo en `App.tsx`.
- Usa `@/` para importar desde otra carpeta y `./` dentro de la misma.
- Importa tipos con `import { type X }` o `import type { X }`.
- Escribe con las comillas y el uso de `;` **que ya tiene el archivo** que editas. En un archivo nuevo, usa el estilo de sus vecinos de carpeta.

**No hagas**
- No ejecutes Prettier ni ningún formateador sobre archivos enteros, ni conviertas comillas o `;` en líneas que no cambias.
- No uses `Kpi` en lugar de `KPI` ni nombres de archivo en PascalCase.

**Cómo comprobar**
- `git diff` solo muestra las líneas relacionadas con el cambio, sin cambios de comillas ni de `;`.
- `npm run build` pasa (ver sección 6).

## 6. El cambio termina con build y lint, no con el dev server

**Por qué:** `vite` en dev no comprueba tipos. `npm run build` ejecuta `tsc -b && vite build` (`frontend/package.json:8`), y con `noUnusedLocals` y `noUnusedParameters` (`tsconfig.app.json:22-23`), un import sin usar o un import de tipo sin `type` (sección 5) rompe el build aunque la pantalla se vea bien.

**Haz**
- Antes de dar un cambio de frontend por terminado, ejecuta `npm run build`, `npm run lint` y `npm run test` dentro del contenedor (comandos en `environment.md`).

**No hagas**
- No des por bueno un cambio solo porque el dashboard carga en `:5173`.

**Cómo comprobar**
- Los tres comandos terminan con código 0, y el resultado queda registrado según `docs-and-verification.md`.
