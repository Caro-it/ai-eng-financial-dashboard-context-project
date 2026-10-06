// Tipos de parámetros de query, derivados de frontend/specs/openapi.snapshot.json.
// Evidencia y estado de verificación: frontend/specs/verification.md.
//
// Sobre null: en el esquema, start_date, end_date y business_type son anyOf [tipo, null].
// En una query string no se envía null: se omite el parámetro. Por eso, en todos los
// parámetros opcionales, el null del esquema se modela como omisión, es decir, como
// propiedad opcional (?) sin null. threshold, group_by, operation_type y limit no
// admiten null en el esquema.
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
   * Fecha final, incluida en el rango (solo por código: el filtrado sí está verificado en vivo). Formato YYYY-MM-DD.
   * Opcional; si se omite, el rango llega hasta max_date de /facets (verificado en vivo).
   * Si es anterior a start_date, la API no valida el orden (por código); su respuesta está
   * sin verificar en vivo. La UI bloquea el rango invertido antes de llamar.
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
   * El rango 0.01–1.0 del brief no lo impone la API: lo aplica la UI, que siempre envía un valor en ese rango.
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
   * Opcional; si se omite, mezcla ambos.
   * El esquema admite null, que equivale a omitir el parámetro.
   */
  business_type?: BusinessType
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
   * Opcional; si se omite, mezcla ambos.
   * El esquema admite null, que equivale a omitir el parámetro.
   */
  business_type?: BusinessType
}
