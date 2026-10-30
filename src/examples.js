/* Sources mirror examples/*.R. Regenerate previews with npm run gallery. */
const RExamples = {catalog: [
  {
    "id": "welcome",
    "label": "Hello, R",
    "title": "Hello, R",
    "tags": [
      "basics",
      "graphics"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "Vectors, a summary, and your first plot.",
    "src": "# Welcome to R Online. Change a value and run again.\nx <- c(2, 4, 8, 16, 32)\ncat(\"Hello, R!\\n\")\nsummary(x)\nplot(x, type = \"b\", pch = 19, col = \"#167c80\",\n     main = \"A little code. Endless possibilities.\", xlab = \"Step\", ylab = \"Value\")\n",
    "stdin": "",
    "fingerprint": "faeaab590ad4877ecdf24501d2bf3ce3a57e422c3fd33fe3c07cd1c1ead641f4"
  },
  {
    "id": "fizzbuzz",
    "label": "FizzBuzz",
    "title": "FizzBuzz",
    "tags": [
      "basics"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "FizzBuzz",
    "src": "for (n in 1:30) {\n  word <- paste0(if (n %% 3 == 0) \"Fizz\" else \"\", if (n %% 5 == 0) \"Buzz\" else \"\")\n  cat(if (nzchar(word)) word else n, \"\\n\", sep = \"\")\n}\n",
    "stdin": "",
    "fingerprint": "3e913042138d19747f2839b887b1a83b2ce740e60545e3f7c41fe42368dd7f7d"
  },
  {
    "id": "vectors",
    "label": "Thinking in vectors",
    "title": "Thinking in vectors",
    "tags": [
      "basics"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "Thinking in vectors",
    "src": "x <- seq(0, 10, by = 2)\nprint(x)\nprint(x^2)\nprint(x + c(10, 100)) # Recycling\nprint(x[x > mean(x)])\n",
    "stdin": "",
    "fingerprint": "d3608c323710ecfcd846a7a6e4bd4b55ff99bed8211ef26009ed88163c8f9f83"
  },
  {
    "id": "hanoi",
    "label": "Functions and recursion",
    "title": "Functions and recursion",
    "tags": [
      "basics"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "Functions and recursion",
    "src": "hanoi <- function(n, from = \"A\", to = \"C\", spare = \"B\") {\n  if (n == 0) return(invisible(NULL))\n  hanoi(n-1, from, spare, to)\n  cat(\"Move\", n, \"from\", from, \"to\", to, \"\\n\")\n  hanoi(n-1, spare, to, from)\n}\nhanoi(3)\n",
    "stdin": "",
    "fingerprint": "0fd8d165b62bf6da3854042b909c779e2b8d27cca859c7b2f5fb86903314efda"
  },
  {
    "id": "closures",
    "label": "Closures and the apply family",
    "title": "Closures and the apply family",
    "tags": [
      "basics"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "Closures and the apply family",
    "src": "power <- function(exponent) function(x) x^exponent\nsquare <- power(2)\nsapply(1:6, square)\nMap(function(x, y) x + y, 1:3, 4:6)\nReduce(`+`, 1:100)\n",
    "stdin": "",
    "fingerprint": "c1e0f8bff4adccbf7d9748413e1a2275745ffc0551a417550118713055e4d719"
  },
  {
    "id": "strings",
    "label": "Strings and regular expressions",
    "title": "Strings and regular expressions",
    "tags": [
      "basics"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "Strings and regular expressions",
    "src": "words <- c(\"R is fun\", \"R is fast\", \"R is here\")\nsprintf(\"%02d: %s\", seq_along(words), words)\ngsub(\"R\", \"Learning R\", words)\nregmatches(\"red=12, blue=34\", gregexpr(\"[0-9]+\", \"red=12, blue=34\"))\n",
    "stdin": "",
    "fingerprint": "d3a162ef63832bab2374b0e7f03587423237b3f170b4003434b0d11abdb76b74"
  },
  {
    "id": "input-numbers",
    "label": "Numbers from Program input",
    "title": "Numbers from Program input",
    "tags": [
      "input",
      "basics"
    ],
    "docs": "docs/input.html",
    "description": "Numbers from Program input",
    "src": "a <- as.numeric(readline(\"First number: \"))\nb <- as.numeric(readline(\"Second number: \"))\ncat(\"Sum:\", a + b, \"\\n\")\n",
    "stdin": "6\n7\n",
    "fingerprint": "43eb93c56d92f79e7e1771754cc4760f6cfd3e8c47b60ecc5655cead8add9770"
  },
  {
    "id": "word-count",
    "label": "Count words from input",
    "title": "Count words from input",
    "tags": [
      "input",
      "data"
    ],
    "docs": "docs/input.html",
    "description": "Count words from input",
    "src": "lines <- readLines(\"stdin\")\nwords <- strsplit(tolower(paste(lines, collapse = \" \")), \"[^a-z]+\")[[1]]\nsort(table(words[nzchar(words)]), decreasing = TRUE)\n",
    "stdin": "R is fun\nR is for data\n",
    "fingerprint": "6f939d6389be7f7a339191fd24cabf3a054a7f4ebb5a3fac0400aa336a4bc2a6"
  },
  {
    "id": "text-file",
    "label": "Read a plain-text file",
    "title": "Read a plain-text file",
    "tags": [
      "input",
      "data",
      "files"
    ],
    "docs": "docs/input.html",
    "description": "Read lines from a .txt file, skip comments and blanks, and measure each note.",
    "src": "# Edit Program input to change this plain-text file.\n# Files live in R's browser filesystem, separate from your computer's files.\npath <- tempfile(fileext = \".txt\")\nwriteLines(readLines(\"stdin\"), path)\n\nlines <- readLines(path, warn = FALSE)\nunlink(path)\nnotes <- trimws(lines)\nnotes <- notes[nzchar(notes) & !startsWith(notes, \"#\")]\nprint(data.frame(note = notes, characters = nchar(notes)))\ncat(\"Notes:\", length(notes), \"\\n\")\n",
    "stdin": "# Field notes\n  Check the rain gauge  \n\nRecord the temperature\nCheck the rain gauge\n",
    "fingerprint": "77046203f068d099a20c18addf0b6d60f004eee66aa8f80353c5ac6933a56290"
  },
  {
    "id": "csv-file",
    "label": "Read a CSV file",
    "title": "Read a CSV file",
    "tags": [
      "input",
      "data",
      "files"
    ],
    "docs": "docs/input.html",
    "description": "Read comma-separated scores with quoted commas and missing values; summarise by team.",
    "src": "# Copy editable Program input into a CSV file in R's browser filesystem.\npath <- tempfile(fileext = \".csv\")\nwriteLines(readLines(\"stdin\"), path)\n\n# Quoted fields can contain commas; empty scores become missing values.\nscores <- read.csv(path, na.strings = \"\", stringsAsFactors = FALSE)\nunlink(path)\nprint(scores)\ncat(\"Mean score by team (missing scores omitted):\\n\")\naggregate(score ~ team, data = scores, FUN = mean)\n",
    "stdin": "name,team,score\n\"Lovelace, Ada\",Blue,98\n\"Hopper, Grace\",Gold,99\n\"Johnson, Katherine\",Blue,100\n\"Vaughan, Dorothy\",Gold,\n",
    "fingerprint": "6dc1332990b5f168c8c9056ff437cf7dad906f7ec2b45745db80f140f5323fd1"
  },
  {
    "id": "json-file",
    "label": "Read a JSON file",
    "title": "Read a JSON file",
    "tags": [
      "input",
      "data",
      "files",
      "packages"
    ],
    "docs": "docs/input.html",
    "description": "Read nested JSON metadata and measurement records with jsonlite; handle null values.",
    "src": "library(jsonlite)\n# Copy editable Program input into a JSON file in R's browser filesystem.\npath <- tempfile(fileext = \".json\")\nwriteLines(readLines(\"stdin\"), path)\n\n# Read a nested object: metadata plus an array of measurement records.\nreport <- fromJSON(path)\nunlink(path)\ncat(\"Station:\", report$station, \"\\n\")\nprint(report$readings)\ncat(\"Mean temperature:\", mean(report$readings$temperature, na.rm = TRUE),\n    report$unit, \"\\n\")\n",
    "stdin": "{\n  \"station\": \"Lakeside\", \"unit\": \"C\",\n  \"readings\": [\n    {\"hour\": \"09:00\", \"temperature\": 12},\n    {\"hour\": \"12:00\", \"temperature\": 18},\n    {\"hour\": \"15:00\", \"temperature\": null}\n  ]\n}\n",
    "fingerprint": "85930cc3b0dea09bf10839b1eda202098f1058bf75e4935ccf0099253259fa88"
  },
  {
    "id": "tsv-file",
    "label": "Read a TSV file",
    "title": "Read a TSV file",
    "tags": [
      "input",
      "data",
      "files"
    ],
    "docs": "docs/input.html",
    "description": "Read tab-separated rainfall data, parse dates, and total rainfall by city.",
    "src": "# Program input contains real tab characters between columns.\npath <- tempfile(fileext = \".tsv\")\nwriteLines(readLines(\"stdin\"), path)\n\n# read.delim reads tab-separated files; NA marks a missing measurement.\nrain <- read.delim(path, na.strings = \"NA\", stringsAsFactors = FALSE)\nunlink(path)\nrain$date <- as.Date(rain$date)\nprint(rain)\ncat(\"Total rainfall by city (mm):\\n\")\naggregate(rain_mm ~ city, data = rain, FUN = sum)\n",
    "stdin": "city\tdate\train_mm\nChicago\t2026-10-01\t12\nOslo\t2026-10-01\t8\nChicago\t2026-10-02\t3\nOslo\t2026-10-02\tNA\n",
    "fingerprint": "7e2c98d031a24e889a04379d1aa5adb67328afcca9c901b13740023556e92c4c"
  },
  {
    "id": "fixed-width-file",
    "label": "Read a fixed-width file",
    "title": "Read a fixed-width file",
    "tags": [
      "input",
      "data",
      "files"
    ],
    "docs": "docs/input.html",
    "description": "Read records by column width with read.fwf and find the wettest city.",
    "src": "# Fields occupy fixed columns: city (10), year (4), rainfall (5).\n# Preserve the spaces when editing Program input.\npath <- tempfile(fileext = \".txt\")\nwriteLines(readLines(\"stdin\"), path)\n\nrain <- read.fwf(path, widths = c(10, 4, 5), strip.white = TRUE,\n                 col.names = c(\"city\", \"year\", \"rain_mm\"),\n                 colClasses = c(\"character\", \"integer\", \"numeric\"))\nunlink(path)\nprint(rain)\ncat(\"Wettest city:\", rain$city[which.max(rain$rain_mm)], \"\\n\")\n",
    "stdin": "Chicago   2025  125\nOslo      2025   98\nLima      2025   12\n",
    "fingerprint": "700bb3133a645489c45ef022ffb8cd2d11902e89e1957d43d4a9dec58698c5fb"
  },
  {
    "id": "data-frames",
    "label": "Meet the cars",
    "title": "Meet the cars",
    "tags": [
      "data"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "Meet the cars",
    "src": "head(mtcars)\naggregate(mpg ~ cyl, data = mtcars, FUN = mean)\nsummary(mtcars[c(\"mpg\", \"wt\")])\n",
    "stdin": "",
    "fingerprint": "a8cf2064c87ce0a12f830dbd651c0a26387980b916b65755f8b4df4d34f20a9f"
  },
  {
    "id": "penguins",
    "label": "Penguins with dplyr",
    "title": "Penguins with dplyr",
    "tags": [
      "data",
      "packages"
    ],
    "docs": "https://dplyr.tidyverse.org/reference/index.html",
    "description": "Penguins with dplyr",
    "src": "library(dplyr)\npenguins |> group_by(species) |>\n  summarise(count = n(), mean_mass = mean(body_mass, na.rm = TRUE))\n",
    "stdin": "",
    "fingerprint": "a80cbdac19efbd7b1cc770843628a597d3d51d04034919649d4868a827e6d3e0"
  },
  {
    "id": "reshape",
    "label": "Reshape with tidyr",
    "title": "Reshape with tidyr",
    "tags": [
      "data",
      "packages"
    ],
    "docs": "https://tidyr.tidyverse.org/reference/pivot_longer.html",
    "description": "Reshape with tidyr",
    "src": "library(tidyr)\nwide <- data.frame(city=c(\"Chicago\",\"Oslo\"), winter=c(-4,-3), summer=c(24,18))\npivot_longer(wide, -city, names_to=\"season\", values_to=\"temperature\")\n",
    "stdin": "",
    "fingerprint": "e7f510a4f1b56a90109726dbf89239f77cf6d7d48e5acf6c2ac1604cd7b8d2b5"
  },
  {
    "id": "json",
    "label": "JSON round trip",
    "title": "JSON round trip",
    "tags": [
      "data",
      "packages"
    ],
    "docs": "https://jeroen.r-universe.dev/jsonlite/doc/manual.html",
    "description": "JSON round trip",
    "src": "library(jsonlite)\npeople <- data.frame(name=c(\"Ada\",\"Grace\"), score=c(98,99))\ntext <- toJSON(people, pretty=TRUE)\ncat(text, \"\\n\")\nfromJSON(text)\n",
    "stdin": "",
    "fingerprint": "0b1e336e2abf46db4b410c47d6623c2e50d46da07afc5d708cf588a66905b4c0"
  },
  {
    "id": "factors",
    "label": "Factors and tables",
    "title": "Factors and tables",
    "tags": [
      "data"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "Factors and tables",
    "src": "colour <- factor(c(\"red\",\"blue\",\"red\",\"green\",\"blue\",\"red\"))\ntable(colour)\nprop.table(table(colour))\nbarplot(table(colour), col=c(\"#5b9ac9\",\"#83b991\",\"#d87976\"))\n",
    "stdin": "",
    "fingerprint": "5f1236992f3f74803ba1c5486e6932fe4a4886fca708eeea7b782ee3d156dd55"
  },
  {
    "id": "linear-model",
    "label": "A linear model",
    "title": "A linear model",
    "tags": [
      "statistics",
      "graphics"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "A linear model",
    "src": "fit <- lm(mpg ~ wt, data=mtcars)\nsummary(fit)\nplot(fitted(fit), resid(fit), pch=19, col=\"#167c80\", xlab=\"Fitted mpg\", ylab=\"Residual\")\nabline(h=0, lty=2)\n",
    "stdin": "",
    "fingerprint": "c79bf75017f708991eaf699d8488e4284f9ffa25b0a2ca6d94167b80a95e1774"
  },
  {
    "id": "t-test",
    "label": "Distributions and a t-test",
    "title": "Distributions and a t-test",
    "tags": [
      "statistics"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "Distributions and a t-test",
    "src": "set.seed(42)\nx <- rnorm(30, mean=1)\nt.test(x, mu=0)\ncat(\"P(Z > 1.96) =\", pnorm(1.96, lower.tail=FALSE), \"\\n\")\ncurve(dnorm(x), from=-4, to=4, col=\"#167c80\", lwd=3)\n",
    "stdin": "",
    "fingerprint": "6ad5ba2fa072326e9dc756f6be550872eb041961156e88d5feef316909128ba9"
  },
  {
    "id": "central-limit",
    "label": "The central limit theorem",
    "title": "The central limit theorem",
    "tags": [
      "statistics",
      "graphics"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "The central limit theorem",
    "src": "set.seed(42)\nmeans <- replicate(2000, mean(rexp(30)))\nhist(means, breaks=35, probability=TRUE, col=\"#b9ded5\", border=\"white\", main=\"Means become bell-shaped\")\ncurve(dnorm(x, 1, 1/sqrt(30)), add=TRUE, col=\"#167c80\", lwd=3)\n",
    "stdin": "",
    "fingerprint": "41012195e8836c8a3477379d577e94e08f29c2b6ea0a27ee33fc8d0ac3973bcb"
  },
  {
    "id": "histogram",
    "label": "A simple histogram",
    "title": "A simple histogram",
    "tags": [
      "graphics"
    ],
    "docs": "docs/graphics.html",
    "description": "A simple histogram",
    "src": "set.seed(17)\nhist(rnorm(1000), breaks=30, col=\"#167c80\", border=\"white\", main=\"A thousand random values\")\n",
    "stdin": "",
    "fingerprint": "0c61040515cc072cce00e8f779723e8f03bb7a834447e7b6f4fba867914bf0b2"
  },
  {
    "id": "scatter",
    "label": "Scatter and regression",
    "title": "Scatter and regression",
    "tags": [
      "graphics",
      "statistics"
    ],
    "docs": "docs/graphics.html",
    "description": "Scatter and regression",
    "src": "plot(mpg ~ wt, data=mtcars, pch=19, col=\"#167c80\", main=\"Weight and fuel economy\")\nabline(lm(mpg ~ wt, data=mtcars), col=\"#cc7952\", lwd=3)\n",
    "stdin": "",
    "fingerprint": "306b039cafde32c0382fa20f7de573d06f39d3c7f92dbd611f222bd384b8f48b"
  },
  {
    "id": "facets",
    "label": "Facets with ggplot2",
    "title": "Facets with ggplot2",
    "tags": [
      "graphics",
      "packages"
    ],
    "docs": "https://ggplot2.tidyverse.org/reference/index.html",
    "description": "Facets with ggplot2",
    "src": "library(ggplot2)\nggplot(mtcars, aes(wt, mpg, colour=factor(cyl))) +\n  geom_point(size=3) + geom_smooth(method=\"lm\", se=FALSE) +\n  facet_wrap(~cyl) + theme_minimal() + labs(colour=\"Cylinders\")\n",
    "stdin": "",
    "fingerprint": "61673fd1b738eca8f828207baddbd98cd0229870c09cda893de411ea2012c7ec"
  },
  {
    "id": "colour-wheel",
    "label": "A colour wheel",
    "title": "A colour wheel",
    "tags": [
      "graphics"
    ],
    "docs": "docs/graphics.html",
    "description": "A colour wheel",
    "src": "n <- 36\npie(rep(1,n), col=hcl.colors(n, \"Dynamic\"), labels=rep(\"\",n), border=NA, main=\"HCL colours\")\n",
    "stdin": "",
    "fingerprint": "c267e2e8f6c557b1290b23217705cfc205666717ccbc30afd539aea056c1c5fa"
  },
  {
    "id": "mandelbrot",
    "label": "Mandelbrot set",
    "title": "Mandelbrot set",
    "tags": [
      "graphics",
      "math"
    ],
    "docs": "docs/graphics.html",
    "description": "Mandelbrot set",
    "src": "x <- seq(-2,1,length.out=220); y <- seq(-1.3,1.3,length.out=180)\nc <- outer(x, 1i*y, `+`); z <- c*0; count <- matrix(0,length(x),length(y))\nfor (step in 1:45) {\n  active <- Mod(z) <= 2\n  z[active] <- z[active]^2 + c[active]\n  count[active] <- step\n}\nimage(x,y,count,useRaster=TRUE,col=hcl.colors(46,\"Inferno\"),asp=1,xlab=\"Real\",ylab=\"Imaginary\")\n",
    "stdin": "",
    "fingerprint": "a8d4144ce91f7aaccba450707b4047266ed153c25ae5ef95d9d7678e2688ed93"
  },
  {
    "id": "game-of-life",
    "label": "Game of Life",
    "title": "Game of Life",
    "tags": [
      "graphics",
      "simulation"
    ],
    "docs": "docs/graphics.html",
    "description": "Game of Life",
    "src": "set.seed(4); size <- 24; world <- matrix(rbinom(size^2,1,.23),size)\nshift <- function(x,dr,dc) x[(seq_len(size)+dr-1)%%size+1,(seq_len(size)+dc-1)%%size+1]\nfor (generation in 1:4) {\n  image(world,useRaster=TRUE,col=c(\"#f3faf7\",\"#167c80\"),axes=FALSE,main=paste(\"Generation\",generation))\n  neighbours <- Reduce(`+`,lapply(1:9,function(k) shift(world,(k-1)%%3-1,(k-1)%/%3-1))) - world\n  world <- (neighbours==3 | (world==1 & neighbours==2))*1\n}\n",
    "stdin": "",
    "fingerprint": "1fed2b6470f297f3082f8a932b258122ad0bcf3970bf7f2a4733f238fcfe8b5c"
  },
  {
    "id": "fractal-tree",
    "label": "A fractal tree",
    "title": "A fractal tree",
    "tags": [
      "graphics",
      "math"
    ],
    "docs": "docs/graphics.html",
    "description": "A fractal tree",
    "src": "plot.new(); plot.window(c(-1,1),c(0,1.8),asp=1)\nbranch <- function(x,y,angle,length,depth) {\n  if (depth==0) return(invisible())\n  nx<-x+length*cos(angle); ny<-y+length*sin(angle)\n  segments(x,y,nx,ny,col=if(depth<3) \"#167c80\" else \"#82684e\",lwd=depth/2)\n  branch(nx,ny,angle-.4,length*.72,depth-1)\n  branch(nx,ny,angle+.4,length*.72,depth-1)\n}\nbranch(0,0,pi/2,.5,9)\n",
    "stdin": "",
    "fingerprint": "fffdcdc8d6dac80c043cb36fbd24e575af3e579ce6eca6605cd05a3a735e6a1d"
  },
  {
    "id": "spirals",
    "label": "Spirals and waves",
    "title": "Spirals and waves",
    "tags": [
      "graphics",
      "math"
    ],
    "docs": "docs/graphics.html",
    "description": "Spirals and waves",
    "src": "t <- seq(0,8*pi,length.out=800)\nmatplot(t,cbind(sin(t),cos(t),sin(t/3)),type=\"l\",lty=1,col=hcl.colors(3,\"Dark 3\"),xlab=\"Time\",ylab=\"Wave\")\nplot(t*cos(t),t*sin(t),type=\"l\",asp=1,col=\"#167c80\",xlab=\"x\",ylab=\"y\",main=\"An expanding spiral\")\n",
    "stdin": "",
    "fingerprint": "9e7d0a933fb571678fb7d4db30fd79100fd96ff9feebc9825fcc15511ba3c654"
  },
  {
    "id": "s3",
    "label": "S3 print methods",
    "title": "S3 print methods",
    "tags": [
      "objects"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "S3 print methods",
    "src": "person <- function(name, age) structure(list(name=name,age=age),class=\"online_person\")\nprint.online_person <- function(x, ...) cat(x$name,\"is\",x$age,\"years old.\\n\")\nprint(person(\"Ada\",36))\n",
    "stdin": "",
    "fingerprint": "647a15fa6db6973783e2444da102483208974cd86db33b0b4e1155f17436ba31"
  },
  {
    "id": "reference-class",
    "label": "Reference classes",
    "title": "Reference classes",
    "tags": [
      "objects"
    ],
    "docs": "https://cran.r-project.org/doc/manuals/r-release/R-intro.html",
    "description": "Reference classes",
    "src": "Counter <- setRefClass(\"Counter\",fields=list(value=\"numeric\"),methods=list(\n  increment=function() {value <<- value+1; invisible(value)}))\ncounter <- Counter$new(value=0)\ncounter$increment(); counter$increment()\ncounter$value\n",
    "stdin": "",
    "fingerprint": "b372c79f28e2372f013067c965bc4b7134716cc93e61162883e66f1aaf98ac40"
  },
  {
    "id": "html-table",
    "label": "An HTML table",
    "title": "An HTML table",
    "tags": [
      "output",
      "packages"
    ],
    "docs": "https://yihui.org/knitr/",
    "description": "An HTML table",
    "src": "knitr::kable(head(mtcars), format=\"html\")\n",
    "stdin": "",
    "fingerprint": "c8a4079b60d6a88641a4547a45b4e1e4ac23ba855c9cf2736461736589b64707"
  },
  {
    "id": "markdown",
    "label": "Rich Markdown",
    "title": "Rich Markdown",
    "tags": [
      "output"
    ],
    "docs": "docs/graphics.html",
    "description": "Rich Markdown",
    "src": "display_markdown(\"# R Online\\n**Explore** data, one small program at a time.\\n- Write R\\n- Run it here\\n- Share a link\")\n",
    "stdin": "",
    "fingerprint": "99dbf744edc71e4f729377172cab36994d3997d6bc5d6beba8a5c793e3cdbb28"
  },
  {
    "id": "256t-save",
    "label": "Save a function",
    "title": "Save a function",
    "tags": [
      "256t"
    ],
    "docs": "docs/256t-calls.html",
    "description": "Save a function",
    "src": "# Use Save to HashBin to publish this function.\ngreet <- function(name) paste0(\"Hello, \", name, \"!\")\nif (sys.nframe() == 0L) {\n  greet(\"Ada\")\n}\n",
    "stdin": "",
    "fingerprint": "4eb59ebcc7463bc689134bd8fa3587b51814bdc1af6dffb21a7d794e8f8809c8"
  },
  {
    "id": "256t-function",
    "label": "A function from a CID",
    "title": "A function from a CID",
    "tags": [
      "256t"
    ],
    "docs": "docs/256t-calls.html",
    "description": "A function from a CID",
    "src": "greet <- t256$fn(\"AAAAAAArZnVuY3Rpb24obmFtZSkgcGFzdGUwKCJIZWxsbywgIiwgbmFtZSwgIiEiKQ\")\ngreet(\"Ada\")\n",
    "stdin": "",
    "fingerprint": "7bf01e8579de2ef3c58f5527d45bdc35c883fcaf1e8d9c27295ba7cb78b7d840"
  },
  {
    "id": "256t-combined",
    "label": "Function and parameters",
    "title": "Function and parameters",
    "tags": [
      "256t"
    ],
    "docs": "docs/256t-calls.html",
    "description": "Function and parameters",
    "src": "t256$call(\"AAAAAAAaZiA8LSBmdW5jdGlvbih4KSB4XjI7IGYoNik\")\n",
    "stdin": "",
    "fingerprint": "6db935895cc0cc2bcf3f4a2af839d0cec7380a32933cbeb63944ad2e9bbf4bc4"
  },
  {
    "id": "256t-parameters",
    "label": "Mix saved functions and parameters",
    "title": "Mix saved functions and parameters",
    "tags": [
      "256t"
    ],
    "docs": "docs/256t-calls.html",
    "description": "Mix saved functions and parameters",
    "src": "t256$call(\"AAAAAAAlZnVuY3Rpb24obikgYXMuY2hhcmFjdGVyKGFzLnJvbWFuKG4pKQ\", \"AAAAAAACMzA\")\n",
    "stdin": "",
    "fingerprint": "3d8038ded874f324c50cc4345c58e930aa76153441220d0894ab382f868dea83"
  }
]};
if(typeof module!=="undefined")module.exports=RExamples;else globalThis.RExamples=RExamples;
