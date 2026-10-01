# Affix logo assets

Drop your SVGs here with these EXACT names. The suffix describes the **artwork
colour**, not the theme:

- `-dark`  = dark-coloured logo → use on **light** backgrounds
- `-light` = white/light logo   → use on **dark** backgrounds

| File                        | What it is                    | Used in                        |
| --------------------------- | ----------------------------- | ------------------------------ |
| `affix-wordmark-dark.svg`   | Long/horizontal logo, dark    | Header, Footer                 |
| `affix-wordmark-light.svg`  | Long/horizontal logo, white   | (dark sections, when needed)   |
| `affix-symbol-dark.svg`     | Icon only, dark               | Badges / favicon               |
| `affix-symbol-light.svg`    | Icon only, white              | Dark CTA block                 |

Once dropped, the running dev server hot-reloads and they appear automatically.

## Favicon (browser tab)
Also save the icon-only mark as `src/app/icon.svg` — Next.js picks it up
automatically for the browser tab. (Copy `affix-symbol-dark.svg` there.)
