library(jsonlite)
# Copy editable Program input into a JSON file in R's browser filesystem.
path <- tempfile(fileext = ".json")
writeLines(readLines("stdin"), path)

# Read a nested object: metadata plus an array of measurement records.
report <- fromJSON(path)
unlink(path)
cat("Station:", report$station, "\n")
print(report$readings)
cat("Mean temperature:", mean(report$readings$temperature, na.rm = TRUE),
    report$unit, "\n")
