# Event Storming to JSON-LD Board

A simple, client-side web tool for creating Event Storming diagrams on a virtual canvas and exporting them to a spatial-heuristic-based JSON-LD format.

This entire application is self-contained in `index.html`, `style.css`, and `app.js` and runs entirely in the browser with no server-side backend required.

## Features

- **Interactive Canvas**: Pan and zoom an infinite canvas with a grid.
- **Sticky Notes**: Add, edit, delete, and resize stickies for core Event Storming concepts (`DomainEvent`, `Command`, `Aggregate`, etc.).
- **Bulk Actions**: Select multiple stickies (using `Shift/Ctrl/Cmd + Click` or `Cmd/Ctrl + A`) to move, resize, or delete them as a group.
- **Save/Load**: Save your work to a local `.json` file and load it back into the board later.
- **Export to JSON-LD**: Translates the spatial arrangement of stickies on the board into a structured JSON-LD graph. The translation uses heuristics, such as:
    - Events are ordered left-to-right to create a timeline (`precededBy`).
    - A `Command` triggers the closest `DomainEvent` to its right.
    - An `Aggregate` is the target of a `Command` placed below it.
    - The size of each sticky is included in the export.

## How to Use

### Running Locally

1. Clone this repository.
2. Open the `index.html` file in any modern web browser.

### Hosting on GitHub Pages

Since this is a static website, you can host it for free on GitHub Pages:

1. Push this repository to a new repository on your GitHub account.
2. In the repository settings, go to the **Pages** section in the left sidebar.
3. Under "Build and deployment", for the "Source", select **Deploy from a branch**.
4. Choose the `main` (or `master`) branch and keep the folder as `/ (root)`.
5. Click **Save**.

Your site will be live in a minute or two at a URL like `https://<your-username>.github.io/<your-repository-name>/`.