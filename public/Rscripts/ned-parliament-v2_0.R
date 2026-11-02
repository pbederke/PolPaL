# DATA INTEGRATION R CODE FOR POLPAL 
# VERSION 1.2
# Contrast to V1.0: Section AGGREGATE ADDITIONAL INFORMATION added
# Contrast to v1.1: Revision of entryMonth and entryDay in section FINALIZE OUTPUT DATA

## LOAD PACKAGES ####
library(tidyverse)                                                              # DONT CHANGE ANY OF THIS
library(readr)
library(countrycode)
library(haven)

## IMPORT EXTERNAL DATA ####
fileVector <- "parliamentary_elections_v2.dta"                                  # ADJUST
dateDownloadedVector <- "2026-08-04"                                            # ADJUST
raw_data <- read_stata(file = fileVector)                                       # ADJUST

## DEFINE VARIABLES ####
versionKeyVector <- "ned-parliament-v2_0"                                       # ALL LOWER CASE; NO PUNCTUATION BUT "_" IF NECESSARY
entryCountryVarVector <- "country"                                              # USE NA IF NOT EXISTENT
entryYearVarVector <- "year"                                                    # USE NA IF NOT EXISTENT
entryMonthVarVector <- "month"                                                  # USE NA IF NOT EXISTENT
entryDayVarVector <- NA                                                         # USE NA IF NOT EXISTENT
entryEntityIdVarVector <- grep("^party_", names(raw_data), value = TRUE)        # OBLIGATORY, USE PARTY NAME AS ID IF NOT EXISTENT
entryEntityNameShortVarVector <- NA                                             # USE NA IF NOT EXISTENT
entryEntityNameEnglishVarVector <-  NA                                          # USE NA IF NOT EXISTENT
entryEntityNameVarVector <- grep("^party_", names(raw_data), value = TRUE)      # USE NA IF NOT EXISTENT
noteVector <- NA                                                                # USE NA IF NOT APPLICABLE

# for external data with more than one variable containing party IDs:
entityIdVector <- ifelse(length(entryEntityIdVarVector) > 1, "entityId", NA)    # DONT CHANGE
if (length(entryEntityIdVarVector)>1)  {                                        # DONT CHANGE
  entityIdVarVector <- entryEntityIdVarVector                                   # DONT CHANGE
} else {                                                                        # DONT CHANGE
  entityIdVarVector <- NA                                                       # DONT CHANGE
}                                                                               # DONT CHANGE
# for external data with more than one variable containing party names:
entityNameVector <- ifelse(length(entryEntityNameVarVector)>1, "entityName", NA)# DONT CHANGE
if (length(entryEntityNameVarVector)>1) {                                       # DONT CHANGE
  entityNameVarVector <- entryEntityNameVarVector                               # DONT CHANGE
} else {                                                                        # DONT CHANGE
  entityNameVarVector <- NA                                                     # DONT CHANGE
}                                                                               # DONT CHANGE

## VARIABLES TO REDUCE DATASET ####
vars_to_select <- c(                                                            # DONT CHANGE ANY OF THIS
  entryCountryVarVector,
  entryYearVarVector,
  entryMonthVarVector,
  entryDayVarVector,
  entryEntityIdVarVector,
  entryEntityNameShortVarVector,
  entryEntityNameEnglishVarVector,
  entryEntityNameVarVector,
  grep("^seats_|^seat_share_", names(raw_data), value = TRUE)  # zusätzliche Infos mit auswählen
) |> 
  discard(is.na) |>
  unique()  # verhindert Duplikate wenn entryEntityIdVarVector == entryEntityNameVarVector

## SUBSET AND PREPARE DATA ####
subset_data <-                                                                  # DONT CHANGE ANYTHING HERE
  raw_data |>
  select(all_of(vars_to_select)) |>
  unique()

## CONTINUE PREPARATION OF DATASET IF NECESSARY ####
# Der Datensatz liegt im Wide-Format vor: pro Wahl eine Zeile, mit Spalten party_1..party_N,
# seats_1..seats_N, seat_share_1..seat_share_N.
# Transformation ins Long-Format: eine Zeile pro Partei pro Wahl.
# "party" wird als entityId UND entityName verwendet (kein separater ID-Code vorhanden).

subset_data <- raw_data |>
  pivot_longer(
    cols = matches("^(party|seats|seat_share)_\\d+$"),
    names_to = c(".value", "party_position"),
    names_pattern = "(party|seats|seat_share)_(\\d+)"
  ) |>
  filter(!is.na(party) & party != "") |>
  # FIX: party kann nicht zweimal gleichzeitig umbenannt werden.
  # Erst umbenennen, dann entityName als Kopie anlegen.
  rename(entityId = party) |>
  mutate(entityName = entityId)

