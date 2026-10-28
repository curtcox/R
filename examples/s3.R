person <- function(name, age) structure(list(name=name,age=age),class="online_person")
print.online_person <- function(x, ...) cat(x$name,"is",x$age,"years old.\n")
print(person("Ada",36))
