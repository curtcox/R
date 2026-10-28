# Original R Online runtime. Private state survives globalenv() resets through this closure.
local({
  runtime <- new.env(parent = baseenv())
  state <- new.env(parent = baseenv())
  defaults <- options()
  initial_search <- search()
  q <- function(x) encodeString(as.character(x), quote = '"')
  emit <- function(type, ...) {
    fields <- list(type = type, ...)
    js <- paste(vapply(names(fields), function(n) paste0(q(n), ':', q(fields[[n]])), ''), collapse = ',')
    invisible(webr::eval_js(paste0('Module.webr.channel.write({type:"online-output",data:{', js, '}})')))
  }
  html <- function(x) { capture(); emit('html', data = paste(x, collapse = '\n')); invisible(x) }
  markdown <- function(x) { capture(); emit('markdown', data = paste(x, collapse = '\n')); invisible(x) }
  display_svg <- function(x) { capture(); emit('svg', data = paste(x, collapse = '\n')); invisible(x) }
  b64 <- function(bytes) {
    # Binary conversion stays in the isolated JS worker; no package is needed.
    assign('.online_bytes', bytes, envir = state)
    webr::eval_js(paste0('btoa(String.fromCharCode(...Module.FS.readFile(', q(state$png), ')))'))
  }
  device <- function(...) {
    width <- getOption('online.plot.width', 7); height <- getOption('online.plot.height', 5)
    grDevices::svg('/tmp/online-device-%03d.svg', width = width, height = height, onefile = FALSE)
    grDevices::dev.control(displaylist = 'enable')
    state$pending <- FALSE
    invisible()
  }
  capture <- function() {
    if (isTRUE(state$capturing) || !isTRUE(state$pending) || grDevices::dev.cur() == 1L) return(invisible())
    state$capturing <- TRUE
    on.exit(state$capturing <- FALSE)
    width <- getOption('online.plot.width', 7); height <- getOption('online.plot.height', 5)
    picture <- grDevices::recordPlot()
    svg <- tempfile(fileext = '.svg'); state$png <- tempfile(fileext = '.png')
    grDevices::svg(svg, width = width, height = height)
    grDevices::replayPlot(picture); grDevices::dev.off()
    grDevices::png(state$png, width = round(width * 192), height = round(height * 192), res = 192)
    grDevices::replayPlot(picture); grDevices::dev.off()
    png <- webr::eval_js(paste0('(function(){const a=Module.FS.readFile(', q(state$png), '); let s=""; for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s)})()'))
    emit('figure', svg = paste(base::readLines(svg, warn = FALSE), collapse = '\n'), png = png)
    unlink(c(svg, state$png)); state$pending <- FALSE
    invisible()
  }
  before_page <- function(...) capture()
  after_page <- function(...) { if (!isTRUE(state$capturing)) state$pending <- TRUE }
  setHook('before.plot.new', before_page)
  setHook('plot.new', after_page)
  setHook('before.grid.newpage', before_page)
  setHook('grid.newpage', after_page)
  input <- function(con) identical(con, state$input) || (is.character(con) && length(con) == 1L && con == 'stdin')
  echo <- function(lines) { if (length(lines)) base::cat(paste0(lines, '\n'), sep = '') }
  readers <- list(
    stdin = function() state$input,
    file = function(description = '', ...) { if (identical(description, 'stdin')) state$input else base::file(description, ...) },
    readline = function(prompt = '') {
      capture(); base::cat(prompt)
      line <- base::readLines(state$input, n = 1L, warn = FALSE)
      if (length(line)) { echo(line); return(line) }
      if (!isTRUE(state$empty)) { base::cat('\nProgram input is empty — add lines in the Input box\n'); state$empty <- TRUE }
      ''
    },
    readLines = function(con = stdin(), n = -1L, ok = TRUE, warn = TRUE, encoding = 'unknown', skipNul = FALSE) {
      if (input(con)) {
        capture(); result <- base::readLines(state$input, n = n, ok = ok, warn = FALSE, encoding = encoding, skipNul = skipNul)
        echo(result); result
      } else base::readLines(con, n = n, ok = ok, warn = warn, encoding = encoding, skipNul = skipNul)
    },
    scan = function(file = '', ..., nlines = 0L) {
      if (identical(file, '') || input(file)) {
        capture(); lines <- base::readLines(state$input, n = if (nlines > 0L) nlines else -1L, warn = FALSE)
        echo(lines); base::scan(text = paste(lines, collapse = '\n'), ..., nlines = nlines)
      } else base::scan(file = file, ..., nlines = nlines)
    }
  )
  for (name in names(readers)) assign(name, readers[[name]], runtime)
  runtime$interactive <- function() FALSE
  runtime$display_html <- html
  runtime$display_markdown <- markdown
  runtime$display_svg <- display_svg
  runtime$cat <- function(..., file = '', sep = ' ', fill = FALSE, labels = NULL, append = FALSE) {
    capture()
    if (!identical(file, '') && !identical(file, stdout())) return(base::cat(..., file=file, sep=sep, fill=fill, labels=labels, append=append))
    connection <- rawConnection(raw(), 'wb'); on.exit(close(connection))
    base::cat(..., file=connection, sep=sep, fill=fill, labels=labels, append=append)
    emit('text', stream='stdout', text=rawToChar(rawConnectionValue(connection))); invisible()
  }
  runtime$print <- function(x, ...) {
    if (inherits(x, c('knitr_kable', 'shiny.tag', 'shiny.tag.list', 'html'))) html(as.character(x))
    else { capture(); base::print(x, ...) }
    invisible(x)
  }
  runtime$install.packages <- function(pkgs, ...) webr::install(pkgs, ...)
  render_help <- function(topic, package = NULL) {
    found <- do.call(utils::help, list(topic = topic, package = package, help_type = 'text'))
    if (!length(found)) { base::cat('No documentation for ', topic, '\n', sep = ''); return(invisible(NULL)) }
    rd <- utils:::.getHelpFile(found)
    output <- textConnection('page', 'w', local = TRUE)
    tools::Rd2HTML(rd, out = output, package = if (is.null(package)) '' else package)
    close(output); html(paste(page, collapse = '\n')); invisible(found)
  }
  runtime$help <- function(topic, package = NULL, ...) {
    expression <- if (missing(topic)) "help" else substitute(topic)
    render_help(if (is.name(expression)) as.character(expression) else eval(expression, parent.frame()), package)
  }
  runtime$`?` <- function(e1, e2) {
    topic <- if (missing(e2)) substitute(e1) else substitute(e2)
    render_help(as.character(topic))
  }
  runtime$.online_prepare <- function(stdin_text) {
    try(grDevices::graphics.off(), silent = TRUE)
    for (name in setdiff(search(), c(initial_search, 'online:runtime'))) {
      if (startsWith(name, 'package:')) try(detach(name, character.only = TRUE, unload = FALSE), silent = TRUE)
    }
    rm(list = ls(globalenv(), all.names = TRUE), envir = globalenv())
    extra <- setdiff(names(options()), names(defaults)); if (length(extra)) options(setNames(rep(list(NULL), length(extra)), extra))
    options(defaults); options(device = device, warn = 0)
    setHook('before.plot.new', before_page, action = 'replace'); setHook('plot.new', after_page, action = 'replace')
    setHook('before.grid.newpage', before_page, action = 'replace'); setHook('grid.newpage', after_page, action = 'replace')
    setwd('/home/web_user')
    try(close(state$input), silent = TRUE)
    state$input <- base::textConnection(strsplit(sub('\n$', '', stdin_text), '\n', fixed = TRUE)[[1L]], open = 'r')
    state$empty <- FALSE; state$pending <- FALSE; state$capturing <- FALSE
    invisible()
  }
  runtime$.online_execute <- function() {
    warnings <- list(); error <- ''; frames <- list(); current_line <- 1L
    format_error <- function(condition) {
      call <- conditionCall(condition)
      label <- if (is.null(call)) '' else paste0(' in ', paste(deparse(call), collapse = ''))
      text <- paste0('Error', label, ': ', conditionMessage(condition), '\n')
      if (length(frames)) text <- paste0(text, paste(frames, collapse = '\n'), '\n')
      paste0(text, '  at main.R:', current_line)
    }
    tryCatch({
      expressions <- parse('/home/web_user/main.R', keep.source = TRUE)
      references <- attr(expressions, 'srcref')
      for (i in seq_along(expressions)) {
        current_line <- as.integer(references[[i]])[1L]
        withCallingHandlers({
          value <- withVisible(eval(expressions[[i]], globalenv()))
          if (value$visible) runtime$print(value$value)
        }, warning = function(w) { warnings[[length(warnings) + 1L]] <<- w; invokeRestart('muffleWarning') },
        error = function(e) {
          calls <- sys.calls(); frames <<- character()
          for (j in seq_along(calls)) {
            fn <- sys.function(j); ref <- attr(fn, 'srcref'); file <- attr(ref, 'srcfile')
            if (!is.null(file) && identical(file$filename, '/home/web_user/main.R')) {
              location <- attr(calls[[j]], 'srcref'); line <- if (is.null(location)) as.integer(ref)[1L] else as.integer(location)[1L]
              label <- substr(paste(deparse(calls[[j]]), collapse = ''), 1L, 160L)
              frames <<- c(frames, paste0('  at ', label, ' (main.R:', line, ')'))
            }
          }
        })
      }
    }, error = function(e) {
      if (inherits(e, 'parseError')) {
        location <- regmatches(conditionMessage(e), regexpr('main.R:[0-9]+', conditionMessage(e)))
        if (length(location) && nzchar(location)) current_line <<- as.integer(sub('.*:', '', location))
      }
      error <<- format_error(e); capture(); base::cat(error, '\n', sep = '')
    })
    capture()
    if (length(warnings)) {
      base::cat(if (length(warnings) == 1L) 'Warning message:\n' else 'Warning messages:\n')
      for (i in seq_along(warnings)) base::cat(if (length(warnings) > 1L) paste0(i, ': ') else '', conditionMessage(warnings[[i]]), '\n', sep = '')
    }
    webr::eval_js("Module._fflush(0)")
    invisible(error)
  }
  attach(runtime, name = 'online:runtime', warn.conflicts = FALSE)
})
