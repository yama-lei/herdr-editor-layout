# AGENTS.md

Notes for coding agents working on this repo: Herdr app mods plus a VS Code-like
"workbench" layout. Read `README.md` for what the features are. Read
`~/.config/herdr-app/AGENTS.md` for the Herdr app itself (layouts, keys, mods,
the `herdr` / `gpui-kit` / `gpui-base` APIs). That file is rewritten on every
app start, so it is always current. The type files `mods/*/gpui-kit.d.ts` are
the API reference: grep them before you guess a method name.

## Layout

| Path | What |
| --- | --- |
| `layouts/workbench.json` (+ `.svg` preview) | The workbench layout: sidebar with an activity bar and stacked views, title bar, editor area, terminal panel. |
| `mods/activity/` | One mod, many views. The block's `props.view` picks one (see `main.js`'s `VIEWS`). |
| `mods/activity/main.js` | Dispatches to a view class: `init(props, cx)`, `render(cx)`, optional `release()`. |
| `common.js` | Shared helpers: `MOD`, `icon(name, size)` (monochrome UI icons in `icons/`), `iconButton`, `viewHeader`, editor spec helpers (`editorKey`, `editorSpec`, `setEditorSpec`, `openInEditor`), `location()` (the focused folder / machine). |
| `bar.js`, `titlebar.js`, `panelbar.js` | Activity bar, title bar (command center, `SSH: <machine>` chip), terminal panel header. |
| `files.js` | Explorer: tree, git marks, selection, keys, drag and drop. It does every file operation (`perform`). |
| `fileops.js` | The Explorer's right-click popup (`FileMenu`) and its dialogs (`FilePrompt`). Both are short-lived overlays that post a request to the Explorer and then close. |
| `spaces.js` | Spaces by machine (local + `hc machine ls`), tabs, Open Folder… browser, recent folders. Right-click reuses Herdr's `menu` mod. |
| `agents.js`, `sessions.js` | Agents: live `agents()` matched to session files (same agent + cwd), and session history. `sessions.js` embeds a python3 scanner run through `sh` (so it works over ssh) that keeps the sessions whose cwd is inside the workspace folder (plus a few in live agents' folders) and reads only the head and tail of each file: Claude Code, Codex, pi / omp (`~/.{pi,omp}/agent/sessions`), opencode (sqlite db or JSON). The Python is inside a `String.raw` template, so it must not use backticks or `${`. |
| `search.js`, `git.js` | Search, Source Control. |
| `editor.js` | Editor area / pane: text (EditorState), diffs, Markdown edit / split / preview, and it hosts `viewer.js`. |
| `viewer.js` | Image, PDF (poppler), media (ffprobe) and binary viewers, with zoom (buttons, Ctrl+wheel). |
| `io.js` | Local and remote file I/O: `sh`, `stat`, `fetchToCache`, `writeRemoteText`, `job`, `transfer`, `remove`, `rename`, `create`, clipboard. |
| `ficons/` | Material file icons: `svg/` (1184 SVGs), `table.js` (the name → icon tables), `index.js` (`fileIcon` / `fileImage`). Vendored from amster93/herdr-file-icons (Apache-2.0), which builds them from Material Icon Theme (MIT). Keep the LICENSE files. |
| `mods/open-vscode/` | Third-party mod (CacaoRick/herdr-open-vscode), unchanged. Don't edit it. |
| `keys.json` | Bindings to merge into `~/.config/herdr-app/keys.json`. |

## Workflow

1. Edit files in this repo, never in `~/.config/herdr-app/mods/...`. Those are copies.
2. Run `./install.sh`. It **copies** (rsync) because Herdr doesn't hot-reload symlinked mods, and it runs `herdr-app check` on each mod. The app reloads within a second.
3. If you changed `keys.json`, merge the change into `~/.config/herdr-app/keys.json` too. Edit that file as JSON and keep the user's other keys.
4. Run `herdr-app status` and look at `"errors": []`.

Notes on checking:

- `herdr-app check <dir>` only renders the view the mod opens by default. To check another view, copy the installed mod to `/tmp/actcheck-<view>`. In that copy, change `main.js` so the line `const p = { ...(initProps ?? {}), ...(herdrProps() ?? {}) };` becomes `const p = { view: "<view>" };`. Then run `herdr-app check` on the copy and delete it afterwards.
- For the editor, also hardcode a file `spec` in the copy (in place of `props()?.spec`) so that a real file renders.
- `herdr-app shot` returns the last frame drawn. While the window is hidden that frame is stale, so don't take it as proof that a change works.
- `io.js` has no UI. Test it under node with a small shim for `herdr` (`exec`, `hc`) against a temp folder and, if one is connected, a remote machine.

## Herdr / gpui gotchas (learned the hard way)

- **No `setTimeout` / `setInterval`.** Use `await cx.sleep(ms)`, `cx.timer.after(ms, fn)` or `cx.timer.every(ms, fn)`. The timers return a task with `cancel()`. Cancel them in `dispose()` / `release()`.
- **Never call `cx.notify()` synchronously during render.** That includes the part of a `cx.spawn(async ...)` body before its first `await`. Work started from `render` (e.g. `files.js` `takeRequest`) is deferred with `cx.timer.after(0, ...)`.
- Don't name a method after a property (`this.key` vs `key()` broke the editor; it's `slotKey()` now).
- `exec` is text only, with a 30 s timeout and 8 MiB of output. `readTextFile` stops at 1 MB. `writeTextFile` and `watchFolder` only work locally.
- Binary data and remote files go through `hc exec [--on M] [-i] [--timeout N] -- argv`, which keeps bytes intact. `image()` paths are relative to the app home, so remote images and PDF pages are cached under `mods/activity/.cache/`. Give each cached file a unique name, because gpui caches images by path.
- `shared` / `setShared` re-render every mod. Keep values small and never write to them in a loop.
- Overlays (`openOverlay` with `kind: "popup" | "dialog"`) are separate view instances. Pass data through `props`, and get results back through `shared`.
- Wheel events bubble from the innermost element outwards, and a scroll container can consume them. To intercept one (Ctrl+wheel zoom), put `on_scroll_wheel` on the scrolled content, not on an ancestor, and call `cx.stop_propagation()`.

