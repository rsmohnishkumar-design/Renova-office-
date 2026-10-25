# Nova Office — website

A multi-page, static redesign of the Nova Office (formerly Renova Office)
site: separate pages instead of one long scrolling page, a new visual
identity, and basic SEO setup.

## What's in this folder

```
index.html         Home
about.html          About Us
services.html       Services
products.html       Products
our-work.html       Our Work
contact.html        Contact Us
css/styles.css       All styling
js/main.js           Mobile nav + scroll-reveal animation
sitemap.xml
robots.txt
tools/billing/        Billing app (Firebase)
```

## The Billing App

The working billing app lives in `tools/billing/` (Firebase-backed) and is linked from the Products and Our Work pages.

## Deploying to GitHub Pages

1. In your existing repository (`Renova-office-`), delete the old
   `index.html` and any old page/section files you're replacing, but
   **keep the `tools/billing/` folder**.
2. Copy every file from this package into the repository root,
   preserving the folder structure (`css/`, `js/`, the six `.html`
   files, `sitemap.xml`, `robots.txt`).
3. Put your real `tools/billing/` folder back (see above).
4. Commit and push to the branch GitHub Pages serves from (usually
   `main`).
5. In the repo's **Settings → Pages**, confirm the Pages source is
   still set correctly — no change needed if it was already working.
6. Visit `https://rsmohnishkumar-design.github.io/Renova-office-/` and
   click through all six nav links, on both desktop and phone, to
   confirm everything loads.

## If you rename the repository

The site currently assumes the URL
`https://rsmohnishkumar-design.github.io/Renova-office-/`. All
internal links are relative, so renaming the repo won't break
navigation — but the **canonical URLs, Open Graph tags, sitemap.xml,
and robots.txt** all hard-code that address for SEO purposes. If you
rename the repo (e.g. to `Nova-office`), do a find-and-replace for
`rsmohnishkumar-design.github.io/Renova-office-` across all files and
swap in the new address.

## Design notes

- **Palette:** deep ink navy (`#0e2235`) + warm bronze accent
  (`#b8793b`) on an ivory background — a deliberately non-generic,
  editorial-corporate look rather than a default blue SaaS gradient.
- **Type:** Fraunces (serif, headings) + Inter (sans, body), loaded
  from Google Fonts.
- **Motion:** a light scroll-reveal fade on each section, and it's
  disabled automatically for visitors with "reduce motion" turned on.
- **Accessibility:** visible focus states, a skip-to-content link,
  and color contrast checked against the background.

## Content honesty — what I did and didn't invent

Per your brief, I didn't fabricate anything:
- **Founder:** Mohnish Kumar, as you gave it to me. No invented bio,
  achievements, or history.
- **Our Work:** shows only the Billing App, since that's the one
  confirmed live project. Add more here once something else is
  genuinely shipped.
- **Products:** unfinished products are clearly marked "Coming Soon."
- **SEO:** I added the structural pieces (meta tags, sitemap, JSON-LD,
  robots.txt) but did **not** set up or claim Google Search Console
  verification — that requires a verification code tied to your own
  Google account, which I don't have. See "Remaining steps" below.

## Remaining steps (things I couldn't do for you)

1. **Copy in the real `tools/billing/` folder** (see above) — the
   site won't fully work without it.
2. **Google Search Console:** go to search.google.com/search-console,
   add the property with your live URL, and verify ownership (DNS or
   HTML-tag method). Then submit `sitemap.xml` from inside the
   console.
3. **Favicon:** I used a simple generated "N" mark as a placeholder
   icon. Swap `<link rel="icon" ...>` in each page's `<head>` for a
   real logo file if you have one.
4. **Contact form:** the form submits via `mailto:`, which opens the
   visitor's own email app addressed to
   `renovaoffice.support@gmail.com` — no backend required, and it
   actually sends (no fake submission). If you'd rather capture
   submissions directly (e.g. with Formspree), let me know and I can
   wire that in instead.
5. **Test on a real phone/tablet**, not just a resized browser window,
   before calling it done.
