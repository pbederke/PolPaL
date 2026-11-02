# DATA INTEGRATION R CODE FOR POLPAL 
# VERSION 1.2
# Contrast to V1.0: Section AGGREGATE ADDITIONAL INFORMATION added
# Contrast to v1.1: Revision of entryMonth and entryDay in section FINALIZE OUTPUT DATA
# As of 2026-02-04

## NOTES - PLEASE READ CAREFULLY ####
# Note that starting from the section FINALIZE OUTPUT DATA, you should be able to run the code
# without adjusting anything but the date variables (adjust to format used in external data)
# and the countrycodePolpal variable (adjust to countrycodes used in the external data).
# For every element, we have specified on the left-hand side whether something needs to be changed, 
# and if so, how it should be changed.
# Still, for some external data, it might still be necessary to adjust more lines of code.
# In this case, please use comments and explain what you did why for documentation purposes.
# Some data contains more than one variable with party names and party IDs.
# In this case, please use the Section CONTINUE PREPRATION OF DATASET IF NECESSARY, 
# use comments to explain what you did and why, and use entityName for the party name variable,
# and entityId for the party ID variables. This should allow you to run the script without 
# additional changes needed to the FINALIZE OUTPUT DATA section.
# Please use the CONSISTENCY CHECKS below to get a first insight whether every output variable
# is saved in the format necessary to upload it to PolPaL.

## LOAD PACKAGES ####
library(tidyverse)                                                              # DONT CHANGE ANY OF THIS
library(readr)
library(countrycode)
library(haven)

## IMPORT EXTERNAL DATA ####
fileVector <- "poppa_integrated.dta"                                            # ADJUST
dateDownloadedVector <- "2026-04-21"                                            # ADJUST; Format: [YYYY-MM-DD]
raw_data <- read_stata(file = fileVector)                                         # ADJUST

## DEFINE VARIABLES ####
versionKeyVector <- "poppa-2023-3"                                              # ALL LOWER CASE; NO PUNCTUATION BUT "_" IF NECESSARY
entryCountryVarVector <- "country_short"                                        # USE NA IF NOT EXISTENT
entryYearVarVector <- "wave"                                                    # USE NA IF NOT EXISTENT
entryMonthVarVector <- NA                                                       # USE NA IF NOT EXISTENT
entryDayVarVector <- NA                                                         # USE NA IF NOT EXISTENT
entryEntityIdVarVector <- c("poppa_id")                                         # OBLIGATORY, USE PARTY NAME AS ID IF NOT EXISTENT
entryEntityNameShortVarVector <- "party_short"                                  # USE NA IF NOT EXISTENT
entryEntityNameEnglishVarVector <-  "party_name_english"                        # USE NA IF NOT EXISTENT
entryEntityNameVarVector <-  c("party_name_original")                           # USE NA IF NOT EXISTENT
additionalInformationVector <- c("wave")                                        # USE NULL IF NOT APPLICABLE
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
  additionalInformationVector
) |> 
  discard(is.na)

## SUBSET AND PREPARE DATA ####
subset_data <-                                                                  # DONT CHANGE ANYTHING HERE
  raw_data |>
  select(all_of(vars_to_select)) |>
  unique()

## CONTINUE PREPARATION OF DATASET IF NECESSARY ####
# In case several variables contain party IDs and/or party names, transform the external data from long to wide:
# Use "entityId" as name for variable with party IDs.
# Use "entityName" as name for variable with party names.

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
    entryEntityIdVar = if (is.na(entityIdVarVector)[[1]]) {                     # DONT CHANGE
      entryEntityIdVarVector } else {                                           # DONT CHANGE
        entityIdVar},                                                           # DONT CHANGE
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
    entryEntityNameVar = if (is.na(entityNameVarVector)[[1]]) {
      entryEntityNameVarVector } else {
        entityNameVar},                                                         # DONT CHANGE
    entryEntityName = if (is.na(entryEntityNameVarVector)[[1]]) {               # DONT CHANGE
      NA } else {
        if (is.na(entityNameVector)) {                                          # DONT CHANGE
          .data[[entryEntityNameVarVector]] } else {                            # DONT CHANGE
            entityName }},                                                      # DONT CHANGE
    ## PolPaL COUNTRYCODE
    countrycodePolpal = 
      if (is.na(entryCountryVarVector)) {                                       # DONT CHANGE
        "[COUNTRYCODES]"} else {                                                # ADJUST IF NO entryCountryVar IN DATA
        countrycode(
          sourcevar = .data[[entryCountryVarVector]],                           # DONT CHANGE
          origin = "iso3c",                                           # ADJUST
          destination = "iso3c"
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
  mutate(
    entryYear = case_when(
      entryYear == 1 ~ 2018,
      entryYear == 2 ~ 2023,
      T ~ NA
    ),
    entryYearVar = NA
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
