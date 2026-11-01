# herdr-mods

Herdr mods and a layout of my own.

| Folder | What it is |
| --- | --- |
| `layouts/workbench.json` | **Workbench** layout, VS Code-like: horizontal activity bar in the sidebar, an editor area, a terminal panel below |
| `mods/activity/` | Every piece of the workbench: activity bar, Explorer, Search, Source Control, Remote Explorer, editor / viewers, title bar, panel bar |
| `mods/open-vscode/` | [CacaoRick/herdr-open-vscode](https://github.com/CacaoRick/herdr-open-vscode), unchanged: opens the focused pane's folder in VS Code (Remote-SSH for remote spaces) |

## Workbench layout

```
┌ sidebar ───────────┬ title bar: command center · toggles · window ┐
│ brand              ├──────────────────────────────────────────────┤
│ [≡][⧉][⌕][⑂][▤] [VS]│ editor area (hidden until a file is opened)  │
│ stack of views:    ├──────────────────────────────────────────────┤
│  Spaces & Agents   │ TERMINAL  tab1  tab2      + ▯ ˄ ×            │
│  Explorer          │ the active tab's terminals                   │
│  Search            │                                              │
│  Source Control    ├──────────────────────────────────────────────┤
│ footer             │ status                                       │
└────────────────────┴──────────────────────────────────────────────┘
```

- **Explorer**: tree rooted at the focused terminal's git repo (or folder), git marks, live updates.
  - Right-click: New File / New Folder, Open with System App, Open in Terminal, Reveal in File Manager, Download (remote), Cut / Copy / Paste, Copy Path / Copy Relative Path, Rename, Delete.
  - Keys (click the tree first): Ctrl+C / Ctrl+X / Ctrl+V, Delete, F2, Ctrl+Alt+C (path), Ctrl+Shift+Alt+C (relative path), ↑↓←→ Enter, Ctrl+A; Ctrl/Shift+click selects several.
  - Ctrl+V also pastes files copied in a file manager (text/uri-list, GNOME cut), or a copied picture as `image.png`.
  - Drag files from the desktop onto a folder (or the empty space below the tree) to copy them in, also to a remote machine.
  - Between machines files travel as a tar stream through `hc exec`; taken names become "name copy". Local deletes go to the Trash (`gio trash`); remote deletes are permanent (asked first).
- **Search**: ripgrep → `git grep` → `grep`; case / whole word / regex.
- **Source Control**: stage / unstage / discard per file or all, commit (Enter), pull (ff-only), push, recent commits; click a file for its diff.
- **Remote Explorer**: the ssh machines (`hc machine ls`: name, host, state only), their spaces, recent folders; Open Folder… browses a machine's folders and opens a space there. The title bar shows `SSH: <machine>`.
- **Editor**: syntax-highlighted editing, Ctrl+S saves, here or on a remote machine (refuses if the file changed since it was opened), Markdown preview, diffs, "Open in VS Code". Remote files are re-checked every 3 s.
- **Viewers**: images (png/jpg/gif/webp/bmp/svg, plus tiff/avif/ico through ffmpeg) with zoom; PDFs page by page with poppler (`pdftoppm`), only the pages on screen, at screen resolution, zoom 25–400%; audio/video info and a poster frame (ffprobe); other binary files show type and size. Remote files are downloaded to `mods/activity/.cache` first (in the background, with progress).
- Remote spaces are refreshed in one shell round trip per view (Explorer every 4 s, Source Control every 5 s).
- The editor area follows the active space (one open file per space).
- In other layouts the same mod opens the editor as a pane beside the terminal.

Built from Herdr's shipped `files` / `changes` mods and `workspace-chrome` icons.

## Install

```sh
./install.sh                      # copies mods/ and layouts/ into ~/.config/herdr-app
herdr-app do layout.switch --name workbench   # or Ctrl+Shift+L
```

The script **copies** instead of symlinking: Herdr doesn't hot-reload symlinked mod folders. Run it again after every edit.

Merge `keys.json` into `~/.config/herdr-app/keys.json` once:

| Key | Action |
| --- | --- |
| Ctrl+Alt+1…5 | Spaces & Agents / Explorer / Search / Source Control / Remote Explorer |
| Ctrl+\` | toggle the terminal panel |
| Ctrl+Alt+E | toggle the editor area |
| Ctrl+S / Ctrl+W (in the editor) | save / close |
| Ctrl+Shift+G | open the focused folder in VS Code (open-vscode) |

## Limits

- The editor can't jump to a line yet; search hits show "line N" in the header.
- Text files over 1 MB open in the viewer, not the editor (Herdr's readTextFile limit).
- No drag-and-drop inside the tree (moving): use Cut / Paste. Video doesn't play inside Herdr; "Open with System App" plays it.
- Needs locally: poppler-utils (PDF), ffmpeg (other images, media), wl-clipboard or xclip (file clipboard), gio (Trash).
