# WebP فارسی

A lightweight, client-side image converter for converting images to WebP format — built for Persian-speaking web developers and designers.

## Features

- **Drag & drop or click to upload** — select multiple images at once
- **Batch conversion** — convert all files in one click
- **Quality control** — fine-tune output quality with a live slider (1–100)
- **Lossless mode** — preserve full image data without compression loss
- **Before/after preview** — compare original and converted images side by side
- **Size statistics** — see original size, WebP size, and percentage reduction per file
- **Individual downloads** — download each converted file with one click
- **Dark/light mode** — persists across sessions via `localStorage`
- **Fully responsive** — works on mobile, tablet, and desktop
- **Privacy-first** — no server uploads, no analytics, no external image APIs

## Tech Stack

- HTML5
- CSS3 (custom properties, RTL layout)
- Vanilla JavaScript (Canvas API for conversion)

## How It Works

Images are decoded by the browser's native image decoder and drawn onto an off-screen `<canvas>` element. The canvas is then encoded to WebP using `canvas.toBlob('image/webp', quality)`. No libraries, no server, no upload.

## Privacy

Images are never sent to a server. All processing happens inside the browser. Object URLs created during conversion are explicitly revoked after use to avoid memory leaks.

## Browser Compatibility

WebP encoding is supported in all modern browsers (Chrome, Edge, Firefox 96+, Safari 14+). Input format support depends on the browser's own image decoder:

| Format | Support |
|--------|---------|
| JPG / JPEG | All browsers |
| PNG | All browsers |
| GIF | All browsers |
| BMP | All browsers |
| TIFF | Varies by browser |
| AVIF | Modern browsers (Chrome 85+, Firefox 93+, Safari 16+) |

If a browser cannot decode a selected format, a Persian error message is shown and the other files continue converting normally.

## Getting Started

This is a fully static project. No build step required.

**Option 1 — Open directly:**

```
open index.html
```

**Option 2 — Local server (recommended for full feature testing):**

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

Then visit `http://localhost:8080`.

## Author

Taha Fathalizadeh

## License

MIT — see [LICENSE](LICENSE).
