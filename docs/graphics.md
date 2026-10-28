# Graphics and rich output

Base graphics, grid, and ggplot2 plots appear alongside console output. The
runtime records completed pages and captures them eagerly before the next plot,
ordinary print/cat output, or the end of the run. Multiple pages are kept in
order. SVGs appear as inert images; their scripts cannot execute in the editor.

```r
options(online.plot.width = 7, online.plot.height = 5)
plot(mpg ~ wt, data = mtcars, pch = 19, col = "#167c80")
abline(lm(mpg ~ wt, data = mtcars), col = "coral", lwd = 2)
```

Plot dimensions use inches and reset each run. `dev.size()` reports the active
device's dimensions. The default is 7 by 5 inches. Download offers the current
SVG drawing and a PNG captured at 192 dpi (1344 by 960 pixels at the default size).
You can pan and zoom the displayed plot, including on a touch screen.

Data frames, matrices, tibbles, and lists print as text using R's normal methods.
The helpers below create rich output explicitly.

```r
display_html("<h2>Results</h2><p>All done.</p>")
display_markdown("# Results\n**All done.**")
display_svg('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="teal"/></svg>')
```

HTML and Markdown appear in script-disabled sandboxed frames. Markdown supports
headings, emphasis, inline code, lists and HTTPS links. HTML from
`knitr::kable(format = "html")` and printed htmltools tags uses the same output
frames. External images are subject to the output frame's CSP.

`?mean` and `help(mean)` render R help using the same script-disabled frames.
Explicit device calls such as `png("my-file.png")` retain R's normal file-writing
behavior; use the default online device for automatic display.
