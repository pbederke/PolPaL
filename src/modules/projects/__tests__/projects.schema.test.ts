import { describe, it, expect } from 'vitest';
import { ProjectCreateSchema, ProjectUpdateSchema } from '../projects.schema';

describe('projects.schema', () => {
  const valid = { projectKey: 'polpal', projectNameShort: 'PolPaL', projectName: 'Political Parties and Leaders' };

  describe('ProjectCreateSchema', () => {
    it('accepts valid minimal object', () => {
      expect(ProjectCreateSchema.safeParse(valid)).toHaveProperty('success', true);
    });
    it('accepts with optional fields', () => {
      expect(ProjectCreateSchema.safeParse({ ...valid, projectUrl: 'https://example.com', projectDescription: 'A database' })).toHaveProperty('success', true);
    });
    it('rejects missing projectKey', () => {
      const { projectKey: _, ...noKey } = valid;
      expect(ProjectCreateSchema.safeParse(noKey)).toHaveProperty('success', false);
    });
    it('rejects empty projectName', () => {
      expect(ProjectCreateSchema.safeParse({ ...valid, projectName: '' })).toHaveProperty('success', false);
    });
  });

  describe('ProjectUpdateSchema', () => {
    it('accepts empty object (all optional)', () => {
      expect(ProjectUpdateSchema.safeParse({})).toHaveProperty('success', true);
    });
    it('accepts partial update', () => {
      expect(ProjectUpdateSchema.safeParse({ projectName: 'Updated' })).toHaveProperty('success', true);
    });
  });
});

