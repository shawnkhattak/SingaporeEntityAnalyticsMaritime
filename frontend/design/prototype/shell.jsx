// Interactive shell: command panel + rail, map workspace, inspector shell.
// Reuses HIcon/HRow/HCol/HPill/HChip/HKbd/flag from hifi/parts.jsx but provides
// click-wired versions of the chrome.

/* =============================================================
 * INTERACTIVE COMMAND PANEL
 * ===========================================================*/
function PrototypeCommandPanel({ activeNav }) {
  const { panelCollapsed, setPanelCollapsed, filters, setFilters, runJob, runningJobs } = useApp();

  if (panelCollapsed) return <CollapsedRail activeNav={activeNav}/>;

  const navItems = [
    ['map','radar','Map',null],
    ['vessels-list','ship','Vessels','12,481'],
    ['entities-list','bldg','Entities','3,902'],
    ['ports','pin','Ports', String(PORTS.length)],
    ['risk','shield','Risk feed', String(RISK_FLAGS.length)],
    ['news','news','News', String(NEWS.length)],
    ['sanctions','scale','Sanctions', String(SANCTIONS.length)],
    ['graph','net','Graph',null],
    ['schema','table','Schema',null],
  ];
  const opsItems = [
    ['ops','db','Operations'],
    ['roadmap','flag','Roadmap'],
  ];

  const toggleSet = (set, value) => {
    const n = new Set(set);
    if (n.has(value)) n.delete(value); else n.add(value);
    return n;
  };

  return (
    <div className="hifi-panel" style={{
      position:'absolute', left:16, top:16, bottom:16, width:320,
      display:'flex', flexDirection:'column', overflow:'hidden', zIndex:5,
    }}>
      {/* Brand */}
      <HRow justify="space-between" style={{ padding:'14px 16px', borderBottom:'1px solid var(--gray-200)' }}>
        <HRow gap={8}>
          <div style={{ width:28, height:28, borderRadius:8, background:'var(--navy-900)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', cursor:'pointer' }} onClick={() => navigate('/')}>
            <HIcon name="anchor" size={16}/>
          </div>
          <HCol gap={0}>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em', color:'var(--navy-900)', lineHeight:'18px' }}>SEAM</div>
            <div style={{ fontSize:9, color:'var(--slate-500)', letterSpacing:'0.12em', fontWeight:600 }}>V2 · INTELLIGENCE</div>
          </HCol>
        </HRow>
        <HRow gap={4}>
          <button className="hifi-btn icon sm ghost"><HIcon name="bell" size={14}/></button>
          <button className="hifi-btn icon sm ghost" title="collapse panel" onClick={() => setPanelCollapsed(true)}>
            <HIcon name="chevL" size={14}/>
          </button>
        </HRow>
      </HRow>

      {/* Search */}
      <div style={{ padding:'12px 14px' }}>
        <div className="hifi-input frosty">
          <HIcon name="search" size={14} color="var(--slate-500)"/>
          <input data-global-search placeholder="Search vessels, IMOs, ports, evidence #…"/>
          <HKbd>/</HKbd>
        </div>
      </div>

      {/* Scrollable middle */}
      <div className="hifi-scroll" style={{ flex:1, overflow:'auto', padding:'0 10px' }}>
        <HCol gap={1}>
          {navItems.map(([id,ic,label,count]) => {
            const path = id === 'map' ? '/' :
                         id === 'vessels-list' ? '/vessels' :
                         id === 'entities-list' ? '/entities' :
                         `/${id}`;
            const active = activeNav === id;
            return (
              <div key={id} className={`hifi-nav ${active?'active':''}`} onClick={() => navigate(path)} style={{ cursor:'pointer' }}>
                <HIcon name={ic} size={16}/>
                <span>{label}</span>
                {count && <span className="count">{count}</span>}
              </div>
            );
          })}
          <div className="hifi-divider"/>
          {opsItems.map(([id,ic,label]) => (
            <div key={id} className={`hifi-nav ${activeNav===id?'active':''}`} onClick={() => navigate('/'+id)} style={{ cursor:'pointer' }}>
              <HIcon name={ic} size={16}/><span>{label}</span>
            </div>
          ))}
        </HCol>

        <div className="hifi-divider"/>
        <FilterSection filters={filters} setFilters={setFilters} toggleSet={toggleSet}/>

        <div className="hifi-divider"/>
        <HSection title="Source refresh">
          <HCol gap={6}>
            <HRow gap={4} style={{ flexWrap:'wrap' }}>
              <button
                className="hifi-btn sm"
                disabled={!!runningJobs['positions']}
                onClick={() => runJob({ slug:'positions', label:'Positions snapshot' })}
              >
                <HIcon name="refresh" size={12}/>Positions
                {runningJobs['positions'] && <span className="hifi-mono" style={{ fontSize:10, marginLeft:4 }}>…</span>}
              </button>
              <button className="hifi-btn sm" disabled={!!runningJobs['news']} onClick={() => runJob({ slug:'news', label:'News RSS' })}>
                <HIcon name="refresh" size={12}/>News
              </button>
            </HRow>
            <button className="hifi-btn primary sm" disabled={!!runningJobs['all']} onClick={() => runJob({ slug:'all', label:'Refresh all live', durationMs:2500 })}>
              <HIcon name="play" size={12}/>Refresh all live
            </button>
          </HCol>
        </HSection>
      </div>

      {/* Sticky stats */}
      <KeyStats/>
    </div>
  );
}