# FIX: Nach dem pivot_longer heißen die Spalten jetzt "entityId", "entityName",
# "seats", "seat_share" – die Vektoren müssen auf die neuen Namen zeigen.
entryEntityIdVarVector   <- "entityId"
entryEntityNameVarVector <- "entityName"
additionalInformationVector <- c("seats", "seat_share")

# FIX: Abhängige Vektoren neu berechnen, da sich entryEntityIdVarVector geändert hat.
# Jetzt ist length() == 1, also werden entityIdVector/entityNameVector korrekt NA.
entityIdVector    <- ifelse(length(entryEntityIdVarVector) > 1, "entityId", NA)
entityIdVarVector <- if (length(entryEntityIdVarVector) > 1) entryEntityIdVarVector else NA
entityNameVector    <- ifelse(length(entryEntityNameVarVector) > 1, "entityName", NA)
entityNameVarVector <- if (length(entryEntityNameVarVector) > 1) entryEntityNameVarVector else NA

## FINALIZE OUTPUT DATA ####
output_data <- 
  subset_data |> 
  mutate(
    ## FILE INFORMATION
    usedFile = fileVector,                                                      # DONT CHANGE
    dateDownloaded = dateDownloadedVector,                                      # DONT CHANGE
    ## KEYS
    projectKey = str_extract(versionKeyVector, "^[^-]+"),                       # DONT CHANGE
    datasetKey = str_extract(versionKeyVector, "^[^-]+-[^-]+"),                 # DONT CHANGE
    versionKey = versionKeyVector,                                              # DONT CHANGE
    ## COUNTRY
    entryCountryVar = entryCountryVarVector,                                    # DONT CHANGE
    entryCountry = if (is.na(entryCountryVarVector)[[1]]) {                     # DONT CHANGE
      NA } else {                                                               # DONT CHANGE
        .data[[entryCountryVarVector]]},                                        # DONT CHANGE
    ## YEAR
    entryYearVar = entryYearVarVector,                                          # DONT CHANGE
    entryYear = if (is.na(entryYearVarVector)) {                                # DONT CHANGE
      NA } else {                                                               # DONT CHANGE
        .data[[entryYearVarVector]] |> as.numeric()},                           # ADJUST
    ## MONTH
    entryMonthVar = entryMonthVarVector,                                        # DONT CHANGE
    entryMonth = if (is.na(entryMonthVarVector)) {                              # DONT CHANGE
      NA } else {                                                               # DONT CHANGE
        .data[[entryMonthVarVector]] |> as.numeric()},                          # ADJUST
    ## DAY
    entryDayVar = entryDayVarVector,                                            # DONT CHANGE
    entryDay = if (is.na(entryDayVarVector)) {                                  # DONT CHANGE
      NA } else {                                                               # DONT CHANGE
        .data[[entryDayVarVector]] |> as.numeric()},                            # ADJUST
    ## ENTITY ID
    # FIX: war "entityIdVar" (existiert nicht) -> jetzt korrekt "entityIdVarVector"
    entryEntityIdVar = if (is.na(entityIdVarVector)[[1]]) {                     # DONT CHANGE
      entryEntityIdVarVector } else {                                           # DONT CHANGE
        entityIdVarVector},                                                     # FIX: war entityIdVar
    entryEntityId = if (is.na(entityIdVector)[[1]]) {                           # DONT CHANGE
      .data[[entryEntityIdVarVector]] } else {                                  # DONT CHANGE
        .data[[entityIdVector]]},                                               # DONT CHANGE
    ## ENTITY NAME SHORT
    entryEntityNameShortVar = entryEntityNameShortVarVector,                    # DONT CHANGE
    entryEntityNameShort = if (is.na(entryEntityNameShortVarVector)) {          # DONT CHANGE
      NA } else {                                                               # DONT CHANGE
        .data[[entryEntityNameShortVarVector]]},                                # DONT CHANGE
    ## ENTITY NAME ENGLISH
    entryEntityNameEnglishVar = entryEntityNameEnglishVarVector,                # DONT CHANGE
    entryEntityNameEnglish = if (is.na(entryEntityNameEnglishVarVector)) {      # DONT CHANGE
      NA } else {                                                               # DONT CHANGE
        .data[[entryEntityNameEnglishVarVector]]},                              # DONT CHANGE
    ## ENTITY NAME
    # FIX: war "entityNameVar" (existiert nicht) -> jetzt korrekt "entityNameVarVector"
    entryEntityNameVar = if (is.na(entityNameVarVector)[[1]]) {
      entryEntityNameVarVector } else {
        entityNameVarVector},                                                   # FIX: war entityNameVar
    entryEntityName = if (is.na(entryEntityNameVarVector)[[1]]) {               # DONT CHANGE
      NA } else {
        if (is.na(entityNameVector)) {                                          # DONT CHANGE
          .data[[entryEntityNameVarVector]] } else {                            # DONT CHANGE
            .data[[entityNameVector]] }},                                       # DONT CHANGE
    ## PolPaL COUNTRYCODE
    countrycodePolpal = 
      if (is.na(entryCountryVarVector)) {                                       # DONT CHANGE
        "[COUNTRYCODES]"} else {                                                # ADJUST IF NO entryCountryVar IN DATA
        countrycode(
          sourcevar = .data[[entryCountryVarVector]],                           # DONT CHANGE
          origin = "country.name.en",                                           # ADJUST
          destination = "iso3c",                                                # DONT CHANGE
          custom_match = 
            c(                                                                  # DONT CHANGE
              # Hier ggf. Ländernamen eintragen die countrycode() nicht erkennt:
              # "Kosovo" = "XKX",
            )
        )
      } |>
      str_trim(),                                                               # DONT CHANGE
    ## uniqueObservationId
    uniqueObservationId = paste(                                                # DONT CHANGE ANYTHING HERE
      versionKey, 
      entryCountry, 
      paste(entryYear, entryMonth, entryDay, sep = "-"),
      entryEntityIdVar,
      entryEntityId,
      sep = "--"
    ),
    ## NOTE/COMMENT
    note = noteVector                                                           # DONT CHANGE
  ) |> 
  select(                                                                       # DONT CHANGE ANYTHING HERE
    usedFile, dateDownloaded,
    projectKey, datasetKey, versionKey,
    entryCountryVar, entryCountry, 
    entryYearVar, entryYear,
    entryMonthVar, entryMonth,
    entryDayVar, entryDay,
    entryEntityIdVar, entryEntityId, 
    entryEntityNameShortVar, entryEntityNameShort,
    entryEntityNameEnglishVar, entryEntityNameEnglish, 
    entryEntityNameVar, entryEntityName, 
    countrycodePolpal, uniqueObservationId, 
    note,
    all_of(additionalInformationVector)
  ) |> 
  ## FILTER ALL OBSERVATIONS WITHOUT ENTITY ID
  filter(!is.na(entryEntityId) & entryEntityId != "") |>                        # DONT CHANGE
  ## ENSURE NO DUPLICATE ROWS
  distinct()                                                                    # DONT CHANGE

