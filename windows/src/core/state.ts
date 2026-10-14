// App state — mirror of AppState.swift (the parts the island needs).

import type { BotEmoteName, BotStateName, IslandMode, IslandViewName } from "./layout";
import type { EyeShape } from "../mochi/engine";

export type AgentSource = "claudeCode" | "n8n" | "agent";
export type PillBadge = "approval" | "finished" | "error";

export interface AgentTask {
  id: string;
  name: string;
  color: string;
  state: BotStateName;
  stepIndex: number;
  steps: string[];
  source: AgentSource;
  isIntegration: boolean;
  emote?: BotEmoteName | null;
  miniEye?: EyeShape | null;
  pillBadge?: PillBadge | null;
  sessionCwd?: string | null;
}

export interface ApprovalInfo {
  requestId: string;
  sessionId: string;
  tool: string;
  command: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export type PromptContext =
  | { kind: "window"; appName: string; title: string; url?: string }
  | { kind: "file"; name: string; path?: string };

export interface ResultItem {
  label: string;
  detail: string;
  url?: string;
}

export interface SearchResult {
  title: string;
  items: ResultItem[];
  note?: string;
}

const task = (
  id: string, name: string, color: string, source: AgentSource,
): AgentTask => ({
  id, name, color, state: "idle", stepIndex: 0, steps: [], source, isIntegration: true,
});

/** AgentTask.integrationAgents — same ids, names and colours as macOS. */
export const INTEGRATION_AGENTS: AgentTask[] = [
  task("agent_hermes", "Hermes", "#38BDF8", "agent"),
  task("integration_resend", "Resend", "#22C55E", "n8n"),
  task("integration_n8n", "n8n", "#F29B38", "n8n"),
  task("integration_vercel", "Vercel", "#7C5CFF", "n8n"),
  task("integration_github", "GitHub", "#F4505E", "n8n"),
  task("integration_notion", "Notion", "#8C8C8C", "n8n"),
  task("integration_calcom", "Cal.com", "#C9956A", "n8n"),
  task("integration_stripe", "Stripe", "#0570DE", "n8n"),
];

export const TOGGLEABLE_INTEGRATION_IDS = [
  "integration_resend", "integration_n8n", "integration_vercel", "integration_github",
  "integration_notion", "integration_calcom", "integration_stripe",
];

/** What an integration poller last reported. */
export interface IntegrationInfo {
  data: Record<string, unknown>;
  error: string | null;
  loaded: boolean;
  configured: boolean;
}

export interface CustomIntegration {
  id: string;
  name: string;
  color: string;
  target?: string;
  description?: string;
  enabled: boolean;
}

export interface Settings {
  soundEnabled: boolean;
  soundVolume: number;
  autoCloseInterval: number;
  absenceInterval: number;
  activeIntegrations: string[];
  screen: "primary" | "cursor";
  autostart: boolean;
  hooksInstalled: boolean;
  /** Claude model used by the chat. */
  model: string;
  customIntegrations?: CustomIntegration[];
}

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  soundVolume: 0.12,
  autoCloseInterval: 15,
  absenceInterval: 180,
  activeIntegrations: [
    "integration_resend", "integration_n8n", "integration_vercel", "integration_github",
  ],
  screen: "primary",
  autostart: false,
  hooksInstalled: false,
  model: "claude-opus-5",
  customIntegrations: [],
};

type Listener = () => void;

export type HatKind = "none" | "wizard" | "beanie" | "crown";
export type GlassesKind = "none" | "shades" | "nerd" | "monocle";
export type ThemeKind = "classic" | "dark" | "cyberpunk" | "matcha";
export type SoundPackKind = "thock" | "cherry_blue" | "gateron_yellow" | "arcade";

export interface MochiAccessories {
  hat: HatKind;
  glasses: GlassesKind;
  theme: ThemeKind;
  soundPack: SoundPackKind;
}

class AppState {
  mode: IslandMode = "hidden";
  view: IslandViewName = "overview";

  accessories: MochiAccessories = {
    hat: (localStorage.getItem("coucou_accessory_hat") as HatKind) || "none",
    glasses: (localStorage.getItem("coucou_accessory_glasses") as GlassesKind) || "none",
    theme: (localStorage.getItem("coucou_theme") as ThemeKind) || "classic",
    soundPack: (localStorage.getItem("coucou_sound_pack") as SoundPackKind) || "thock",
  };

  setHat(hat: HatKind) {
    this.accessories.hat = hat;
    try { localStorage.setItem("coucou_accessory_hat", hat); } catch {}
    this.notify();
  }

  setGlasses(glasses: GlassesKind) {
    this.accessories.glasses = glasses;
    try { localStorage.setItem("coucou_accessory_glasses", glasses); } catch {}
    this.notify();
  }

  setTheme(theme: ThemeKind) {
    this.accessories.theme = theme;
    try { localStorage.setItem("coucou_theme", theme); } catch {}
    this.notify();
  }

  setSoundPack(pack: SoundPackKind) {
    this.accessories.soundPack = pack;
    try { localStorage.setItem("coucou_sound_pack", pack); } catch {}
    this.notify();
  }

  tasks: AgentTask[] = [];
  focusId: string | null = null;

  stateOverride: BotStateName | null = null;

  /** Cursor in logical screen pixels, origin top-left (like AppState.mousePosition). */
  mouse = { x: 0, y: 0 };
  /** Cursor relative to the island's top-left corner. */
  mouseInIsland = { x: 0, y: 0 };

  isPinned = false;
  paused = false;

  uploadProgress = 0;
  uploadDuration = 2.4;
  fileDragOver = false;

