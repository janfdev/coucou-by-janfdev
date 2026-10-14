// Island views — DOM ports of IslandViewContent.swift. Paddings, font sizes,
// colours and wording are copied from the Swift views so both platforms read
// identically.

import { h, svg, clear, dot } from "./dom";
import { ICONS } from "./icons";
import { Ticker } from "./ticker";
import { State, type AgentTask, type HatKind, type GlassesKind, type ThemeKind, type SoundPackKind } from "../core/state";
import { Sound } from "../core/sound";
import { Bridge } from "../core/bridge";
import { washRGBA, type IslandViewName, type Wash } from "../core/layout";
import { createMiniBot, pruneMiniBots } from "../mochi/minibots";
import { buildPrompt } from "./chat";
import { buildChoose, buildUpload, buildUploading } from "./upload";
import { renderIntegrationCard, type IntegrationCardHooks } from "./integrations";

export interface ViewActions {
  setView(v: IslandViewName): void;
  collapse(): void;
  setFocus(id: string): void;
  openTerminal(): void;
  /** The ↗ button: opens whatever the focused pill points at. */
  openTarget(): void;
  openUrl(url: string): void;
  decide(d: "allow" | "deny"): void;
  toggleSound(): void;
  setVolume(v: number): void;
  setAutoClose(seconds: number): void;
  openSettingsWindow(): void;
  blip(): void;
}

export interface ViewHost {
  el: HTMLElement;
  sync(): void;
  /** Called when the view becomes active, for views with a text field. */
  focus?(): void;
  /** Called every frame while the view is on screen. */
  tick?(nowMs: number): void;
}

// ── Shared pieces ─────────────────────────────────────────────────────────────

function card(wash: Wash, ...children: (Node | string)[]): HTMLElement {
  const el = h("div", { class: wash ? "card wash" : "card" }, ...children);
  if (wash) el.style.setProperty("--wash", washRGBA(wash));
  return el;
}

function btn(
  label: string,
  kind: "primary" | "secondary",
  onClick: () => void,
  kbd?: string,
): HTMLElement {
  return h(
    "button",
    { class: `btn ${kind}`, onclick: onClick },
    h("span", { text: label }),
    kbd ? h("span", { class: "kbd", text: kbd }) : null,
  );
}

/** AgentWho — coloured dot + task name + grey label. */
function agentWho(task: AgentTask | null, label: string): HTMLElement {
  const row = h("div", { class: "who-row" });
  if (task) {
    row.append(dot(task.color, 8), h("span", { class: "n", text: task.name }));
  }
  row.append(h("span", { text: label }));
  return row;
}

function stack(padLeft: number, padRight: number, ...children: Node[]): HTMLElement {
  const el = h("div", { class: "stack" }, ...children);
  el.style.padding = `4px ${padRight}px 4px ${padLeft}px`;
  return el;
}

// ── Header ────────────────────────────────────────────────────────────────────

