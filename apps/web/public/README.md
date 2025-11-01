# Public Assets

This folder contains static assets that are served directly by Next.js.

## Current Files

- `favicon.ico` - Browser favicon (500x500 PNG, auto-served by Next.js)
- `poic-favicon.png` - POIC logo/favicon source (500x500)
- `images/` - Store additional images like banners, screenshots, etc.

## Usage

Files in this directory can be referenced from the root `/`:

```tsx
// Example: referencing an image
<img src="/images/logo.png" alt="Logo" />

// Favicon is automatically picked up from /favicon.ico
```

## Metadata Configuration

Favicon and OG tags are configured in `app/layout.tsx`:
- Favicon: `/poic-favicon.png`
- OpenGraph image: `/poic-favicon.png`
- Twitter card image: `/poic-favicon.png`

## Optional Improvements

- Create `og-image.png` (1200x630) - Optimized Open Graph image for social sharing
- Create `apple-touch-icon.png` (180x180) - iOS home screen icon
