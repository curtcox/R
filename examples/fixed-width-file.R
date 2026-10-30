# Fields occupy fixed columns: city (10), year (4), rainfall (5).
# Preserve the spaces when editing Program input.
path <- tempfile(fileext = ".txt")
writeLines(readLines("stdin"), path)

rain <- read.fwf(path, widths = c(10, 4, 5), strip.white = TRUE,
                 col.names = c("city", "year", "rain_mm"),
                 colClasses = c("character", "integer", "numeric"))
unlink(path)
print(rain)
cat("Wettest city:", rain$city[which.max(rain$rain_mm)], "\n")
