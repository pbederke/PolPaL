library(tidyverse)
library(readr)

## IMPORT DATA ##

raw_data <- read_csv("MPDataset_MPDS2025a.csv", na = "") # Adjust import according to file format.

manifesto_countrycodes <- c(
  "11"  = "SWE",  # Sweden
  "12"  = "NOR",  # Norway
  "13"  = "DNK",  # Denmark
  "14"  = "FIN",  # Finland
  "15"  = "ISL",  # Iceland
  
  "21"  = "BEL",  # Belgium
  "22"  = "NLD",  # Netherlands
  "23"  = "LUX",  # Luxembourg
  
  "31"  = "FRA",  # France
  "32"  = "ITA",  # Italy
  "33"  = "ESP",  # Spain
  "34"  = "GRC",  # Greece
  "35"  = "PRT",  # Portugal
  
  "41"  = "DEU",  # Germany
  "42"  = "AUT",  # Austria
  "43"  = "CHE",  # Switzerland
  
  "51"  = "GBR",  # Great Britain
  "52"  = "GBR", # Northern Ireland (ISO does not assign a separate ISO3;
  # choose custom code unless you prefer "GBR")
  "53"  = "IRL",  # Ireland
  "54"  = "MLT",  # Malta
  "55"  = "CYP",  # Cyprus
  
  "61"  = "USA",  # United States
  "62"  = "CAN",  # Canada
  "63"  = "AUS",  # Australia
  "64"  = "NZL",  # New Zealand
  
  "71"  = "JPN",  # Japan
  "72"  = "ISR",  # Israel
  "73"  = "LKA",  # Sri Lanka
  "74"  = "TUR",  # Turkey
  "75"  = "ALB",  # Albania
  "76"  = "ARM",  # Armenia
  "77"  = "AZE",  # Azerbaijan
  "78"  = "BLR",  # Belarus
  "79"  = "BIH",  # Bosnia-Herzegovina
  
  "80"  = "BGR",  # Bulgaria
  "81"  = "HRV",  # Croatia
  "82"  = "CZE",  # Czech Republic
  "83"  = "EST",  # Estonia
  "84"  = "GEO",  # Georgia
  "85"  = "GDR",  # German Democratic Republic (historical; custom code)
  "86"  = "HUN",  # Hungary
  "87"  = "LVA",  # Latvia
  "88"  = "LTU",  # Lithuania
  "89"  = "MKD",  # North Macedonia
  "90"  = "MDA",  # Moldova
  "91"  = "MNE",  # Montenegro
  "92"  = "POL",  # Poland
  "93"  = "ROU",  # Romania
  "94"  = "RUS",  # Russia
  "95"  = "SRB",  # Serbia
  "96"  = "SVK",  # Slovakia
  "97"  = "SVN",  # Slovenia
  "98"  = "UKR",  # Ukraine
  
  "113" = "KOR",  # South Korea
  
  "150" = "ARG",  # Argentina
  "151" = "BOL",  # Bolivia
  "152" = "COL",  # Colombia
  "153" = "CRI",  # Costa Rica
  "154" = "ECU",  # Ecuador
  "155" = "CHL",  # Chile
  "160" = "PAN",  # Panama
  "162" = "URY",  # Uruguay
  "168" = "DOM",  # Dominican Republic
  "171" = "MEX",  # Mexico
  "179" = "PER",  # Peru
  "180" = "BRA",  # Brazil
  "181" = "ZAF"   # South Africa
)
## PREPARE DATA FOR IMPORT ##
data <- 
  raw_data |> 
  mutate(
    projectKey = "marpor",
    datasetKey = "marpor-mpds",
    versionKey = "marpor-mpds-2025a", 
    entryCountryVar = "country",
    entryCountry = country |> as.character(),
    entryYearVar = "edate",
    entryYear = edate |> str_sub(7, 10) |> as.numeric(),
    entryMonthVar = "edate",
    entryMonth = edate |> str_sub(4, 5) |> as.numeric(),
    entryDayVar = "edate",
    entryDay = edate |> str_sub(1, 2) |> as.numeric(),
    entryPartyIdVar = "party",
    entryPartyId = party |> as.character(),
    entryPartyNameShortVar = "partyabbrev",
    entryPartyNameShort = partyabbrev,
    entryPartyNameEnglishVar = "partyname",
    entryPartyNameEnglish = partyname,
    entryPartyNameVar = NA,
    entryPartyName = NA,
    countrycode = manifesto_countrycodes[as.character(country)],
    uniqueObservationId = paste(versionKey, entryCountry, paste(entryYear, entryMonth, entryDay, sep = "-"), entryPartyIdVar, entryPartyId, sep = "--"),
    usedFile = "MPDataset_MPDS2025a.csv",
    note = "entryYear, entryMonth, and entryDay are extracted from edate variable"
  ) |> 
  select(
    projectKey, datasetKey, versionKey,
    entryCountryVar, entryCountry, 
    entryYearVar, entryYear,
    entryMonthVar, entryMonth,
    entryDayVar, entryDay,
    entryPartyIdVar, entryPartyId, 
    entryPartyNameShortVar, entryPartyNameShort,
    entryPartyNameEnglishVar, entryPartyNameEnglish, 
    entryPartyNameVar, entryPartyName, 
    countrycode, uniqueObservationId, 
    usedFile, note,
  ) |> 
  distinct()

# CONSISTENCY CHECKS ##
data$projectKey |> is.na() |> any()
data$datasetKey |> is.na() |> any()
data$versionKey |> is.na() |> any()
data$entryCountryVar |> is.na() |> any()
data$entryCountry |> is.na() |> any()
data$entryPartyIdVar |> is.na() |> any()
data$entryPartyId |> is.na() |> any()
data$countrycode |> is.na() |> any()
data$uniqueObservationId |> is.na() |> any()
data$uniqueObservationId |> duplicated() |> any()
data$usedFile |> is.na() |> any()

write_excel_csv(data, "marpor-mpds-2025a.csv", na = "")
