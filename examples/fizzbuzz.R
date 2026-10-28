for (n in 1:30) {
  word <- paste0(if (n %% 3 == 0) "Fizz" else "", if (n %% 5 == 0) "Buzz" else "")
  cat(if (nzchar(word)) word else n, "\n", sep = "")
}
