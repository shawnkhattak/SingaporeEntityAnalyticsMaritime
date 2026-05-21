import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type {
  IngestionJob,
  MapFilters,
  RiskFlag,
  SelectedSubject,
  SourceHealth,
  Toast,
  ToastVariant,
  VesselMapFeature,
} from "../types";
import { DEFAULT_FILTERS } from "../types";

export type AppState = {
  filters: MapFilters;
  selected: SelectedSubject;
  isPanelCollapsed: boolean;
  panelManuallyExpanded: boolean;
  /** Sticky flag — once the panel has auto-collapsed (or the user
   *  manually toggled), subsequent navigations don't trigger the
   *  auto-collapse rule again. Persisted in sessionStorage so a fresh
   *  tab gets the first-time behavior. */
  autoCollapsedThisSession: boolean;
  isInspectorOpen: boolean;
  inspectorWidth: 480 | 720 | 860;
  toasts: Toast[];
  runningJobs: Record<string, true>;
  vessels: VesselMapFeature[];
  vesselsLoaded: boolean;
  health: SourceHealth[];
  jobs: IngestionJob[];
  riskByVessel: Record<number, RiskFlag[]>;
  riskByEntity: Record<number, RiskFlag[]>;
  tableCounts: Record<string, number> | null;
  backendOnline: boolean;
  aiFocusVesselIds: number[];
};

type Action =
  | { type: "SET_FILTERS"; filters: MapFilters }
  | { type: "RESET_FILTERS" }
  | { type: "SELECT_SUBJECT"; subject: SelectedSubject }
  | { type: "CLEAR_SELECTION" }
  | { type: "TOGGLE_PANEL"; manual?: boolean }
  | { type: "SET_PANEL_COLLAPSED"; collapsed: boolean; manual?: boolean }
  | { type: "OPEN_INSPECTOR" }
  | { type: "CLOSE_INSPECTOR" }
  | { type: "RESIZE_INSPECTOR"; width: 480 | 720 | 860 }
  | { type: "PUSH_TOAST"; toast: Toast }
  | { type: "DISMISS_TOAST"; id: string }
  | { type: "JOB_STARTED"; slug: string }
  | { type: "JOB_FINISHED"; slug: string }
  | { type: "SET_VESSELS"; vessels: VesselMapFeature[] }
  | { type: "SET_HEALTH"; health: SourceHealth[] }
  | { type: "SET_JOBS"; jobs: IngestionJob[] }
  | { type: "SET_TABLE_COUNTS"; counts: Record<string, number> }
  | { type: "CACHE_VESSEL_RISK"; id: number; flags: RiskFlag[] }
  | { type: "CACHE_ENTITY_RISK"; id: number; flags: RiskFlag[] }
  | { type: "MARK_AUTO_COLLAPSED" }
  | { type: "SET_BACKEND_ONLINE"; online: boolean }
  | { type: "SET_AI_FOCUS_VESSELS"; ids: number[] }
  | { type: "CLEAR_AI_FOCUS_VESSELS" };

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "1";
  } catch {
    return fallback;
  }
}

