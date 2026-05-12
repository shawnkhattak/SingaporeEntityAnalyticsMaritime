// Overlays, error state, roadmap, foundations.

/* =============================================================
 * 14. COMMAND PALETTE (⌘K)
 * ===========================================================*/
const HCommandPaletteScreen = () => (
  <div className="hifi" data-screen-label="14 Command palette" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase showHalos={false} dim/>
    <HCommandPanel activeNav="map"/>
    <HMapUtilBar/>

    {/* Palette modal */}
    <div style={{ position:'absolute', left:'calc(50% + 152px)', top:140, transform:'translateX(-50%)', zIndex:10 }}>
      <div className="hifi-panel-solid" style={{ width:680, padding:0, boxShadow:'var(--shadow-modal)', overflow:'hidden' }}>
        {/* Search row */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--gray-200)' }}>
          <HRow gap={12}>
            <HIcon name="search" size={20} color="var(--slate-500)"/>
            <span style={{ fontSize:18, color:'var(--navy-900)' }}>northern</span>
            <span style={{ width:1, height:20, background:'var(--ocean-500)', animation:'none' }}/>
            <div style={{ flex:1 }}/>
            <HKbd>esc</HKbd>
          </HRow>
        </div>

        {/* Sections */}
        <div className="hifi-scroll" style={{ maxHeight:520, overflow:'auto', padding:'8px 0' }}>
          {/* Vessels */}
          <div style={{ padding:'8px 22px 4px' }}>
            <HRow justify="space-between"><span className="hifi-caption">Vessels · 3 matches</span><span style={{ fontSize:11, color:'var(--slate-400)' }}>Top result</span></HRow>
          </div>
          {[
            {name:'NORTHERN STAR', imo:'9876543', flag:'SG', risk:'high', sel:true, hl:[0,8]},
            {name:'NORTHERN LIGHT', imo:'9821400', flag:'NO', risk:null, hl:[0,8]},
            {name:'NORTHERN PEARL', imo:'9744321', flag:'MH', risk:'low', hl:[0,8]},
          ].map(v=>(
            <div key={v.imo} style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'9px 22px',
              background: v.sel?'var(--ocean-50)':'transparent',
              borderLeft: v.sel?'3px solid var(--ocean-500)':'3px solid transparent',
              cursor:'pointer'
            }}>
              <div style={{
                width:28, height:28, borderRadius:6,
                background: v.sel?'var(--ocean-500)':'var(--gray-100)',
                color: v.sel?'#fff':'var(--slate-500)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <HIcon name="ship" size={14}/>
              </div>
              <span style={{ flex:1, fontSize:14, fontWeight:500 }}>
                <span style={{ background:'rgba(229,193,0,0.4)', padding:'0 2px', borderRadius:2, color:'var(--navy-900)' }}>{v.name.slice(0,8)}</span>
                <span>{v.name.slice(8)}</span>
              </span>
              <span className="hifi-mono" style={{ fontSize:11, color:'var(--slate-500)' }}>IMO {v.imo}</span>
              <span style={{ fontSize:14 }}>{flag(v.flag)}</span>
              {v.risk && <HPill kind={v.risk} solid dot>{v.risk}</HPill>}
              {v.sel && <HKbd>↵</HKbd>}
            </div>
          ))}

          <div style={{ height:1, background:'var(--gray-100)', margin:'6px 22px' }}/>

          <div style={{ padding:'6px 22px 4px' }}><span className="hifi-caption">Entities · 1 match</span></div>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 22px', cursor:'pointer' }}>
            <div style={{ width:28, height:28, borderRadius:6, background:'var(--gray-100)', color:'var(--slate-500)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <HIcon name="bldg" size={14}/>
            </div>
            <span style={{ flex:1, fontSize:14 }}>
              <span style={{ background:'rgba(229,193,0,0.4)', padding:'0 2px', borderRadius:2 }}>Northern</span> Wave Holdings
            </span>
            <span style={{ fontSize:11, color:'var(--slate-500)' }}>operator · {flag('MT')} Malta</span>
          </div>

          <div style={{ height:1, background:'var(--gray-100)', margin:'6px 22px' }}/>

          <div style={{ padding:'6px 22px 4px' }}><span className="hifi-caption">Ports · 1 match</span></div>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 22px', cursor:'pointer' }}>
            <div style={{ width:28, height:28, borderRadius:6, background:'var(--gray-100)', color:'var(--slate-500)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <HIcon name="pin" size={14}/>
            </div>
            <span style={{ flex:1, fontSize:14 }}>Port of <span style={{ background:'rgba(229,193,0,0.4)', padding:'0 2px', borderRadius:2 }}>Northern</span> Sound</span>
            <span className="hifi-mono" style={{ fontSize:11, color:'var(--slate-500)' }}>USANC · {flag('US')}</span>
          </div>

          <div style={{ height:1, background:'var(--gray-100)', margin:'6px 22px' }}/>

          {/* Go to */}
          <div style={{ padding:'6px 22px 4px' }}><span className="hifi-caption">Go to</span></div>
          {[
            ['radar','Map','/'],['ship','Vessels','/vessels'],['shield','Risk feed','/risk'],['db','Operations','/ops'],
          ].map(([ic,t,p])=>(
            <div key={t} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 22px', cursor:'pointer' }}>
              <HIcon name={ic} size={16} color="var(--slate-500)"/>
              <span style={{ flex:1, fontSize:13 }}>{t}</span>
              <span className="hifi-mono" style={{ fontSize:11, color:'var(--slate-400)' }}>{p}</span>
            </div>
          ))}

          <div style={{ height:1, background:'var(--gray-100)', margin:'6px 22px' }}/>

          {/* Ingestion actions */}
          <div style={{ padding:'6px 22px 4px' }}><span className="hifi-caption">Ingestion actions</span></div>
          {[
            ['play','Run positions snapshot','POST /dev/ingestion/positions-snapshot'],
            ['refresh','Refresh all live sources','POST /dev/ingestion/refresh-live'],
            ['shield','Recompute risk flags','POST /dev/risk/recompute'],
          ].map(([ic,t,p])=>(
            <div key={t} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 22px', cursor:'pointer' }}>
              <HIcon name={ic} size={16} color="var(--slate-500)"/>
              <span style={{ flex:1, fontSize:13 }}>{t}</span>
              <span className="hifi-mono" style={{ fontSize:10, color:'var(--slate-400)' }}>{p}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 22px', borderTop:'1px solid var(--gray-200)', background:'var(--gray-50)' }}>
          <HRow gap={16} style={{ fontSize:11, color:'var(--slate-500)' }}>
            <HRow gap={4}><HKbd>↑↓</HKbd><span>navigate</span></HRow>
            <HRow gap={4}><HKbd>↵</HKbd><span>open</span></HRow>
            <HRow gap={4}><HKbd>⌘K</HKbd><span>close</span></HRow>
            <span style={{ marginLeft:'auto', fontStyle:'italic' }}>search across vessels · entities · ports · evidence #</span>
          </HRow>
        </div>
      </div>
    </div>
  </div>
);

/* =============================================================
 * 15. CONFIRM MODAL + TOAST STACK
 * ===========================================================*/
const HModalToasts = () => (
  <div className="hifi" data-screen-label="15 Confirm modal + toasts" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase showHalos={false} dim/>
    <HCommandPanel activeNav="sanctions"/>
    <HMapUtilBar/>

    {/* Confirm modal */}
    <div style={{ position:'absolute', left:'calc(50% + 152px)', top:'50%', transform:'translate(-50%, -50%)', zIndex:10 }}>
      <div className="hifi-panel-solid" style={{ width:480, padding:0, boxShadow:'var(--shadow-modal)', overflow:'hidden' }}>
        <div style={{ padding:'24px 24px 18px' }}>
          <HRow gap={14} style={{ marginBottom:14 }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background:'rgba(198,40,40,0.10)', color:'var(--risk-critical)',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
            }}>
              <HIcon name="alert" size={22}/>
            </div>
            <HCol gap={6}>
              <div className="hifi-h1" style={{ fontSize:18 }}>Refresh sanctions from API?</div>
              <div className="hifi-sm" style={{ color:'var(--slate-500)' }}>
                This will consume <strong>1 OpenSanctions quota request</strong>. You have <strong style={{ color:'var(--risk-medium)' }}>13 of 100</strong> remaining this month.
              </div>
            </HCol>
          </HRow>
          <div className="hifi-card subtle" style={{ padding:12, fontSize:12 }}>
            <HRow justify="space-between" style={{ marginBottom:6 }}>
              <span style={{ color:'var(--slate-500)' }}>Monthly quota</span>
              <span className="hifi-mono"><strong>87</strong>/100 used</span>
            </HRow>
            <div style={{ height:6, background:'var(--gray-200)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:'87%', background:'linear-gradient(90deg, var(--health-ok), var(--risk-medium))' }}/>
            </div>
            <HRow style={{ marginTop:8, fontSize:11, color:'var(--slate-500)' }} justify="space-between">
              <span>Last refresh: 3h 12m ago</span>
              <span>Resets in 18 days</span>
            </HRow>
          </div>
        </div>
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--gray-200)', background:'var(--gray-50)' }}>
          <HRow gap={8} justify="flex-end">
            <button className="hifi-btn">Cancel</button>
            <button className="hifi-btn danger"><HIcon name="refresh" size={13}/>Yes, refresh now</button>
          </HRow>
        </div>
      </div>
    </div>

    {/* Toast stack — bottom right */}
    <div style={{ position:'absolute', bottom:24, right:24, display:'flex', flexDirection:'column', gap:10, width:380, zIndex:20 }}>
      {[
        { kind:'ok', icon:'check', title:'Positions snapshot complete', body:'247 vessels ingested · +12 new positions. Map refreshed.', tag:'#J2341' },
        { kind:'med', icon:'alert', title:'OpenSanctions quota at 87%', body:'13 requests remaining this month. Quota resets May 31.', tag:'WARN' },
        { kind:'crit', icon:'alert', title:'Port-activity fetch failed', body:'due-arrive returned HTTP 502 from upstream. Retry scheduled.', tag:'#J2338' },
      ].map((t,i)=>{
        const color = t.kind==='crit' ? 'var(--risk-critical)' : t.kind==='med' ? '#A66A0A' : 'var(--health-ok)';
        const bg = t.kind==='crit' ? 'rgba(198,40,40,0.06)' : t.kind==='med' ? 'rgba(229,148,19,0.08)' : 'rgba(46,143,91,0.06)';
        return (
          <div key={i} className="hifi-panel-solid" style={{ padding:'12px 14px', borderLeft:`3px solid ${color}`, boxShadow:'var(--shadow-popover)' }}>
            <HRow gap={10} style={{ alignItems:'flex-start' }}>
              <div style={{ width:24, height:24, borderRadius:6, background:bg, color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <HIcon name={t.icon} size={13}/>
              </div>
              <HCol gap={3} style={{ flex:1, minWidth:0 }}>
                <HRow justify="space-between">
                  <span style={{ fontSize:13, fontWeight:600 }}>{t.title}</span>
                  <span className="hifi-mono" style={{ fontSize:10, color:'var(--slate-400)' }}>{t.tag}</span>
                </HRow>
                <span style={{ fontSize:12, color:'var(--slate-500)' }}>{t.body}</span>
              </HCol>
              <button className="hifi-btn icon sm ghost" style={{ flexShrink:0, marginTop:-4 }}><HIcon name="x" size={12}/></button>
            </HRow>
          </div>
        );
      })}
    </div>
  </div>
);

/* =============================================================
 * 16. ROADMAP PAGE
 * ===========================================================*/
const HRoadmap = () => (
  <div className="hifi" data-screen-label="16 Roadmap" style={{ width:1440, height:900, position:'relative', background:'var(--gray-50)' }}>
    {/* Subtle wave bg */}
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04 }}>
      {[...Array(8)].map((_,i)=>(
        <path key={i} d={`M 0 ${100 + i*100} Q 360 ${60 + i*100} 720 ${100+i*100} T 1440 ${100+i*100}`} stroke="var(--ocean-500)" strokeWidth="1" fill="none"/>
      ))}
    </svg>

    <HCommandPanel activeNav="roadmap" showFilters={false}/>

    {/* Center column */}
    <div style={{ position:'absolute', left:'calc(50% + 152px)', top:0, bottom:0, width:780, transform:'translateX(-50%)', padding:'40px 0', display:'flex', flexDirection:'column' }}>
      <HCol gap={4} style={{ marginBottom:32 }}>
        <div className="hifi-caption">SEAM V2 · ROADMAP</div>
        <div className="hifi-display">From snapshot to streaming intelligence</div>
        <div className="hifi-sm" style={{ color:'var(--slate-500)', maxWidth:600 }}>
          A staged plan to evolve the platform from a snapshot ingestion model to live evidence-backed maritime intelligence. Updated weekly.
        </div>
      </HCol>

      <HCol gap={14} style={{ position:'relative', flex:1 }}>
        {/* Vertical timeline rail */}
        <div style={{ position:'absolute', left:18, top:8, bottom:8, width:2, background:'var(--gray-200)' }}/>

        {[
          { n:1, status:'Completed', title:'Snapshot foundations', body:'OCEANS-X positions, particulars, port activity. Vessel + entity ingestion. Evidence model. Risk flag taxonomy.', docs:8, tests:142 },
          { n:2, status:'Completed', title:'Reference & enrichment', body:'UN/LOCODE, flag states, vessel types. RSS news ingestion. Sanctions matching (OpenSanctions + CSV).', docs:6, tests:91 },
          { n:3, status:'In progress', title:'Map workspace v2', body:'Floating command panel, slide-in inspectors, risk halos, vessel popovers, geo-layer toggles.', docs:4, tests:68 },
          { n:4, status:'In progress', title:'Operations Console', body:'Source health, ingestion controls, vessel browser, logs viewer, table counts.', docs:3, tests:42 },
          { n:5, status:'Planned', title:'Graph relationships', body:'Multi-hop graph queries, evidence-aware edges, exportable subgraphs.', docs:2, tests:18 },
          { n:6, status:'Final', title:'Live streaming + alerts', body:'Push-based AIS updates, alert subscriptions, watchlist auto-refresh, configurable thresholds.', docs:1, tests:0 },
        ].map((s,i)=>{
          const sColor = s.status==='Completed'?'var(--health-ok)':s.status==='In progress'?'var(--ocean-500)':s.status==='Final'?'var(--cyan-400)':'var(--slate-400)';
          return (
            <div key={s.n} style={{ position:'relative', paddingLeft:54 }}>
              <div style={{
                position:'absolute', left:0, top:14, width:38, height:38, borderRadius:'50%',
                background: s.status==='Completed'?'var(--health-ok)':s.status==='In progress'?'var(--ocean-500)':'#fff',
                border: `2px solid ${sColor}`,
                color: (s.status==='Completed'||s.status==='In progress')?'#fff':sColor,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14, fontWeight:700,
                boxShadow:'0 0 0 4px var(--gray-50)'
              }}>{s.status==='Completed'? <HIcon name="check" size={16}/> : s.n}</div>
              <div className="hifi-panel-solid" style={{ padding:'16px 20px' }}>
                <HRow justify="space-between" style={{ marginBottom:6 }}>
                  <HRow gap={10}>
                    <span className="hifi-caption">Stage {s.n}</span>
                    <HPill kind={s.status==='Completed'?'ok':s.status==='In progress'?'info':s.status==='Final'?'info':'none'} dot>{s.status}</HPill>
                  </HRow>
                  <HRow gap={12} style={{ fontSize:11, color:'var(--slate-500)' }}>
                    <span><HIcon name="note" size={11}/> {s.docs} docs</span>
                    <span><HIcon name="check" size={11}/> {s.tests} tests</span>
                  </HRow>
                </HRow>
                <div className="hifi-h1" style={{ fontSize:17, marginBottom:6 }}>{s.title}</div>
                <div className="hifi-sm" style={{ color:'var(--slate-500)' }}>{s.body}</div>
                {s.status==='In progress' && (
                  <div style={{ height:4, background:'var(--gray-100)', borderRadius:2, marginTop:12, overflow:'hidden' }}>
                    <div style={{ height:'100%', width: s.n===3?'72%':'45%', background:'var(--ocean-500)' }}/>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </HCol>
    </div>
  </div>
);

/* =============================================================
 * 17. ERROR / DISCONNECTED STATE
 * ===========================================================*/
const HErrorState = () => (
  <div className="hifi" data-screen-label="17 Error — backend unreachable" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase showVessels={false} showHalos={false}/>
    {/* Greyscale wash over map */}
    <div style={{ position:'absolute', inset:0, background:'rgba(14,34,53,0.04)', filter:'grayscale(0.6)' }}/>

    {/* Command panel with red dot footer */}
    <div className="hifi-panel" style={{
      position:'absolute', left:16, top:16, bottom:16, width:320,
      display:'flex', flexDirection:'column', zIndex:5, overflow:'hidden'
    }}>
      <HRow justify="space-between" style={{ padding:'14px 16px', borderBottom:'1px solid var(--gray-200)' }}>
        <HRow gap={8}>
          <div style={{ width:28, height:28, borderRadius:8, background:'var(--navy-900)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            <HIcon name="anchor" size={16}/>
          </div>
          <HCol gap={0}>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--navy-900)', lineHeight:'18px' }}>SEAM</div>
            <div style={{ fontSize:9, color:'var(--slate-500)', letterSpacing:'0.12em', fontWeight:600 }}>V2 · OFFLINE</div>
          </HCol>
        </HRow>
        <HRow gap={6}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--risk-critical)' }}/>
          <span style={{ fontSize:11, fontWeight:600, color:'var(--risk-critical)' }}>Backend</span>
        </HRow>
      </HRow>

      <div style={{ padding:16, flex:1 }}>
        <div className="hifi-card" style={{ padding:14, borderColor:'rgba(198,40,40,0.30)', background:'rgba(198,40,40,0.04)' }}>
          <HRow gap={10} style={{ alignItems:'flex-start', marginBottom:8 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'var(--risk-critical)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <HIcon name="alert" size={15}/>
            </div>
            <HCol gap={3}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--risk-critical)' }}>Cannot reach backend</div>
              <div style={{ fontSize:11.5, color:'var(--slate-500)' }}>Last successful request 4m 12s ago.</div>
            </HCol>
          </HRow>
          <div style={{ fontSize:12, color:'var(--navy-700)', marginBottom:10 }}>
            All inspectors and ingestion controls are disabled until connection is restored. Cached vessels are shown for reference only.
          </div>
          <HRow gap={6}>
            <button className="hifi-btn primary sm" style={{ flex:1 }}><HIcon name="refresh" size={12}/>Retry</button>
            <button className="hifi-btn sm">Logs</button>
          </HRow>
        </div>

        <div style={{ marginTop:18 }}>
          <div className="hifi-caption" style={{ marginBottom:8 }}>Sources</div>
          <HCol gap={6}>
            {[
              ['OCEANS-X positions','fail','timeout'],
              ['OpenSanctions API','fail','timeout'],
              ['RSS feeds','fail','timeout'],
              ['Geo layers','fail','timeout'],
            ].map(([n,h,t])=>(
              <HRow key={n} justify="space-between" style={{ fontSize:12 }}>
                <HRow gap={8}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--risk-critical)' }}/>
                  <span style={{ color:'var(--slate-500)' }}>{n}</span>
                </HRow>
                <span style={{ fontSize:10.5, color:'var(--slate-400)' }}>{t}</span>
              </HRow>
            ))}
          </HCol>
        </div>
      </div>
    </div>

    <HMapUtilBar/>

    {/* Reconnecting pill */}
    <div style={{ position:'absolute', top:24, left:'calc(50% + 168px)', transform:'translateX(-50%)', zIndex:5 }}>
      <div className="hifi-glass" style={{ padding:'8px 14px', borderRadius:999, fontSize:12, border:'1px solid rgba(198,40,40,0.3)' }}>
        <HRow gap={10}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--risk-critical)' }}/>
          <span style={{ color:'var(--navy-900)', fontWeight:500 }}>Reconnecting…</span>
          <span style={{ color:'var(--slate-500)' }}>attempt 3 of ∞ · next in 8s</span>
        </HRow>
      </div>
    </div>

    {/* Inspector showing error state */}
    <div className="hifi-panel-solid" style={{
      position:'absolute', right:24, top:24, bottom:24, width:480,
      display:'flex', flexDirection:'column', zIndex:6
    }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--gray-200)' }}>
        <HRow justify="space-between">
          <HCol gap={3}>
            <div className="hifi-caption">VESSELS</div>
            <div className="hifi-h1" style={{ fontSize:20, color:'var(--slate-400)' }}>Cannot load</div>
          </HCol>
          <button className="hifi-btn icon sm ghost"><HIcon name="x" size={14}/></button>
        </HRow>
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:32 }}>
        <HCol gap={16} style={{ alignItems:'center', textAlign:'center', maxWidth:360 }}>
          <div style={{
            width:72, height:72, borderRadius:18,
            background:'rgba(198,40,40,0.08)', color:'var(--risk-critical)',
            display:'flex', alignItems:'center', justifyContent:'center',
            border:'1px solid rgba(198,40,40,0.15)'
          }}>
            <HIcon name="alert" size={32}/>
          </div>
          <HCol gap={6}>
            <div className="hifi-h1" style={{ fontSize:18 }}>Vessel list unavailable</div>
            <div className="hifi-sm" style={{ color:'var(--slate-500)' }}>
              GET <span className="hifi-mono" style={{ color:'var(--navy-700)' }}>/api/vessels/search</span> timed out after 30s. The backend may be restarting or unreachable.
            </div>
          </HCol>
          <HRow gap={8}>
            <button className="hifi-btn primary"><HIcon name="refresh" size={13}/>Retry now</button>
            <button className="hifi-btn"><HIcon name="ext" size={13}/>View ops</button>
          </HRow>
          <div className="hifi-card subtle" style={{ padding:10, fontSize:11, color:'var(--slate-500)', width:'100%', textAlign:'left' }}>
            <div style={{ fontFamily:'JetBrains Mono', color:'var(--slate-400)', fontSize:10.5 }}>
              ERR_CONNECTION_TIMED_OUT<br/>
              upstream: 10.4.1.22:8000<br/>
              correlation: 7e91c4a0…
            </div>
          </div>
        </HCol>
      </div>
    </div>
  </div>
);

/* =============================================================
 * 18. FOUNDATIONS — palette, type, components
 * ===========================================================*/
const HFoundations = () => (
  <div className="hifi" data-screen-label="00 Foundations" style={{ width:1440, height:1280, position:'relative', background:'var(--gray-50)', padding:48 }}>
    <HCol gap={36}>
      {/* Header */}
      <HCol gap={6}>
        <div className="hifi-caption">SEAM V2 · FOUNDATIONS</div>
        <div className="hifi-display">Design system at a glance</div>
        <div className="hifi-sm" style={{ color:'var(--slate-500)', maxWidth:680 }}>
          Tokens, type, and components used across the workspace. Map is the canvas; floating panels reveal intelligence; risk is restrained but unmistakable.
        </div>
      </HCol>

      {/* Palette */}
      <HCol gap={14}>
        <div className="hifi-h1">Palette</div>
        <HCol gap={16}>
          <HCol gap={6}>
            <div className="hifi-caption">Ocean — primary surfaces & accent</div>
            <HRow gap={10}>
              {[['--ocean-50','#F2F7FB'],['--ocean-100','#E5EFF6'],['--ocean-200','#D2E4F0'],['--ocean-500','#3A7FB8'],['--cyan-400','#3FB6C9']].map(([k,v])=>(
                <div key={k} className="hifi-card" style={{ padding:0, overflow:'hidden', width:172 }}>
                  <div style={{ height:64, background:v }}/>
                  <div style={{ padding:'8px 10px' }}>
                    <div className="hifi-mono" style={{ fontSize:11, fontWeight:600 }}>{k}</div>
                    <div className="hifi-mono" style={{ fontSize:10, color:'var(--slate-500)' }}>{v}</div>
                  </div>
                </div>
              ))}
            </HRow>
          </HCol>
          <HCol gap={6}>
            <div className="hifi-caption">Navy / text</div>
            <HRow gap={10}>
              {[['--navy-900','#0E2235'],['--navy-700','#274C6E'],['--slate-500','#5F7184']].map(([k,v])=>(
                <div key={k} className="hifi-card" style={{ padding:0, overflow:'hidden', width:172 }}>
                  <div style={{ height:64, background:v }}/>
                  <div style={{ padding:'8px 10px' }}>
                    <div className="hifi-mono" style={{ fontSize:11, fontWeight:600 }}>{k}</div>
                    <div className="hifi-mono" style={{ fontSize:10, color:'var(--slate-500)' }}>{v}</div>
                  </div>
                </div>
              ))}
            </HRow>
          </HCol>
          <HCol gap={6}>
            <div className="hifi-caption">Land / surfaces</div>
            <HRow gap={10}>
              {[['--land-100','#F2EEE5'],['--land-200','#E6E0D2'],['--gray-100','#F4F5F7'],['--gray-200','#E6E9EE'],['--white','#FFFFFF']].map(([k,v])=>(
                <div key={k} className="hifi-card" style={{ padding:0, overflow:'hidden', width:172 }}>
                  <div style={{ height:64, background:v, borderBottom:'1px solid var(--gray-200)' }}/>
                  <div style={{ padding:'8px 10px' }}>
                    <div className="hifi-mono" style={{ fontSize:11, fontWeight:600 }}>{k}</div>
                    <div className="hifi-mono" style={{ fontSize:10, color:'var(--slate-500)' }}>{v}</div>
                  </div>
                </div>
              ))}
            </HRow>
          </HCol>
          <HCol gap={6}>
            <div className="hifi-caption">Risk + health (semantic only)</div>
            <HRow gap={10}>
              {[
                ['--risk-critical','#C62828','Critical'],
                ['--risk-high','#E04A1F','High'],
                ['--risk-medium','#E59413','Medium'],
                ['--risk-low','#E5C100','Low'],
                ['--health-ok','#2E8F5B','Healthy'],
              ].map(([k,v,l])=>(
                <div key={k} className="hifi-card" style={{ padding:0, overflow:'hidden', width:172 }}>
                  <div style={{ height:64, background:v, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:600 }}>{l}</div>
                  <div style={{ padding:'8px 10px' }}>
                    <div className="hifi-mono" style={{ fontSize:11, fontWeight:600 }}>{k}</div>
                    <div className="hifi-mono" style={{ fontSize:10, color:'var(--slate-500)' }}>{v}</div>
                  </div>
                </div>
              ))}
            </HRow>
          </HCol>
        </HCol>
      </HCol>

      {/* Typography + components */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <HCol gap={14}>
          <div className="hifi-h1">Type · Inter + JetBrains Mono</div>
          <div className="hifi-panel-solid" style={{ padding:20 }}>
            <HCol gap={14}>
              {[
                ['display','Evidence-backed maritime intelligence','28/36 · 700'],
                ['h1-panel','Vessel detail','18/24 · 600'],
                ['h2-card','Latest position','15/20 · 600'],
                ['body','At 14.2 knots heading 087° in the North Sea.','14/20 · 400'],
                ['body-sm','Last refresh 3 minutes ago','13/18 · 400'],
                ['caption','SOURCE · OBSERVED','11/14 · 500 uppercase'],
              ].map(([label,text,meta])=>(
                <HRow key={label} gap={20} style={{ alignItems:'baseline' }}>
                  <div style={{ width:84 }}><span className="hifi-mono" style={{ fontSize:10, color:'var(--slate-500)' }}>{label}</span></div>
                  <div className={`hifi-${label.split('-')[0]==='body'?'body':label.split('-')[0]==='caption'?'caption':label.startsWith('h2')?'h2':label.startsWith('h1')?'h1':'display'}`} style={{ flex:1, fontSize: label==='body-sm'?13:undefined, lineHeight: label==='body-sm'?'18px':undefined }}>{text}</div>
                  <div className="hifi-mono" style={{ fontSize:10, color:'var(--slate-400)' }}>{meta}</div>
                </HRow>
              ))}
              <HRow gap={20} style={{ alignItems:'baseline', borderTop:'1px solid var(--gray-100)', paddingTop:12 }}>
                <div style={{ width:84 }}><span className="hifi-mono" style={{ fontSize:10, color:'var(--slate-500)' }}>numeric</span></div>
                <span className="hifi-num" style={{ fontSize:36, flex:1 }}>12,481</span>
                <div className="hifi-mono" style={{ fontSize:10, color:'var(--slate-400)' }}>700 · -0.02em</div>
              </HRow>
              <HRow gap={20} style={{ alignItems:'baseline' }}>
                <div style={{ width:84 }}><span className="hifi-mono" style={{ fontSize:10, color:'var(--slate-500)' }}>mono</span></div>
                <span className="hifi-mono" style={{ flex:1 }}>IMO 9876543 · 52.31°N 4.07°E · evidence #4821</span>
              </HRow>
            </HCol>
          </div>
        </HCol>

        <HCol gap={14}>
          <div className="hifi-h1">Buttons</div>
          <div className="hifi-panel-solid" style={{ padding:20 }}>
            <HCol gap={12}>
              <HRow gap={8}>
                <button className="hifi-btn primary">Primary</button>
                <button className="hifi-btn">Secondary</button>
                <button className="hifi-btn ghost">Ghost</button>
                <button className="hifi-btn danger">Danger</button>
              </HRow>
              <HRow gap={8}>
                <button className="hifi-btn primary"><HIcon name="play" size={14}/>With icon</button>
                <button className="hifi-btn"><HIcon name="refresh" size={14}/>Refresh</button>
                <button className="hifi-btn icon"><HIcon name="copy" size={14}/></button>
                <button className="hifi-btn primary lg"><HIcon name="play" size={14}/>Large primary</button>
              </HRow>
              <HRow gap={8}>
                <button className="hifi-btn primary sm">Small</button>
                <button className="hifi-btn sm">Small</button>
                <button className="hifi-btn icon sm"><HIcon name="x" size={12}/></button>
                <button className="hifi-btn" disabled>Disabled</button>
              </HRow>
            </HCol>
          </div>

          <div className="hifi-h1">Pills & chips</div>
          <div className="hifi-panel-solid" style={{ padding:20 }}>
            <HCol gap={12}>
              <HRow gap={6} style={{ flexWrap:'wrap' }}>
                <HPill kind="crit" solid dot>Critical</HPill>
                <HPill kind="high" solid dot>High</HPill>
                <HPill kind="med" solid dot>Medium</HPill>
                <HPill kind="low" solid dot>Low</HPill>
                <HPill kind="none">No risk</HPill>
              </HRow>
              <HRow gap={6} style={{ flexWrap:'wrap' }}>
                <HPill kind="ok" dot>Healthy</HPill>
                <HPill kind="stale" dot>Stale</HPill>
                <HPill kind="fail" dot>Failing</HPill>
                <HPill kind="info" dot>Ingesting</HPill>
              </HRow>
              <HRow gap={6} style={{ flexWrap:'wrap' }}>
                <HChip selected>All</HChip>
                <HChip>Tanker</HChip>
                <HChip>Bulker</HChip>
                <HChip kind="crit">Sanctioned</HChip>
                <HChip kind="high">PSC</HChip>
              </HRow>
            </HCol>
          </div>
        </HCol>
      </div>

      {/* Cards + inputs row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <HCol gap={14}>
          <div className="hifi-h1">Cards</div>
          <HRow gap={12} style={{ alignItems:'stretch' }}>
            <div className="hifi-card" style={{ padding:14, flex:1 }}>
              <div className="hifi-caption">Latest position</div>
              <div className="hifi-mono" style={{ fontSize:14, fontWeight:600, marginTop:6 }}>52.31°N · 4.07°E</div>
              <HRow gap={14} style={{ marginTop:6 }}>
                <span><span className="hifi-num" style={{ fontSize:18 }}>14.2</span><span style={{ fontSize:11, color:'var(--slate-500)' }}> kn</span></span>
                <span><span className="hifi-num" style={{ fontSize:18 }}>087°</span></span>
              </HRow>
            </div>
            <div className="hifi-card hifi-stripe-crit" style={{ padding:14, flex:1 }}>
              <HRow gap={6} style={{ marginBottom:4 }}>
                <HPill kind="crit" solid dot>CRIT</HPill>
                <span style={{ fontSize:13, fontWeight:600 }}>Sanctions</span>
              </HRow>
              <div style={{ fontSize:12.5 }}>MV NORTHERN STAR matched OFAC SDN list</div>
            </div>
          </HRow>
        </HCol>

        <HCol gap={14}>
          <div className="hifi-h1">Inputs</div>
          <div className="hifi-panel-solid" style={{ padding:20 }}>
            <HCol gap={12}>
              <div className="hifi-input search">
                <HIcon name="search" size={14} color="var(--slate-500)"/>
                <input placeholder="Search vessels, IMOs, ports…"/>
                <HKbd>/</HKbd>
              </div>
              <div className="hifi-input focus">
                <input defaultValue="9876543"/>
              </div>
              <div className="hifi-input">
                <span style={{ flex:1, color:'var(--slate-400)' }}>Any flag…</span>
                <HIcon name="chevD" size={14} color="var(--slate-500)"/>
              </div>
              <HRow gap={2} style={{ padding:2, background:'var(--gray-100)', borderRadius:8, width:'fit-content' }}>
                {['Live','1h','6h','24h','7d'].map((t,i)=>(
                  <div key={t} style={{
                    padding:'4px 14px', fontSize:12, fontWeight:500, borderRadius:6,
                    background: i===0?'#fff':'transparent',
                    color: i===0?'var(--navy-900)':'var(--slate-500)',
                    boxShadow: i===0?'0 1px 2px rgba(14,34,53,0.08)':'none',
                  }}>{t}</div>
                ))}
              </HRow>
            </HCol>
          </div>
        </HCol>
      </div>
    </HCol>
  </div>
);

Object.assign(window, { HCommandPaletteScreen, HModalToasts, HRoadmap, HErrorState, HFoundations });
