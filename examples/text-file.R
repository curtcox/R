# Edit Program input to change this plain-text file.
# Files live in R's browser filesystem, separate from your computer's files.
path <- tempfile(fileext = ".txt")
writeLines(readLines("stdin"), path)

lines <- readLines(path, warn = FALSE)
unlink(path)
notes <- trimws(lines)
notes <- notes[nzchar(notes) & !startsWith(notes, "#")]
print(data.frame(note = notes, characters = nchar(notes)))
cat("Notes:", length(notes), "\n")
