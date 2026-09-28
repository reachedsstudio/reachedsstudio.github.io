# Reached Studio

Portfolio site for an architecture studio. Plain HTML, CSS and JS with no build step, published with GitHub Pages.

## Structure

```
index.html            Home: hero, selected work, studio, services, contact
project.html          Case-study page. Copy it for each project
assets/css/style.css  All styles. Colour tokens are at the top (light and dark)
assets/js/main.js     Theme toggle, mobile menu, header state, scroll reveals
assets/favicon.svg
images/work/          Placeholder line drawings
```

## Editing content

- **Projects**: each card in `index.html` (`#work`) links to a project page. Copy `project.html` (for example to `courtyard-house.html`), update the title, specs, text and images, then point the card's `href` at it.
- **Images**: replace the SVGs in `images/work/` with photographs. When you use a photo, **remove the `is-drawing` class** from its `<img>`. That class inverts line drawings in dark mode and would invert photos too.
  - Wide cards use a 4:3 frame and narrow cards use 4:5. Images are cropped to fit with `object-fit: cover`.
- **Contact**: replace `hello@example.com` and the `#` social links in `index.html`.
- **Theme**: follows the visitor's system setting by default. The toggle stores their choice in `localStorage`.

## Local preview

Serve the folder with any static server, for example `npx serve .` or `python -m http.server`, then open the local URL it prints.
