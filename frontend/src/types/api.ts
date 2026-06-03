/**
 * API and HTTP Related Types
 * Handles request/response formats, error handling, and pagination
 */

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

/** API error response structure */
export interface ApiErrorResponse {
  success: false
  message: string
  error?: string
  statusCode?: number
  details?: Record<string, unknown>
}

/** Pagination information */
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Paginated API response */
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo
}

/** Query parameters for list endpoints */
export interface ListQueryParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

/** HTTP request options */
export interface RequestOptions {
  headers?: Record<string, string>
  timeout?: number
  retries?: number
}
