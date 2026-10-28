plot(mpg ~ wt, data=mtcars, pch=19, col="#167c80", main="Weight and fuel economy")
abline(lm(mpg ~ wt, data=mtcars), col="#cc7952", lwd=3)
