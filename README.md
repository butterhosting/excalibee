# Excaliself

Self-hosted [Excalidraw](https://excalidraw.com) with a library: drawings are stored on your own server, in nested
folders, with thumbnails and full-text search over the text inside them. By [Butterhost.ing](https://butterhost.ing).

## Run

```sh
bun install
bun start:dev          # http://localhost:3000
```

`bun tc`, `bun lint` and `bun test:unit` are the gates; `bun e2e:headless` drives the production image through Playwright.
`./image.sh create` builds that image from the `Dockerfile` (`--stage` picks the `.env.*` to bake in); `bun dev` runs it in compose on `Dockerfile.dev`.

## How it stores things

Everything lives in one SQLite file under `EXCALISELF_ROOT`. A drawing's metadata (`drawing`) is kept apart from its scene
and thumbnail (`drawing_content`) so that listing the library never reads the heavy rows. Folders nest through a self
reference, and the foreign keys cascade: deleting a folder takes its subfolders and drawings with it.

The editor autosaves a debounced 1.5 s after the last change and renders the thumbnail itself; the server derives the search
text from the scene on every save. Excalidraw's fonts and locales are served from the installed package (`/excalidraw/*`),
so nothing is fetched from a CDN.
