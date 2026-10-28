library(dplyr)
penguins |> group_by(species) |>
  summarise(count = n(), mean_mass = mean(body_mass, na.rm = TRUE))