export function buildHeader(actions: ViewActions): ViewHost {
  const tabHome = h("button", { class: "tab", title: "Overview", onclick: () => go("overview") }, svg(ICONS.house, 13));
  const tabChat = h("button", { class: "tab", title: "Ask", onclick: () => go("prompt") }, svg(ICONS.bubble, 13));
  const tabAcc = h("button", { class: "tab", title: "Accessories", onclick: () => go("accessories") }, svg(ICONS.sparkle, 13));
  const tabDrop = h("button", { class: "tab", title: "Drop", onclick: () => go("upload") }, svg(ICONS.plus, 13));

  const minBtn = h("button", { title: "Minimize", onclick: () => { Sound.thock(); actions.collapse(); } }, svg(ICONS.chevronUp, 14));
  const gearBtn = h("button", { title: "Settings", onclick: () => go("settings") }, svg(ICONS.gear, 14));
  const soundBtn = h("button", { title: "Mute", onclick: () => { Sound.thock(); actions.toggleSound(); } }, svg(ICONS.speakerOn, 14));

  function go(v: IslandViewName) {
    Sound.thock();
    actions.setView(v);
  }

  const brand = h(
    "div",
    { class: "header-brand", title: "Coucou by janfdev" },
    h("span", { class: "brand-name", text: "Coucou" }),
    h("span", { class: "brand-tag", text: "by janfdev" }),
  );

  const hudDot = h("i", { class: "hud-dot" });
  const hudCpu = h("span", { class: "hud-val", text: "--% CPU" });
  const hudRam = h("span", { class: "hud-val", text: "--G RAM" });
  const hud = h(
    "div",
    { class: "header-hud", title: "Developer System HUD" },
    hudDot,
    hudCpu,
    h("span", { class: "hud-sep", text: "·" }),
    hudRam,
  );

  async function updateStats() {
    const stats = await Bridge.getSystemStats();
    if (stats) {
      hudCpu.textContent = `${Math.round(stats.cpuPercent)}% CPU`;
      hudRam.textContent = `${stats.ramUsedGb}G RAM`;
      hudDot.style.background = stats.cpuPercent > 70 ? "#f4505e" : stats.cpuPercent > 40 ? "#f5a524" : "#22c55e";
    }
  }

  void updateStats();
  setInterval(() => void updateStats(), 3500);

  const el = h(
    "div",
    { id: "header" },
    h("div", { class: "tabs" }, tabHome, tabChat, tabAcc, tabDrop),
    h("div", { class: "header-center" }, brand, hud),
    h("div", { class: "header-actions" }, minBtn, gearBtn, soundBtn),
  );

  return {
    el,
    sync() {
      const v = State.view;
      tabHome.classList.toggle("on", v === "overview" || v === "empty");
      tabChat.classList.toggle("on", v === "prompt");
      tabAcc.classList.toggle("on", v === "accessories");
      tabDrop.classList.toggle("on", v === "upload");
      gearBtn.classList.toggle("on", v === "settings");
      clear(gearBtn);
      gearBtn.append(svg(v === "settings" ? ICONS.gearFill : ICONS.gear, 14));
      clear(soundBtn);
      soundBtn.append(svg(State.settings.soundEnabled ? ICONS.speakerOn : ICONS.speakerOff, 14));
      el.style.opacity = v === "confused" ? "0" : "1";
    },
  };
}

// ── Overview ──────────────────────────────────────────────────────────────────

function buildOverview(actions: ViewActions): ViewHost {
  const ticker = new Ticker();
  const who = h("div", { class: "who" });
  const tickerBody = h("div", { class: "card-body" }, who, ticker.el);
  const leftBody = h("div", { class: "left-body" });
  const jump = h(
    "button",
    { class: "icon-btn jump", title: "Open", onclick: () => actions.openTarget() },
    svg(ICONS.arrowUpRight, 8),
  );
  const left = card(null, leftBody, jump);
  const pills = h("div", { class: "pills" });
  const right = card(null, pills);

  const el = h("div", { class: "view overview" },
    h("div", { class: "left" }, left),
    h("div", { class: "right" }, right),
  );

  let pillIds = "";
  let detailOpen = false;
  let lastFocus: string | null = null;
  let mode: "ticker" | "card" | null = null;
  let cardKey = "";

  const hooks: IntegrationCardHooks = {
    get detailOpen() {
      return detailOpen;
    },
    openDetail() {
      detailOpen = true;
      cardKey = "";
      State.notify();
    },
    closeDetail() {
      detailOpen = false;
      cardKey = "";
      State.notify();
    },
    openSettings: () => actions.openSettingsWindow(),
  };

  return {
    el,
    tick(nowMs: number) {
      if (mode === "ticker") ticker.tick(nowMs);
    },
    sync() {
      const task = State.focusTask;
      if (task?.id !== lastFocus) {
        lastFocus = task?.id ?? null;
        detailOpen = false;
        cardKey = "";
        mode = null;
      }

      // Ticker active when agent session is active
      const sessionActive =
        (task?.source === "agent" || task?.id === "agent_hermes" || task?.source === "claudeCode") &&
        (task.state !== "idle" || task.steps.length > 0);

      if (task && sessionActive) {
        if (mode !== "ticker") {
          clear(leftBody);
          leftBody.append(tickerBody);
          mode = "ticker";
          cardKey = "";
        }
        clear(who);
        who.append(
          dot(task.color, 7),
          h("span", { class: "name", text: task.name }),
          h("span", { class: "tool", text: task.name || "Hermes Agent" }),
        );
        if (task.steps.length > 1) {
          who.append(h("span", {
            class: "count",
            text: `${Math.min(task.stepIndex + 1, task.steps.length)}/${task.steps.length}`,
          }));
        }
        ticker.sync(task);
      } else if (task) {
        const info = State.integrations[task.id];
        const key = [
          task.id, detailOpen, task.state, task.steps.join("|"),
          info?.loaded, info?.error, info?.configured,
          JSON.stringify(info?.data ?? {}),
        ].join("~");
        if (key !== cardKey) {
          cardKey = key;
          mode = "card";
          clear(leftBody);
          leftBody.append(renderIntegrationCard(task, hooks));
        }
      }

      jump.style.display = detailOpen ? "none" : "";

      const others = State.otherTasks.slice(0, 8);
      const pillKey = others.map((t) => `${t.id}:${t.pillBadge ?? ""}`).join("|");
      if (pillKey !== pillIds) {
        pillIds = pillKey;
        clear(pills);
        for (const t of others) pills.append(buildPill(t, actions));
        pruneMiniBots();
      }
    },
  };
}

