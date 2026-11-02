import { describe, it, expect } from 'vitest';
import {
  importEntriesSingleSchema,
  ImportEntriesSingleSchema,
  syncEntriesBodySchema,
} from '../entries.schema';

describe('entries.schema', () => {
  const validEntryBody = {
    usedFile: 'data.csv',
    dateDownloaded: '2024-01-15',
    projectKey: 'polpal',
    datasetKey: 'parliament',
    versionKey: 'v1',
    entryEntityIdVar: 'party_id',
    entryEntityId: '12345',
    countrycodePolpal: 'USA',
    uniqueObservationId: 'obs-001',
  };

  describe('importEntriesSingleSchema', () => {
    describe('valid inputs', () => {
      it('accepts valid full object', () => {
        const result = importEntriesSingleSchema.safeParse({
          body: {
            ...validEntryBody,
            entryCountryVar: 'country',
            entryCountry: 'United States',
            entryYearVar: 'year',
            entryYear: 2020,
            entryMonthVar: 'month',
            entryMonth: 6,
            entryDayVar: 'day',
            entryDay: 15,
            entryEntityNameShortVar: 'name_short',
            entryEntityNameShort: 'SPD',
            entryEntityNameEnglishVar: 'name_en',
            entryEntityNameEnglish: 'Social Democratic Party',
            entryEntityNameVar: 'name',
            entryEntityName: 'Sozialdemokratische Partei Deutschlands',
            additionalInformation: 'Extra info',
            note: 'Some note',
          },
        });
        expect(result.success).toBe(true);
      });

      it('accepts valid minimal object with only required fields', () => {
        const result = importEntriesSingleSchema.safeParse({
          body: validEntryBody,
        });
        expect(result.success).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('rejects missing usedFile', () => {
        const { usedFile, ...rest } = validEntryBody;
        const result = importEntriesSingleSchema.safeParse({ body: rest });
        expect(result.success).toBe(false);
      });

      it('rejects missing dateDownloaded', () => {
        const { dateDownloaded, ...rest } = validEntryBody;
        const result = importEntriesSingleSchema.safeParse({ body: rest });
        expect(result.success).toBe(false);
      });

      it('rejects missing projectKey', () => {
        const { projectKey, ...rest } = validEntryBody;
        const result = importEntriesSingleSchema.safeParse({ body: rest });
        expect(result.success).toBe(false);
      });

      it('rejects missing datasetKey', () => {
        const { datasetKey, ...rest } = validEntryBody;
        const result = importEntriesSingleSchema.safeParse({ body: rest });
        expect(result.success).toBe(false);
      });

      it('rejects missing versionKey', () => {
        const { versionKey, ...rest } = validEntryBody;
        const result = importEntriesSingleSchema.safeParse({ body: rest });
        expect(result.success).toBe(false);
      });

      it('rejects missing entryEntityIdVar', () => {
        const { entryEntityIdVar, ...rest } = validEntryBody;
        const result = importEntriesSingleSchema.safeParse({ body: rest });
        expect(result.success).toBe(false);
      });

      it('rejects missing entryEntityId', () => {
        const { entryEntityId, ...rest } = validEntryBody;
        const result = importEntriesSingleSchema.safeParse({ body: rest });
        expect(result.success).toBe(false);
      });

      it('rejects missing countrycodePolpal', () => {
        const { countrycodePolpal, ...rest } = validEntryBody;
        const result = importEntriesSingleSchema.safeParse({ body: rest });
        expect(result.success).toBe(false);
      });

      it('rejects missing uniqueObservationId', () => {
        const { uniqueObservationId, ...rest } = validEntryBody;
        const result = importEntriesSingleSchema.safeParse({ body: rest });
        expect(result.success).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('accepts empty optional fields', () => {
        const result = importEntriesSingleSchema.safeParse({
          body: {
            ...validEntryBody,
            entryCountry: '',
            entryYear: undefined,
            note: '',
          },
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('ImportEntriesSingleSchema (array)', () => {
    describe('valid inputs', () => {
      it('accepts array with single entry', () => {
        const result = ImportEntriesSingleSchema.safeParse([validEntryBody]);
        expect(result.success).toBe(true);
      });

      it('accepts array with multiple entries', () => {
        const result = ImportEntriesSingleSchema.safeParse([
          validEntryBody,
          { ...validEntryBody, uniqueObservationId: 'obs-002' },
        ]);
        expect(result.success).toBe(true);
      });

      it('accepts empty array', () => {
        const result = ImportEntriesSingleSchema.safeParse([]);
        expect(result.success).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('rejects non-array input', () => {
        const result = ImportEntriesSingleSchema.safeParse(validEntryBody);
        expect(result.success).toBe(false);
      });

      it('rejects array with invalid entry', () => {
        const result = ImportEntriesSingleSchema.safeParse([{ invalid: true }]);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('syncEntriesBodySchema', () => {
    describe('valid inputs', () => {
      it('accepts valid full object', () => {
        const result = syncEntriesBodySchema.safeParse({
          toCreate: [validEntryBody],
          toUpdate: [validEntryBody],
          toDelete: ['obs-001'],
        });
        expect(result.success).toBe(true);
      });

      it('accepts empty arrays for all fields', () => {
        const result = syncEntriesBodySchema.safeParse({
          toCreate: [],
          toUpdate: [],
          toDelete: [],
        });
        expect(result.success).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('rejects missing toCreate', () => {
        const result = syncEntriesBodySchema.safeParse({
          toUpdate: [],
          toDelete: [],
        });
        expect(result.success).toBe(false);
      });

      it('rejects missing toUpdate', () => {
        const result = syncEntriesBodySchema.safeParse({
          toCreate: [],
          toDelete: [],
        });
        expect(result.success).toBe(false);
      });

      it('rejects missing toDelete', () => {
        const result = syncEntriesBodySchema.safeParse({
          toCreate: [],
          toUpdate: [],
        });
        expect(result.success).toBe(false);
      });

      it('rejects non-string elements in toDelete', () => {
        const result = syncEntriesBodySchema.safeParse({
          toCreate: [],
          toUpdate: [],
          toDelete: [123],
        });
        expect(result.success).toBe(false);
      });

      it('rejects invalid entries in toCreate', () => {
        const result = syncEntriesBodySchema.safeParse({
          toCreate: [{ invalid: true }],
          toUpdate: [],
          toDelete: [],
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
