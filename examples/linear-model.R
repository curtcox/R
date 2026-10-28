fit <- lm(mpg ~ wt, data=mtcars)
summary(fit)
plot(fitted(fit), resid(fit), pch=19, col="#167c80", xlab="Fitted mpg", ylab="Residual")
abline(h=0, lty=2)