function buildPill(task: AgentTask, actions: ViewActions): HTMLElement {
  const label = task.name;
  const canvas = createMiniBot(task, 24);
  const pill = h(
    "div",
    { class: "pill", onclick: () => actions.setFocus(task.id) },
    canvas,
    h("span", { class: "lbl", text: label }),
  );
  pill.style.borderColor = `${task.color}24`;
  pill.addEventListener("mouseenter", () => {
    pill.style.background = `${task.color}2e`;
    pill.style.borderColor = `${task.color}8c`;
    pill.style.boxShadow = `0 2px 10px ${task.color}59`;
    (pill.querySelector(".lbl") as HTMLElement).style.color = lighten(task.color, 0.3);
  });
  pill.addEventListener("mouseleave", () => {
    pill.style.background = "";
    pill.style.borderColor = `${task.color}24`;
    pill.style.boxShadow = "";
    (pill.querySelector(".lbl") as HTMLElement).style.color = "";
  });

  if (task.pillBadge) {
    const colors = { approval: "#F5A524", finished: "#22C55E", error: "#F4505E" } as const;
    const icons = { approval: ICONS.bang, finished: ICONS.check, error: ICONS.xmark } as const;
    const inner = h("i", { style: `background:${colors[task.pillBadge]}` }, svg(icons[task.pillBadge], 6, { stroke: task.pillBadge === "finished" ? 3 : 0 }));
    const badge = h("div", { class: "pill-badge" }, inner);
    badge.style.boxShadow = `0 0 4px ${colors[task.pillBadge]}99`;
    pill.append(badge);
  }
  return pill;
}

function lighten(hex: string, amount: number): string {
  const v = parseInt(hex.replace("#", ""), 16);
  const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) =>
    Math.min(255, Math.round(x + amount * 255)),
  );
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// ── Empty ─────────────────────────────────────────────────────────────────────

function buildEmpty(actions: ViewActions): ViewHost {
  const body = h(
    "div",
    { class: "stack", style: "padding:0 18px 0 126px;flex-direction:row;align-items:center;gap:16px" },
    h(
      "div",
      { style: "display:flex;flex-direction:column;gap:5px" },
      h("div", { class: "title", text: "Nothing running right now." }),
      h("div", { class: "sub", text: "Drop a file or window, or ask me anything." }),
    ),
    h("div", { class: "grow" }),
    btn("Ask Hermes", "primary", () => actions.setView("prompt")),
  );
  return { el: h("div", { class: "view" }, card(null, body)), sync() {} };
}

// ── Approval ──────────────────────────────────────────────────────────────────

