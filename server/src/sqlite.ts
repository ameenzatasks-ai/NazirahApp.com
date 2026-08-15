/**
 * A small better-sqlite3-shaped façade over @libsql/client.
 *
 * The app had 86 prepared statements written against better-sqlite3's
 * synchronous API. libSQL is async-only, so the calls had to change — but
 * rewriting every query into libSQL's `execute({ sql, args })` form would have
 * been a large, error-prone diff for no behavioural gain. This keeps the
 * familiar `prepare(sql).get(a, b)` shape and asks call sites only to `await`.
 *
 * `run()` reports `changes` and `lastInsertRowid` under better-sqlite3's names
 * so the handful of call sites reading those keep working unchanged.
 *
 * TRANSACTIONS are the subtle part. libSQL runs a transaction on a dedicated
 * object, so a statement issued against the base client inside a transaction
 * callback would silently execute OUTSIDE it — losing atomicity without ever
 * failing. AsyncLocalStorage carries the active transaction, so statements
 * inside a callback are routed to it automatically and the callbacks read the
 * same as they did before.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient, type Client, type Transaction, type InValue } from '@libsql/client';

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

export interface Statement {
  get<T = any>(...params: unknown[]): Promise<T | undefined>;
  all<T = any>(...params: unknown[]): Promise<T[]>;
  run(...params: unknown[]): Promise<RunResult>;
}

/** The transaction in scope for the current async call chain, if any. */
const txStore = new AsyncLocalStorage<Transaction>();

/**
 * better-sqlite3 takes positional params as varargs and named params as a
 * single object. libSQL wants an array or a record, so translate.
 */
function toArgs(params: unknown[]): InValue[] | Record<string, InValue> {
  if (params.length === 1 && params[0] !== null && typeof params[0] === 'object'
      && !Array.isArray(params[0]) && !(params[0] instanceof Date)
      && !ArrayBuffer.isView(params[0])) {
    return params[0] as Record<string, InValue>;
  }
  // booleans have no SQLite type; better-sqlite3 rejected them outright, and
  // libSQL would bind them unpredictably, so map them the way SQL expects.
  return params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p)) as InValue[];
}

export class SqliteClient {
  constructor(private readonly client: Client) {}

  /** The transaction in scope, else the base connection. */
  private get executor(): Client | Transaction {
    return txStore.getStore() ?? this.client;
  }

  prepare(sql: string): Statement {
    const self = this;
    return {
      async get<T>(...params: unknown[]): Promise<T | undefined> {
        const rs = await self.executor.execute({ sql, args: toArgs(params) });
        return rs.rows[0] as T | undefined;
      },
      async all<T>(...params: unknown[]): Promise<T[]> {
        const rs = await self.executor.execute({ sql, args: toArgs(params) });
        return rs.rows as unknown as T[];
      },
      async run(...params: unknown[]): Promise<RunResult> {
        const rs = await self.executor.execute({ sql, args: toArgs(params) });
        return {
          changes: rs.rowsAffected,
          // libSQL returns a bigint; the app treats these as plain numbers, and
          // row ids here are nowhere near the safe-integer limit.
          lastInsertRowid: rs.lastInsertRowid !== undefined ? Number(rs.lastInsertRowid) : 0,
        };
      },
    };
  }

  /** Multi-statement DDL, as used by the migrations. */
  async exec(sql: string): Promise<void> {
    await this.client.executeMultiple(sql);
  }

  async pragma(statement: string): Promise<void> {
    await this.client.execute(`PRAGMA ${statement}`);
  }

  /**
   * Mirrors better-sqlite3's `db.transaction(fn)`: returns a function that runs
   * `fn` atomically. Statements issued inside are routed to the transaction by
   * the AsyncLocalStorage above.
   */
  transaction<A extends unknown[], R>(fn: (...args: A) => Promise<R> | R) {
    return async (...args: A): Promise<R> => {
      // Already inside one — join it rather than deadlocking on a second write
      // transaction against the same connection.
      const existing = txStore.getStore();
      if (existing) return await fn(...args);

      const tx = await this.client.transaction('write');
      try {
        const result = await txStore.run(tx, () => fn(...args));
        await tx.commit();
        return result;
      } catch (err) {
        try { await tx.rollback(); } catch { /* already closed */ }
        throw err;
      }
    };
  }

  async close(): Promise<void> {
    this.client.close();
  }
}

export function createSqliteClient(url: string, authToken?: string): SqliteClient {
  return new SqliteClient(createClient(authToken ? { url, authToken } : { url }));
}
