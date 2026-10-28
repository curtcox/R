colour <- factor(c("red","blue","red","green","blue","red"))
table(colour)
prop.table(table(colour))
barplot(table(colour), col=c("#5b9ac9","#83b991","#d87976"))