function buildApproval(actions: ViewActions): ViewHost {
  const who = h("div");
  const code = h("div", { class: "code" });
  const row = h("div", { class: "actions" });
  const el = h("div", { class: "view" }, card("amber", stack(116, 16, who, code, row)));
  let rowKey = "";
  return {
    el,
    sync() {
      clear(who);
      who.append(agentWho(State.focusTask, "needs permission"));
      // The whole point of approving here rather than in the terminal: this line
      // is the command, the file path or the URL being authorised, not just the
      // name of the tool asking.
      code.textContent = State.pendingApproval?.command || State.pendingApproval?.tool || "…";
      // Two buttons, built once. Rebuilding them between a mouse-down and a
      // mouse-up would swallow the click, and there is nothing left to vary:
      // "Always" is gone until the remembered-rules list exists to back it.
      if (rowKey === "built") return;
      rowKey = "built";
      clear(row);
      row.append(
        btn("Deny", "secondary", () => actions.decide("deny"), "N"),
        btn("Allow", "primary", () => actions.decide("allow"), "Y"),
      );
    },
  };
}

// ── Question ──────────────────────────────────────────────────────────────────

function buildQuestion(): ViewHost {
  const who = h("div");
  const title = h("div", { class: "title" });
  const row = h("div", { class: "actions" });
  const el = h("div", { class: "view" }, card("cyan", stack(116, 16, who, title, row)));
  return {
    el,
    sync() {
      clear(who);
      const task = State.focusTask;
      who.append(agentWho(task, `${task?.name ?? "Hermes"} is asking a question`));
      title.textContent = task?.steps.at(-1) ?? `${task?.name ?? "Hermes"} needs an answer.`;
      clear(row);
      row.append(h("div", { class: "sub", text: "Answer in Telegram or your terminal." }));
    },
  };
}

// ── Error ─────────────────────────────────────────────────────────────────────

function buildError(actions: ViewActions): ViewHost {
  const who = h("div");
  const title = h("div", { class: "title" });
  const detail = h("div", { class: "detail" });
  const row = h("div", { class: "actions" },
    btn("Retry", "primary", () => actions.setView(State.defaultView())),
    btn("Dismiss", "secondary", () => actions.collapse()),
  );
  const el = h("div", { class: "view" }, card("red", stack(116, 16, who, title, detail, row)));
  return {
    el,
    sync() {
      const task = State.focusTask;
      clear(who);
      who.append(agentWho(task, task?.name ?? "Hermes Agent"));
      title.textContent = task?.source === "n8n" ? "Workflow stopped." : `${task?.name ?? "Hermes"} session stopped on an error.`;
      detail.textContent = task?.steps.at(-1) ?? "No detail available.";
    },
  };
}

// ── Finished ──────────────────────────────────────────────────────────────────

function buildFinished(actions: ViewActions): ViewHost {
  const who = h("div");
  const title = h("div", { class: "title" });
  const row = h("div", { class: "actions" },
    btn("OK", "primary", () => actions.collapse()),
  );
  const el = h("div", { class: "view" }, card("green", stack(116, 16, who, title, row)));
  return {
    el,
    sync() {
      clear(who);
      const task = State.focusTask;
      who.append(agentWho(task, `${task?.name ?? "Hermes"} finished`));
      title.textContent = State.focusTask?.steps.at(-1) ?? "Task finished successfully";
    },
  };
}

// ── Confused ──────────────────────────────────────────────────────────────────

function buildConfused(): ViewHost {
  const body = h(
    "div",
    { class: "stack", style: "padding:0 18px 0 136px" },
    h("div", { class: "title", text: "Too many hits at once." }),
    h("div", { class: "sub", text: "Give me a sec — back to work in three seconds." }),
  );
  return { el: h("div", { class: "view" }, card("pink", body)), sync() {} };
}

// ── Note ──────────────────────────────────────────────────────────────────────

function buildNote(): ViewHost {
  const title = h("div", { class: "title" });
  const el = h("div", { class: "view" }, card(null, h("div", { class: "stack", style: "padding:0 18px 0 106px" }, title)));
  return {
    el,
    sync() {
      title.textContent = State.noteMessage ?? "";
    },
  };
}

// ── In-island settings ────────────────────────────────────────────────────────

