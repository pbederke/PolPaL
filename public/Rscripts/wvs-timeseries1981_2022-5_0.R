# DATA INTEGRATION R CODE FOR POLPAL 
# VERSION 1.0
# As of 2025-12-15

## NOTES ####
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
fileVector <- "WVS_Time_Series_1981-2022_stata_v5_0.dta"                          # ADJUST
dateDownloadedVector <- "2026-08-16"                                            # ADJUST
raw_data <- read_dta(fileVector, encoding = "utf-8")                                                 # ADJUST

## DEFINE VARIABLES ####
versionKeyVector <- "wvs-timeseries1981_2022-5_0"                               # ALL LOWER CASE; NO PUNCTUATION
entryCountryVarVector <- "COUNTRY_ALPHA"                                        # USE NA IF NOT EXISTENT
entryYearVarVector <- "S022"                                                    # USE NA IF NOT EXISTENT
entryMonthVarVector <- "S022"                                                   # USE NA IF NOT EXISTENT
entryDayVarVector <- NA                                                         # USE NA IF NOT EXISTENT
entryEntityIdVarVector <- c("E256",
                            "E179WVS",
                            "E179_WVS7LOC",
                            "E180WVS", 
                            "E182")                                             # OBLIGATORY, USE PARTY NAME IF NOT EXISTENT                       
entityIdVector <- ifelse(length(entryEntityIdVarVector) > 1, "entityId", NA)      # DONT CHANGE; Use entityId for variable with party IDs in case you must transfer the data from long to wide due to several variables containing party IDs
entryEntityNameShortVarVector <- NA                                             # USE NA IF NOT EXISTENT
entryEntityNameEnglishVarVector <-  NA                                          # USE NA IF NOT EXISTENT
entryEntityNameVarVector <-  c("E256", 
                               "E179WVS",
                               "E179_WVS7LOC",
                               "E180WVS", 
                               "E182")                                          # USE NA IF NOT EXISTENT
