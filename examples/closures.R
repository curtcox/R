power <- function(exponent) function(x) x^exponent
square <- power(2)
sapply(1:6, square)
Map(function(x, y) x + y, 1:3, 4:6)
Reduce(`+`, 1:100)
