x <- seq(-2,1,length.out=220); y <- seq(-1.3,1.3,length.out=180)
c <- outer(x, 1i*y, `+`); z <- c*0; count <- matrix(0,length(x),length(y))
for (step in 1:45) {
  active <- Mod(z) <= 2
  z[active] <- z[active]^2 + c[active]
  count[active] <- step
}
image(x,y,count,col=hcl.colors(46,"Inferno"),asp=1,xlab="Real",ylab="Imaginary")
