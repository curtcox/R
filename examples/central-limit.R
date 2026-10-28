set.seed(42)
means <- replicate(2000, mean(rexp(30)))
hist(means, breaks=35, probability=TRUE, col="#b9ded5", border="white", main="Means become bell-shaped")
curve(dnorm(x, 1, 1/sqrt(30)), add=TRUE, col="#167c80", lwd=3)