  promptContext: PromptContext | null = null;
  droppedFile: { name: string; path: string } | null = null;
  noteMessage: string | null = null;
  searchResult: SearchResult | null = null;
  chatHistory: ChatMessage[] = [];
  pendingApproval: ApprovalInfo | null = null;
  pendingEmote: BotEmoteName | null = null;

  integrations: Record<string, IntegrationInfo> = {};

  lastActivity = performance.now();

  settings: Settings = { ...DEFAULT_SETTINGS };

  triggerEmote(emote: BotEmoteName) {
    this.pendingEmote = emote;
    this.notify();
  }

  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Marks the UI dirty; the island re-renders on the next frame. */
  notify() {
    for (const fn of this.listeners) fn();
  }

  get focusTask(): AgentTask | null {
    return this.tasks.find((t) => t.id === this.focusId) ?? this.tasks[0] ?? null;
  }

  get effectiveState(): BotStateName {
    return this.stateOverride ?? this.focusTask?.state ?? "idle";
  }

  get otherTasks(): AgentTask[] {
    return this.tasks.filter((t) => t.id !== this.focusId);
  }

  setFocus(id: string) {
    const t = this.tasks.find((x) => x.id === id);
    if (!t) return;
    this.focusId = id;
    t.pillBadge = null;
    this.notify();
  }

  updateTask(id: string, state: BotStateName) {
    const t = this.tasks.find((x) => x.id === id);
    if (!t) return;
    t.state = state;
    this.notify();
  }

  appendStep(id: string, step: string) {
    const t = this.tasks.find((x) => x.id === id);
    if (!t) return;
    t.steps.push(step);
    if (t.steps.length > 20) t.steps.shift();
    t.stepIndex = t.steps.length - 1;
    this.notify();
  }

  setPillBadge(id: string, badge: PillBadge | null) {
    const t = this.tasks.find((x) => x.id === id);
    if (!t) return;
    t.pillBadge = badge;
    this.notify();
  }

  /** loadIntegrationTasks() — Hermes always on, custom integrations and standard opt-ins. */
  loadIntegrationTasks() {
    for (const proto of INTEGRATION_AGENTS) {
      const shouldLoad =
        proto.id === "agent_hermes" || this.settings.activeIntegrations.includes(proto.id);
      const idx = this.tasks.findIndex((t) => t.id === proto.id);
      if (shouldLoad && idx < 0) this.tasks.push({ ...proto, steps: [] });
      if (!shouldLoad && idx >= 0) this.tasks.splice(idx, 1);
    }

    // Load custom integrations
    const customs = this.settings.customIntegrations ?? [];
    for (const c of customs) {
      const shouldLoad = c.enabled !== false;
      const idx = this.tasks.findIndex((t) => t.id === c.id);
      if (shouldLoad) {
        const item: AgentTask = {
          id: c.id,
          name: c.name,
          color: c.color || "#06b6d4",
          state: "idle",
          stepIndex: 0,
          steps: c.description ? [c.description] : [c.target ?? ""],
          source: "agent",
          isIntegration: true,
        };
        if (idx < 0) this.tasks.push(item);
        else this.tasks[idx] = { ...this.tasks[idx], ...item };
      } else if (idx >= 0) {
        this.tasks.splice(idx, 1);
      }
    }

    // Order: agent_hermes first, then custom_* and agent_* pills, then other integrations
    const order = INTEGRATION_AGENTS.map((t) => t.id);
    this.tasks.sort((a, b) => {
      const isCustomA = a.id.startsWith("custom_") || a.id.startsWith("agent_");
      const isCustomB = b.id.startsWith("custom_") || b.id.startsWith("agent_");
      if (a.id === "agent_hermes") return -1;
      if (b.id === "agent_hermes") return 1;
      if (isCustomA && !isCustomB) return -1;
      if (isCustomB && !isCustomA) return 1;
      if (isCustomA && isCustomB) return 0;
      return order.indexOf(a.id) - order.indexOf(b.id);
    });
    if (!this.focusId) this.focusId = "agent_hermes";
    this.notify();
  }

  removeTask(id: string) {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx < 0) return;
    this.tasks.splice(idx, 1);
    if (this.focusId === id) this.focusId = this.tasks[0]?.id ?? "agent_hermes";
    this.notify();
  }

  /** Creates a dynamic agent_ pill on first event; no-ops if it already exists.
   *  Inserted right after agent_hermes so it appears in the visible slice(0,4). */
  upsertExternalAgent(id: string, name: string, color: string) {
    const existing = this.tasks.find((t) => t.id === id);
    if (existing) {
      existing.name = name;
      existing.color = color;
      this.notify();
      return;
    }
    const at = this.tasks.findIndex((t) => t.id === "agent_hermes") + 1;
    this.tasks.splice(at >= 0 ? at : 0, 0, {
      id, name, color,
      state: "idle", stepIndex: 0, steps: [],
      source: "agent", isIntegration: false,
    });
    if (!this.focusId) this.focusId = id;
    this.notify();
  }

  toggleIntegration(id: string) {
    if (id === "agent_hermes") return;
    const active = this.settings.activeIntegrations;
    if (active.includes(id)) {
      this.settings.activeIntegrations = active.filter((x) => x !== id);
      if (this.focusId === id) this.focusId = "agent_hermes";
    } else {
      if (active.length >= 4) return;
      this.settings.activeIntegrations = [...active, id];
    }
    this.loadIntegrationTasks();
  }

  defaultView(): IslandViewName {
    return this.tasks.length === 0 ? "empty" : "overview";
  }
}

export const State = new AppState();