entityNameVector <- ifelse(length(entryEntityNameVarVector)>1, "entityName", NA)  # DONT CHANGE; Use entityName for variable with party names in case you must transfer the data from long to wide due to several variables containing party names
additionalInformationVector <- NULL                                             # USE NULL IF NOT EXISTENT
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
vars_to_select <- c(                                                            # DONT CHANGE ANYTHING HERE
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

# EXTRACT PARTY NAMES
# List of relevant variables with information on parties:
# E256         General party preference
# E179WVS      Which party would you vote for? first choice
# E179_WVS7LOC Which party would you vote for if there were a national election tomorrow (local names)
# E180WVS      Which party would you vote for? second choice
# E182         Party that would never vote (unclear, what this means, because the question wording is apparently: 
# If there were a [COUNTRY] election tomorrow, for which party on this list would you vote? Just call out the number on this card.)

# Names are hidden in value labels, so we need to extract them, too:
E256_parties <- stack(attr(subset_data$E256, "labels"))
E256_parties$variable <- "E256"
E179WVS_parties <- stack(attr(subset_data$E179WVS, "labels"))
E179WVS_parties$variable <- "E179WVS"
E179_WVS7LOC_parties <- stack(attr(subset_data$E179_WVS7LOC, "labels"))
E179_WVS7LOC_parties$variable <- "E179_WVS7LOC"
E180WVS_parties <- stack(attr(subset_data$E180WVS, "labels"))
E180WVS_parties$variable <- "E180WVS"
E182_parties <- stack(attr(subset_data$E182, "labels"))
E182_parties$variable <- "E182"

# This becomes the "dictionary" for saving the information on party names together with the respective WVS party IDs
parties <- rbind(E256_parties, 
                 E179WVS_parties,
                 E179_WVS7LOC_parties,
                 E180WVS_parties, 
                 E182_parties) |> 
  unique() |>
  rename(entityId = values,
         entityName = ind,
         entityIdVar = variable) |>
  unique()

# TRANSFORM DATA TO LONG INCLUDING PARTY NAMES AND IDS
subset_long <- subset_data |> 
  zap_labels() |> 
  zap_label() |>
  pivot_longer(cols=c(E256:E182),
               values_to = "entityId",
               names_to = "entityIdVar") |>
  left_join(parties, by=c("entityIdVar","entityId")) |>
  mutate(entityNameVar = as.character(entityIdVar),
         entityName = as.character(entityName)) |>
  unique()

## FINALIZE OUTPUT DATA ####
output_data <-                                                                  # DONT CHANGE
  subset_long |>                                                                # DONT CHANGE
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
        .data[[entryYearVarVector]] |> str_sub(1, 4) |> as.numeric()},          # ADJUST
    ## MONTH
    entryMonthVar = entryMonthVarVector,                                        # DONT CHANGE
    entryMonth = if (is.na(entryMonthVarVector)) {                              # DONT CHANGE
      NA } else {                                                               # DONT CHANGE
        .data[[entryYearVarVector]] |> str_sub(6, 7) |> as.numeric()},          # ADJUST
    ## DAY
    entryDayVar = entryDayVarVector,                                            # DONT CHANGE
    entryDay = if (is.na(entryDayVarVector)) {                                  # DONT CHANGE
      NA } else {                                                               # DONT CHANGE
        .data[[entryYearVarVector]] |> str_sub(9, 10) |> as.numeric()},         # ADJUST
    ## ENTITY ID
    entryEntityIdVar = if (is.na(entityIdVarVector)[[1]]) {                      # DONT CHANGE
      entryEntityIdVarVector } else {                                           # DONT CHANGE
        entityIdVar},                                                            # DONT CHANGE
    entryEntityId = if (is.na(entityIdVector)[[1]]) {                            # DONT CHANGE
      .data[[entryEntityIdVarVector]] } else {                                  # DONT CHANGE
        .data[[entityIdVector]]},                                                # DONT CHANGE
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
        entityNameVar},                                                          # DONT CHANGE
    entryEntityName = if (is.na(entryEntityNameVarVector)[[1]]) {               # DONT CHANGE
      NA } else {
        if (is.na(entityNameVector)) {                                           # DONT CHANGE
          .data[[entryEntityNameVarVector]] } else {                            # DONT CHANGE
            entityName }},                                                       # DONT CHANGE
    ## PolPaL COUNTRYCODE
    countrycodePolpal =                                                         # DONT CHANGE
      if (is.na(entryCountryVarVector)) {                                       # DONT CHANGE
        "[COUNTRYCODES]"} else {                                                # ADJUST IF NO entryCountryVar IN DATA
          countrycode(
            sourcevar = .data[[entryCountryVarVector]],                         # DONT CHANGE
            origin = "iso3c",                                                   # ADJUST
            destination = "iso3c",                                              # DONT CHANGE
            custom_match = 
              c(                                                                # DONT CHANGE
                "NIR" = "GBR"                                                   # ADJUST IF NON-MATCH
              )
          )} |>
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
  distinct() |>                                                                   # DONT CHANGE
  mutate(entryMonth = if_else(entryMonth == 0, NA_integer_, entryMonth))
  
# CONSISTENCY CHECKS ####
output_data$usedFile |> is.na() |> any()                                        # DONT CHANGE ANYTHING HERE
output_data$dateDownloaded |> is.na() |> any()
output_data$projectKey |> is.na() |> any()
output_data$datasetKey |> is.na() |> any()
output_data$versionKey |> is.na() |> any()
output_data$entryEntityIdVar |> is.na() |> any()
output_data$entryEntityId |> is.na() |> any()
output_data$countrycodePolpal |> is.na() |> any()
output_data$uniqueObservationId |> is.na() |> any()
output_data$uniqueObservationId |> duplicated() |> any()
unique(output_data$uniqueObservationId[duplicated(output_data$uniqueObservationId)])

## EXPORT CSV FOR IMPORT ON PolPaL WEBSITE ####
write_excel_csv(x = output_data, file = paste0(versionKeyVector,".csv"), na = "") # DONT CHANGE

