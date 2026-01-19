/**
 * PostgreSQL Database Connection
 *
 * Provides connection pool for TimescaleDB (PostgreSQL) operations.
 * Used by the outbox system for reliable event delivery.
 *
 * Usage:
 *   import { createPool, getPool, closePool } from './postgres.js';
 *
 *   // Initialize
 *   await createPool();
 *
 *   // Use pool
 *   const pool = getPool();
 *   const client = await pool.connect();
 *   const result = await client.query('SELECT NOW()');
 *   client.release();
 *
 *   // Cleanup
 *   await closePool();
 *
 * Dependencies:
 *   - pg (PostgreSQL client)
 */

import pg from 'pg';

const { Pool } = pg;

let pool = null;

/**
 * Default configuration from environment variables
 */
const defaultConfig = {
  host: process.env.POSTGRES_HOST || process.env.TIMESCALEDB_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || process.env.TIMESCALEDB_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || process.env.TIMESCALEDB_DB || 'stock',
  user: process.env.POSTGRES_USER || process.env.TIMESCALEDB_USER || 'stock',
  password: process.env.POSTGRES_PASSWORD || process.env.TIMESCALEDB_PASSWORD || 'stock',
  max: parseInt(process.env.POSTGRES_POOL_SIZE || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

/**
 * Create PostgreSQL connection pool
 * @param {object} config - Pool configuration
 * @returns {Promise<Pool>} PostgreSQL connection pool
 */
export async function createPool(config = {}) {
  if (pool) {
    return pool;
  }

  const poolConfig = { ...defaultConfig, ...config };

  pool = new Pool(poolConfig);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error', err);
  });

  // Test connection
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }

  return pool;
}

/**
 * Get the existing pool instance
 * @returns {Pool|null} PostgreSQL connection pool
 */
export function getPool() {
  return pool;
}

/**
 * Close the connection pool
 * @returns {Promise<void>}
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Execute a query with automatic connection handling
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
export async function query(text, params = []) {
  if (!pool) {
    throw new Error('PostgreSQL pool not initialized. Call createPool() first.');
  }
  return pool.query(text, params);
}

/**
 * Execute a transaction with automatic rollback on error
 * @param {Function} callback - Async function receiving client
 * @returns {Promise<any>} Transaction result
 */
export async function transaction(callback) {
  if (!pool) {
    throw new Error('PostgreSQL pool not initialized. Call createPool() first.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default { createPool, getPool, closePool, query, transaction };
