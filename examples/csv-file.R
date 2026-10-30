# Copy editable Program input into a CSV file in R's browser filesystem.
path <- tempfile(fileext = ".csv")
writeLines(readLines("stdin"), path)

# Quoted fields can contain commas; empty scores become missing values.
scores <- read.csv(path, na.strings = "", stringsAsFactors = FALSE)
unlink(path)
print(scores)
cat("Mean score by team (missing scores omitted):\n")
aggregate(score ~ team, data = scores, FUN = mean)