/* =============================================================
 * COLLAPSED RAIL
 * ===========================================================*/
function CollapsedRail({ activeNav }) {
  const { setPanelCollapsed } = useApp();
  const items = [
    ['map','radar','/'],
    ['vessels-list','ship','/vessels'],
    ['entities-list','bldg','/entities'],
    ['ports','pin','/ports'],
    ['risk','shield','/risk'],
    ['news','news','/news'],
    ['sanctions','scale','/sanctions'],
    ['graph','net','/graph'],
    ['schema','table','/schema'],
  ];
  return (
    <div className="hifi-panel" style={{
      position:'absolute', left:16, top:16, bottom:16, width:64,
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'14px 0', gap:6, zIndex:5
    }}>
      <div style={{ width:32, height:32, borderRadius:8, background:'var(--navy-900)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', cursor:'pointer' }} onClick={() => navigate('/')}>
        <HIcon name="anchor" size={16}/>
      </div>
      <button className="hifi-btn icon sm ghost" title="expand panel" onClick={() => setPanelCollapsed(false)} style={{ marginTop:2 }}>
        <HIcon name="chevR" size={14}/>
      </button>
      <div style={{ height:1, width:32, background:'var(--gray-200)', margin:'6px 0' }}/>
      {items.map(([id,ic,path]) => {
        const active = activeNav === id;
        return (
          <div
            key={id}
            title={id}
            onClick={() => navigate(path)}
            style={{
              width:40, height:36, display:'flex', alignItems:'center', justifyContent:'center',
              background: active ? 'var(--ocean-50)' : 'transparent',
              color: active ? 'var(--navy-900)' : 'var(--slate-500)',
              borderRadius:8, position:'relative', cursor:'pointer',
            }}>
            {active && <span style={{ position:'absolute', left:-12, top:8, bottom:8, width:3, background:'var(--ocean-500)', borderRadius:'0 2px 2px 0' }}/>}
            <HIcon name={ic} size={17}/>
          </div>
        );
      })}
      <div style={{ flex:1 }}/>
      <div style={{ height:1, width:32, background:'var(--gray-200)' }}/>
      <div
        title="ops"
        onClick={() => navigate('/ops')}
        style={{ width:40, height:36, display:'flex', alignItems:'center', justifyContent:'center', color: activeNav==='ops'?'var(--navy-900)':'var(--slate-500)', background: activeNav==='ops'?'var(--ocean-50)':'transparent', borderRadius:8, cursor:'pointer' }}>
        <HIcon name="db" size={17}/>
      </div>
      <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--ocean-500)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, marginTop:2 }}>EM</div>
    </div>
  );
}

/* =============================================================
 * Filter section
 * ===========================================================*/
