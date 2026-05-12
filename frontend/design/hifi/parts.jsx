// SEAM V2 Hi-fi — shared primitives, map base, command panel, inspector shell.

/* =============================================================
 * Icon library (lucide-flavored, 1.6 stroke)
 * ===========================================================*/
const HIcon = ({ name, size=18, color, style }) => {
  const stroke = color || 'currentColor';
  const sw = size <= 14 ? 1.5 : 1.6;
  const s = { width: size, height: size, display: 'inline-block', verticalAlign: '-3px', flexShrink: 0, ...(style||{}) };
  const props = { viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", style: s };
  const P = {
    anchor: <><circle cx="12" cy="5" r="2.2"/><path d="M12 7.2v14M5 12H3a9 9 0 0 0 18 0h-2"/><path d="M8 12h8"/></>,
    ship:   <><path d="M3 16l9-9 9 9"/><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/><path d="M3 20l3-1.5L9 20l3-1.5 3 1.5 3-1.5L21 20"/></>,
    bldg:   <><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h.01M9 11h.01M9 15h.01M15 7h.01M15 11h.01M15 15h.01"/><path d="M10 21v-4h4v4"/></>,
    pin:    <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></>,
    radar:  <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-4"/></>,
    shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M12 8v5M12 16h.01"/></>,
    news:   <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h6M7 13h6M7 17h4M16 9h2M16 13h2M16 17h2"/></>,
    scale:  <><path d="M12 3v18M5 21h14M7 7h10"/><path d="M5 13c0 0 0-2 2-2s2 2 2 2c0 1.5-1.5 2-2 2s-2-.5-2-2zM15 13c0 0 0-2 2-2s2 2 2 2c0 1.5-1.5 2-2 2s-2-.5-2-2z"/></>,
    db:     <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
    net:    <><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/><circle cx="12" cy="12" r="2.2"/><path d="M7.5 7.5l3 3M16.5 7.5l-3 3M7.5 16.5l3-3M16.5 16.5l-3-3"/></>,
    table:  <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/></>,
    filter: <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
    search: <><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></>,
    refresh:<><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></>,
    play:   <><path d="M6 4l14 8-14 8z"/></>,
    layers: <><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/></>,
    eye:    <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2.7"/></>,
    eyeoff: <><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.4 4"/><path d="M6.4 6.4C3.5 8.3 2 12 2 12s4 7 10 7c1.7 0 3.2-.5 4.6-1.2"/></>,
    chevR:  <><path d="M9 6l6 6-6 6"/></>,
    chevL:  <><path d="M15 6l-6 6 6 6"/></>,
    chevD:  <><path d="M6 9l6 6 6-6"/></>,
    chevU:  <><path d="M6 15l6-6 6 6"/></>,
    ext:    <><path d="M14 4h6v6M20 4l-9 9M19 13v6H5V5h6"/></>,
    x:      <><path d="M6 6l12 12M18 6l-12 12"/></>,
    plus:   <><path d="M12 5v14M5 12h14"/></>,
    minus:  <><path d="M5 12h14"/></>,
    fit:    <><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></>,
    ruler:  <><path d="M3 13l8-8 10 10-8 8z"/><path d="M8 10l2 2M11 7l2 2M14 10l2 2M11 13l2 2"/></>,
    upload: <><path d="M12 3v14M6 9l6-6 6 6"/><path d="M4 21h16"/></>,
    copy:   <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M5 16V5a2 2 0 0 1 2-2h11"/></>,
    cmd:    <><path d="M7 4a3 3 0 1 1 0 6h10a3 3 0 1 1 0-6v16a3 3 0 1 1 0-6H7a3 3 0 1 1 0 6"/></>,
    user:   <><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    bell:   <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    alert:  <><path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></>,
    check:  <><path d="M4 12l5 5L20 6"/></>,
    arrowR: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    arrowL: <><path d="M19 12H5M11 5l-7 7 7 7"/></>,
    history:<><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/><path d="M12 7v5l3 2"/></>,
    download:<><path d="M12 3v14M6 13l6 6 6-6"/><path d="M4 21h16"/></>,
    note:   <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></>,
    flag:   <><path d="M4 21V4M4 4h13l-2 4 2 4H4"/></>,
    activity:<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,
    grip:   <><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></>,
  };
  return <svg {...props}>{P[name] || <circle cx="12" cy="12" r="6"/>}</svg>;
};

/* =============================================================
 * Layout helpers
 * ===========================================================*/
const HRow = ({ children, gap=8, align='center', justify='flex-start', style, ...rest }) => (
  <div style={{ display:'flex', alignItems:align, justifyContent:justify, gap, ...style }} {...rest}>{children}</div>
);
const HCol = ({ children, gap=8, style, ...rest }) => (
  <div style={{ display:'flex', flexDirection:'column', gap, ...style }} {...rest}>{children}</div>
);

const HPill = ({ kind, solid, children, dot }) => (
  <span className={`hifi-pill ${kind||''} ${solid?'solid':''}`}>
    {dot && <span className="dot"/>}{children}
  </span>
);

const HChip = ({ kind, selected, children }) => (
  <span className={`hifi-chip ${kind||''} ${selected?'selected':''}`}>{children}</span>
);

const HKbd = ({ children }) => <span className="hifi-kbd">{children}</span>;

const HSection = ({ title, action, children, style }) => (
  <div style={style}>
    <HRow justify="space-between" style={{ marginBottom: 8 }}>
      <div className="hifi-caption">{title}</div>
      {action}
    </HRow>
    {children}
  </div>
);

/* =============================================================
 * Country flag emoji helper (limited, for demo)
 * ===========================================================*/
const flag = c => ({SG:'🇸🇬',HK:'🇭🇰',BZ:'🇧🇿',PA:'🇵🇦',IT:'🇮🇹',NO:'🇳🇴',MH:'🇲🇭',MT:'🇲🇹',US:'🇺🇸',NL:'🇳🇱',CN:'🇨🇳',EG:'🇪🇬',NG:'🇳🇬',AE:'🇦🇪',IR:'🇮🇷'})[c] || '🏳️';

/* =============================================================
 * MAP BASE — light analytical, coastlines + landmasses
 * ===========================================================*/
const HMapBase = ({ w=1440, h=900, showVessels=true, showHalos=true, dim=false }) => (
  <div className="hifi-map" style={{ width:w, height:h }}>
    {/* Subtle graticule */}
    <div className="hifi-map-grid"/>
    {/* Bathymetry bands */}
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:w, height:h }}>
      {/* faint depth contours */}
      <g fill="none" stroke="var(--ocean-200)" strokeWidth="0.6" opacity="0.5">
        <path d="M 0 200 Q 200 180 400 220 T 800 240 T 1200 220 T 1440 240"/>
        <path d="M 0 380 Q 220 360 440 390 T 880 410 T 1440 400"/>
        <path d="M 0 560 Q 200 540 380 580 T 760 600 T 1200 580 T 1440 600"/>
        <path d="M 0 740 Q 240 720 480 760 T 960 780 T 1440 760"/>
      </g>

      {/* Landmass — Europe-ish (top center) */}
      <path d="M 380 60 Q 460 40 560 60 Q 660 50 760 80 Q 860 90 920 130 Q 980 170 960 230 Q 940 280 880 290 Q 800 300 720 270 Q 620 260 540 240 Q 440 220 400 180 Q 360 130 380 60 Z"
        fill="var(--land-100)" stroke="var(--land-300)" strokeWidth="1"/>
      <path d="M 380 60 Q 460 40 560 60 Q 660 50 760 80 Q 860 90 920 130 Q 980 170 960 230 Q 940 280 880 290 Q 800 300 720 270 Q 620 260 540 240 Q 440 220 400 180 Q 360 130 380 60 Z"
        fill="none" stroke="var(--navy-700)" strokeWidth="0.6" opacity="0.5"/>

      {/* Africa */}
      <path d="M 540 340 Q 620 320 700 360 Q 760 400 760 480 Q 760 600 700 680 Q 640 720 560 700 Q 480 660 460 580 Q 460 480 500 400 Q 520 360 540 340 Z"
        fill="var(--land-100)" stroke="var(--land-300)" strokeWidth="1"/>
      <path d="M 540 340 Q 620 320 700 360 Q 760 400 760 480 Q 760 600 700 680 Q 640 720 560 700 Q 480 660 460 580 Q 460 480 500 400 Q 520 360 540 340 Z"
        fill="none" stroke="var(--navy-700)" strokeWidth="0.6" opacity="0.5"/>

      {/* Asia */}
      <path d="M 1000 80 Q 1120 60 1240 90 Q 1340 120 1400 200 Q 1440 320 1400 460 Q 1380 600 1300 720 Q 1220 800 1140 760 Q 1060 720 1020 600 Q 980 480 1000 360 Q 990 220 1000 80 Z"
        fill="var(--land-100)" stroke="var(--land-300)" strokeWidth="1"/>
      <path d="M 1000 80 Q 1120 60 1240 90 Q 1340 120 1400 200 Q 1440 320 1400 460 Q 1380 600 1300 720 Q 1220 800 1140 760 Q 1060 720 1020 600 Q 980 480 1000 360 Q 990 220 1000 80 Z"
        fill="none" stroke="var(--navy-700)" strokeWidth="0.6" opacity="0.5"/>

      {/* South America */}
      <path d="M 60 460 Q 140 440 200 480 Q 250 540 240 640 Q 220 760 160 820 Q 100 860 70 820 Q 40 740 60 660 Q 50 540 60 460 Z"
        fill="var(--land-100)" stroke="var(--land-300)" strokeWidth="1"/>

      {/* Islands */}
      <ellipse cx="240" cy="380" rx="60" ry="20" fill="var(--land-100)" stroke="var(--land-300)" strokeWidth="1"/>
      <ellipse cx="900" cy="700" rx="50" ry="16" fill="var(--land-100)" stroke="var(--land-300)" strokeWidth="1"/>
      <ellipse cx="1280" cy="780" rx="80" ry="22" fill="var(--land-100)" stroke="var(--land-300)" strokeWidth="1"/>

      {/* Country labels */}
      <g fill="var(--slate-500)" fontFamily="Inter" fontSize="11" fontStyle="italic" opacity="0.7">
        <text x="640" y="160">NORTH ATLANTIC</text>
        <text x="280" y="320">ATLANTIC OCEAN</text>
        <text x="860" y="440">INDIAN OCEAN</text>
        <text x="1240" y="520">PHILIPPINE SEA</text>
        <text x="600" y="500" fontStyle="normal" fontSize="10" letterSpacing="0.1em">AFRICA</text>
        <text x="640" y="120" fontStyle="normal" fontSize="10" letterSpacing="0.1em">EUROPE</text>
        <text x="1180" y="200" fontStyle="normal" fontSize="10" letterSpacing="0.1em">ASIA</text>
      </g>

      {/* Shipping lane (cyan polygon) */}
      <path d="M 420 200 Q 560 240 720 260 Q 880 280 1040 300 L 1040 340 Q 880 320 720 300 Q 560 280 420 240 Z"
        fill="var(--cyan-400)" opacity="0.10" stroke="var(--cyan-400)" strokeWidth="0.8" strokeOpacity="0.4"/>
    </svg>

    {/* Ports */}
    {[[420,170,'Rotterdam','NLRTM'],[760,250,'Suez','EGSUZ'],[700,440,'Lagos','NGLOS'],[1080,360,'Singapore','SGSIN'],[1240,180,'Shanghai','CNSHA'],[920,420,'Mumbai','INBOM']].map(([x,y,name,code])=>(
      <div key={code} style={{ position:'absolute', left:x-5, top:y-5 }}>
        <div className="hifi-port-marker"/>
        <div className="hifi-caption" style={{ position:'absolute', left:14, top:-3, whiteSpace:'nowrap', fontSize:10 }}>{name}</div>
      </div>
    ))}

    {/* Vessels */}
    {showVessels && [
      [380,330,''],[450,400,'low'],[510,310,''],[600,210,''],[640,330,''],
      [820,310,'high'],[860,360,''],[950,260,''],[980,400,''],[1080,300,''],
      [880,520,'crit'],[1020,540,''],[940,640,''],[300,560,''],[200,500,''],
      [340,640,'med'],[440,580,''],[560,720,''],[700,610,''],[800,700,''],
      [1180,460,''],[1240,540,''],[1180,620,''],[1080,720,''],[1280,700,''],
      [120,300,''],[160,360,''],[260,260,''],[1100,140,''],[1200,260,''],
      [340,420,''],[480,260,''],[680,360,''],[760,560,''],[1140,540,''],
    ].map(([x,y,risk],i)=>(
      <div key={i} style={{ position:'absolute', left:x-6, top:y-6 }}>
        {showHalos && risk && (
          <div className={`hifi-halo ${risk}`} style={{
            position:'absolute', left:-12, top:-12, width:36, height:36,
          }}/>
        )}
        <div className={`hifi-vessel ${risk}`}/>
      </div>
    ))}

    {/* Dim overlay (used for modal/palette states) */}
    {dim && <div style={{ position:'absolute', inset:0, background:'rgba(14,34,53,0.32)' }}/>}
  </div>
);

