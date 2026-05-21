# sk_phoenix

Personal website for **Sibi V. Kaitharath** — Systems Architecture · Quantitative Logic · Derivatives Engineering.

## Design

- Black & white, high-contrast monochromatic aesthetic
- Bebas Neue display typeface (bold, cinematic)
- Inter for body text (light weight, airy)
- Animated hero with dramatic portrait, custom cursor, scroll-reveal sections
- Inspired by: minimal editorial design (INFINITE MACHINE reference)

## Stack

| Layer       | Tech                  |
|-------------|-----------------------|
| Frontend    | Static HTML/CSS/JS    |
| Web server  | nginx (alpine)        |
| Container   | Podman                |
| Hosting     | Linux server, port 8090 |

## File Structure

```
sk_phoenix/
├── index.html          # Single-page site
├── css/style.css       # All styles
├── js/main.js          # Cursor, scroll reveal, parallax
├── assets/me.jpeg      # Portrait image
├── nginx.conf          # nginx server config
├── Dockerfile
└── README.md
```

## Build & Run

```bash
# Stop and remove old container/image (always do this before rebuilding)
podman stop sk_phoenix 2>/dev/null; podman rm sk_phoenix 2>/dev/null
podman rmi sk_phoenix:latest 2>/dev/null

# Build fresh image
podman build -t sk_phoenix:latest .

# Run on port 8090
podman run -d --name sk_phoenix -p 8090:80 sk_phoenix:latest
```

Visit: `http://<server-ip>:8090`

## Sections

1. **Hero** — Full viewport with portrait, massive Bebas Neue name, tagline
2. **About** — Intro paragraph
3. **Core Capabilities** — 6-item two-column grid
4. **Philosophy** — Large display quote
5. **Areas of Focus** — Numbered list with hover-dim effect
6. **Footer** — Minimal nav + copyright

## Updating

After any change:
1. Rebuild the image (see Build & Run above)
2. Commit and push to GitHub

```bash
git add -A
git commit -m "your message"
git push origin main
```