function FilterSection({ filters, setFilters, toggleSet }) {
  return (
    <HSection title="Map filters">
      <HCol gap={12}>
        {/* Risk */}
        <HCol gap={4}>
          <div style={{ fontSize:11, fontWeight:500, color:'var(--slate-500)' }}>Risk severity</div>
          <HRow gap={4} style={{ flexWrap:'wrap' }}>
            <HChip selected={filters.riskSeverities.size === 0}>All</HChip>
            {['critical','high','medium','low'].map((s) => {
              const kind = s==='critical'?'crit':s==='medium'?'med':s;
              const sel = filters.riskSeverities.has(s);
              return (
                <span
                  key={s}
                  className={`hifi-chip ${sel?kind:''}`}
                  onClick={() => setFilters({ ...filters, riskSeverities: toggleSet(filters.riskSeverities, s) })}
                  style={{ cursor:'pointer', textTransform:'capitalize' }}>
                  {s}
                </span>
              );
            })}
          </HRow>
        </HCol>
        {/* Toggles */}
        <HCol gap={6}>
          {[
            ['hasSanctions','Has sanctions match'],
            ['hasOpenRiskFlag','Has open risk flag'],
          ].map(([k,label]) => (
            <HRow key={k} justify="space-between" style={{ fontSize:13, cursor:'pointer' }} onClick={() => setFilters({ ...filters, [k]: !filters[k] })}>
              <span>{label}</span>
              <div style={{
                width:32, height:18, borderRadius:9,
                background: filters[k]?'var(--ocean-500)':'var(--gray-200)',
                position:'relative', transition:'background .15s'
              }}>
                <div style={{
                  position:'absolute', top:2, left: filters[k]?16:2, width:14, height:14,
                  background:'#fff', borderRadius:'50%',
                  boxShadow:'0 1px 2px rgba(0,0,0,0.2)', transition:'left .15s'
                }}/>
              </div>
            </HRow>
          ))}
        </HCol>
        {/* Time window */}
        <HCol gap={4}>
          <div style={{ fontSize:11, fontWeight:500, color:'var(--slate-500)' }}>Time window</div>
          <div style={{ display:'flex', gap:2, padding:2, background:'var(--gray-100)', borderRadius:8 }}>
            {['live','1h','6h','24h','7d'].map((t) => {
              const sel = filters.timeWindow === t;
              return (
                <div key={t}
                  onClick={() => setFilters({ ...filters, timeWindow: t })}
                  style={{
                    flex:1, textAlign:'center', padding:'4px 0',
                    fontSize:12, fontWeight:500, cursor:'pointer',
                    background: sel?'#fff':'transparent',
                    color: sel?'var(--navy-900)':'var(--slate-500)',
                    borderRadius:6,
                    boxShadow: sel?'0 1px 2px rgba(14,34,53,0.08)':'none',
                    textTransform: t==='live'?'capitalize':'none',
                  }}>{t === 'live' ? 'Live' : t}</div>
              );
            })}
          </div>
        </HCol>
      </HCol>
    </HSection>
  );
}

/* =============================================================
 * Key stats strip
 * ===========================================================*/
function KeyStats() {
  return (
    <div style={{ padding:'12px 14px', borderTop:'1px solid var(--gray-200)', background:'rgba(248,249,251,0.6)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          ['247','Tracked vessels','+12 /hr','info','/vessels'],
          ['38','Active ports','24h',null,'/ports'],
          ['11','Sanctions match',null,'crit','/sanctions'],
          ['23','Open risk flags',null,null,'/risk'],
        ].map(([n,l,sub,kind,path]) => (
          <div key={l} onClick={() => navigate(path)} style={{ background:'#fff', border:'1px solid var(--gray-200)', borderRadius:8, padding:'8px 10px', cursor:'pointer' }}>
            <HRow justify="space-between" style={{ alignItems:'baseline' }}>
              <div className="hifi-num" style={{ fontSize:18 }}>{n}</div>
              {kind==='crit' && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--risk-critical)' }}/>}
              {kind==='info' && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--ocean-500)' }}/>}
            </HRow>
            <div style={{ fontSize:10.5, color:'var(--slate-500)', fontWeight:500 }}>{l}</div>
            {sub && <div style={{ fontSize:10, color:'var(--slate-400)', marginTop:1 }}>{sub}</div>}
            {l==='Open risk flags' && (
              <div style={{ display:'flex', gap:1, height:3, marginTop:5, borderRadius:1.5, overflow:'hidden' }}>
                <div style={{ flex:'3', background:'var(--risk-critical)' }}/>
                <div style={{ flex:'9', background:'var(--risk-high)' }}/>
                <div style={{ flex:'24', background:'var(--risk-medium)' }}/>
                <div style={{ flex:'41', background:'var(--risk-low)' }}/>
              </div>
            )}
          </div>
        ))}
      </div>
      <HRow justify="space-between" style={{ marginTop:10 }}>
        <HRow gap={6} style={{ cursor:'pointer' }} onClick={() => navigate('/ops')}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--health-ok)' }}/>
          <span style={{ fontSize:11, color:'var(--slate-500)' }}>Backend OK · 0:32 ago</span>
        </HRow>
        <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--ocean-500)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600 }}>EM</div>
      </HRow>
    </div>
  );
}

