set.seed(4); size <- 24; world <- matrix(rbinom(size^2,1,.23),size)
shift <- function(x,dr,dc) x[(seq_len(size)+dr-1)%%size+1,(seq_len(size)+dc-1)%%size+1]
for (generation in 1:4) {
  image(world,useRaster=TRUE,col=c("#f3faf7","#167c80"),axes=FALSE,main=paste("Generation",generation))
  neighbours <- Reduce(`+`,lapply(1:9,function(k) shift(world,(k-1)%%3-1,(k-1)%/%3-1))) - world
  world <- (neighbours==3 | (world==1 & neighbours==2))*1
}