function buildAccessories(_actions: ViewActions): ViewHost {
  const hatOptions: { id: HatKind; label: string }[] = [
    { id: "none", label: "None" },
    { id: "wizard", label: "Wizard" },
    { id: "crown", label: "Crown" },
    { id: "beanie", label: "Beanie" },
  ];

  const glassesOptions: { id: GlassesKind; label: string }[] = [
    { id: "none", label: "None" },
    { id: "shades", label: "Shades" },
    { id: "nerd", label: "Nerd" },
    { id: "monocle", label: "Monocle" },
  ];

  const themeOptions: { id: ThemeKind; label: string }[] = [
    { id: "classic", label: "Classic" },
    { id: "dark", label: "Dark" },
    { id: "cyberpunk", label: "Cyber" },
    { id: "matcha", label: "Matcha" },
  ];

  const soundOptions: { id: SoundPackKind; label: string }[] = [
    { id: "thock", label: "Thock" },
    { id: "cherry_blue", label: "Clicky" },
    { id: "gateron_yellow", label: "Linear" },
    { id: "arcade", label: "8-Bit" },
  ];

  const hatBtns = hatOptions.map((opt) =>
    h("button", {
      class: "btn secondary",
      text: opt.label,
      onclick: () => {
        Sound.thock();
        State.setHat(opt.id);
      },
    }),
  );

  const glassesBtns = glassesOptions.map((opt) =>
    h("button", {
      class: "btn secondary",
      text: opt.label,
      onclick: () => {
        Sound.thock();
        State.setGlasses(opt.id);
      },
    }),
  );

  const themeBtns = themeOptions.map((opt) =>
    h("button", {
      class: "btn secondary",
      text: opt.label,
      onclick: () => {
        Sound.thock();
        State.setTheme(opt.id);
      },
    }),
  );

  const soundBtns = soundOptions.map((opt) =>
    h("button", {
      class: "btn secondary",
      text: opt.label,
      onclick: () => {
        State.setSoundPack(opt.id);
        Sound.setSoundPack(opt.id);
        Sound.thock();
      },
    }),
  );

  const rows = h(
    "div",
    { class: "settings-rows", style: "gap:10px" },
    h(
      "div",
      { class: "settings-row", style: "justify-content:space-between;align-items:center" },
      h("span", { style: "font-weight:600;font-size:11px;color:#cbd5e1", text: "Topi (Hat)" }),
      h("div", { class: "seg" }, ...hatBtns),
    ),
    h(
      "div",
      { class: "settings-row", style: "justify-content:space-between;align-items:center" },
      h("span", { style: "font-weight:600;font-size:11px;color:#cbd5e1", text: "Kacamata" }),
      h("div", { class: "seg" }, ...glassesBtns),
    ),
    h(
      "div",
      { class: "settings-row", style: "justify-content:space-between;align-items:center" },
      h("span", { style: "font-weight:600;font-size:11px;color:#cbd5e1", text: "Skin Theme" }),
      h("div", { class: "seg" }, ...themeBtns),
    ),
    h(
      "div",
      { class: "settings-row", style: "justify-content:space-between;align-items:center" },
      h("span", { style: "font-weight:600;font-size:11px;color:#cbd5e1", text: "Sound Pack" }),
      h("div", { class: "seg" }, ...soundBtns),
    ),
  );

  const el = h(
    "div",
    { class: "view" },
    card(null, h("div", { class: "stack", style: "padding:10px 14px 10px 88px" }, rows)),
  );

  return {
    el,
    sync() {
      const curHat = State.accessories.hat;
      hatOptions.forEach((opt, idx) => {
        hatBtns[idx].classList.toggle("primary", curHat === opt.id);
        hatBtns[idx].classList.toggle("secondary", curHat !== opt.id);
      });

      const curGlasses = State.accessories.glasses;
      glassesOptions.forEach((opt, idx) => {
        glassesBtns[idx].classList.toggle("primary", curGlasses === opt.id);
        glassesBtns[idx].classList.toggle("secondary", curGlasses !== opt.id);
      });

      const curTheme = State.accessories.theme;
      themeOptions.forEach((opt, idx) => {
        themeBtns[idx].classList.toggle("primary", curTheme === opt.id);
        themeBtns[idx].classList.toggle("secondary", curTheme !== opt.id);
      });

      const curSound = State.accessories.soundPack;
      soundOptions.forEach((opt, idx) => {
        soundBtns[idx].classList.toggle("primary", curSound === opt.id);
        soundBtns[idx].classList.toggle("secondary", curSound !== opt.id);
      });
    },
  };
}

