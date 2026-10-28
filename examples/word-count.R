lines <- readLines("stdin")
words <- strsplit(tolower(paste(lines, collapse = " ")), "[^a-z]+")[[1]]
sort(table(words[nzchar(words)]), decreasing = TRUE)
