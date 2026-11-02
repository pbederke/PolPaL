# =============================================================================
# POLPAL DATA INTEGRATION SCRIPT
# Version 1.3 | Last updated: 2026-05-06
# Changes vs v1.0: Section AGGREGATE ADDITIONAL INFORMATION added
# Changes vs v1.1: Revision of entryMonth and entryDay in FINALIZE OUTPUT DATA
# Changes vs v1.2: Add more comments and simplify code
#                  Exclude noteVector because this is now integrated on the website
#                  Add notes section 10 in case someone has to keep notes for a specific observation ID.
# Authors: Paul Bederke, Lea Kaftan, Jakob Mansius << ADJUST >> to name of the person who adjusted the script to the external data
# =============================================================================
#
# HOW TO USE THIS TEMPLATE:
#   (1) Fill in the LOAD DATA block (Section 2) and the CONFIGURATION block
#       (Section 3). Only change lines marked with << ADJUST >>.
#   (2) After this block, additional adjustments may still be required:
#       - Section 6:  If your dataset has multiple party ID / name variables,
#                     always pivot to long format here, and replace "subset_data"
#                     with your reshaped object at the top of Section 7.
#       - Section 7c: Adjust date parsing if as.numeric() is not sufficient.
#       - Section 7f: Adjust the origin format and add custom country string
#                     matches that countrycode() does not recognise.
#   (3) Run the CONSISTENCY CHECKS (Section 9) before exporting.
#
# =============================================================================


# === 1. PACKAGES =============================================================

library(tidyverse)
library(readr)
library(countrycode)
library(haven)
library(tidyselect)


# === 2. LOAD DATA ============================================================

fileVector           <- "ESS9e03_3.dta"      # << ADJUST >> filename as downloaded
dateDownloadedVector <- "2026-02-04"         # << ADJUST >> format: YYYY-MM-DD
raw_data <- read_dta(file = fileVector)      # << ADJUST >> e.g. read_dta(), read_xlsx()


# === 3. CONFIGURATION ========================================================

# -- Dataset key --------------------------------------------------------------
versionKeyVector <- "ess-9-3_3"        # << ADJUST >> e.g. "ess-1-6_7"; as registered in PolPaL!

# -- Variable names in the raw data (use NA if variable does not exist) -------
entryCountryVarVector         <- "cntry"     # << ADJUST >>
entryYearVarVector            <- "inwyys"    # << ADJUST >>
entryMonthVarVector           <- "inwmms"    # << ADJUST >>
entryDayVarVector             <- NA          # << ADJUST >>

# Obligatory. If no ID variable exists, use the entity name variable instead.
entryEntityIdVarVector        <- vars_select(                # << ADJUST >> e.g. "party_id" or c("party_id", "ep_group")
                                   names(raw_data),
                                   starts_with("prtv"),
                                   starts_with("prtc"),
                                   starts_with("prtm")
                                 )

# Use NA if variable does not exist in your data.
entryEntityNameShortVarVector   <- NA  # << ADJUST >>
entryEntityNameEnglishVarVector <- NA  # << ADJUST >>

# Party name variable(s) in your data.
entryEntityNameVarVector <- vars_select(               # << ADJUST >> e.g. "party_name" or c("party_name", "ep_group")
                              names(raw_data),
                              starts_with("prtv"),
                              starts_with("prtc"),
                              starts_with("prtm")
                            )

# Additional variables to carry through (e.g. vote share, seats).
# Set to NULL if none. Be cautious not to include too many.
additionalInformationVector <- NULL                      # << ADJUST >> set to NULL if not applicable


# === 4. INTERNAL SETUP =======================================================
# No changes needed in this section.

projectKeyVector <- str_extract(versionKeyVector, "^[^-]+")
datasetKeyVector <- str_extract(versionKeyVector, "^[^-]+-[^-]+")

# For datasets with multiple party ID / name variables, the data will be pivoted
# in Section 6. These vectors control whether the unified "entityId" /
# "entityName" columns are used downstream.
# Example: If the external data only contains one party ID variable, entityIdVector should be NA.

entityIdVector   <- ifelse(length(entryEntityIdVarVector) > 1, "entityId", NA)
if (length(entryEntityIdVarVector) > 1) {
  entityIdVarVector <- entryEntityIdVarVector
} else { entityIdVarVector <- NA }