function readNum(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

const initialState: AppState = {
  filters: DEFAULT_FILTERS,
  selected: null,
  isPanelCollapsed: readBool("seam:panel-collapsed", false),
  panelManuallyExpanded: false,
  autoCollapsedThisSession: (() => {
    try { return sessionStorage.getItem("seam:auto-collapsed") === "1"; } catch { return false; }
  })(),
  isInspectorOpen: false,
  inspectorWidth: ([480, 720, 860].includes(readNum("seam:inspector-width", 480)) ? readNum("seam:inspector-width", 480) : 480) as 480 | 720 | 860,
  toasts: [],
  runningJobs: {},
  vessels: [],
  vesselsLoaded: false,
  health: [],
  jobs: [],
  riskByVessel: {},
  riskByEntity: {},
  tableCounts: null,
  backendOnline: true,
  aiFocusVesselIds: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_FILTERS":
      return { ...state, filters: action.filters };
    case "RESET_FILTERS":
      return { ...state, filters: { ...DEFAULT_FILTERS, enabledGeoLayers: new Set(DEFAULT_FILTERS.enabledGeoLayers) } };
    case "SELECT_SUBJECT":
      return { ...state, selected: action.subject };
    case "CLEAR_SELECTION":
      return { ...state, selected: null };
    case "TOGGLE_PANEL": {
      const collapsed = !state.isPanelCollapsed;
      try { localStorage.setItem("seam:panel-collapsed", collapsed ? "1" : "0"); } catch { /* ignore */ }
      try { sessionStorage.setItem("seam:auto-collapsed", "1"); } catch { /* ignore */ }
      // Any manual toggle locks the user's intent: the auto-collapse rule
      // should never preempt them again this session.
      return {
        ...state,
        isPanelCollapsed: collapsed,
        panelManuallyExpanded: !collapsed,
        autoCollapsedThisSession: true,
      };
    }
    case "SET_PANEL_COLLAPSED": {
      if (state.isPanelCollapsed === action.collapsed && !action.manual) return state;
      try { localStorage.setItem("seam:panel-collapsed", action.collapsed ? "1" : "0"); } catch { /* ignore */ }
      if (action.manual) {
        try { sessionStorage.setItem("seam:auto-collapsed", "1"); } catch { /* ignore */ }
      }
      return {
        ...state,
        isPanelCollapsed: action.collapsed,
        panelManuallyExpanded: action.manual ? !action.collapsed : state.panelManuallyExpanded,
        autoCollapsedThisSession: action.manual ? true : state.autoCollapsedThisSession,
      };
    }
    case "MARK_AUTO_COLLAPSED":
      return { ...state, autoCollapsedThisSession: true };
    case "OPEN_INSPECTOR":
      if (state.isInspectorOpen) return state;
      return { ...state, isInspectorOpen: true };
    case "CLOSE_INSPECTOR":
      if (!state.isInspectorOpen) return state;
      return { ...state, isInspectorOpen: false };
    case "RESIZE_INSPECTOR": {
      if (state.inspectorWidth === action.width) return state;
      try { localStorage.setItem("seam:inspector-width", String(action.width)); } catch { /* ignore */ }
      return { ...state, inspectorWidth: action.width };
    }
    case "PUSH_TOAST":
      return { ...state, toasts: [...state.toasts, action.toast] };
    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    case "JOB_STARTED":
      if (state.runningJobs[action.slug]) return state;
      return { ...state, runningJobs: { ...state.runningJobs, [action.slug]: true } };
    case "JOB_FINISHED": {
      if (!state.runningJobs[action.slug]) return state;
      const next = { ...state.runningJobs };
      delete next[action.slug];
      return { ...state, runningJobs: next };
    }
    case "SET_VESSELS":
      return {
        ...state,
        vessels: action.vessels,
        vesselsLoaded: true,
        riskByVessel: {
          ...state.riskByVessel,
          ...Object.fromEntries(
            action.vessels
              .filter((v) => v.risk_flags && v.risk_flags.length > 0)
              .map((v) => [v.vessel_id, v.risk_flags ?? []]),
          ),
        },
      };
    case "SET_HEALTH":
      return { ...state, health: action.health };
    case "SET_JOBS":
      return { ...state, jobs: action.jobs };
    case "SET_TABLE_COUNTS":
      return { ...state, tableCounts: action.counts };
    case "CACHE_VESSEL_RISK":
      return { ...state, riskByVessel: { ...state.riskByVessel, [action.id]: action.flags } };
    case "CACHE_ENTITY_RISK":
      return { ...state, riskByEntity: { ...state.riskByEntity, [action.id]: action.flags } };
    case "SET_BACKEND_ONLINE":
      if (state.backendOnline === action.online) return state;
      return { ...state, backendOnline: action.online };
    case "SET_AI_FOCUS_VESSELS":
      return { ...state, aiFocusVesselIds: Array.from(new Set(action.ids.filter((id) => Number.isFinite(id)))) };
    case "CLEAR_AI_FOCUS_VESSELS":
      if (state.aiFocusVesselIds.length === 0) return state;
      return { ...state, aiFocusVesselIds: [] };
    default:
      return state;
  }
}

type AppContextValue = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppStateProvider");
  return ctx;
}

/** Canonical stats snapshot used by every dashboard count tile so the
 *  same numbers appear in every consumer. Keys are aligned to the
 *  backend's `getDevTableCounts()` response — not invented strings. */
export type StatsSnapshot = {
  vessels: number | null;
  positions: number | null;
  portEvents: number | null;
  sanctionsRecords: number | null;
  riskFlags: number | null;
  newsArticles: number | null;
  entities: number | null;
  evidenceObservations: number | null;
  loaded: boolean;
};

export function useStatsSnapshot(): StatsSnapshot {
  const { state } = useApp();
  const tc = state.tableCounts;
  if (!tc) {
    return {
      vessels: null,
      positions: null,
      portEvents: null,
      sanctionsRecords: null,
      riskFlags: null,
      newsArticles: null,
      entities: null,
      evidenceObservations: null,
      loaded: false,
    };
  }
  return {
    vessels: tc.vessels ?? null,
    positions: tc.vessel_positions_latest ?? null,
    portEvents: tc.port_events ?? null,
    sanctionsRecords: tc.sanctions_records ?? null,
    riskFlags: tc.risk_flags ?? null,
    newsArticles: tc.news_articles ?? null,
    entities: tc.entities ?? null,
    evidenceObservations: tc.source_observations ?? null,
    loaded: true,
  };
}

export function useFilters() {
  const { state, dispatch } = useApp();
  return {
    filters: state.filters,
    setFilters: useCallback((filters: MapFilters) => dispatch({ type: "SET_FILTERS", filters }), [dispatch]),
    reset: useCallback(() => dispatch({ type: "RESET_FILTERS" }), [dispatch]),
  };
}