/* =============================================================
 * COMMAND PANEL — expanded 320px
 * ===========================================================*/
const HCommandPanel = ({ activeNav='map', showFilters=true, fullHeight=true, top=16, bottom=16 }) => (
  <div className="hifi-panel" style={{
    position:'absolute', left:16, top, bottom: fullHeight?bottom:'auto', width:320,
    display:'flex', flexDirection:'column',
    overflow:'hidden',
    zIndex: 5,
  }}>
    {/* Brand */}
    <HRow justify="space-between" style={{ padding:'14px 16px', borderBottom:'1px solid var(--gray-200)' }}>
      <HRow gap={8}>
        <div style={{ width:28, height:28, borderRadius:8, background:'var(--navy-900)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
          <HIcon name="anchor" size={16}/>
        </div>
        <HCol gap={0}>
          <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em', color:'var(--navy-900)', lineHeight:'18px' }}>SEAM</div>
          <div style={{ fontSize:9, color:'var(--slate-500)', letterSpacing:'0.12em', fontWeight:600 }}>V2 · INTELLIGENCE</div>
        </HCol>
      </HRow>
      <HRow gap={4}>
        <button className="hifi-btn icon sm ghost"><HIcon name="bell" size={14}/></button>
        <button className="hifi-btn icon sm ghost" title="collapse"><HIcon name="chevL" size={14}/></button>
      </HRow>
    </HRow>

    {/* Search */}
    <div style={{ padding:'12px 14px' }}>
      <div className="hifi-input frosty">
        <HIcon name="search" size={14} color="var(--slate-500)"/>
        <input placeholder="Search vessels, IMOs, ports, evidence #…" defaultValue=""/>
        <HKbd>/</HKbd>
      </div>
    </div>

    {/* Scrollable middle */}
    <div className="hifi-scroll" style={{ flex:1, overflow:'auto', padding:'0 10px' }}>
      {/* Nav */}
      <HCol gap={1}>
        {[
          ['map','radar','Map',null],
          ['vessels','ship','Vessels','12,481'],
          ['entities','bldg','Entities','3,902'],
          ['ports','pin','Ports','—'],
          ['risk','shield','Risk feed','77'],
          ['news','news','News','12'],
          ['sanctions','scale','Sanctions','11'],
          ['graph','net','Graph',null],
          ['schema','table','Schema',null],
        ].map(([id,ic,label,count])=>(
          <div key={id} className={`hifi-nav ${activeNav===id?'active':''}`}>
            <HIcon name={ic} size={16}/>
            <span>{label}</span>
            {count && <span className="count">{count}</span>}
          </div>
        ))}
        <div className="hifi-divider"/>
        <div className={`hifi-nav ${activeNav==='ops'?'active':''}`}>
          <HIcon name="db" size={16}/><span>Operations</span>
        </div>
        <div className={`hifi-nav ${activeNav==='roadmap'?'active':''}`}>
          <HIcon name="flag" size={16}/><span>Roadmap</span>
        </div>
      </HCol>

      {showFilters && (
        <>
          <div className="hifi-divider"/>
          <HSection title="Map filters" action={<HIcon name="chevD" size={14} color="var(--slate-500)"/>}>
            <HCol gap={12}>
              {/* Risk */}
              <HCol gap={4}>
                <div style={{ fontSize:11, fontWeight:500, color:'var(--slate-500)' }}>Risk severity</div>
                <HRow gap={4} style={{ flexWrap:'wrap' }}>
                  <HChip selected>All</HChip>
                  <HChip kind="crit">Critical</HChip>
                  <HChip kind="high">High</HChip>
                  <HChip>Medium</HChip>
                  <HChip>Low</HChip>
                </HRow>
              </HCol>
              {/* Vessel type */}
              <HCol gap={4}>
                <div style={{ fontSize:11, fontWeight:500, color:'var(--slate-500)' }}>Vessel type</div>
                <div className="hifi-input">
                  <span style={{ flex:1, fontSize:13 }}>Cargo, Tanker <span style={{ color:'var(--slate-500)' }}>+2</span></span>
                  <HIcon name="chevD" size={14} color="var(--slate-500)"/>
                </div>
              </HCol>
              {/* Flag state */}
              <HCol gap={4}>
                <div style={{ fontSize:11, fontWeight:500, color:'var(--slate-500)' }}>Flag state</div>
                <div className="hifi-input">
                  <span style={{ flex:1, fontSize:13, color:'var(--slate-400)' }}>Any flag…</span>
                  <HIcon name="chevD" size={14} color="var(--slate-500)"/>
                </div>
              </HCol>
              {/* Toggles */}
              <HCol gap={6}>
                {[['Has sanctions match', false], ['Has open risk flag', true]].map(([t,on])=>(
                  <HRow key={t} justify="space-between" style={{ fontSize:13 }}>
                    <span>{t}</span>
                    <div style={{
                      width:32, height:18, borderRadius:9,
                      background: on?'var(--ocean-500)':'var(--gray-200)',
                      position:'relative', transition:'background .15s'
                    }}>
                      <div style={{
                        position:'absolute', top:2, left: on?16:2, width:14, height:14,
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
                  {['Live','1h','6h','24h','7d'].map((t,i)=>(
                    <div key={t} style={{
                      flex:1, textAlign:'center', padding:'4px 0',
                      fontSize:12, fontWeight:500,
                      background: i===0?'#fff':'transparent',
                      color: i===0?'var(--navy-900)':'var(--slate-500)',
                      borderRadius:6,
                      boxShadow: i===0?'0 1px 2px rgba(14,34,53,0.08)':'none',
                    }}>{t}</div>
                  ))}
                </div>
              </HCol>
              {/* Port activity overlay radio */}
              <HCol gap={6}>
                <div style={{ fontSize:11, fontWeight:500, color:'var(--slate-500)' }}>Port activity overlay</div>
                {[['None',true],['Due to arrive',false],['Due to depart',false]].map(([t,sel])=>(
                  <HRow key={t} gap={8} style={{ fontSize:13 }}>
                    <div style={{
                      width:14, height:14, borderRadius:'50%',
                      border: sel?'4px solid var(--ocean-500)':'1.5px solid var(--gray-300)',
                      background: sel?'#fff':'transparent'
                    }}/>
                    <span>{t}</span>
                  </HRow>
                ))}
              </HCol>
            </HCol>
          </HSection>

          <div className="hifi-divider"/>
          <HSection title="Source refresh" action={<HIcon name="chevR" size={14} color="var(--slate-500)"/>}>
            <HRow gap={6} style={{ flexWrap:'wrap' }}>
              <button className="hifi-btn sm"><HIcon name="refresh" size={12}/>Positions</button>
              <button className="hifi-btn sm"><HIcon name="refresh" size={12}/>News</button>
              <button className="hifi-btn primary sm"><HIcon name="play" size={12}/>Refresh all</button>
            </HRow>
          </HSection>
        </>
      )}
    </div>

    {/* Sticky stats */}
    <div style={{ padding:'12px 14px', borderTop:'1px solid var(--gray-200)', background:'rgba(248,249,251,0.6)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          ['247','Tracked vessels','+12 /hr','info'],
          ['38','Active ports','24h',null],
          ['11','Sanctions match',null,'crit'],
          ['23','Open risk flags',null,null],
        ].map(([n,l,sub,kind])=>(
          <div key={l} style={{ background:'#fff', border:'1px solid var(--gray-200)', borderRadius:8, padding:'8px 10px' }}>
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
        <HRow gap={6}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--health-ok)' }}/>
          <span style={{ fontSize:11, color:'var(--slate-500)' }}>Backend OK · 0:32 ago</span>
        </HRow>
        <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--ocean-500)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600 }}>EM</div>
      </HRow>
    </div>
  </div>
);

/* =============================================================
 * COMMAND PANEL — collapsed 64px rail
 * ===========================================================*/
const HCommandRail = ({ activeNav='map', top=16, bottom=16 }) => (
  <div className="hifi-panel" style={{
    position:'absolute', left:16, top, bottom, width:64,
    display:'flex', flexDirection:'column', alignItems:'center',
    padding:'14px 0', gap:6, zIndex: 5
  }}>
    <div style={{ width:32, height:32, borderRadius:8, background:'var(--navy-900)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
      <HIcon name="anchor" size={16}/>
    </div>
    <button className="hifi-btn icon sm ghost" title="expand" style={{ marginTop:2 }}><HIcon name="chevR" size={14}/></button>
    <div style={{ height:1, width:32, background:'var(--gray-200)', margin:'6px 0' }}/>
    {[
      ['map','radar'],['vessels','ship'],['entities','bldg'],['ports','pin'],
      ['risk','shield'],['news','news'],['sanctions','scale'],['graph','net'],['schema','table'],
    ].map(([id,ic])=>(
      <div key={id} title={id} style={{
        width:40, height:36, display:'flex', alignItems:'center', justifyContent:'center',
        background: activeNav===id ? 'var(--ocean-50)' : 'transparent',
        color: activeNav===id ? 'var(--navy-900)' : 'var(--slate-500)',
        borderRadius:8,
        position:'relative',
      }}>
        {activeNav===id && <span style={{ position:'absolute', left:-12, top:8, bottom:8, width:3, background:'var(--ocean-500)', borderRadius:'0 2px 2px 0' }}/>}
        <HIcon name={ic} size={17}/>
      </div>
    ))}
    <div style={{ flex:1 }}/>
    <div style={{ height:1, width:32, background:'var(--gray-200)' }}/>
    <div style={{ width:40, height:36, display:'flex', alignItems:'center', justifyContent:'center', color: activeNav==='ops'?'var(--navy-900)':'var(--slate-500)', background: activeNav==='ops'?'var(--ocean-50)':'transparent', borderRadius:8 }}>
      <HIcon name="db" size={17}/>
    </div>
    <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--ocean-500)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, marginTop:2 }}>EM</div>
  </div>
);

/* =============================================================
 * MAP UTILITY BAR — top-right
 * ===========================================================*/
const HMapUtilBar = ({ right=16, top=16 }) => (
  <div style={{ position:'absolute', top, right, display:'flex', flexDirection:'column', gap:8, zIndex:4 }}>
    <div className="hifi-glass" style={{ padding:4, display:'flex', flexDirection:'column', gap:2, borderRadius:10 }}>
      <button className="hifi-btn icon sm ghost"><HIcon name="plus" size={14}/></button>
      <div style={{ height:1, background:'var(--gray-200)' }}/>
      <button className="hifi-btn icon sm ghost"><HIcon name="minus" size={14}/></button>
      <div style={{ height:1, background:'var(--gray-200)' }}/>
      <button className="hifi-btn icon sm ghost"><HIcon name="fit" size={14}/></button>
    </div>
    <div className="hifi-glass" style={{ padding:'6px 10px', borderRadius:10, fontSize:12 }}>
      <HRow gap={6}><HIcon name="layers" size={13}/><span>3 layers on</span></HRow>
    </div>
    <div className="hifi-glass" style={{ padding:4, display:'flex', gap:2, borderRadius:10 }}>
      {['Light','Dark','Sat'].map((b,i)=>(
        <div key={b} style={{
          padding:'4px 10px', fontSize:11, fontWeight:500, borderRadius:6,
          background: i===0?'var(--navy-900)':'transparent',
          color: i===0?'#fff':'var(--slate-500)',
        }}>{b}</div>
      ))}
    </div>
    <div className="hifi-glass" style={{ padding:'6px 10px', borderRadius:10 }}>
      <span className="hifi-mono" style={{ fontSize:11, color:'var(--navy-700)' }}>52.31°N · 4.07°E</span>
    </div>
    <button className="hifi-btn icon sm" style={{ background:'rgba(255,255,255,0.92)', backdropFilter:'blur(10px)' }}>
      <HIcon name="ruler" size={14}/>
    </button>
  </div>
);

/* =============================================================
 * MAP STATUS STRIP — bottom center
 * ===========================================================*/
const HMapStatusStrip = ({ left='50%', text='Showing 247 vessels · last positions refreshed 3 min ago · 7 with active risk flags' }) => (
  <div style={{ position:'absolute', bottom:24, left, transform:'translateX(-50%)', zIndex:4 }}>
    <div className="hifi-glass" style={{ padding:'8px 16px', borderRadius:999, fontSize:12 }}>
      <HRow gap={10}>
        <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--health-ok)' }}/>
        <span style={{ color:'var(--navy-700)' }}>
          Showing <strong style={{ color:'var(--navy-900)' }}>247 vessels</strong> · last positions refreshed <span style={{ textDecoration:'underline', cursor:'pointer' }}>3 min ago</span> · <span style={{ color:'var(--risk-high)' }}>7 with active risk flags</span>
        </span>
      </HRow>
    </div>
  </div>
);

/* =============================================================
 * SCALE BAR — bottom left of map
 * ===========================================================*/
const HScaleBar = ({ left=104, bottom=24 }) => (
  <div className="hifi-glass" style={{ position:'absolute', left, bottom, padding:'6px 10px', borderRadius:8, zIndex:4 }}>
    <HRow gap={8}>
      <div style={{ position:'relative', width:80, height:8 }}>
        <div style={{ position:'absolute', left:0, right:0, top:3, height:2, background:'var(--navy-900)' }}/>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2, background:'var(--navy-900)' }}/>
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:2, background:'var(--navy-900)' }}/>
        <div style={{ position:'absolute', left:'50%', top:1, bottom:1, width:1, background:'var(--navy-900)' }}/>
      </div>
      <span className="hifi-mono" style={{ fontSize:10, color:'var(--navy-700)' }}>500 km · 270 nm</span>
    </HRow>
  </div>
);

