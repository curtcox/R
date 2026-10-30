# Program input contains real tab characters between columns.
path <- tempfile(fileext = ".tsv")
writeLines(readLines("stdin"), path)

# read.delim reads tab-separated files; NA marks a missing measurement.
rain <- read.delim(path, na.strings = "NA", stringsAsFactors = FALSE)
unlink(path)
rain$date <- as.Date(rain$date)
print(rain)
cat("Total rainfall by city (mm):\n")
aggregate(rain_mm ~ city, data = rain, FUN = sum)
