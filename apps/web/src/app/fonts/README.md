# Quinea Round (headline font)

Self-hosted via `next/font/local`. Drop the font files here with these names.
`.woff2` is strongly preferred (smallest + fastest); `.otf` / `.ttf` also work
— just change the extension in `layout.tsx` to match.

| Weight            | Filename (preferred)          |
| ----------------- | ----------------------------- |
| Regular (400)     | `QuineaRound-Regular.woff2`   |
| Medium (500)      | `QuineaRound-Medium.woff2`    |
| SemiBold (600)    | `QuineaRound-SemiBold.woff2`  |
| Bold (700)        | `QuineaRound-Bold.woff2`      |

You don't need all four. **Minimum: Regular + Bold.** Tell me which weights you
actually have and I'll wire exactly those into `layout.tsx` (declaring a file
that doesn't exist makes the build fail, so I match reality).

Have only `.otf`/`.ttf`? Either drop those (I'll update the extension), or
convert once at https://cloudconvert.com/ttf-to-woff2 for smaller files.
