/**
 * Jest manual mock for the `langfuse` package.
 *
 * The real Langfuse client is already skipped in test environments via the
 * `NODE_ENV === "test"` guard in langfuse.config.ts. This stub exists purely
 * to satisfy Jest module resolution so tests don't fail with
 * "Cannot find module 'langfuse'".
 */

import { jest } from "@jest/globals";

export const Langfuse = jest.fn().mockImplementation(() => ({
  trace: jest.fn(),
  score: jest.fn(),
  flush: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

export default { Langfuse };
