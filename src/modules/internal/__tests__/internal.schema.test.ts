import { describe, it, expect } from 'vitest';
import * as internalSchema from '../internal.schema';

describe('internal.schema', () => {
  it('has no exported schemas', () => {
    const exports = Object.keys(internalSchema);
    expect(exports).toHaveLength(0);
  });
});
