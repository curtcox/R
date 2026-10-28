words <- c("R is fun", "R is fast", "R is here")
sprintf("%02d: %s", seq_along(words), words)
gsub("R", "Learning R", words)
regmatches("red=12, blue=34", gregexpr("[0-9]+", "red=12, blue=34"))
