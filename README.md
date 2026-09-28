# Reached Studio

Portfolio site for an architecture studio. Plain HTML, CSS and JS with no build step, published with GitHub Pages.

## Structure

```
index.html            Home, laid out as a drawing sheet: manifesto, plate,
                      specimen index (hover previews), material ticker, contact
project.html          Case-study page. Copy it for each project
assets/css/style.css  All styles. Colour tokens are at the top (light and dark)
assets/js/main.js     Theme toggle, mobile menu, header state, scroll reveals
assets/favicon.svg
images/work/          Placeholder line drawings
```

## Editing content

- **Projects**: each row of the index in `index.html` (`#index`) links to a project page. Copy `project.html` (for example to `courtyard-house.html`), update the title, specs, text and images, then point the row's `href` at it.
- **Images**: see *Adding renders* below. The home plate and project cover use 16:9 and the project gallery uses 4:5. Index previews show each image at its own shape. Images are cropped to fit their frames.
- **Contact**: replace `hello@example.com` and the `#` social links in `index.html`.
- **Theme**: dark by default. The toggle switches to a light sheet and remembers the choice in `localStorage`.

## Adding renders

1. Export renders (JPG or PNG, any size) into the `renders/` folder. This folder is not committed.
2. Name each file after the placeholder it replaces. Capitals and spaces are fine (`Courtyard House.png` works):

   | Name | Replaces |
   |---|---|
   | `hero` | Plate under the manifesto on the home page |
   | `courtyard-house` | Index entry 01 and its project page cover |
   | `tower`, `interior`, `library`, `pavilion`, `section` | Index entries 02–06 |
   | `courtyard-house-site-plan`, `courtyard-house-section`, `courtyard-house-interior` | Project page gallery |

3. Double-click `tools/add-renders.cmd`, or run:

   ```
   powershell -ExecutionPolicy Bypass -File tools/add-renders.ps1
   ```

   Add `-Push` to also commit and push. The script saves a resized, compressed JPG to `images/work/`, points the matching `<img>` tags at it, and prints any files it couldn't match along with the valid names. Dropping in an updated render with the same name replaces the old one.
4. Update the `alt` text of the changed images so it describes the render.

## Local preview

Serve the folder with any static server, for example `npx serve .` or `python -m http.server`, then open the local URL it prints.
