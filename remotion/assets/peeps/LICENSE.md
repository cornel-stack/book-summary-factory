# Open Peeps — vendored parts (licensing)

## Artwork: Open Peeps — **CC0 1.0 (public domain)**
The illustration artwork in `raw/` is from **Open Peeps** by **Pablo Stanley**
(https://www.openpeeps.com), released under **CC0 1.0 Universal (public
domain dedication)**. CC0 permits commercial use, modification, and
redistribution **with no attribution required**. We vendor only the specific
parts we use (a hair + face subset), as allowed.

> "Open Peeps is a hand-drawn illustration library… released under the CC0
> license. You can use them freely without attribution." — openpeeps.com

## How these files were obtained (provenance)
The raw part files in `raw/*.js` were extracted from the **react-peeps** npm
package v0.1.10 (https://github.com/CeamKrier/react-peeps), a faithful port of
the Open Peeps artwork into React/SVG. That port's *code* is MIT-licensed
(Copyright © 2020–present Emre Çakır); the *artwork paths* it carries are the
CC0 Open Peeps designs. We extract only the SVG path data (the CC0 artwork)
into `remotion/src/drawing/peeps.ts` via `pipeline/extract_peeps.ts`.

MIT notice for the port (included out of caution, though we ship only the
CC0 artwork, not the port's code):

```
MIT License — Copyright (c) 2020-present, Emre Çakır.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software… (full text: https://github.com/CeamKrier/react-peeps/blob/master/LICENSE)
```

## NOT vendored
- **Humaaans** (by Pablo Stanley) — free for commercial use but **may not be
  redistributed as a library**. Deliberately excluded from this repo.

## Parts vendored here
Hair: `Short`, `Bun`, `Bald`, `ShortMessy`, `Pomp`, `MediumShort`, `Long`.
Faces: `Calm`, `Smile`, `Concerned`, `Awe`, `Angry`, `Tired`, `Suspicious`.
(Phase 8 fusion spike + Phase 9/10 crowd-tier variety.)
