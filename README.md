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
- **Images**: see *Adding renders* below. Wide cards use a 4:3 frame, narrow cards and the project gallery use 4:5, and the home hero and project cover use 16:9. Images are cropped to fit.
- **Contact**: replace `hello@example.com` and the `#` social links in `index.html`.
- **Theme**: follows the visitor's system setting by default. The toggle stores their choice in `localStorage`.

## Adding renders

1. Export renders (JPG or PNG, any size) into the `renders/` folder. This folder is not committed.
2. Name each file after the placeholder it replaces. Capitals and spaces are fine (`Courtyard House.png` works):

   | Name | Replaces |
   |---|---|
   | `hero` | Large image at the top of the home page |
   | `courtyard-house` | Courtyard House card and its project page cover |
   | `tower`, `interior`, `library`, `pavilion`, `section` | The other five home page cards |
   | `courtyard-house-site-plan`, `courtyard-house-section`, `courtyard-house-interior` | Project page gallery |

3. Double-click `tools/add-renders.cmd`, or run:

   ```
   powershell -ExecutionPolicy Bypass -File tools/add-renders.ps1
   ```

   Add `-Push` to also commit and push. The script saves a resized, compressed JPG to `images/work/`, points the matching `<img>` tags at it, and prints any files it couldn't match along with the valid names. Dropping in an updated render with the same name replaces the old one.
4. Update the `alt` text of the changed images so it describes the render.

## Local preview

Serve the folder with any static server, for example `npx serve .` or `python -m http.server`, then open the local URL it prints.
