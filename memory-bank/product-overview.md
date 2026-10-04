# Product overview

Contexto de producto para agents. Solo recoge lo que el repo dice o lo que se ha comprobado. Lo que el repo no dice se marca como **no documentado**.

**Fuentes:** [`verification.md`](../verification.md) (qué está verificado y cómo) y [`docs/findings.md`](../docs/findings.md) (convenciones y riesgos). Este archivo los enlaza; no los duplica.

**Estado de cada afirmación**
- ✅ = verificado ejecutando la app (Codespaces), con la fila de `verification.md`.
- **lectura** = comprobado por un agente leyendo archivos, sin ejecutar.
- ❓ = nadie lo ha comprobado.

**Por qué estos nombres:** `AGENTS.md:11-12` exige la carpeta `./memory-bank`, pero ni `AGENTS.md` ni `.agents/rules/` definen nombres ni formato para sus archivos. Por eso se usan `product-overview.md`, `tech-stack.md` y `current-state.md`.

---

## Qué es

| Afirmación | Evidencia | Estado |
|---|---|---|
| Dashboard de métricas financieras con frontend React + TypeScript y backend FastAPI. | `README.md:18`, `README.es.md:18` | lectura |
| El repo es un proyecto de ejercicio de 4Geeks Academy. Los pasos que propone son inspeccionarlo con un agente de IA y documentar reglas y memory bank. | `README.md:3-5`, `README.md:20-26` | lectura |
| La API se llama "Financial Metrics API". | `backend/app/main.py:6` | lectura |

## Qué muestra el dashboard

| Afirmación | Evidencia | Estado |
|---|---|---|
| Una sola página con cabecera, fila de KPIs y dos gráficos. | `frontend/src/App.tsx:45-71` | lectura |
| KPIs: Total Income, Total Outcome, Profit y Profit Margin. | `frontend/src/components/dashboard/kpi-row.tsx:15`, `:23`, `:31`, `:39` | lectura |
| Gráficos: ingresos frente a gastos (`IncomeOutcomeChart`) y % de beneficio (`ProfitPercentChart`), los dos con datos agregados por mes. | `frontend/src/App.tsx:65-66` | lectura |
| El dashboard carga en el 5173 con datos del backend. | `verification.md` #14 | ✅ |
| La cabecera dice "2024 - Full Year", pero los datos son relativos a hoy. Es un defecto conocido. | `frontend/src/App.tsx:49`, `backend/app/routes.py:97`; `verification.md` #17; `docs/findings.md` DOC-3 | ✅ |
| Si falla la petición, se muestra un mensaje de error (en español, mientras que el resto de la UI está en inglés). | `frontend/src/App.tsx:35-39`, `:51-55`; `docs/findings.md` NAM-5 | lectura |

## Datos

| Afirmación | Evidencia | Estado |
|---|---|---|
| Los datos son **mock**: no hay base de datos. Se regeneran en cada request con `seed=42`, 12 meses × 30 movimientos, con fechas relativas a `date.today()`. | `backend/app/routes.py:65-68`, `:94-104`; `verification.md` #1, #9; `docs/findings.md` ARQ-5 | lectura |
| Vocabulario de dominio: `income` / `outcome`; categorías `suppliers`, `sales`, `operational`, `administrative`, `others`; tipo de negocio `B2B` / `B2C`. | `backend/app/routes.py:11-14`, `frontend/src/lib/financial-types.ts:1-3`; `docs/findings.md` NAM-1 | lectura |
| La API expone 9 endpoints, pero el frontend solo consume `/api/metrics`. | `backend/app/routes.py:243-378`; `verification.md` #7 (✅), #15 (lectura) | ✅ endpoints · lectura uso |

## Lo que el repo no dice

| Tema | Estado |
|---|---|
| Usuarios o perfiles objetivo | no documentado |
| Objetivos de negocio o métricas de éxito | no documentado |
| Roadmap o features planificadas | no documentado |
| Origen real de los datos (más allá del mock) | no documentado |
| Despliegue a producción | no documentado (solo hay setup de desarrollo: `backend/Dockerfile:12` usa `--reload`; ver `docs/findings.md` sección 7) |
| Idioma oficial de la UI | no documentado; pendiente de decisión del equipo (`docs/findings.md` R-13, sección 8) |