# AGGREGATE ADDITIONAL INFORMATION ####
# Test if there are duplicate observation IDs,
# but no duplicates if both observation ID and additional infos are taken into account:

if (any(duplicated(output_data$uniqueObservationId)) & 
    (any(duplicated(output_data[,c("uniqueObservationId",additionalInformationVector)]))==FALSE )) {
  
  output_data <- output_data |> 
    group_by(uniqueObservationId) |>
    mutate(across(all_of(additionalInformationVector), ~  paste0(as.character(.x), collapse="||"))) |>
    distinct()
  print("Additional information aggregated")
  
} else {
  
  if (any(duplicated(output_data$uniqueObservationId))) {
    print("WARNING: output_data contains duplicates that are not related to additional information! Please check!")
  }
  
}

# CONSISTENCY CHECKS ####
output_data$usedFile |> is.na() |> any()                                        # DONT CHANGE ANYTHING HERE
output_data$dateDownloaded |> is.na() |> any()
output_data$projectKey |> is.na() |> any()
output_data$datasetKey |> is.na() |> any()
output_data$versionKey |> is.na() |> any()
output_data$entryEntityIdVar |> is.na() |> any()
output_data$entryEntityId |> is.na() |> any()
output_data$countrycodePolpal |> is.na() |> any()
output_data$countrycodePolpal |> unique()
output_data$uniqueObservationId |> is.na() |> any()
output_data$uniqueObservationId |> duplicated() |> any()
unique(output_data$uniqueObservationId[duplicated(output_data$uniqueObservationId)])

## EXPORT CSV FOR IMPORT ON PolPaL WEBSITE ####
write_excel_csv(x = output_data, file = paste0(versionKeyVector,".csv"), na = "") # DONT CHANGE
getwd()
