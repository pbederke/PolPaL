import { describe, it, expect } from 'vitest';
import * as usersSchema from '../users.schema';

describe('users.schema', () => {
  it('has no exported schemas', () => {
    const exports = Object.keys(usersSchema);
    expect(exports).toHaveLength(0);
  });
});
