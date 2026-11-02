import { z } from "zod";

export const importEntriesSingleSchema = z.object({
    body: z.object({
        usedFile: z.string({ message: "Used file is required" }),
        dateDownloaded: z.string({ message: "Date downloaded is required" }),
        projectKey: z.string({ message: "Project key is required" }),
        datasetKey: z.string({ message: "Dataset key is required" }),
        versionKey: z.string({ message: "Version key is required" }),
        entryCountryVar: z.string().optional(),
        entryCountry: z.string().optional(),
        entryYearVar: z.string().optional(),
        entryYear: z.number().optional(),
        entryMonthVar: z.string().optional(),
        entryMonth: z.number().optional(),
        entryDayVar: z.string().optional(),
        entryDay: z.number().optional(),
        entryEntityIdVar: z.string({ message: "Entry party ID variable is required" }),
        entryEntityId: z.string({ message: "Entry party ID is required" }),
        entryEntityNameShortVar: z.string().optional(),
        entryEntityNameShort: z.string().optional(),
        entryEntityNameEnglishVar: z.string().optional(),
        entryEntityNameEnglish: z.string().optional(),
        entryEntityNameVar: z.string().optional(),
        entryEntityName: z.string().optional(),
        additionalInformation: z.string().optional(),
        countrycodePolpal: z.string({ message: "Country code is required" }),
        uniqueObservationId: z.string({ message: "Unique observation ID is required" }),
        note: z.string().optional(),
    }),
});

export const ImportEntriesSingleSchema = z.array(importEntriesSingleSchema.shape.body);
export type ImportEntriesSingleInput = z.infer<typeof ImportEntriesSingleSchema>;

export const syncEntriesBodySchema = z.object({
  toCreate: z.array(importEntriesSingleSchema.shape.body),
  toUpdate: z.array(importEntriesSingleSchema.shape.body),
  toDelete: z.array(z.string().min(1)),
});
export type SyncEntriesBodyInput = z.infer<typeof syncEntriesBodySchema>;