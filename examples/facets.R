library(ggplot2)
ggplot(mtcars, aes(wt, mpg, colour=factor(cyl))) +
  geom_point(size=3) + geom_smooth(method="lm", se=FALSE) +
  facet_wrap(~cyl) + theme_minimal() + labs(colour="Cylinders")
