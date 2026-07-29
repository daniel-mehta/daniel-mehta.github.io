# daniel-mehta.github.io

Daniel Mehta's static portfolio and travel-photo archive.

## Add photographs

1. Put optimized `.jpg`, `.png`, `.webp`, or `.avif` files in `assets/photos/`.
2. Add one object per image to `window.PHOTO_MANIFEST` in `assets/photos.js`.
3. Include `src`, descriptive `alt` text, and a two-letter `countryCode`. Caption, location, date, and featured status are optional.

The photo page creates filters and map counts from the manifest automatically.

## Local preview

Serve the repository root with any static HTTP server, then open `index.html`.
The production site requires no build step.
