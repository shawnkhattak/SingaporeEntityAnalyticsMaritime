// Hash router + global app state for the prototype.

/* =============================================================
 * HASH ROUTER
 * ===========================================================*/
function parseHash() {
  const h = (window.location.hash || '#/').slice(1);
  const [pathWithSearch] = h.split('#');
  const [path, search] = pathWithSearch.split('?');
  const params = new URLSearchParams(search || '');

  // Map paths
  if (path === '' || path === '/' || path === '/map') return { name: 'map', params };
  if (path === '/vessels') return { name: 'vessels-list', params };
  const v = path.match(/^\/vessels\/(\d+)$/);
  if (v) return { name: 'vessel-detail', id: Number(v[1]), params };
  if (path === '/entities') return { name: 'entities-list', params };
  const e = path.match(/^\/entities\/(\d+)$/);
  if (e) return { name: 'entity-detail', id: Number(e[1]), params };
  if (path === '/ports') return { name: 'ports', params };
  if (path === '/risk') return { name: 'risk', params };
  if (path === '/news') return { name: 'news', params };
  if (path === '/sanctions') return { name: 'sanctions', params };
  const ev = path.match(/^\/evidence\/(\d+)$/);
  if (ev) return { name: 'evidence', id: Number(ev[1]), params };
  if (path === '/graph') return { name: 'graph', params };
  if (path === '/schema') return { name: 'schema', params };
  if (path === '/ops' || path === '/dev') return { name: 'ops', params };
  if (path === '/roadmap') return { name: 'roadmap', params };
  return { name: 'map', params };
}

function useRoute() {
  const [route, setRoute] = React.useState(parseHash);
  React.useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return route;
}

function navigate(path) {
  // Ensure leading slash
  const p = path.startsWith('/') ? path : '/' + path;
  if (window.location.hash !== '#' + p) {
    window.location.hash = '#' + p;
  }
}

const FULL_CANVAS = new Set(['graph', 'schema', 'ops', 'roadmap']);
const isFullCanvas = (r) => FULL_CANVAS.has(r.name);
const hasInspectorOpen = (r) =>
  r.name !== 'map' && !isFullCanvas(r);

/* =============================================================
 * APP STATE
 * ===========================================================*/
const AppContext = React.createContext(null);

function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

const INITIAL_FILTERS = {
  riskSeverities: new Set(),        // empty = all
  vesselTypes: new Set(),
  flagStates: new Set(),
  hasSanctions: false,
  hasOpenRiskFlag: false,
  portActivityKind: null,
  timeWindow: 'live',
  enabledGeoLayers: new Set(['ports_p','coastline_l']),
};

function AppProvider({ children }) {
  const [selectedVesselId, setSelectedVesselId] = React.useState(null);
  const [popoverVesselId, setPopoverVesselId] = React.useState(null);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [modal, setModal] = React.useState(null);          // { title, body, confirmLabel, onConfirm, danger }
  const [toasts, setToasts] = React.useState([]);
  const [filters, setFilters] = React.useState(INITIAL_FILTERS);
  const [panelCollapsed, setPanelCollapsedRaw] = React.useState(() => {
    try { return localStorage.getItem('seam:panel-collapsed') === '1'; } catch { return false; }
  });
  const [runningJobs, setRunningJobs] = React.useState({}); // slug -> true
  const [recentVessels, setRecentVessels] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('seam:recent-vessels') || '[]'); } catch { return []; }
  });

  const setPanelCollapsed = React.useCallback((v) => {
    setPanelCollapsedRaw(v);
    try { localStorage.setItem('seam:panel-collapsed', v ? '1' : '0'); } catch {}
  }, []);

  const pushToast = React.useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    const toast = { id, ttl: 4000, variant: 'info', ...t };
    setToasts((prev) => [...prev, toast]);
    if (toast.ttl) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, toast.ttl);
    }
    return id;
  }, []);

  const dismissToast = React.useCallback((id) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const startJob = React.useCallback((slug) => {
    setRunningJobs((prev) => ({ ...prev, [slug]: true }));
  }, []);
  const finishJob = React.useCallback((slug) => {
    setRunningJobs((prev) => { const n = { ...prev }; delete n[slug]; return n; });
  }, []);

  // Stub: "run" a job for the prototype — pretend, then push a success toast.
  const runJob = React.useCallback(({ slug, label, durationMs=1500 }) => {
    startJob(slug);
    pushToast({ variant: 'info', title: `${label} started`, tag: '#J' + Math.floor(2000+Math.random()*900) });
    setTimeout(() => {
      finishJob(slug);
      pushToast({ variant: 'success', title: `${label} complete`, body: 'Mock response · prototype only.', tag: '#J' + Math.floor(2000+Math.random()*900) });
    }, durationMs);
  }, [pushToast, startJob, finishJob]);

  const selectVessel = React.useCallback((id) => {
    setSelectedVesselId(id);
    setRecentVessels((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 8);
      try { localStorage.setItem('seam:recent-vessels', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const value = {
    selectedVesselId, selectVessel, setSelectedVesselId,
    popoverVesselId, setPopoverVesselId,
    paletteOpen, setPaletteOpen,
    modal, setModal,
    toasts, pushToast, dismissToast,
    filters, setFilters,
    panelCollapsed, setPanelCollapsed,
    runningJobs, startJob, finishJob, runJob,
    recentVessels,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/* =============================================================
 * HOTKEYS
 * ===========================================================*/
function useGlobalHotkeys() {
  const { paletteOpen, setPaletteOpen, modal, setModal, setPopoverVesselId } = useApp();
  const route = useRoute();
  React.useEffect(() => {
    const handler = (e) => {
      const inField = ['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      // ⌘K — palette
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      // "/" — focus search (only if not in field)
      if (!inField && e.key === '/') {
        e.preventDefault();
        document.querySelector('[data-global-search]')?.focus();
        return;
      }
      // Escape: palette > modal > popover > inspector close
      if (e.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (modal) { setModal(null); return; }
        setPopoverVesselId(null);
        if (hasInspectorOpen(route)) {
          navigate('/');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paletteOpen, setPaletteOpen, modal, setModal, route, setPopoverVesselId]);
}

Object.assign(window, {
  useRoute, navigate, isFullCanvas, hasInspectorOpen,
  AppContext, AppProvider, useApp, useGlobalHotkeys,
});
