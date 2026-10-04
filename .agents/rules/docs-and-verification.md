# Documentación y registro de verificación

**Alcance:**
- `README.md`, `README.es.md`, `verification.md`, `docs/**`.
- Cualquier afirmación de que algo "funciona" o "pasa": tests, build o ejecución.

Origen: `docs/findings.md` (DOC-1, DOC-2, DOC-5, TST-4, DX-6) → R-15, R-20, R-21.

---

## 1. Dónde está el contexto del proyecto

**Por qué:** `AGENTS.md:6-15` pide leer `.agents/rules`, `.agents/skills` y `memory-bank/`. Hoy solo existe `.agents/rules`; `.agents/skills` y `memory-bank/` no existen (`docs/findings.md` DOC-2).

**Haz**
- Usa como contexto, además de estas reglas:
  - `docs/findings.md`, con la evidencia y los motivos de cada regla y las reglas pendientes.
  - `verification.md`, con lo que está verificado y cómo.
- Si una regla contradice el código actual, señálalo y no la apliques a ciegas. Actualiza `docs/findings.md` con el hecho nuevo.

**No hagas**
- No inventes contenido para `skills` o `memory-bank` como si ya existieran.

## 2. `verification.md` es el registro de lo verificado

**Por qué:**
- `verification.md` tiene una leyenda estricta: ✅ solo con ejecución real, "verificado por lectura (agente)" para lo leído y ❓ para lo que nadie ha comprobado.
- Hoy los tests de backend y frontend nunca se han ejecutado (`verification.md` #21-22).
- No hay CI (no existe `.github/` en el repo).
- Los comandos de test no estaban documentados (`README.md:39-50`); ahora están en `environment.md`.

**Haz**
- Antes de decir que tests, build o ejecución "pasan", ejecútalos (comandos en `environment.md`) y cita la salida.
- Al ejecutar algo por primera vez, o al cambiar el resultado de una fila, actualiza la fila de `verification.md`: estado, cómo se verificó y en qué entorno (Codespaces, local, etc.).
- Si no puedes ejecutar algo (por ejemplo, sin Docker), déjalo en ❓ e indica el motivo.

**No hagas**
- No marques ✅ algo que solo has leído o inferido.
- No borres filas ❓; o se verifican o se quedan.

**Cómo comprobar**
- Cada ✅ nuevo en `verification.md` indica el comando o la acción concreta y el entorno.

## 3. Los README en inglés y español van sincronizados

**Por qué:** `README.md` y `README.es.md` son paralelos línea a línea: las secciones de ejecución (`README.md:39-50` ↔ `README.es.md:39-50`), la estructura de `.agents` (`:28-37` en ambos) y el enlace cruzado (`:10` en ambos).

**Haz**
- Cualquier cambio de contenido en un README se aplica en el otro en el mismo cambio, traducido y en la misma posición.

**No hagas**
- No actualices URLs, puertos o comandos en un solo idioma.

**Cómo comprobar**
- `git diff --stat README.md README.es.md` muestra cambios en ambos o en ninguno.
- Los dos archivos siguen teniendo el mismo número de secciones (`grep -c "^## " README.md README.es.md`).