export function useSelection() {
  const { state, dispatch } = useApp();
  return {
    selected: state.selected,
    select: useCallback((subject: SelectedSubject) => dispatch({ type: "SELECT_SUBJECT", subject }), [dispatch]),
    clear: useCallback(() => dispatch({ type: "CLEAR_SELECTION" }), [dispatch]),
  };
}

let toastCounter = 0;

export function useToasts() {
  const { state, dispatch } = useApp();
  const push = useCallback(
    (input: Omit<Toast, "id"> & { id?: string }) => {
      const id = input.id ?? `t-${Date.now()}-${++toastCounter}`;
      dispatch({ type: "PUSH_TOAST", toast: { ...input, id } });
      return id;
    },
    [dispatch],
  );
  const dismiss = useCallback((id: string) => dispatch({ type: "DISMISS_TOAST", id }), [dispatch]);
  return { toasts: state.toasts, push, dismiss };
}

export function useRunningJobs() {
  const { state, dispatch } = useApp();
  return {
    running: state.runningJobs,
    isRunning: useCallback((slug: string) => !!state.runningJobs[slug], [state.runningJobs]),
    start: useCallback((slug: string) => dispatch({ type: "JOB_STARTED", slug }), [dispatch]),
    finish: useCallback((slug: string) => dispatch({ type: "JOB_FINISHED", slug }), [dispatch]),
  };
}

export function usePanelState() {
  const { state, dispatch } = useApp();
  return {
    isCollapsed: state.isPanelCollapsed,
    toggle: useCallback(() => dispatch({ type: "TOGGLE_PANEL" }), [dispatch]),
    setCollapsed: useCallback((collapsed: boolean, manual = false) => dispatch({ type: "SET_PANEL_COLLAPSED", collapsed, manual }), [dispatch]),
  };
}

export function useInspectorState() {
  const { state, dispatch } = useApp();
  return {
    isOpen: state.isInspectorOpen,
    width: state.inspectorWidth,
    open: useCallback(() => dispatch({ type: "OPEN_INSPECTOR" }), [dispatch]),
    close: useCallback(() => dispatch({ type: "CLOSE_INSPECTOR" }), [dispatch]),
    resize: useCallback((w: 480 | 720 | 860) => dispatch({ type: "RESIZE_INSPECTOR", width: w }), [dispatch]),
  };
}

/** Run a job with shimmer + toast lifecycle. */
export function useJobRunner() {
  const { dispatch } = useApp();
  const toasts = useToasts();
  return useCallback(
    async <T,>(
      slug: string,
      run: () => Promise<T>,
      messages: {
        successTitle: string;
        errorTitle: string;
        successBody?: (result: T) => string | undefined;
        suppressSuccessToast?: boolean;
      },
    ): Promise<T | null> => {
      dispatch({ type: "JOB_STARTED", slug });
      try {
        const result = await run();
        if (!messages.suppressSuccessToast) {
          toasts.push({
            variant: "success" as ToastVariant,
            title: messages.successTitle,
            body: messages.successBody?.(result),
          });
        }
        return result;
      } catch (error) {
        toasts.push({
          variant: "error",
          title: messages.errorTitle,
          body: error instanceof Error ? error.message : String(error),
        });
        return null;
      } finally {
        dispatch({ type: "JOB_FINISHED", slug });
      }
    },
    [dispatch, toasts],
  );
}

/** Persist recently viewed vessels for the command palette. */
export function recordRecentVessel(id: number) {
  recordRecent("vessel", id);
}

export type RecentKind = "vessel" | "entity" | "evidence" | "port";

export type RecentEntry = {
  kind: RecentKind;
  id: number | string;
  label?: string;
  at: number;
};

const RECENT_KEY = "seam:recent";

export function recordRecent(kind: RecentKind, id: number | string, label?: string) {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr: RecentEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = arr.filter((e) => !(e.kind === kind && String(e.id) === String(id)));
    const next: RecentEntry[] = [{ kind, id, label, at: Date.now() }, ...filtered].slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    // Legacy: keep the old vessels-only key in sync so older callers still work.
    if (kind === "vessel") {
      const ids = next.filter((e) => e.kind === "vessel").map((e) => Number(e.id)).filter(Number.isFinite);
      localStorage.setItem("seam:recent-vessels", JSON.stringify(ids.slice(0, 8)));
    }
  } catch {
    /* ignore */
  }
}

export function readRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Memo helper: auto-collapse panel when an inspector opens (and the user hasn't manually expanded). */
export function useAutoCollapsePanel(isInspectorOpen: boolean) {
  const { state, dispatch } = useApp();
  useEffect(() => {
    if (isInspectorOpen && !state.isPanelCollapsed && !state.panelManuallyExpanded) {
      dispatch({ type: "SET_PANEL_COLLAPSED", collapsed: true });
    }
  }, [isInspectorOpen, state.isPanelCollapsed, state.panelManuallyExpanded, dispatch]);
}
