# 256t saved-function calls

`t256` is available in every program. A CID identifies exact UTF-8 text. Small
texts of at most 64 bytes are encoded directly in the CID; larger texts use a
six-byte length and SHA-512 digest and are fetched from 256t.us, then 256t.org.
Every remote result is verified before R receives it, and each result is fetched
at most once while the worker remains alive. Stop replaces the worker and cache.

```r
text <- 'function(name) paste0("Hello, ", name, "!")'
cid <- t256$cid(text)
greet <- t256$fn(cid)
greet("Ada")
```

| Function | Result |
| --- | --- |
| `t256$text(cid)` | Verified text, including any saved envelope |
| `t256$source(cid)` | R source unwrapped from an R Online envelope |
| `t256$fn(cid)` | A function defined by the saved source |
| `t256$parameters(cid)` | A list of literal arguments |
| `t256$call(cid, params_cid = NULL)` | Call a saved function with saved or embedded arguments |
| `t256$cid(text)` | The content ID for UTF-8 text |

A saved function may use a literal `function(...)`, an R lambda, or a final
assignment such as `greet <- function(name) ...`. Earlier top-level expressions
run first, so a saved function can load packages. A trailing
`if (sys.nframe() == 0L) { ... }` demonstration block is skipped by `t256$fn()`.
This is ordinary R code and can perform network requests or other side effects.

A parameters document contains arguments exactly as written between parentheses:
`6, h = 7`. Only literal constants, unary numeric signs, and `c()` or `list()` of
those constants are allowed. Calls to arbitrary functions, assignments, and
other executable expressions are rejected by walking the parsed R syntax tree.

A combined document can define a function and call it in the final expression:

```r
f <- function(x) x^2
f(6)
```

`t256$call()` uses that final call's literal arguments. A separate parameter CID
overrides them. Parameters are data, while saved function source is executable R.

The gallery's four small saved documents use inline CIDs and need no paid
publication. Their exact sources live in `examples/saved/` and their CID-named
fixtures in `tests/fixtures/256t/`. Larger shared programs require publication to
HashBin; no paid documents have been published by this implementation.

R cannot await `crypto.subtle` with webR's PostMessage channel. The worker uses a
vendored MIT SHA-512 implementation for synchronous dynamic calls, checked against
Node/WebCrypto vectors in tests. No R hashing package is needed.