/* =============================================================
 * INTERACTIVE MAP
 *   - clickable vessels (the 10 named ones) → set popover, navigate
 *   - shows popover when popoverVesselId set
 * ===========================================================*/
function PrototypeMap() {
  const { popoverVesselId, setPopoverVesselId, selectVessel } = useApp();

  return (
    <div className="hifi-map" style={{ position:'absolute', inset:0 }}>
      {/* delegate to HMapBase for the base (uses static dots inside it) — but
       *  we want clickable named vessels overlaid, so we render our own. */}
      <div style={{ position:'absolute', inset:0 }}>
        <HMapBase showVessels={false} showHalos={false}/>
      </div>
      {/* Extra dots (decorative, non-clickable) */}
      {EXTRA_VESSEL_DOTS.map(([x,y,risk],i) => (
        <div key={'x'+i} style={{ position:'absolute', left:x-6, top:y-6, pointerEvents:'none' }}>
          <div className={`hifi-vessel ${risk||''}`}/>
        </div>
      ))}
      {/* Named vessels — clickable */}
      {VESSELS.map(v => {
        const sel = popoverVesselId === v.id;
        return (
          <div key={v.id} style={{ position:'absolute', left:v.x-6, top:v.y-6 }}>
            {v.risk && (
              <div className={`hifi-halo ${v.risk}`} style={{ position:'absolute', left:-12, top:-12, width:36, height:36 }}/>
            )}
            {sel && <div className="hifi-vessel-ring" style={{ left:-12, top:-12, position:'absolute' }}/>}
            <div
              className={`hifi-vessel ${v.risk||''} ${sel?'sel':''}`}
              onClick={(e) => {
                e.stopPropagation();
                setPopoverVesselId(v.id);
                selectVessel(v.id);
              }}
              style={{ cursor:'pointer' }}
              title={v.name}
            />
          </div>
        );
      })}
      {/* Background click closes popover */}
      <div
        onClick={() => setPopoverVesselId(null)}
        style={{ position:'absolute', inset:0, zIndex:-1 }}
      />
    </div>
  );
}

/* =============================================================
 * Vessel popover (interactive)
 * ===========================================================*/
function VesselPopoverLive() {
  const { popoverVesselId, setPopoverVesselId } = useApp();
  if (!popoverVesselId) return null;
  const v = findVessel(popoverVesselId);
  if (!v) return null;
  // Position to the right of the dot
  const left = Math.min(v.x + 24, 1440 - 320 - 16);
  const top = Math.max(v.y - 60, 24);
  return (
    <div className="hifi-glass" style={{ position:'absolute', left, top, width:300, padding:14, zIndex:6 }}>
      <HRow justify="space-between" style={{ marginBottom:8 }}>
        <HCol gap={2}>
          <div style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.01em' }}>{v.name}</div>
          <div className="hifi-mono" style={{ fontSize:11, color:'var(--slate-500)' }}>IMO {v.imo} · MMSI {v.mmsi}</div>
        </HCol>
        <button className="hifi-btn icon sm ghost" onClick={() => setPopoverVesselId(null)}><HIcon name="x" size={14}/></button>
      </HRow>
      <div style={{ background:'var(--ocean-50)', borderRadius:8, padding:'8px 10px', marginBottom:10 }}>
        <HRow gap={12} style={{ flexWrap:'wrap', fontSize:11 }}>
          <span className="hifi-mono" style={{ fontWeight:600 }}>{v.lat.toFixed(2)}°N {v.lon.toFixed(2)}°E</span>
          <span><strong className="hifi-num">{v.speed.toFixed(1)}</strong> kn</span>
          <span><strong className="hifi-num">{String(v.course).padStart(3,'0')}°</strong></span>
          <HPill kind="info">{v.navStatus}</HPill>
        </HRow>
      </div>
      {v.flags.length > 0 && (
        <HRow gap={4} style={{ marginBottom:10, flexWrap:'wrap' }}>
          {v.flags.map(f => <HPill key={f} kind={v.risk} solid dot>{f}</HPill>)}
        </HRow>
      )}
      <HCol gap={4} style={{ marginBottom:12, fontSize:12 }}>
        {v.owner && <HRow justify="space-between"><span style={{ color:'var(--slate-500)' }}>Owner</span><span>{findEntity(v.owner)?.name}</span></HRow>}
        {v.manager && <HRow justify="space-between"><span style={{ color:'var(--slate-500)' }}>Manager</span><span>{findEntity(v.manager)?.name}</span></HRow>}
        <HRow justify="space-between"><span style={{ color:'var(--slate-500)' }}>Flag</span><span>{flag(v.flag)} {v.flag}</span></HRow>
      </HCol>
      <HRow gap={6}>
        <button className="hifi-btn primary" style={{ flex:1 }} onClick={() => { setPopoverVesselId(null); navigate(`/vessels/${v.id}`); }}>Open vessel</button>
        <button className="hifi-btn" onClick={() => { setPopoverVesselId(null); navigate('/graph?subject=vessel&id='+v.id); }}><HIcon name="net" size={14}/></button>
      </HRow>
    </div>
  );
}

