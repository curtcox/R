Counter <- setRefClass("Counter",fields=list(value="numeric"),methods=list(
  increment=function() {value <<- value+1; invisible(value)}))
counter <- Counter$new(value=0)
counter$increment(); counter$increment()
counter$value
