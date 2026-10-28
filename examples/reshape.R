library(tidyr)
wide <- data.frame(city=c("Chicago","Oslo"), winter=c(-4,-3), summer=c(24,18))
pivot_longer(wide, -city, names_to="season", values_to="temperature")
