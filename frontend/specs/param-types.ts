// Tipos de parámetros de query, derivados de frontend/specs/openapi.snapshot.json.
// Evidencia y estado de verificación: frontend/specs/verification.md.
//
// Sobre null: se respeta el esquema. Los parámetros con anyOf [..., null] admiten null
// (business_type); los que no lo tienen, no (threshold, group_by, operation_type, limit).
// Excepción: start_date y end_date también son anyOf [string, null] en el esquema,
// pero DateRangeFilter los define como string por decisión explícita de la spec.
// En la query string, null equivale a omitir el parámetro.
//
// Solo tipos: sin fetch, funciones ni componentes.

import type { BusinessType, GroupBy, OperationType } from './api-types'

/**
 * Filtro de rango de fechas, común a los endpoints de métricas.
 * Ambos extremos son inclusivos.
 */
export interface DateRangeFilter {
  /**
   * Fecha inicial, incluida en el rango. Formato YYYY-MM-DD.
   * Opcional; si se omite, el rango empieza al principio de los datos.
   * Esquema: format date. Verificado en vivo que es inclusiva.
   */
  start_date?: string
  /**
   * Fecha final, incluida en el rango. Formato YYYY-MM-DD.
   * Opcional; si se omite, el rango llega hasta max_date de /facets (verificado en vivo).
   * Si es anterior a start_date, la API no valida el orden: devolvería [] (sin verificar en vivo).
   */
  end_date?: string
}

/** Parámetros de query de GET /api/metrics/alerts. */
export interface AlertsParams extends DateRangeFilter {
  /**
   * Incremento mínimo para que un período genere alerta.
   * Es una FRACCIÓN en la misma escala que increase_ratio: 0.3 = 30 %.
   * Hay alerta si increase_ratio > threshold (comparación estricta).
   * Opcional. Default 0.3.
   * Límites en la API: mínimo 0 (inclusivo), SIN máximo. Con 50, la API devuelve 200 y [] (verificado en vivo).
   * El rango 0.01–1.0 del brief no lo impone la API: si se quiere, hay que aplicarlo en la UI.
   */
  threshold?: number
  /**
   * Granularidad de los períodos comparados.
   * Opcional. Default 'month', que produce period en formato YYYY-MM.
   * Valores: 'day' | 'week' | 'month'.
   */
  group_by?: GroupBy
  /**
   * Filtra los movimientos por tipo de negocio antes de agregar.
   * Valores: 'B2B' | 'B2C', en mayúsculas.
   * Opcional y admite null; si se omite o es null, mezcla ambos.
   */
  business_type?: BusinessType | null
}

/** Parámetros de query de GET /api/metrics/categories/top. */
export interface TopCategoriesParams extends DateRangeFilter {
  /**
   * Tipo de operación por el que se agregan las categorías.
   * Valores: 'income' | 'outcome'.
   * Opcional. Default 'outcome'.
   * No admite null: no se pueden pedir ambos tipos en la misma llamada.
   */
  operation_type?: OperationType
  /**
   * Número máximo de categorías devueltas.
   * Entero. Opcional. Default 5. Límites: mínimo 1, máximo 20.
   * La respuesta puede traer menos filas que limit.
   */
  limit?: number
  /**
   * Filtra los movimientos por tipo de negocio antes de agregar.
   * Valores: 'B2B' | 'B2C', en mayúsculas.
   * Opcional y admite null; si se omite o es null, mezcla ambos.
   */
  business_type?: BusinessType | null
}