entityNameVector <- ifelse(length(entryEntityNameVarVector) > 1, "entityName", NA)
if (length(entryEntityNameVarVector) > 1) {
  entityNameVarVector <- entryEntityNameVarVector
} else { entityNameVarVector <- NA }


# === 5. SUBSET DATA ==========================================================
# Keeps only the columns that are necessary; drops duplicate rows.

vars_to_select <- c(
  entryCountryVarVector,
  entryYearVarVector,
  entryMonthVarVector,
  entryDayVarVector,
  entryEntityIdVarVector,
  entryEntityNameShortVarVector,
  entryEntityNameEnglishVarVector,
  entryEntityNameVarVector,
  additionalInformationVector
) |> discard(is.na)

subset_data <- raw_data |>
  select(all_of(vars_to_select)) |>
  unique()


# === 6. CONTINUE PREPARATION IF NECESSARY ====================================   
# If multiple ID or name variables exist, always pivot to long format here.
# Example: if multiple ID variables exist, entityIdVector will not(!) be NA.
# The specifics (which columns, how to handle names) depend on your dataset.
#
# Naming conventions must be followed for Section 7 to run unchanged:
#  e.g. "entityId"    — unified column containing party ID values
#  e.g. "entityIdVar" — column containing the source variable name for each ID
#
# Document every change with a comment explaining what you did and why.
# Ask for help if you feel you could need it.

# List of relevant variables with information on parties:
# prtv*        Which party did you vote for in that election?
# prtc*        Which particular political party you feel closer to than all the other parties?
# prtm*        Of which political party are you a member?

parties <- 
  purrr::map_dfr(
    entryEntityIdVarVector,
    \(v) {
      out <- stack(attr(subset_data[[v]], "labels"))
      out$variable <- v
      out
    }
  ) |>
  rename(entityId = values,
         entityName = ind,
         entityIdVar = variable) |>
  unique()

# TRANSFORM DATA TO LONG INCLUDING PARTY NAMES AND IDS
subset_long <- subset_data |> 
  zap_labels() |> 
  zap_label() |>
  pivot_longer(cols=c(prtvtcat:prtcldsk),
               values_to = "entityId",
               names_to = "entityIdVar") |>
  left_join(parties, by=c("entityIdVar","entityId")) |>
  mutate(entityNameVar = as.character(entityIdVar),
         entityName = as.character(entityName)) |>
  unique()

# === 7. BUILD OUTPUT DATA ====================================================

output_data <-
  subset_long |> # << ADJUST, if applicable >> replace with your new subset object from Section 6 if applicable
  
  # -- 7a. File info & keys ---------------------------------------------------
mutate(
  usedFile       = fileVector,
  dateDownloaded = dateDownloadedVector,
  projectKey     = projectKeyVector,
  datasetKey     = datasetKeyVector,
  versionKey     = versionKeyVector
) |>
  
  # -- 7b. Country ------------------------------------------------------------
mutate(
  entryCountryVar = entryCountryVarVector,
  entryCountry    = if (is.na(entryCountryVarVector)[[1]]) NA else .data[[entryCountryVarVector]]
) |>
  
  # -- 7c. Temporal variables -------------------------------------------------
# << ADJUST >> as.numeric() assumes year/month/day are stored as plain numbers.
# If stored as a date string, replace with the appropriate parsing function.
mutate(
  entryYearVar  = entryYearVarVector,
  entryYear     = if (is.na(entryYearVarVector))  NA else as.numeric(.data[[entryYearVarVector]]),  # << ADJUST >>
  entryMonthVar = entryMonthVarVector,
  entryMonth    = if (is.na(entryMonthVarVector)) NA else as.numeric(.data[[entryMonthVarVector]]), # << ADJUST >>
  entryDayVar   = entryDayVarVector,
  entryDay      = if (is.na(entryDayVarVector))   NA else as.numeric(.data[[entryDayVarVector]])    # << ADJUST >>
) |>
  
  # -- 7d. Entity ID ----------------------------------------------------------
mutate(
  entryEntityIdVar = if (is.na(entityIdVarVector)[[1]]) entryEntityIdVarVector else entityIdVar,
  entryEntityId    = if (is.na(entityIdVector)[[1]])    .data[[entryEntityIdVarVector]] else .data[[entityIdVector]]
) |>
  
  # -- 7e. Entity names -------------------------------------------------------
