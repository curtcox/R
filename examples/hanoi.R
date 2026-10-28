hanoi <- function(n, from = "A", to = "C", spare = "B") {
  if (n == 0) return(invisible(NULL))
  hanoi(n-1, from, spare, to)
  cat("Move", n, "from", from, "to", to, "\n")
  hanoi(n-1, spare, to, from)
}
hanoi(3)
