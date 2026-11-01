// Remote Explorer, like VS Code's: the ssh machines Herdr knows (hc machine ls),
// their spaces, and "Open Folder…" to start a space in a folder there. Opening a
// folder makes a space on that machine; the Explorer, Search, Source Control and
// editor then work on it (files are read and saved over Herdr's connection).
//
// Only a machine's name, host and state are read from `hc machine ls`: its
// target (the ssh command) can hold secrets and is never kept or shown.
import { div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { hc, run, theme, spaces, shared, setShared } from "herdr";
import { iconButton, viewHeader, icon, basename } from "./common.js";
import { sh } from "./io.js";

const RECENT = "activity.remote.recent";
const DIRS = 'cd "$1" 2>/dev/null || exit 2; pwd; for p in * .[!.]* ..?*; do [ -d "$p" ] && [ ! -L "$p" ] && printf "%s\\n" "$p"; done | head -n 1000';

export default class Remote {
  init(_p, cx) {
    this.list = []; this.open = new Set(shared("activity.remote.open") ?? []); this.error = null;
    this.browse = null; // { on, path, dirs, loading, error }
    this.pathInput = InputState.new({ placeholder: "/path/to/folder" });
    this.pathInput.on("submit", (_e, cx) => this.go(this.pathInput.value().trim(), cx));
    this.load(cx);
    cx.timer.every(15000, (cx) => this.load(cx));
  }

  load(cx) {
    cx.spawn(async (cx) => {
      const r = await hc(["machine", "ls", "--json"]).catch(() => null);
      try {
        const all = JSON.parse(r?.stdout || "{}").machines ?? [];
        // Keep only what's shown.
        this.list = all.map((m) => ({ name: m.name, host: m.host ?? "", state: m.state ?? "unknown" }));
        this.error = null;
      } catch { this.error = r?.stderr?.trim() || "Cannot list the machines"; }
      cx.notify();
    });
  }

  toggle(name, cx) {
    this.open.has(name) ? this.open.delete(name) : this.open.add(name);
    setShared("activity.remote.open", [...this.open]);
    cx.notify();
  }

  // The folder browser: starts in the home folder there.
  startBrowse(on, cx) {
    this.browse = { on, path: null, dirs: [], loading: true };
    this.go("~", cx);
  }

  go(path, cx) {
    const b = this.browse;
    if (!b || !path) return;
    b.loading = true; b.error = null; cx.notify();
    cx.spawn(async (cx) => {
      const r = await sh(path === "~" ? `cd && ${DIRS.replace('cd "$1" 2>/dev/null || exit 2; ', "")}` : DIRS, [path], { on: b.on }).catch((e) => ({ code: 1, stderr: String(e) }));
      if (this.browse !== b) return;
      b.loading = false;
      if (r.code !== 0) { b.error = r.code === 2 ? `No such folder: ${path}` : r.stderr.trim() || "Cannot list this folder"; cx.notify(); return; }
      const [where, ...dirs] = r.stdout.split("\n").filter(Boolean);
      b.path = where; b.dirs = dirs.sort((x, y) => Number(x.startsWith(".")) - Number(y.startsWith(".")) || x.localeCompare(y));
      this.pathInput.set_value(where);
      cx.notify();
    });
  }

  openFolder(on, folder) {
    const recent = { ...(shared(RECENT) ?? {}) };
    recent[on] = [folder, ...(recent[on] ?? []).filter((f) => f !== folder)].slice(0, 6);
    setShared(RECENT, recent);
    const existing = spaces().find((s) => s.machine === on && s.folder === folder);
    if (existing) run("space.select", { id: existing.id });
    else run("space.new", { machine: on, folder, name: basename(folder) || folder });
    this.browse = null;
  }

  machineRow(m, t) {
    const open = this.open.has(m.name), ok = m.state === "connected";
    const color = ok ? t.ansi2 : m.state === "connecting" ? t.blocked : t.ansi1;
    return h_flex().id(`rm-${m.name}`).h(26).flex_none().pl(6).pr(6).gap(6).items_center().cursor_pointer().hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => this.toggle(m.name, cx))
      .child(icon(`chevron-${open ? "down" : "right"}`, 12).text_color(t.dim))
      .child(icon("server", 14).text_color(t.muted))
      .child(div().flex_none().max_w(120).truncate().child(m.name))
      .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).child(m.host))
      .child(div().size(7).rounded_full().flex_none().bg(color).tooltip(m.state))
      .child(iconButton(`rm-open-${m.name}`, "folder-open", `Open Folder on ${m.name}…`, (_e, cx) => this.startBrowse(m.name, cx), { size: 20, icon: 13 }))
      .child(iconButton(`rm-term-${m.name}`, "terminal", `New Terminal on ${m.name}`, () => run("space.new", { machine: m.name, name: m.name }), { size: 20, icon: 13 }));
  }

  spaceRow(s, t) {
    return h_flex().id(`rs-${s.id}`).h(24).flex_none().pl(42).pr(8).gap(6).items_center().cursor_pointer()
      .when(s.active, (el) => el.bg(t.selected)).hover((st) => st.bg(t.hover))
      .on_click(() => run("space.select", { id: s.id }))
      .child(icon("folder", 13).text_color(t.muted))
      .child(div().flex_none().max_w(140).truncate().child(s.name))
      .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).child(s.folder ?? ""))
      .when(Boolean(s.status), (el) => el.child(div().size(6).rounded(3).flex_none().bg(t[s.status] ?? t.dim)));
  }

  recentRow(on, folder, t) {
    return h_flex().id(`rr-${on}-${folder}`).h(24).flex_none().pl(42).pr(8).gap(6).items_center().cursor_pointer().text_color(t.muted)
      .hover((st) => st.bg(t.hover).text_color(t.foreground))
      .on_click(() => this.openFolder(on, folder))
      .child(icon("refresh", 12).text_color(t.dim))
      .child(div().flex_1().min_w(0).truncate().text_size(12).child(folder))
      .tooltip(`Open ${folder} on ${on} again`);
  }

  browser(t) {
    const b = this.browse;
    const row = (id, label, action, ico = "folder") => h_flex().id(id).h(24).flex_none().px(10).gap(6).items_center().cursor_pointer()
      .hover((s) => s.bg(t.hover)).on_click(action).child(icon(ico, 13).text_color(t.muted)).child(div().flex_1().min_w(0).truncate().child(label));
    const up = b.path && b.path !== "/" ? b.path.replace(/\/[^/]*$/, "") || "/" : null;
    return v_flex().flex_1().min_h(0)
      .child(h_flex().h(30).flex_none().px(10).gap(6).items_center()
        .child(div().flex_1().min_w(0).truncate().text_size(11).font_semibold().text_color(t.muted).child(`OPEN FOLDER ON ${b.on.toUpperCase()}`))
        .child(iconButton("rb-x", "x", "Cancel", (_e, cx) => { this.browse = null; cx.notify(); })))
      .child(div().px(10).pb(6).flex_none().child(Input.new(this.pathInput).h(28).px(8).rounded(6).border_1().border_color(t.input).bg(t.background).text_size(12)))
      .child(v_flex().id("rb-list").flex_1().min_h(0).overflow_y_scrollbar()
        .when(Boolean(up), (el) => el.child(row("rb-up", "..", (_e, cx) => this.go(up, cx), "arrow-up")))
        .children(b.dirs.map((d, i) => row(`rb-${i}`, d, (_e, cx) => this.go(`${b.path === "/" ? "" : b.path}/${d}`, cx))))
        .when(b.loading, (el) => el.child(div().px(12).py(6).text_size(12).text_color(t.dim).child("Loading…")))
        .when(Boolean(b.error), (el) => el.child(div().px(12).py(6).text_size(12).text_color(t.ansi1).child(b.error)))
        .when(!b.loading && !b.error && !b.dirs.length, (el) => el.child(div().px(12).py(6).text_size(12).text_color(t.dim).child("No folders inside"))))
      .child(h_flex().flex_none().p(10).gap(8).border_t(1).border_color(t.border)
        .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).child(b.path ?? ""))
        .child(div().id("rb-open").px(12).py(4).rounded(5).bg(t.solid).text_color(t.solid_foreground).text_size(12).cursor_pointer()
          .when(!b.path, (el) => el.opacity(0.5))
          .on_click(() => { if (b.path) this.openFolder(b.on, b.path); })
          .child("Open")));
  }

  render(cx) {
    const t = theme(), all = spaces(), recent = shared(RECENT) ?? {};
    const local = all.filter((s) => !s.machine);
    const body = this.browse ? this.browser(t) : v_flex().id("remote-list").flex_1().min_h(0).overflow_y_scrollbar().pb(8)
      .child(h_flex().h(26).flex_none().pl(6).pr(6).gap(6).items_center()
        .child(div().w(12).flex_none())
        .child(icon("layout-editor", 14).text_color(t.muted))
        .child(div().flex_1().min_w(0).truncate().child("This Computer")))
      .children(local.map((s) => this.spaceRow(s, t)))
      .child(div().h(1).mx(8).my(6).flex_none().bg(t.border))
      .children(this.list.flatMap((m) => {
        const rows = [this.machineRow(m, t)];
        if (this.open.has(m.name)) {
          const mine = all.filter((s) => s.machine === m.name);
          rows.push(...mine.map((s) => this.spaceRow(s, t)));
          const used = new Set(mine.map((s) => s.folder));
          rows.push(...(recent[m.name] ?? []).filter((f) => !used.has(f)).map((f) => this.recentRow(m.name, f, t)));
          if (!mine.length && !(recent[m.name] ?? []).length)
            rows.push(div().pl(42).py(4).text_size(12).text_color(t.dim).child("No spaces yet: Open Folder… starts one"));
        }
        return rows;
      }))
      .when(!this.list.length, (el) => el.child(div().px(14).py(8).text_size(12).text_color(t.dim).child(this.error ?? "No machines added yet")));
    return v_flex().id("activity-remote").size_full().min_h(0).bg(t.chrome).text_color(t.foreground).text_size(13)
      .child(viewHeader("Remote Explorer", [
        iconButton("rm-add", "plus", "Add Machine…", () => run("mod.open", { name: "machine-add" })),
        iconButton("rm-refresh", "refresh", "Refresh", (_e, cx) => this.load(cx)),
      ]))
      .child(body);
  }
}
