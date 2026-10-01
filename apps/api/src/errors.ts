import type { ErrorCode } from '@boardgame/protocol';

export class AppError extends Error {
  constructor(readonly code: ErrorCode, message: string, readonly status: number, readonly retryable = false) { super(message); }
}
