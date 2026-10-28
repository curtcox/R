# Use Save to HashBin to publish this function.
greet <- function(name) paste0("Hello, ", name, "!")
if (sys.nframe() == 0L) {
  greet("Ada")
}
