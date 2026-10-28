plot.new(); plot.window(c(-1,1),c(0,1.8),asp=1)
branch <- function(x,y,angle,length,depth) {
  if (depth==0) return(invisible())
  nx<-x+length*cos(angle); ny<-y+length*sin(angle)
  segments(x,y,nx,ny,col=if(depth<3) "#167c80" else "#82684e",lwd=depth/2)
  branch(nx,ny,angle-.4,length*.72,depth-1)
  branch(nx,ny,angle+.4,length*.72,depth-1)
}
branch(0,0,pi/2,.5,9)
