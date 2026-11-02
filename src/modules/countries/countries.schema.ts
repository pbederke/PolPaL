import { z } from 'zod';

export const CountryCreateSchema = z.object({
  countrycodePolpal: z.string().min(1),
  isCountry: z.boolean(),
  iso2c: z.string().optional().nullable(),
  iso3c: z.string().optional().nullable(),
  iso3n: z.number().int().optional().nullable(),
  countryname: z.string().min(1),
  region: z.string().optional().nullable(),
  regionCode: z.number().int().optional().nullable(),
  regionSub: z.string().optional().nullable(),
  regionSubCode: z.number().int().optional().nullable(),
  regionIntermediate: z.string().optional().nullable(),
  regionIntermediateCode: z.number().int().optional().nullable(),
  wikidataId: z.string().optional().nullable(),
});

export const CountryUpdateSchema = CountryCreateSchema.partial();

