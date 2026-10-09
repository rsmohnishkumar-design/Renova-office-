# RENOVA OFFICE

**Renewing the Way You Work.**

Company website for RENOVA OFFICE, which builds practical, affordable digital tools and websites for small businesses.

Built with plain HTML, CSS and vanilla JavaScript. There is no build step, backend, database or paid service.

## Project status

**Phase 1: company website.** Home, About, Services, Products and Contact sections.

- All products are marked *Coming Soon*. None is built yet.
- The contact section shows a **placeholder email** (`hello@example.com`). There is no contact form.

## Structure

```
index.html        Page content
style.css         Styles. Brand colours are the variables at the top (:root)
script.js         Mobile menu, scroll animations, active nav link
assets/           Local images and icons (favicon.svg)
tools/            Reserved for future tools (see tools/README.md)
```

All local paths are relative, so the site works on GitHub Pages under a project sub-path.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Publish with GitHub Pages

1. Push to `main`.
2. On GitHub: **Settings → Pages → Build and deployment**.
3. Set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. The site appears at `https://rsmohnishkumar-design.github.io/Renova-office-/`.

A custom domain can be added later under the same Pages settings.

## Things to update

- [ ] Replace the placeholder email in `index.html` (search for `hello@example.com`).
- [ ] Replace the text logo with a real one, if desired (`.brand` in `index.html`, `assets/`).
- [ ] Change colours in `:root` in `style.css`.

## Adding future tools

Each tool gets its own folder under `tools/` with its own `index.html`, `.css` and `.js`, so tools stay independent of the main site. See `tools/README.md`. When a tool works, change its card in the Products section from "Coming Soon" to a link.
