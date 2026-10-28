head(mtcars)
aggregate(mpg ~ cyl, data = mtcars, FUN = mean)
summary(mtcars[c("mpg", "wt")])
