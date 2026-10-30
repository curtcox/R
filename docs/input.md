# Program input

Put one answer per line in the **Program input** box. Input is supplied before a
run; the browser cannot pause R to ask for another answer. Every run starts at
the beginning of the box. Source and input travel together in shared links and
HashBin saves.

```r
name <- readline("Name: ")
cat("Hello", name, "\n")
values <- scan("stdin", quiet = TRUE)
mean(values)
```

`readline()` consumes and echoes one line. When there are no lines left, it
returns an empty string and prints a one-time hint to add input. `interactive()`
returns `FALSE`.

`readLines("stdin")`, `readLines(stdin())`, and
`readLines(file("stdin"))` share the same connection and echo the lines they
consume. Use `n = 1` to read one line. Ordinary files still use R's normal readers.

`scan()` and `scan("stdin")` read and echo input using R's normal scanning rules.
`nmax` controls parsed values and `nlines` controls lines. Unread input is retained
for subsequent readers, including partial lines left by a limited scan.

```r
first <- scan("stdin", nlines = 1, quiet = TRUE)
next_answer <- readline("Next answer: ")
```

`file("stdin")` and `stdin()` return the same text connection for the run.
Namespaced calls such as `base::readline()` bypass the input helpers; use the
unqualified functions above. Connections created for other files behave normally.

The gallery includes [plain text](../?example=text-file),
[CSV](../?example=csv-file), [JSON](../?example=json-file),
[TSV](../?example=tsv-file), and [fixed-width](../?example=fixed-width-file)
file-reading examples. Each copies editable Program input into a temporary file,
then reads that file with `readLines()`, `read.csv()`, `jsonlite::fromJSON()`,
`read.delim()`, or `read.fwf()`. CSV examples handle quoted commas and missing
values; JSON includes nested metadata and records. TSV uses actual tab characters,
and fixed-width data needs its column spacing preserved.

These files live in R's browser filesystem. A path in an example refers to that
filesystem, not a file on your computer. The samples need no upload or external
data download, and each run recreates its file from Program input.

Auto-run may run a program again while you edit it. Network requests or other
side effects may repeat. Disable Auto-run while preparing a program with such
side effects, then use Run.
