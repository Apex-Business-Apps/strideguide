/**
 * Query Timeout Utilities
 * Adds configurable timeouts to database queries
 */

import { PostgrestBuilder } from '@supabase/postgrest-js';

const DEFAULT_QUERY_TIMEOUT = 5000; // 5 seconds
const LONG_QUERY_TIMEOUT = 30000; // 30 seconds for complex queries

/**
 * Error thrown when query times out
 */
export class QueryTimeoutError extends Error {
  constructor(timeoutMs: number, queryInfo?: string) {
    super(
      `Query timeout after ${timeoutMs}ms${queryInfo ? `: ${queryInfo}` : ''}`
    );
    this.name = 'QueryTimeoutError';
  }
}

/**
 * Execute a promise with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  queryInfo?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new QueryTimeoutError(timeoutMs, queryInfo));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Wrap a Supabase query with timeout
 */
export async function queryWithTimeout<T>(
  queryBuilder: Promise<{ data: T | null; error: Error | null }>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT,
  queryInfo?: string
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const result = await withTimeout(queryBuilder, timeoutMs, queryInfo);
    return result as { data: T | null; error: Error | null };
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      console.error('[QueryTimeout]', error.message);
      return {
        data: null,
        error: new Error(error.message),
      };
    }
    throw error;
  }
}

/**
 * Execute a function with timeout
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT,
  operationName?: string
): Promise<T> {
  return withTimeout(fn(), timeoutMs, operationName);
}

/**
 * Batch query executor with timeout per query
 */
export async function executeBatchQueries<T>(
  queries: Array<{
    builder: Promise<{ data: unknown; error: Error | null }>;
    timeout?: number;
    name?: string;
  }>
): Promise<Array<{ data: unknown; error: Error | null; name?: string }>> {
  const promises = queries.map(({ builder, timeout, name }) =>
    queryWithTimeout(builder, timeout || DEFAULT_QUERY_TIMEOUT, name).then(
      result => ({
        ...result,
        name,
      })
    )
  );

  return Promise.all(promises);
}

/**
 * Query timeout configuration
 */
export const QUERY_TIMEOUTS = {
  FAST: 2000, // Simple queries (SELECT by ID)
  DEFAULT: 5000, // Normal queries (SELECT with conditions)
  MODERATE: 10000, // Moderate complexity (JOINs, aggregations)
  LONG: 30000, // Complex queries (multiple JOINs, analytics)
} as const;

/**
 * Create a timeout-wrapped Supabase client query helper
 */
export function createTimeoutQuery(defaultTimeout: number = DEFAULT_QUERY_TIMEOUT) {
  return {
    /**
     * Execute single query with timeout
     */
    async single<T>(
      queryBuilder: Promise<{ data: T | null; error: Error | null }>,
      timeout?: number
    ): Promise<{ data: T | null; error: Error | null }> {
      return queryWithTimeout(queryBuilder, timeout || defaultTimeout);
    },

    /**
     * Execute multiple queries in batch
     */
    async batch<T>(
      queries: Array<{
        builder: Promise<{ data: unknown; error: Error | null }>;
        timeout?: number;
        name?: string;
      }>
    ): Promise<Array<{ data: unknown; error: Error | null; name?: string }>> {
      return executeBatchQueries(queries);
    },

    /**
     * Execute with circuit breaker and timeout
     */
    async withCircuitBreaker<T>(
      serviceName: string,
      queryBuilder: Promise<{ data: T | null; error: Error | null }>,
      timeout?: number
    ): Promise<{ data: T | null; error: Error | null }> {
      const { withCircuitBreaker } = await import('./CircuitBreaker');

      return withCircuitBreaker(
        serviceName,
        () => queryWithTimeout(queryBuilder, timeout || defaultTimeout),
        { requestTimeout: timeout || defaultTimeout }
      );
    },
  };
}

/**
 * Default timeout query helper
 */
export const timeoutQuery = createTimeoutQuery();
