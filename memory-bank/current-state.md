# Current state

Estado del proyecto a fecha de **2026-10-04**. Resume y enlaza: el detalle está en [`verification.md`](../verification.md) y [`docs/findings.md`](../docs/findings.md). Si este archivo y esas fuentes no coinciden, mandan las fuentes.

**Estado:** ✅ = verificado ejecutando (Codespaces) · **lectura** = leído por un agente · ❓ = sin comprobar.

---

## Qué funciona

| Qué | Evidencia | Estado |
|---|---|---|
| `docker compose up --build` levanta los dos servicios y reenvía los puertos 5173, 8000 y 5678. | `verification.md` #2 | ✅ |
| `GET /health` devuelve `{"status":"ok"}`. | `verification.md` #5 | ✅ |
| `/docs` carga y lista los 9 endpoints. | `verification.md` #7 | ✅ |
| El dashboard carga en el 5173 con datos del backend a través del proxy. | `verification.md` #14 | ✅ |
| El README documenta el healthcheck y explica que el 404 de `GET /` es lo esperado. | `README.md:51-53`, `README.es.md:51-53`; `docs/findings.md` DOC-4 (resuelto) | lectura |
| Reglas para agentes en `.agents/rules/` (5 archivos), probadas en una tarea real. | `verification.md`, sección "Validación de reglas (Fase 3)" | Solo se probaron `docs-and-verification.md` y `environment.md`. |

## Gaps conocidos

Cada gap enlaza su fila de origen.

| Gap | Evidencia | Estado |
|---|---|---|
| Nadie ha ejecutado los tests de backend ni de frontend, y no hay CI. | `verification.md` #21-22; `docs/findings.md` TST-4 | ❓ |
| Nadie ha ejecutado build, lint ni typecheck del frontend. | `.agents/rules/environment.md` §1 (tabla de comandos) | ❓ |
| La cabecera muestra "2024" pero los datos son relativos a hoy. | `verification.md` #17; `docs/findings.md` DOC-3 | ✅ defecto confirmado |
| Posible bug de zona horaria en la agregación mensual: el día 01 se agruparía en el mes anterior en UTC−x. | `docs/findings.md` ARQ-7, R-07 (sección 8) | ❓ sin confirmar |
| Contrato API duplicado a mano entre Pydantic y TypeScript, sin validación en runtime. | `docs/findings.md` ARQ-1 | lectura |
| Filtro `business_type` copiado en 4 handlers. | `docs/findings.md` ARQ-4 | lectura |
| Agregación mensual duplicada en backend y frontend; el frontend usa 1 de 9 endpoints. | `docs/findings.md` ARQ-6; `verification.md` #15 | lectura |
| Aserciones de tests débiles (`comparison`, `alerts`, `summary`). | `docs/findings.md` TST-2 | lectura |
| Dependencias no reproducibles (`requirements.txt` sin versiones, `npm install` en vez de `npm ci`). | `docs/findings.md` DX-4 | lectura |
| La app no se ha probado fuera de Docker ni en local (Windows sin Docker). | `verification.md` #23-24 | ❓ |
| Idioma de la UI sin decidir (R-13 pendiente). | `docs/findings.md` NAM-5, sección 8 | lectura |
| `AGENTS.md` exige `.agents/skills/`, pero no existe. `.agents/rules/` y `memory-bank/` sí existen. | `AGENTS.md:6-15`; `verification.md` #20; `docs/findings.md` DOC-2 | lectura |

## Siguientes prioridades

Solo salen de los gaps anteriores, y cada una dice qué gap cierra. El orden se basa en la evidencia (primero, lo que bloquea afirmar que algo funciona), **no en una decisión de producto**, porque el roadmap está **no documentado**.

1. **Ejecutar los tests, el build y el lint** con los comandos de `environment.md` §1 y registrar el resultado en `verification.md` #21-22. Cierra el gap de tests nunca ejecutados (TST-4) y desbloquea afirmar que cualquier cambio funciona (R-15).
2. **Confirmar o descartar el bug de zona horaria** con el test propuesto en `docs/findings.md` ARQ-7. Desbloquea R-07 (sección 8).
3. **Corregir el periodo hardcodeado "2024"** (DOC-3, `verification.md` #17). Es el único defecto visible confirmado en ejecución.
4. **Probar las reglas que faltan** (`api-contract.md`, `backend.md` y `frontend.md`) con una tarea real, como se hizo en la Fase 3.

Lo que necesita una decisión del equipo, y que por tanto no se puede priorizar desde el repo: el idioma de la UI (R-13).
