import { describe, it, expect } from 'vitest';
import { ScriptLogBodySchema } from '../downloads.schema';

describe('downloads.schema', () => {
  describe('ScriptLogBodySchema', () => {
    it('accepts valid script name', () => {
      expect(ScriptLogBodySchema.safeParse({ scriptName: 'my-script.js' }).success).toBe(true);
    });
    it('accepts name with dots, dashes, underscores', () => {
      expect(ScriptLogBodySchema.safeParse({ scriptName: 'my_script-1.0.js' }).success).toBe(true);
    });
    it('rejects empty script name', () => {
      expect(ScriptLogBodySchema.safeParse({ scriptName: '' }).success).toBe(false);
    });
    it('rejects script name with spaces', () => {
      expect(ScriptLogBodySchema.safeParse({ scriptName: 'my script' }).success).toBe(false);
    });
    it('rejects script name with special chars', () => {
      expect(ScriptLogBodySchema.safeParse({ scriptName: 'script@name' }).success).toBe(false);
    });
    it('rejects name exceeding 200 chars', () => {
      expect(ScriptLogBodySchema.safeParse({ scriptName: 'a'.repeat(201) }).success).toBe(false);
    });
  });
});

