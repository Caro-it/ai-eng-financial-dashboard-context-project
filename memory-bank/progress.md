# Progress

Avance de la rama `feature/agent-skills` a fecha de **2026-10-11**. El detalle de cada verificación está en [`verification.md`](../verification.md) (#20, #22 y #28-35). Si este archivo y esa fuente no coinciden, manda la fuente.

**Quién verificó:** todos los resultados de ejecución de este archivo los obtuvo **Carolina (la usuaria) en GitHub Codespaces con Docker Compose**, los días 2026-10-10 y 2026-10-11. Ningún agente los ejecutó; el agente solo los registró.

**Estado:** ✅ = verificado ejecutando (Carolina, Codespaces) · **lectura** = leído por un agente · ❓ = sin comprobar.

**Stack real:** React 19 + Vite (`memory-bank/tech-stack.md`). **No es Next.js**, así que las reglas de skills pensadas para Next.js no aplican.

---

## Línea base (commit `690e9f0`, antes de aplicar skills)

| Comprobación | Resultado | Estado |
|---|---|---|
| `npm run build` | Pasa con 1 advertencia: chunk de 584.26 kB, mayor que el límite de 500 kB. | ✅ |
| `npm run lint` | Sin errores. | ✅ |
| `npm run test` | 5 tests pasan. | ✅ |
| Lighthouse Accessibility | 100. | ✅ |
| axe DevTools (WCAG 2.1 AA y mejores prácticas) | 0 incidencias. | ✅ |

## Skills aplicadas

Las tres skills de ecosistema están en `.agents/skills/`, con origen registrado en `skills-lock.json`.

### 1. `accessibility` (`addyosmani/web-quality-skills`) — commit `f76fdfc`

**Cambios:** 8 cambios en 5 archivos (`frontend/index.html`, `frontend/src/App.tsx`, `income-outcome-chart.tsx`, `profit-percent-chart.tsx`, `frontend/src/index.css`). Según el mensaje del commit (lectura): título y descripción de los gráficos, `role=alert` + `lang=es` en el error, línea de outcome discontinua, `h2` en los títulos de gráficos, estado de carga + `aria-busy`, `prefers-reduced-motion`, título de la página y contraste de la línea de referencia del 0 %.

| Comprobación | Resultado | Estado |
|---|---|---|
| Build | Igual que la línea base (1 advertencia de chunk). | ✅ |
| Lint | Limpio. | ✅ |
| Tests | 5 pasan. | ✅ |
| Lighthouse Accessibility / axe | 100 / 0 incidencias. | ✅ |
| A mano | El título de la pestaña es "Financial Overview". La línea de outcome es discontinua y aparece en la leyenda. La línea del 0 % es visible. Los `h2` no cambian el aspecto. Con Tab se llega a los gráficos con foco visible (Chrome) y las flechas mueven el tooltip. | ✅ |

**Rechazados:** tabla alternativa de datos; `h2` oculto en los KPIs.
**Pendiente:** `role="status"` en el tooltip. Requiere probar con lector de pantalla.

### 2. `vercel-react-best-practices` (`vercel-labs/agent-skills`) — commit `b96a275`

**Reglas aplicadas:** `bundle-dynamic-imports` (carga diferida de los gráficos de Recharts con `Suspense`) y `js-cache-function-results` (`Intl.NumberFormat` de moneda reutilizado).

| Comprobación | Resultado | Estado |
|---|---|---|
| Build | Sin advertencias. Chunk principal de 187.74 kB; Recharts pasa a un chunk diferido (`LineChart`, 342.29 kB). | ✅ |
| Lint | Limpio. | ✅ |
| Tests | 5 pasan. | ✅ |
| Layout shift con red lenta | No hay. | ✅ |

**Rechazado:** `js-combine-iterations`.
**No aplican:** las reglas de Next.js (`next/image`, `next/font`, RSC, `server-*`), porque el stack es React 19 + Vite.

## Skill del ecosistema elegida: `vitest` (`antfu/skills`)

**Búsqueda:** `npx skills find` con `testing`, `typescript` y `vitest`.
**Elección:** `antfu/skills@vitest` (instalada en el commit `b0b73f1`), porque el repo ya usa Vitest y solo tenía 5 tests.

**Aplicación — commit `e57cf40`:** 8 tests nuevos en `frontend/src/lib/financial-utils.test.ts`.

| Comprobación | Resultado | Estado |
|---|---|---|
| Tests | 13 pasan (5 + 8). | ✅ |
| Build | Sin advertencias. | ✅ |
| Lint | Exit code 0. | ✅ |

**Versión:** la skill está escrita para Vitest 5.0.1 y el repo usa 4.1.4. No se usaron APIs exclusivas de v5.
**Rechazados:** tests de zona horaria (ARQ-7 sigue pendiente; el mecanismo solo está confirmado en Node), `toBeCloseTo` y el caso `-0.0`.

## Skill interna: `dashboard-pre-merge-check` — commit `dfccd59`

- Ubicación: `.skills/dashboard-pre-merge-check/SKILL.md`. Está en `.skills/`, **no** en `.agents/skills/`.
- Qué hace: checklist previo a merge. Ejecuta build, lint y tests solo dentro del contenedor, comprueba la red de Codespaces antes de culpar al código, compara con la línea base, hace las comprobaciones manuales de accesibilidad y registra el resultado en `verification.md`.
- Prueba: en una sesión nueva sin Docker, el veredicto fue **NO VERIFICABLE** y no inventó resultados.

## Entorno: incidencia de red en Codespaces

En Codespaces la red entre contenedores estaba bloqueada: `wget` a `backend:8000` desde el frontend daba timeout y la app mostraba el error de carga. Se resolvió con un **arreglo temporal con `iptables` y `sysctl`, que no está en el repo** (no hay commit). Si el problema vuelve, hay que reaplicarlo a mano; el paso 2 de la skill interna sirve para diagnosticarlo.

## Pendientes

| Pendiente | Origen |
|---|---|
| `role="status"` en el tooltip, probado con lector de pantalla. | Skill `accessibility` |
| Bug de zona horaria en la agregación mensual (ARQ-7, R-07). Sigue sin confirmar en el navegador. | `docs/findings.md` ARQ-7 |
| Tests del backend (`pytest`): nadie los ha ejecutado. | `verification.md` #21 |
| `docker compose up --build -V`: sin verificar. | `.agents/rules/environment.md` §1 |
| Arreglo de red de Codespaces: temporal, no documentado como solución permanente. | Sección "Entorno" |
