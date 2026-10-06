// Tipos de respuesta de la API, derivados de frontend/specs/openapi.snapshot.json.
// Evidencia y estado de verificación: frontend/specs/verification.md.
// Solo tipos: sin fetch, funciones ni componentes.

/**
 * Tipo de operación de un movimiento.
 * Valores: 'income' | 'outcome'.
 * Esquema: #/components/schemas/FinancialMovement/properties/operation_type/enum.
 */
export type OperationType = 'income' | 'outcome'

/**
 * Tipo de negocio. Siempre en mayúsculas: 'b2b' no está en el enum (422 esperado, sin verificar en vivo).
 * Valores: 'B2B' | 'B2C'.
 * Esquema: #/components/schemas/FinancialMovement/properties/business_type/enum.
 */
export type BusinessType = 'B2B' | 'B2C'

/**
 * Categoría de un movimiento.
 * Valores: 'suppliers' | 'sales' | 'operational' | 'administrative' | 'others'.
 * Esquema: #/components/schemas/FinancialMovement/properties/category/enum.
 */
export type Category = 'suppliers' | 'sales' | 'operational' | 'administrative' | 'others'

/**
 * Granularidad de agregación por período.
 * Valores: 'day' | 'week' | 'month'.
 * Esquema: #/paths/~1api~1metrics~1alerts/get/parameters/1/schema/enum.
 */
export type GroupBy = 'day' | 'week' | 'month'

/**
 * Respuesta 200 de GET /api/metrics/facets.
 * Se calcula sobre todo el dataset: el endpoint no acepta parámetros.
 * Esquema: #/components/schemas/MetricsFacets.
 */
export interface FacetsResponse {
  /**
   * Tipos de operación presentes en los datos, en orden alfabético.
   * Obligatorio, no admite null.
   * En vivo (2026-10-05): ['income', 'outcome'].
   */
  operation_types: OperationType[]
  /**
   * Tipos de negocio presentes en los datos, en orden alfabético.
   * Obligatorio, no admite null.
   * En vivo (2026-10-05): ['B2B', 'B2C'].
   */
  business_types: BusinessType[]
  /**
   * Categorías presentes en los datos, en orden alfabético.
   * Lista plana y global: no se separa por business_type ni por operation_type.
   * Obligatorio, no admite null.
   * En vivo (2026-10-05): 5 categorías.
   */
  categories: Category[]
  /**
   * Fecha del movimiento más antiguo del dataset.
   * Formato YYYY-MM-DD. Obligatorio, no admite null.
   * Las fechas son relativas al día actual, así que este valor cambia cada día.
   */
  min_date: string
  /**
   * Fecha del movimiento más reciente del dataset.
   * Formato YYYY-MM-DD. Obligatorio, no admite null.
   * Es el límite que se alcanza si no se envía end_date.
   */
  max_date: string
}

/**
 * Un período cuyo gasto supera el umbral respecto a su baseline.
 * Esquema: #/components/schemas/MetricsAlert.
 */
export interface AlertEntry {
  /**
   * Período agregado. Obligatorio, no admite null.
   * El formato depende de group_by:
   * - 'month' (default): YYYY-MM, por ejemplo '2025-12'. Verificado en vivo.
   * - 'week': YYYY-Www, semana ISO. Solo por código.
   * - 'day': YYYY-MM-DD. Solo por código.
   */
  period: string
  /**
   * Suma de amount de los movimientos 'outcome' del período, redondeada a 2 decimales.
   * Obligatorio, no admite null.
   */
  outcome_total: number
  /**
   * Media del outcome de TODOS los períodos anteriores dentro del rango filtrado.
   * NO es una media móvil de 3 períodos: si cambia start_date, cambia el baseline.
   * Siempre > 0: los períodos con baseline 0 no generan alerta.
   * Redondeada a 2 decimales. Obligatorio, no admite null.
   */
  baseline_average: number
  /**
   * Incremento relativo: (outcome_total - baseline_average) / baseline_average.
   * Es una FRACCIÓN, no un porcentaje: 0.35 = 35 %. Para mostrarlo en %, multiplicar por 100.
   * Siempre mayor que el threshold enviado (comparación estricta). Redondeado a 4 decimales.
   * Obligatorio, no admite null.
   */
  increase_ratio: number
}

/**
 * Respuesta 200 de GET /api/metrics/alerts.
 * Es un array directo, sin objeto envoltorio (verificado en vivo).
 * Si no hay alertas, devuelve [].
 * Orden cronológico por period.
 * Esquema: #/paths/~1api~1metrics~1alerts/get/responses/200/content/application~1json/schema.
 */
export type AlertsResponse = AlertEntry[]

/**
 * Total agregado de una categoría para un tipo de operación.
 * No incluye porcentaje: se calcula en el frontend (verification.md, decisión D1).
 * Esquema: #/components/schemas/TopCategoryItem.
 */
export interface CategoryEntry {
  /**
   * Categoría agregada. Obligatorio, no admite null.
   * Solo aparecen categorías con movimientos en el rango: nunca hay filas con total 0.
   */
  category: Category
  /**
   * Tipo de operación agregado. Es el operation_type enviado en la query, o 'outcome' por defecto.
   * Obligatorio, no admite null.
   */
  operation_type: OperationType
  /**
   * Suma de amount de la categoría en el rango, redondeada a 2 decimales.
   * Siempre positivo: el signo lo da operation_type.
   * Obligatorio, no admite null.
   */
  total_amount: number
}

/**
 * Respuesta 200 de GET /api/metrics/categories/top.
 * Es un array directo, sin objeto envoltorio (verificado en vivo).
 * Va en orden descendente por total_amount y se corta a `limit`.
 * Puede tener menos filas que `limit`, o ninguna ([]) si el rango no tiene datos.
 * Esquema: #/paths/~1api~1metrics~1categories~1top/get/responses/200/content/application~1json/schema.
 */
export type TopCategoriesResponse = CategoryEntry[]