## Shared state keys

| Key | Value |
| --- | --- |
| `activity.editor` | `{ [slot]: spec }`. The slot is `@area:<spaceId>` in the workbench's editor area, otherwise a tab id. spec = `{ kind: "file" \| "diff", path, root, rel, on?, line?, staged?, asText? }`. |
| `activity.fileop` | One request from the menu or dialogs to the Explorer: `{ op, target, seq, at }`. The Explorer remembers `seq` so it runs each request once. |
| `activity.clip` | The Explorer's own clipboard: `{ items: [{ path, on }], cut }`. Ctrl+V falls back to the system clipboard (uri-list, gnome-copied-files, image). |
| `activity.spaces.folded`, `activity.remote.recent` | Spaces: folded machine groups; recent folders per machine (`@local` for this one). |

## Remote I/O patterns

- **One round trip per refresh.** The Explorer and Source Control send one shell script that prints sections separated by `SEP` (`"\n@@HERDR-SEP@@\n"`). Remote spaces poll (Explorer every 4 s, git every 5 s), because `watchFolder` is local only.
- **Long work** (copies, tar transfers, downloads) runs as a detached job (`io.js` `job`). The job is started with `setsid`, and its exit code is polled from a temp folder, so the 30 s `exec` limit doesn't apply.
- **Between machines**, items travel as a tar stream: `hc exec --on A tar c | hc exec --on B tar x`. Names that are taken become "name copy", "name copy 2". Refuse to put a folder inside itself.
- **Saving remotely** (`writeRemoteText`) checks that the file hasn't changed since it was opened, and refuses if it has.
- Shell scripts take paths as positional arguments (`"$1"`), never interpolated. Avoid shell keywords as variable names (`do`, `done`, `in`).

## Security

- `hc machine ls --json` returns each machine's `target`, the ssh command. It can contain plaintext passwords (sshpass). **Never print, log, copy, store or display `target`.** Read only `name`, `host` and `state`, as `spaces.js` does.
- Remote deletes are permanent (`rm -rf`), so always confirm them in a dialog first. Local deletes go to the Trash (`gio trash`).

## Style

- Plain ES modules, no build step and no dependencies beyond what Herdr provides.
- Comments explain *why* and any user-visible behaviour. Keep the header comment of each file accurate.
- Keep the UI close to VS Code (names, shortcuts, menu order) unless Herdr can't do it.
- Local tools the features rely on: poppler-utils, ffmpeg/ffprobe, wl-clipboard or xclip, gio, rg (optional). Degrade with a clear message when a tool is missing.
- Update `README.md` (features, keys, limits, credits) together with the code.