/* =============================================================
 * Map utility bar — minimal, decorative
 * ===========================================================*/
function PrototypeMapUtilBar() {
  return <HMapUtilBar/>;
}

/* =============================================================
 * Map status strip with running indicator
 * ===========================================================*/
function PrototypeMapStatusStrip({ leftOffset = 0 }) {
  const { runningJobs, runJob } = useApp();
  const refreshing = !!runningJobs['positions'] || !!runningJobs['all'];
  return (
    <div style={{ position:'absolute', bottom:24, left:`calc(50% + ${leftOffset}px)`, transform:'translateX(-50%)', zIndex:4 }}>
      <div className="hifi-glass" style={{ padding:'8px 16px', borderRadius:999, fontSize:12 }}>
        <HRow gap={10}>
          <span style={{ width:7, height:7, borderRadius:'50%', background: refreshing?'var(--ocean-500)':'var(--health-ok)', animation: refreshing?'hifi-pulse 1.5s infinite':'none' }}/>
          <span style={{ color:'var(--navy-700)' }}>
            Showing <strong style={{ color:'var(--navy-900)' }}>{VESSELS.length + EXTRA_VESSEL_DOTS.length} vessels</strong> · last positions refreshed{' '}
            <span style={{ textDecoration:'underline', cursor:'pointer' }} onClick={() => runJob({ slug:'positions', label:'Positions snapshot' })}>
              {refreshing ? 'now…' : '3 min ago'}
            </span> · <span style={{ color:'var(--risk-high)' }}>7 with active risk flags</span>
          </span>
        </HRow>
      </div>
    </div>
  );
}

/* =============================================================
 * INSPECTOR SHELL (interactive)
 * ===========================================================*/
function Inspector({ title, breadcrumb, tabs, footer, children, side='left', width=480 }) {
  const [activeTab, setActiveTab] = React.useState(0);
  const pos = side === 'left' ? { left:96 } : { right:16 };
  return (
    <div className="hifi-panel-solid" style={{
      position:'absolute', top:16, bottom:16, width, ...pos,
      display:'flex', flexDirection:'column', overflow:'hidden', zIndex:6,
    }}>
      <div style={{ padding:'14px 18px 0', borderBottom: tabs?'none':'1px solid var(--gray-200)' }}>
        <HRow justify="space-between">
          <HCol gap={3}>
            {breadcrumb && <div className="hifi-caption">{breadcrumb}</div>}
            <div className="hifi-h1" style={{ fontSize:20 }}>{title}</div>
          </HCol>
          <HRow gap={2}>
            <button className="hifi-btn icon sm ghost" title="pop out"><HIcon name="ext" size={14}/></button>
            <button className="hifi-btn icon sm ghost" title="close" onClick={() => navigate('/')}>
              <HIcon name="x" size={14}/>
            </button>
          </HRow>
        </HRow>
        {tabs && (
          <div className="hifi-tabs" style={{ marginTop:14 }}>
            {tabs.map((t,i) => {
              const [label, count] = Array.isArray(t) ? t : [t, null];
              return (
                <div
                  key={label}
                  className={`hifi-tab ${i===activeTab?'active':''}`}
                  onClick={() => setActiveTab(i)}
                  style={{ cursor:'pointer' }}>
                  {label}{count!=null && <span className="count">{count}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="hifi-scroll" style={{ flex:1, overflow:'auto', padding:'18px' }}>
        {typeof children === 'function' ? children(activeTab) : children}
      </div>
      {footer && (
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--gray-200)', background:'var(--gray-50)' }}>
          {footer}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  PrototypeCommandPanel, CollapsedRail,
  PrototypeMap, VesselPopoverLive,
  PrototypeMapUtilBar, PrototypeMapStatusStrip, Inspector,
});
