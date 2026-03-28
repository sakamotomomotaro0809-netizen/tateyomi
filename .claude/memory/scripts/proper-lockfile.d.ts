/**
 * Type definitions for proper-lockfile
 */

declare module 'proper-lockfile' {
  export interface LockOptions {
    stale?: number;
    retries?: {
      retries?: number;
      minTimeout?: number;
      maxTimeout?: number;
      factor?: number;
    };
    lockfilePath?: string;
    realpath?: boolean;
  }

  export function lock(
    file: string,
    options?: LockOptions
  ): Promise<() => Promise<void>>;

  export function unlock(file: string): Promise<void>;

  export function check(
    file: string,
    options?: LockOptions
  ): Promise<boolean>;
}
