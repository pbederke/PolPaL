import { describe, it, expect } from 'vitest';
import { CountryCreateSchema, CountryUpdateSchema } from '../countries.schema';

describe('countries.schema', () => {
  const valid = { countrycodePolpal: 'DEU', isCountry: true, countryname: 'Germany' };

  describe('CountryCreateSchema', () => {
    it('accepts valid minimal object', () => {
      expect(CountryCreateSchema.safeParse(valid)).toHaveProperty('success', true);
    });
    it('accepts full object with optional fields', () => {
      expect(CountryCreateSchema.safeParse({ ...valid, iso2c: 'DE', iso3c: 'DEU', iso3n: 276, region: 'Europe' })).toHaveProperty('success', true);
    });
    it('accepts isCountry as false', () => {
      expect(CountryCreateSchema.safeParse({ ...valid, isCountry: false })).toHaveProperty('success', true);
    });
    it('rejects missing countrycodePolpal', () => {
      const { countrycodePolpal: _, ...noCode } = valid;
      expect(CountryCreateSchema.safeParse(noCode)).toHaveProperty('success', false);
    });
    it('rejects missing isCountry', () => {
      const { isCountry: _, ...noFlag } = valid;
      expect(CountryCreateSchema.safeParse(noFlag)).toHaveProperty('success', false);
    });
    it('rejects missing countryname', () => {
      const { countryname: _, ...noName } = valid;
      expect(CountryCreateSchema.safeParse(noName)).toHaveProperty('success', false);
    });
    it('rejects empty countrycodePolpal', () => {
      expect(CountryCreateSchema.safeParse({ ...valid, countrycodePolpal: '' })).toHaveProperty('success', false);
    });
  });

  describe('CountryUpdateSchema', () => {
    it('accepts empty object (all fields optional)', () => {
      expect(CountryUpdateSchema.safeParse({})).toHaveProperty('success', true);
    });
    it('accepts partial update', () => {
      expect(CountryUpdateSchema.safeParse({ countryname: 'Deutschland' })).toHaveProperty('success', true);
    });
  });
});
