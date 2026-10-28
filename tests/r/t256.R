# Executed by tests/core.test.js through the same webR/RCore harness.
function_cid <- t256$cid('function(x, h=1) x*h')
parameters_cid <- t256$cid('6, h = 7')
stopifnot(t256$call(function_cid, parameters_cid) == 42)
stopifnot(t256$fn(t256$cid('f <- function(x) x+1\nif (sys.nframe() == 0L) { stop("demo") }'))(4) == 5)
stopifnot(t256$fn(t256$cid('\\(x) x^2'))(3) == 9)
stopifnot(t256$call(t256$cid('f<-function(x) x^2; f(6)')) == 36)
stopifnot(identical(t256$parameters(t256$cid('x=list(1, c(-2, 3)), y=TRUE')),
                    list(x=list(1,c(-2,3)),y=TRUE)))
for (bad in c('system("false")', '{cat("bad"); 1}', 'x <- 1', 'get("pi")')) {
  rejected <- try(t256$parameters(t256$cid(bad)), silent=TRUE)
  stopifnot(inherits(rejected, 'try-error'))
}
cat('256t R tests passed\n')
