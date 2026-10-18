# D2 catalog assets

Reviewed copies from https://icons.d2lang.com/ (catalog names React and Vuejs).
The catalog offers the hosted images free for diagram use; logos remain marks of
their respective owners and do not imply endorsement. No blanket software license
for every catalog graphic is assumed.

| File | Original URL | SHA-256 |
| --- | --- | --- |
| `react.svg` | https://icons.d2lang.com/dev/react.svg | `d0e9dc0b633d07be392250c600a0e32133277c5f6e6a8fddaae4d4ea5839b32c` |
| `vuejs.svg` | https://icons.d2lang.com/dev/vuejs.svg | `16c080853806a49cf4bfbc5349c605297d7da0b1e7444dad2778d639791aa518` |

Both SVGs contain paths/shapes only: no script, event handlers, foreignObject or
external references. Modern Angular diagrams deliberately do not use the
catalog's **Angularjs** logo: that would misidentify the framework.

`remarkD2.assetsRoot` allows only this directory. MDX references use relative local
paths; the build embeds data URLs into light/dark SVGs, so the reader need not
contact the catalog. Keep original bytes and update checksums/tests on review.
