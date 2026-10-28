t <- seq(0,8*pi,length.out=800)
matplot(t,cbind(sin(t),cos(t),sin(t/3)),type="l",lty=1,col=hcl.colors(3,"Dark 3"),xlab="Time",ylab="Wave")
plot(t*cos(t),t*sin(t),type="l",asp=1,col="#167c80",xlab="x",ylab="y",main="An expanding spiral")
