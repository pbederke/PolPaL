export { 
  ChangeActionEnum,
  EntityTypesEnum, 
  EntityChangesEnum,
  LanguageCodeEnum,
  ReferenceTypeEnum,
  ReportTicketStatus,
  RoleEnum,
  TableNamesEnum,
  ValidationEnum,
  TableNameAboutEnum
} from '@prisma/client';

export const GenderEnum = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
  UNKNOWN: 'UNKNOWN',
} as const;
export type GenderEnum = typeof GenderEnum[keyof typeof GenderEnum];

// REGIONS
export const RegionEnum = [
  "Africa",
  "Americas",
  "Asia",
  "Europe",
  "Oceania",
] as const;

export type RegionEnumType = (typeof RegionEnum)[number];
export type RegionEnum = keyof typeof RegionEnum;

export const RegionSubEnum = [
  "Northern Africa",
  "Sub-Saharan Africa",
  "Latin America and the Caribbean",
  "Northern America",
  "Central Asia",
  "Eastern Asia",
  "Southern Asia",
  "South-eastern Asia",
  "Western Asia",
  "Eastern Europe",
  "Northern Europe",
  "Southern Europe",
  "Western Europe",
  "Australia and New Zealand",
  "Melanesia",
  "Micronesia",
  "Polynesia",
] as const;

export type RegionSubEnumType = (typeof RegionSubEnum)[number];
export type RegionSubEnum = keyof typeof RegionSubEnum;

export const RegionIntermediateEnum = [
  "Eastern Africa",
  "Middle Africa",
  "Southern Africa",
  "Western Africa",
  "Caribbean",
  "Central America",
  "South America",
] as const;

export type RegionIntermediateEnumType = (typeof RegionIntermediateEnum)[number];
export type RegionIntermediateEnum = keyof typeof RegionIntermediateEnum;
