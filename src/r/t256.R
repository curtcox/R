# Original R Online saved-function API. Parameters are parsed as data, never evaluated as code.
local({
  api <- new.env(parent = baseenv())
  quote_js <- function(x) encodeString(as.character(x), quote = '"')
  bridge <- function(method, value) webr::eval_js(paste0('T256Bridge.', method, '(', quote_js(value), ')'))
  api$text <- function(cid) bridge('text', cid)
  api$source <- function(cid) bridge('source', cid)
  api$cid <- function(text) bridge('cid', text)
  literal <- function(expression) {
    if (is.null(expression) || is.atomic(expression)) return(expression)
    if (is.name(expression)) {
      name <- as.character(expression)
      constants <- setNames(list(NULL, TRUE, FALSE, NA, NA_integer_, NA_real_, NA_character_, Inf, NaN), c('NULL','TRUE','FALSE','NA','NA_integer_','NA_real_','NA_character_','Inf','NaN'))
      if (name %in% names(constants)) return(constants[[name]])
    }
    if (is.call(expression)) {
      name <- as.character(expression[[1L]])
      if (length(name) == 1L && name %in% c('c', 'list')) return(do.call(get(name, baseenv()), lapply(as.list(expression)[-1L], literal)))
      if (length(name) == 1L && name %in% c('+', '-') && length(expression) == 2L && is.numeric(expression[[2L]])) return(if (name == '-') -expression[[2L]] else expression[[2L]])
    }
    stop('256t parameters must contain only literal constants and c()/list() of them', call. = FALSE)
  }
  parameters_text <- function(text) {
    parsed <- parse(text = paste0('.arguments(', text, ')'))
    if (length(parsed) != 1L || !identical(parsed[[1L]][[1L]], as.name('.arguments'))) stop('Invalid 256t parameters', call. = FALSE)
    lapply(as.list(parsed[[1L]])[-1L], literal)
  }
  demo <- function(x) is.call(x) && identical(x[[1L]], as.name('if')) &&
    identical(x[[2L]], quote(sys.nframe() == 0L))
  load_function <- function(text) {
    expressions <- as.list(parse(text = text, keep.source = TRUE))
    if (length(expressions) && demo(expressions[[length(expressions)]])) expressions <- head(expressions, -1L)
    if (!length(expressions)) stop('Saved function text is empty', call. = FALSE)
    environment <- new.env(parent = globalenv())
    last <- expressions[[length(expressions)]]
    if (length(expressions) > 1L) for (expression in head(expressions, -1L)) eval(expression, environment)
    combined <- is.call(last) && is.name(last[[1L]]) && !as.character(last[[1L]]) %in% c('function', '<-', '=', '<<-')
    if (combined) {
      args <- lapply(as.list(last)[-1L], literal)
      fun <- get(as.character(last[[1L]]), envir = environment, inherits = TRUE)
      if (!is.function(fun)) stop('Saved final call does not refer to a function', call. = FALSE)
      return(list(fn = fun, args = args))
    }
    fun <- eval(last, environment)
    if (!is.function(fun)) stop('The last expression must define a function', call. = FALSE)
    list(fn = fun, args = list())
  }
  api$fn <- function(cid) load_function(api$source(cid))$fn
  api$parameters <- function(cid) parameters_text(api$text(cid))
  api$call <- function(cid, params_cid = NULL) {
    saved <- load_function(api$source(cid))
    args <- if (is.null(params_cid)) saved$args else api$parameters(params_cid)
    do.call(saved$fn, args)
  }
  lockEnvironment(api, bindings = TRUE)
  assign('t256', api, envir = as.environment('online:runtime'))
  lockEnvironment(as.environment('online:runtime'), bindings = TRUE)
})