mutate(
  entryEntityNameShortVar   = entryEntityNameShortVarVector,
  entryEntityNameShort      = if (is.na(entryEntityNameShortVarVector)) NA else .data[[entryEntityNameShortVarVector]],
  entryEntityNameEnglishVar = entryEntityNameEnglishVarVector,
  entryEntityNameEnglish    = if (is.na(entryEntityNameEnglishVarVector)) NA else .data[[entryEntityNameEnglishVarVector]],
  entryEntityNameVar        = if (is.na(entityNameVarVector)[[1]]) entryEntityNameVarVector else entityNameVar,
  entryEntityName           = if (is.na(entryEntityNameVarVector)[[1]]) {
    NA
  } else if (is.na(entityNameVector)) {
    .data[[entryEntityNameVarVector]]
  } else {
    entityName
  }
) |>
  
  # -- 7f. PolPaL country code ------------------------------------------------
# << ADJUST >> origin if country names in your data are not in English.
# << ADJUST >> remove custom_match or add any country strings your data uses that
#              countrycode() does not recognise, mapped to their PolPaL countrycode.
mutate(
  countrycodePolpal = {
    if (is.na(entryCountryVarVector)) {
      "[PolPaL countrycode]"                        # << ADJUST >> if no entryCountryVar in data use PolPaL countrycode
    } else {
      countrycode(
        sourcevar    = .data[[entryCountryVarVector]],
        origin       = "iso2c",           # << ADJUST >> if country names in your data are not in English
        destination  = "iso3c",
        custom_match = c(
          "XK" = "XKX" # << ADJUST >>
        )
      )
    }
  } |> str_trim()
) |>
  
  # -- 7g. Unique observation ID ---------------------------------------
mutate(
  uniqueObservationId = paste(
    versionKey,
    entryCountry,
    paste(entryYear, entryMonth, entryDay, sep = "-"),
    entryEntityIdVar,
    entryEntityId,
    sep = "--"
  )) |>
  
  # -- 7h. Select final columns in required order -----------------------------
select(
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
  all_of(additionalInformationVector)
) |>
  
  # -- 7i. Drop rows without entity ID & remove duplicates --------------------
filter(!is.na(entryEntityId) & entryEntityId != "") |>
  distinct()


# === 8. AGGREGATE ADDITIONAL INFORMATION =====================================
# If duplicate observation IDs exist solely because additional information
# columns differ, those values are collapsed using "||" as separator.
# If duplicates exist for any other reason, a warning is raised.

if (any(duplicated(output_data$uniqueObservationId)) &
    (any(duplicated(output_data[, c("uniqueObservationId", additionalInformationVector)])) == FALSE)) {
  
  output_data <- output_data |>
    group_by(uniqueObservationId) |>
    mutate(across(all_of(additionalInformationVector),
                  ~ paste0(as.character(.x), collapse = "||"))) |>
    distinct()
  print("Additional information aggregated.")
  
} else {
  
  if (any(duplicated(output_data$uniqueObservationId))) {
    print("WARNING: output_data contains duplicates not related to additional information — please investigate!")
  }
  
}


# === 9. CONSISTENCY CHECKS ===================================================
# Run line by line. For the TRUE/FALSE checks: all should return FALSE.
# For the remaining checks: review the output manually.

output_data$usedFile            |> is.na() |> any()
output_data$dateDownloaded      |> is.na() |> any()
output_data$projectKey          |> is.na() |> any()
output_data$datasetKey          |> is.na() |> any()
output_data$versionKey          |> is.na() |> any()
output_data$entryEntityIdVar    |> is.na() |> any()
output_data$entryEntityId       |> is.na() |> any()
output_data$countrycodePolpal   |> is.na() |> any()
output_data$uniqueObservationId |> is.na() |> any()
output_data$uniqueObservationId |> duplicated() |> any()

# Review: check that all country codes are valid PolPaL countrycodes.
output_data$countrycodePolpal |> unique()

# Review: if TRUE above, inspect which observation IDs are duplicated.
unique(output_data$uniqueObservationId[duplicated(output_data$uniqueObservationId)])

# === 10 Notes ===============================================================
# In case you think some observation id specific notes will help link the observation correctly,
# please uncomment the following line and add a note by inserting the specific ids and note.

# output_data$note[output_data$observation_id=="[ADD SPECIFIC OBSERVATION ID(S)"] <- "[NOTE]" 


# === 11 EXPORT ==============================================================
# Exports the prepared dataset as a CSV file named after the versionKey.
# No changes needed here.
write_excel_csv(x = output_data, file = paste0(versionKeyVector, ".csv"), na = "")
