# herdr-mods

Herdr mods and a layout of my own.

| Folder | What it is |
| --- | --- |
| `layouts/workbench.json` | **Workbench** layout, VS Code-like: horizontal activity bar in the sidebar, an editor area, a terminal panel below |
| `mods/activity/` | Every piece of the workbench: activity bar, Spaces, Agents, Explorer, Search, Source Control, editor / viewers, title bar, panel bar |
| `mods/open-vscode/` | [CacaoRick/herdr-open-vscode](https://github.com/CacaoRick/herdr-open-vscode), unchanged: opens the focused pane's folder in VS Code (Remote-SSH for remote spaces) |

## Workbench layout

```
┌ sidebar ───────────┬ title bar: command center · toggles · window ┐
│ brand              ├──────────────────────────────────────────────┤
│ [≡][☺][⧉][⌕][⑂] [VS]│ editor area (hidden until a file is opened)  │
│ stack of views:    ├──────────────────────────────────────────────┤
│  Spaces / Agents   │ TERMINAL  tab1  tab2      + ▯ ˄ ×            │
│  Explorer          │ the active tab's terminals                   │
│  Search            │                                              │
│  Source Control    ├──────────────────────────────────────────────┤
│ footer             │ status                                       │
└────────────────────┴──────────────────────────────────────────────┘
```

- **Explorer**: tree rooted at the focused terminal's git repo (or folder), git marks, live updates, VS Code's Material file icons (also in Search, Source Control and the editor header).
  - Right-click: New File / New Folder, Open with System App, Open in Terminal, Reveal in File Manager, Download (remote), Cut / Copy / Paste, Copy Path / Copy Relative Path, Rename, Delete.
  - Keys (click the tree first): Ctrl+C / Ctrl+X / Ctrl+V, Delete, F2, Ctrl+Alt+C (path), Ctrl+Shift+Alt+C (relative path), ↑↓←→ Enter, Ctrl+A; Ctrl/Shift+click selects several.
  - Ctrl+V also pastes files copied in a file manager (text/uri-list, GNOME cut), or a copied picture as `image.png`.
  - Drag files from the desktop onto a folder (or the empty space below the tree) to copy them in, also to a remote machine.
  - Between machines files travel as a tar stream through `hc exec`; taken names become "name copy". Local deletes go to the Trash (`gio trash`); remote deletes are permanent (asked first).
- **Search**: ripgrep → `git grep` → `grep`; case / whole word / regex.
- **Source Control**: stage / unstage / discard per file or all, commit (Enter), pull (ff-only), push, recent commits; click a file for its diff.
- **Spaces**: every space grouped by machine (This Computer, then each ssh machine from `hc machine ls`: name, host, state only), with branch, agent status and its tabs (fold open). Per machine: Open Folder… (browse its folders, open a space there), New Space, recent folders. Right-click a space or tab for Herdr's menu (rename, worktrees, close). The title bar's `SSH: <machine>` opens it.
- **Agents**: *Running* lists the live agents with the conversation's title, model, status (working for how long / needs you / done / idle) and where they run; click to go to it. *History* lists only the open workspace's sessions: those whose folder is inside the active space's folder (symlinks included), read on that space's machine by python3. It reads Claude Code (`~/.claude/projects`), Codex (`~/.codex/sessions`), pi (`~/.pi/agent/sessions`), omp (`~/.omp/agent/sessions`) and opencode (`~/.local/share/opencode`, the database or the older JSON files). Each row shows its title or first prompt, age, agent, model, branch and, for a session started in a subfolder, that subfolder. Click resumes it in a new tab (`claude --resume`, `codex resume`, `pi --session`, `omp --resume`, `opencode --session`). Shift+click forks it (Claude Code, Codex, pi). `sshpass -p` passwords typed into prompts are masked. Inspired by [atuinsh/herdr-atuin-threads](https://github.com/atuinsh/herdr-atuin-threads), without needing Atuin.
- **Editor**: syntax-highlighted editing, Ctrl+S saves, here or on a remote machine (refuses if the file changed since it was opened), Markdown with a live side-by-side preview (the header button or Ctrl+Shift+V cycles split → preview only → edit only; the divider drags), diffs, "Open in VS Code". Remote files are re-checked every 3 s.
- **Viewers**: images (png/jpg/gif/webp/bmp/svg, plus tiff/avif/ico through ffmpeg) with zoom; PDFs page by page with poppler (`pdftoppm`), only the pages on screen, at screen resolution, zoom 25–400% (buttons or Ctrl + mouse wheel / trackpad, also for images); audio/video info and a poster frame (ffprobe); other binary files show type and size. Remote files are downloaded to `mods/activity/.cache` first (in the background, with progress).
- Remote spaces are refreshed in one shell round trip per view (Explorer every 4 s, Source Control every 5 s).
- The editor area follows the active space (one open file per space).
- In other layouts the same mod opens the editor as a pane beside the terminal.

Built from Herdr's shipped `files` / `changes` mods and `workspace-chrome` icons. File icons (`mods/activity/ficons/`) come from [amster93/herdr-file-icons](https://github.com/amster93/herdr-file-icons) (Apache-2.0), generated from [Material Icon Theme](https://github.com/material-extensions/vscode-material-icon-theme) 5.40.0 (MIT); both licenses are in that folder.

## Install

```sh
./install.sh                      # copies mods/ and layouts/ into ~/.config/herdr-app
herdr-app do layout.switch --name workbench   # or Ctrl+Shift+L
```

The script **copies** instead of symlinking: Herdr doesn't hot-reload symlinked mod folders. Run it again after every edit.

Merge `keys.json` into `~/.config/herdr-app/keys.json` once:

| Key | Action |
| --- | --- |
| Ctrl+Alt+1…5 | Spaces / Agents / Explorer / Search / Source Control |
| Ctrl+\` | toggle the terminal panel |
| Ctrl+Alt+E | toggle the editor area |
| Ctrl+S / Ctrl+W (in the editor) | save / close |
| Ctrl+Shift+V (in the editor) | Markdown: split / preview / edit |
| Ctrl+Shift+G | open the focused folder in VS Code (open-vscode) |

## Limits

- The editor can't jump to a line yet; search hits show "line N" in the header.
- Text files over 1 MB open in the viewer, not the editor (Herdr's readTextFile limit).
- No drag-and-drop inside the tree (moving): use Cut / Paste. Video doesn't play inside Herdr; "Open with System App" plays it.
- Agents' history needs python3 on the machine. Other agents' sessions (Gemini CLI, Amp, …) aren't read. omp and opencode can't fork from the list (Shift+click resumes). opencode sessions show no model or prompt, only their title.
- Needs locally: poppler-utils (PDF), ffmpeg (other images, media), wl-clipboard or xclip (file clipboard), gio (Trash).