/* =============================================================
 * INSPECTOR SHELL — slide-in from the LEFT (next to the rail)
 * ===========================================================*/
const HInspector = ({ title, breadcrumb, width=480, children, footer, tabs, activeTab=0, side='left' }) => {
  // rail is 64px at left:16. inspector sits at left:16+64+12 = 92 → round to 96
  const pos = side === 'left'
    ? { left: 96, right: 'auto' }
    : { right: 16, left: 'auto' };
  return (
    <div className="hifi-panel-solid" style={{
      position:'absolute', top:16, bottom:16, width, ...pos,
      display:'flex', flexDirection:'column', zIndex: 6,
      overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{ padding:'14px 18px 0', borderBottom: tabs?'none':'1px solid var(--gray-200)' }}>
        <HRow justify="space-between">
          <HCol gap={3}>
            {breadcrumb && <div className="hifi-caption">{breadcrumb}</div>}
            <div className="hifi-h1" style={{ fontSize:20 }}>{title}</div>
          </HCol>
          <HRow gap={2}>
            <button className="hifi-btn icon sm ghost" title="resize">↔</button>
            <button className="hifi-btn icon sm ghost" title="pop out"><HIcon name="ext" size={14}/></button>
            <button className="hifi-btn icon sm ghost" title="close"><HIcon name="x" size={14}/></button>
          </HRow>
        </HRow>
        {tabs && (
          <div className="hifi-tabs" style={{ marginTop:14 }}>
            {tabs.map((t,i)=>{
              const [label, count] = Array.isArray(t) ? t : [t, null];
              return (
                <div key={label} className={`hifi-tab ${i===activeTab?'active':''}`}>
                  {label}{count!=null && <span className="count">{count}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="hifi-scroll" style={{ flex:1, overflow:'auto', padding:'18px' }}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--gray-200)', background:'var(--gray-50)' }}>
          {footer}
        </div>
      )}
    </div>
  );
};

/* =============================================================
 * VESSEL POPOVER — over map
 * ===========================================================*/
const HVesselPopover = ({ left, top }) => (
  <div className="hifi-glass" style={{
    position:'absolute', left, top, width:300, padding:14, zIndex:5
  }}>
    <HRow justify="space-between" style={{ marginBottom:8 }}>
      <HCol gap={2}>
        <div style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.01em' }}>NORTHERN STAR</div>
        <div className="hifi-mono" style={{ fontSize:11, color:'var(--slate-500)' }}>IMO 9876543 · MMSI 538009123</div>
      </HCol>
      <button className="hifi-btn icon sm ghost"><HIcon name="x" size={14}/></button>
    </HRow>
    <div style={{ background:'var(--ocean-50)', borderRadius:8, padding:'8px 10px', marginBottom:10 }}>
      <HRow gap={12} style={{ flexWrap:'wrap', fontSize:11 }}>
        <span className="hifi-mono" style={{ fontWeight:600 }}>52.31°N 4.07°E</span>
        <span><strong className="hifi-num">14.2</strong> kn</span>
        <span><strong className="hifi-num">087°</strong></span>
        <HPill kind="info">UnderWay</HPill>
      </HRow>
    </div>
    <HRow gap={4} style={{ marginBottom:10, flexWrap:'wrap' }}>
      <HPill kind="high" solid dot>High · Dark AIS</HPill>
      <HPill kind="med" dot>Med · News</HPill>
    </HRow>
    <HCol gap={4} style={{ marginBottom:12, fontSize:12 }}>
      <HRow justify="space-between"><span style={{ color:'var(--slate-500)' }}>Owner</span><span style={{ color:'var(--navy-900)' }}>Aurora Shipping Ltd</span></HRow>
      <HRow justify="space-between"><span style={{ color:'var(--slate-500)' }}>Manager</span><span style={{ color:'var(--navy-900)' }}>Aurora Mgmt SG</span></HRow>
      <HRow justify="space-between"><span style={{ color:'var(--slate-500)' }}>Flag</span><span style={{ color:'var(--navy-900)' }}>{flag('SG')} Singapore</span></HRow>
    </HCol>
    <HRow gap={6}>
      <button className="hifi-btn primary" style={{ flex:1 }}>Open vessel</button>
      <button className="hifi-btn"><HIcon name="net" size={14}/></button>
    </HRow>
    <HRow gap={6} style={{ marginTop:8, fontSize:11, color:'var(--ocean-500)', cursor:'pointer' }}>
      <HIcon name="ext" size={12}/>
      <span style={{ textDecoration:'underline' }}>View evidence #4821</span>
    </HRow>
  </div>
);

Object.assign(window, {
  HIcon, HRow, HCol, HPill, HChip, HKbd, HSection,
  HMapBase, HCommandPanel, HCommandRail, HMapUtilBar, HMapStatusStrip, HScaleBar,
  HInspector, HVesselPopover, flag,
});