function buildSettings(actions: ViewActions): ViewHost {
  const soundSwitch = h("button", { class: "switch", onclick: () => actions.toggleSound() });
  const volume = h("input", {
    type: "range", min: "0", max: "0.2", step: "0.005",
    oninput: (e: Event) => actions.setVolume(Number((e.target as HTMLInputElement).value)),
  }) as HTMLInputElement;
  const autoLabel = h("span", {});
  const segButtons = [10, 15, 30].map((s) =>
    h("button", { onclick: () => actions.setAutoClose(s) }, `${s}s`),
  );
  const claudeBadge = h("span", { class: "status-badge" });
  const apiBadge = h("span", { class: "status-badge" });

  const rows = h(
    "div",
    { class: "settings-rows" },
    h("div", { class: "settings-row" }, soundSwitch, h("span", { text: "Sound" }), volume),
    h(
      "div",
      { class: "settings-row" },
      svg(ICONS.timer, 12),
      autoLabel,
      h("div", { class: "seg" }, ...segButtons),
    ),
    h(
      "div",
      { class: "settings-row", style: "gap:14px" },
      claudeBadge,
      apiBadge,
      h("div", { class: "grow" }),
      h("button", {
        class: "link-btn",
        style: "color:#8e939c;font-size:11.5px",
        text: "Settings…",
        onclick: () => actions.openSettingsWindow(),
      }),
    ),
  );

  const el = h("div", { class: "view" },
    card(null, h("div", { class: "stack", style: "padding:14px 16px 14px 100px" }, rows)));

  return {
    el,
    sync() {
      const s = State.settings;
      soundSwitch.classList.toggle("on", s.soundEnabled);
      volume.value = String(s.soundVolume);
      volume.style.opacity = s.soundEnabled ? "1" : "0.4";
      autoLabel.textContent = `Auto-close · ${Math.round(s.autoCloseInterval)}s`;
      segButtons.forEach((b, i) => b.classList.toggle("on", s.autoCloseInterval === [10, 15, 30][i]));
      clear(claudeBadge);
      claudeBadge.append(
        dot(s.hooksInstalled ? "#22C55E" : "#F4505E", 6),
        h("span", { text: "Hermes Agent" }),
      );
      clear(apiBadge);
      apiBadge.append(dot("#F4505E", 6), h("span", { text: "API" }));
    },
  };
}

// ── Placeholders filled in later stages ───────────────────────────────────────

function buildPlaceholder(title: string, sub: string): ViewHost {
  const body = h(
    "div",
    { class: "stack", style: "padding:0 18px 0 118px" },
    h("div", { class: "title", text: title }),
    h("div", { class: "sub", text: sub }),
  );
  return { el: h("div", { class: "view" }, card(null, body)), sync() {} };
}

// ── Registry ──────────────────────────────────────────────────────────────────

export function buildViews(
  actions: ViewActions,
  onChatHeightChange: () => void,
): Map<IslandViewName, ViewHost> {
  const map = new Map<IslandViewName, ViewHost>();
  map.set("overview", buildOverview(actions));
  map.set("empty", buildEmpty(actions));
  map.set("approval", buildApproval(actions));
  map.set("question", buildQuestion());
  map.set("error", buildError(actions));
  map.set("finished", buildFinished(actions));
  map.set("confused", buildConfused());
  map.set("note", buildNote());
  map.set("accessories", buildAccessories(actions));
  map.set("settings", buildSettings(actions));
  map.set("prompt", buildPrompt(onChatHeightChange, actions));
  map.set("upload", buildUpload());
  map.set("uploading", buildUploading());
  map.set("choose", buildChoose(actions));
  // Not in the Windows v1: sending a file by email, window attach + web result.
  map.set("mail", buildPlaceholder("Sending by email isn't in this version.", ""));
  map.set("searching", buildPlaceholder("Hermes is searching…", ""));
  map.set("result", buildPlaceholder("Result", ""));
  return map;
}
