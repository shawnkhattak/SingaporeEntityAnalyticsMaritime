// Full-canvas surfaces — Operations Console, Graph, Schema, Evidence JSON.

/* =============================================================
 * 10. OPERATIONS CONSOLE
 * ===========================================================*/
const HOpsConsole = () => (
  <div className="hifi" data-screen-label="10 Operations Console" style={{
    width:1440, height:900, position:'relative',
    background:'var(--gray-50)',
  }}>
    {/* Faint texture */}
    <div style={{
      position:'absolute', inset:0,
      backgroundImage:'radial-gradient(circle at 20% 30%, rgba(58,127,184,0.04), transparent 50%), radial-gradient(circle at 80% 70%, rgba(63,182,201,0.04), transparent 50%)'
    }}/>

    <HCommandPanel activeNav="ops" showFilters={false}/>

    {/* Header */}
    <div style={{ position:'absolute', left:352, right:24, top:24 }}>
      <HRow justify="space-between">
        <HCol gap={3}>
          <div className="hifi-caption">OPERATIONS · DEV CONSOLE</div>
          <div className="hifi-display">Operations</div>
        </HCol>
        <HRow gap={10}>
          <HRow gap={8} style={{ fontSize:12 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--health-ok)' }}/>
            <span style={{ fontWeight:600 }}>Backend OK</span>
            <span className="hifi-mono" style={{ color:'var(--slate-500)' }}>/healthz · 200 · 32s ago</span>
          </HRow>
          <button className="hifi-btn"><HIcon name="ext" size={14}/>API docs</button>
          <button className="hifi-btn primary"><HIcon name="play" size={14}/>Refresh all live</button>
        </HRow>
      </HRow>
    </div>

    {/* 3-col grid */}
    <div style={{
      position:'absolute', left:352, right:24, top:100, bottom:300,
      display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16,
    }}>
      {/* COL 1 — Source health + Jobs + Logs */}
      <HCol gap={14} style={{ minHeight:0 }}>
        <div className="hifi-panel-solid" style={{ padding:14 }}>
          <HRow justify="space-between" style={{ marginBottom:10 }}>
            <HRow gap={8}><HIcon name="activity" size={16}/><span className="hifi-h2">Source health</span></HRow>
            <HRow gap={4}>
              <HPill kind="ok" dot>4 ok</HPill>
              <HPill kind="stale" dot>1 stale</HPill>
              <HPill kind="fail" dot>1 fail</HPill>
            </HRow>
          </HRow>
          <HCol gap={2}>
            {[
              ['OCEANS-X positions','ok','12s ago'],
              ['OpenSanctions API','ok','3h ago · 87% quota'],
              ['RSS · Reuters Maritime','stale','9h ago'],
              ['RSS · TradeWinds','ok','42m ago'],
              ['Geo layers','ok','1d ago'],
              ['Port activity (arrive)','fail','retry × 2'],
            ].map(([n,h,t],i)=>(
              <HRow key={n} justify="space-between" style={{
                padding:'8px 8px', borderRadius:6,
                background: i%2===1?'var(--gray-50)':'transparent',
                fontSize:12.5
              }}>
                <HRow gap={8}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background: h==='ok'?'var(--health-ok)':h==='stale'?'var(--health-stale)':'var(--health-fail)' }}/>
                  <span style={{ fontWeight:500 }}>{n}</span>
                </HRow>
                <HRow gap={6}>
                  <span style={{ fontSize:11, color:'var(--slate-500)' }}>{t}</span>
                  <button className="hifi-btn icon sm ghost"><HIcon name="refresh" size={12}/></button>
                </HRow>
              </HRow>
            ))}
          </HCol>
        </div>

        <div className="hifi-panel-solid hifi-shimmer" style={{ padding:14 }}>
          <HRow justify="space-between" style={{ marginBottom:10 }}>
            <HRow gap={8}><HIcon name="play" size={16}/><span className="hifi-h2">Recent jobs</span></HRow>
            <span style={{ fontSize:11, color:'var(--ocean-500)', fontWeight:500 }}>1 running</span>
          </HRow>
          <HCol gap={3}>
            {[
              ['#J2341','positions-snapshot','running','live','08:32:01','—'],
              ['#J2340','sanctions','success','live','08:00:11','08:00:42'],
              ['#J2339','news','success','live','07:40:00','07:40:22'],
              ['#J2338','port-activity','failure','due-arrive','07:31:00','07:31:01'],
              ['#J2337','risk/recompute','success','—','06:00:00','06:00:18'],
            ].map(([id,type,status,mode,start,end])=>(
              <HRow key={id} style={{ padding:'6px 0', fontSize:11.5, borderBottom:'1px solid var(--gray-100)' }} gap={8}>
                <span className="hifi-mono" style={{ width:48, color:'var(--slate-500)' }}>{id}</span>
                <span style={{ flex:1, fontWeight:500 }}>{type}</span>
                <HPill kind={status==='running'?'info':status==='success'?'ok':'fail'} solid={status==='running'} dot>{status}</HPill>
                <span className="hifi-mono" style={{ width:54, color:'var(--slate-500)', textAlign:'right', fontSize:10.5 }}>{start.split(' ').pop()}</span>
              </HRow>
            ))}
          </HCol>
        </div>

        <div className="hifi-panel-solid" style={{ padding:14, flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
          <HRow justify="space-between" style={{ marginBottom:10 }}>
            <HRow gap={8}><HIcon name="note" size={15}/><span className="hifi-h2">Logs</span></HRow>
            <HRow gap={2}>
              {['ALL','INFO','WARN','ERROR'].map((l,i)=>(
                <div key={l} style={{
                  padding:'3px 8px', fontSize:10.5, fontWeight:500, borderRadius:5,
                  background: i===0?'var(--navy-900)':'transparent',
                  color: i===0?'#fff':'var(--slate-500)',
                  cursor:'pointer'
                }}>{l}</div>
              ))}
            </HRow>
          </HRow>
          <div className="hifi-scroll" style={{ flex:1, overflow:'auto', fontFamily:'JetBrains Mono', fontSize:10.5 }}>
            {[
              ['INFO','08:32:17','positions: ingested 247 vessels (delta +12)'],
              ['WARN','08:31:48','sanctions: quota approaching limit (87%)'],
              ['ERROR','08:30:12','port-activity due-arrive: upstream 502'],
              ['INFO','08:30:01','risk: 14 flags recomputed, 3 new'],
              ['INFO','08:29:44','news: 12 articles indexed from 6 feeds'],
              ['INFO','08:28:11','geo layers: cache hit (TTL 86400s)'],
              ['INFO','08:27:00','particulars: 8 vessels enriched'],
            ].map(([lvl,t,m],i)=>(
              <HRow key={i} gap={8} style={{ padding:'3px 0', borderBottom:'1px solid var(--gray-100)' }}>
                <span style={{
                  fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:3, width:40, textAlign:'center',
                  background: lvl==='ERROR'?'rgba(198,40,40,0.10)':lvl==='WARN'?'rgba(229,148,19,0.14)':'rgba(46,143,91,0.12)',
                  color: lvl==='ERROR'?'var(--risk-critical)':lvl==='WARN'?'#A66A0A':'var(--health-ok)',
                }}>{lvl}</span>
                <span style={{ color:'var(--slate-400)' }}>{t}</span>
                <span style={{ flex:1, color:'var(--navy-900)' }}>{m}</span>
              </HRow>
            ))}
          </div>
        </div>
      </HCol>

      {/* COL 2 — DB state */}
      <HCol gap={14} style={{ minHeight:0 }}>
        <div className="hifi-panel-solid" style={{ padding:14 }}>
          <HRow gap={8} style={{ marginBottom:10 }}><HIcon name="table" size={16}/><span className="hifi-h2">Table counts</span></HRow>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              ['vessels','12,481','+12'],
              ['entities','3,902','+2'],
              ['risk_flags','247','+3'],
              ['evidence_observations','41,209','+247'],
              ['vessel_events','8,114','+18'],
              ['port_calls','1,889','+12'],
            ].map(([t,n,d])=>(
              <div key={t} className="hifi-card subtle" style={{ padding:'10px 12px' }}>
                <div className="hifi-mono" style={{ fontSize:10.5, color:'var(--slate-500)' }}>{t}</div>
                <HRow justify="space-between" style={{ alignItems:'baseline', marginTop:2 }}>
                  <span className="hifi-num" style={{ fontSize:17 }}>{n}</span>
                  <span style={{ fontSize:10, color:'var(--health-ok)', fontWeight:600 }}>{d}</span>
                </HRow>
              </div>
            ))}
          </div>
        </div>

        <div className="hifi-panel-solid" style={{ padding:14 }}>
          <HRow gap={8} style={{ marginBottom:10 }}><HIcon name="db" size={16}/><span className="hifi-h2">Recent observations</span></HRow>
          <HCol gap={2}>
            {[
              ['OCEANS-X','position','#4821','7b21a3f9','08:32:14'],
              ['OFAC','sanctions','#4820','c1024e88','08:30:01'],
              ['Reuters RSS','news','#4819','9ef41a02','08:29:44'],
              ['OCEANS-X','particulars','#4818','55ab7711','08:27:01'],
              ['UN/LOCODE','reference','#4817','12cd8800','08:00:00'],
            ].map(([src,type,id,hash,when])=>(
              <HRow key={id} style={{ padding:'7px 8px', fontSize:11.5, borderBottom:'1px solid var(--gray-100)' }} gap={8}>
                <HCol gap={1} style={{ flex:1 }}>
                  <span style={{ fontWeight:500 }}>{src}</span>
                  <span style={{ fontSize:10, color:'var(--slate-500)' }}>{type} · <span className="hifi-mono">{id}</span></span>
                </HCol>
                <span className="hifi-mono" style={{ fontSize:10, color:'var(--slate-400)' }}>{hash}</span>
                <span className="hifi-mono" style={{ fontSize:10, color:'var(--slate-400)', width:48 }}>{when}</span>
              </HRow>
            ))}
          </HCol>
        </div>

        <div className="hifi-panel-solid" style={{ padding:14, flex:1 }}>
          <HRow gap={8} style={{ marginBottom:10 }}><HIcon name="layers" size={16}/><span className="hifi-h2">Reference data</span></HRow>
          <HCol gap={2}>
            {[['Flag states','249'],['Vessel types','24'],['UN/LOCODE ports','3,402'],['Sanctions lists','11'],['Geo layers','7']].map(([k,v])=>(
              <HRow key={k} justify="space-between" style={{ padding:'7px 8px', fontSize:12.5, borderBottom:'1px solid var(--gray-100)' }}>
                <span>{k}</span>
                <HRow gap={8}>
                  <span className="hifi-mono" style={{ color:'var(--slate-500)' }}>{v}</span>
                  <span style={{ fontSize:11, color:'var(--ocean-500)', cursor:'pointer', textDecoration:'underline' }}>Browse</span>
                </HRow>
              </HRow>
            ))}
          </HCol>
        </div>
      </HCol>

      {/* COL 3 — Ingestion controls */}
      <HCol gap={14} style={{ minHeight:0 }}>
        <div className="hifi-panel-solid" style={{ padding:14 }}>
          <HRow gap={8} style={{ marginBottom:12 }}><HIcon name="play" size={16}/><span className="hifi-h2">Live ingestion</span></HRow>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              ['Positions snapshot','running…','info','refresh',true],
              ['Geo layers','1d ago','ok','layers',false],
              ['News RSS','42m ago','ok','news',false],
              ['Sanctions API','3h ago · ⚠','stale','scale',false],
              ['Risk recompute','1d ago','ok','shield',false],
              ['Test job','—',null,'play',false],
            ].map(([n,when,h,ic,running])=>(
              <div key={n} className={`hifi-card ${running?'hifi-shimmer tint':''}`} style={{ padding:'10px 12px' }}>
                <HRow gap={8}>
                  <div style={{ width:28, height:28, borderRadius:6, background: running?'var(--ocean-500)':'var(--gray-100)', color: running?'#fff':'var(--slate-500)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <HIcon name={ic} size={14}/>
                  </div>
                  <HCol gap={1} style={{ flex:1 }}>
                    <span style={{ fontSize:12, fontWeight:600 }}>{n}</span>
                    <HRow gap={4}>
                      {h && <HPill kind={h}>{h}</HPill>}
                      <span style={{ fontSize:10, color:'var(--slate-400)' }}>{when}</span>
                    </HRow>
                  </HCol>
                </HRow>
              </div>
            ))}
          </div>
        </div>

        <div className="hifi-panel-solid" style={{ padding:14 }}>
          <HRow gap={8} style={{ marginBottom:10 }}><HIcon name="upload" size={16}/><span className="hifi-h2">Sanctions CSV</span></HRow>
          <div style={{
            border:'1.5px dashed var(--ocean-200)',
            background:'var(--ocean-50)',
            borderRadius:10,
            padding:18, textAlign:'center'
          }}>
            <div style={{ display:'inline-flex', width:36, height:36, borderRadius:'50%', background:'var(--white)', alignItems:'center', justifyContent:'center', color:'var(--ocean-500)', marginBottom:8 }}>
              <HIcon name="upload" size={18}/>
            </div>
            <div style={{ fontSize:13, fontWeight:600 }}>Drop CSV here</div>
            <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:2 }}>or click to browse</div>
          </div>
          <div className="hifi-input" style={{ marginTop:10 }}>
            <input placeholder="https://example.com/feed.csv"/>
            <button className="hifi-btn primary sm">Pull</button>
          </div>
        </div>

        <div className="hifi-panel-solid" style={{ padding:14 }}>
          <HRow gap={8} style={{ marginBottom:10 }}><HIcon name="ship" size={16}/><span className="hifi-h2">Manual vessel actions</span></HRow>
          <div className="hifi-input">
            <HIcon name="search" size={14} color="var(--slate-500)"/>
            <input defaultValue="NORTHERN STAR · IMO 9876543"/>
          </div>
          <HRow gap={6} style={{ marginTop:8 }}>
            <button className="hifi-btn sm" style={{ flex:1 }}><HIcon name="refresh" size={12}/>Particulars</button>
            <button className="hifi-btn sm" style={{ flex:1 }}><HIcon name="refresh" size={12}/>Movements</button>
          </HRow>
        </div>

        <div className="hifi-panel-solid" style={{ padding:14 }}>
          <HRow gap={8} style={{ marginBottom:10 }}><HIcon name="pin" size={16}/><span className="hifi-h2">Port activity</span></HRow>
          <HRow gap={6}>
            <button className="hifi-btn sm" style={{ flex:1 }}><HIcon name="arrowR" size={12}/>Due-arrive</button>
            <button className="hifi-btn sm" style={{ flex:1 }}><HIcon name="arrowL" size={12}/>Due-depart</button>
          </HRow>
        </div>
      </HCol>
    </div>

    {/* Vessel browser table — bottom */}
    <div className="hifi-panel-solid" style={{ position:'absolute', left:352, right:24, bottom:24, height:256, padding:14, display:'flex', flexDirection:'column' }}>
      <HRow justify="space-between" style={{ marginBottom:10 }}>
        <HRow gap={12}>
          <HRow gap={8}><HIcon name="ship" size={16}/><span className="hifi-h2">Vessel browser</span></HRow>
          <div className="hifi-input" style={{ width:240, height:28 }}>
            <HIcon name="search" size={13} color="var(--slate-500)"/>
            <input placeholder="search by name, IMO…" style={{ fontSize:12 }}/>
          </div>
          <div className="hifi-input" style={{ width:160, height:28 }}>
            <span style={{ flex:1, fontSize:12 }}>Risk: All</span>
            <HIcon name="chevD" size={12}/>
          </div>
        </HRow>
        <HRow gap={8}>
          <button className="hifi-btn sm"><HIcon name="download" size={12}/>Export CSV</button>
          <span style={{ fontSize:11, color:'var(--slate-500)' }}>Page 3 of 17 · 12,481 total</span>
        </HRow>
      </HRow>
      <div style={{ flex:1, overflow:'hidden', border:'1px solid var(--gray-200)', borderRadius:8 }}>
        <table className="hifi-table">
          <thead>
            <tr>
              <th>Vessel</th>
              <th>IMO / MMSI / Call</th>
              <th>Flag</th>
              <th>Type</th>
              <th>Lat / Lon</th>
              <th>Risk</th>
              <th>Flags</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[
              ['NORTHERN STAR','9876543 · 538009123 · S6BG3','SG','Tanker','52.31N 4.07E','crit',['Dark AIS','News'],'3 min'],
              ['BLUE HORIZON','9712384 · 477821000 · VRMQ4','HK','Bulker','25.04N 56.32E','crit',['Sanctions'],'12 min'],
              ['CARIB DAWN','9558721 · 312456000 · J8MK2','BZ','Container','1.28N 103.85E','high',['PSC'],'1h'],
              ['PACIFIC GLOW','9621034 · 372900000 · 3FAB7','PA','Tanker','22.21N 91.78E','med',['Anomaly'],'2h'],
              ['MERIDIAN','9501288 · 247000000 · IBAR8','IT','Cargo','37.51N 14.92E','med',['PSC'],'3h'],
            ].map((r,i)=>(
              <tr key={i} className={i===0?'sel':''}>
                <td style={{ fontWeight:600, color:'var(--ocean-500)' }}>{r[0]}</td>
                <td className="hifi-mono" style={{ fontSize:11, color:'var(--slate-500)' }}>{r[1]}</td>
                <td>{flag(r[2])}</td>
                <td>{r[3]}</td>
                <td className="hifi-mono" style={{ fontSize:11, color:'var(--slate-500)' }}>{r[4]}</td>
                <td><HPill kind={r[5]} solid dot>{r[5]}</HPill></td>
                <td><HRow gap={3}>{r[6].map(f=><HChip key={f}>{f}</HChip>)}</HRow></td>
                <td style={{ fontSize:11, color:'var(--slate-400)' }}>{r[7]}</td>
                <td><button className="hifi-btn sm ghost" title="open in map"><HIcon name="pin" size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

/* =============================================================
 * 11. GRAPH PAGE
 * ===========================================================*/
const HGraph = () => {
  const nodes = [
    {id:'v1', x:560, y:380, kind:'vessel', label:'NORTHERN STAR', sub:'IMO 9876543'},
    {id:'e1', x:320, y:260, kind:'entity', label:'Aurora Shipping Ltd', sub:'Owner · 🇸🇬', sanctioned:true},
    {id:'e2', x:340, y:480, kind:'entity', label:'Aurora Mgmt SG', sub:'Manager'},
    {id:'r1', x:780, y:240, kind:'risk', label:'Dark AIS · 4h', sub:'High · #4821', severity:'high'},
    {id:'r2', x:800, y:520, kind:'risk', label:'Sanctions match', sub:'Crit · #4820', severity:'crit'},
    {id:'ev1', x:1010, y:340, kind:'evidence', label:'OCEANS-X position', sub:'#4821 · 7b21a…'},
    {id:'ev2', x:1020, y:480, kind:'evidence', label:'OFAC SDN entry', sub:'#4820 · c1024…'},
    {id:'v2', x:560, y:620, kind:'vessel', label:'BLUE HORIZON', sub:'IMO 9712384'},
    {id:'p1', x:180, y:600, kind:'entity', label:'Port of Singapore', sub:'SGSIN', port:true},
    {id:'p2', x:780, y:700, kind:'entity', label:'Sea-Bunkers DMCC', sub:'🇦🇪 · UAE', sanctioned:true},
    {id:'e3', x:140, y:340, kind:'entity', label:'Polaris Holdings BV', sub:'Parent · 🇳🇱', sanctioned:true},
  ];
  const edges = [
    ['e1','v1','owns','high'],['e2','v1','manages','high'],
    ['v1','r1','flagged','high'],['v1','r2','flagged','high'],
    ['r1','ev1','evidence','high'],['r2','ev2','evidence','high'],
    ['v2','r2','flagged','med'],['e1','v2','owns','med'],
    ['p1','v1','call','low'],['v1','p2','bunkered','low'],['e1','p2','linked','low'],
    ['e3','e1','beneficial','med'],
  ];
  const kindStyles = {
    vessel:   { bg:'#fff', stripe:'var(--ocean-500)', iconBg:'rgba(58,127,184,0.10)', iconColor:'var(--ocean-500)', icon:'ship' },
    entity:   { bg:'#fff', stripe:'var(--navy-700)',  iconBg:'rgba(39,76,110,0.08)',  iconColor:'var(--navy-700)',  icon:'bldg' },
    risk:     { bg:'#fff', stripe:'var(--risk-critical)', iconBg:'rgba(198,40,40,0.10)', iconColor:'var(--risk-critical)', icon:'shield' },
    evidence: { bg:'var(--gray-50)', stripe:'var(--slate-500)', iconBg:'var(--gray-100)', iconColor:'var(--slate-500)', icon:'db' },
  };
  return (
    <div className="hifi" data-screen-label="11 Graph" style={{ width:1440, height:900, position:'relative', background:'var(--gray-50)' }}>
      <HCommandPanel activeNav="graph" showFilters={false}/>

      {/* Faint dot grid background */}
      <div style={{
        position:'absolute', left:352, right:24, top:24, bottom:24, borderRadius:14,
        background:'#fff',
        border:'1px solid var(--gray-200)',
        backgroundImage: 'radial-gradient(circle, var(--gray-200) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        backgroundPosition: '12px 12px',
      }}/>

      {/* Toolbar */}
      <div className="hifi-panel" style={{
        position:'absolute', left:368, right:528, top:40,
        padding:10, zIndex:5,
      }}>
        <HRow justify="space-between">
          <HRow gap={12}>
            <HCol gap={2}>
              <div className="hifi-caption">Subject</div>
              <HRow gap={2} style={{ padding:2, background:'var(--gray-100)', borderRadius:7 }}>
                {['Vessel','Entity'].map((s,i)=>(
                  <div key={s} style={{
                    padding:'4px 12px', fontSize:12, fontWeight:500, borderRadius:5,
                    background: i===0?'#fff':'transparent',
                    color: i===0?'var(--navy-900)':'var(--slate-500)',
                    boxShadow: i===0?'0 1px 2px rgba(14,34,53,0.08)':'none',
                  }}>{s}</div>
                ))}
              </HRow>
            </HCol>
            <HCol gap={2}>
              <div className="hifi-caption">IMO</div>
              <div className="hifi-input" style={{ width:140, height:28 }}>
                <input defaultValue="9876543" style={{ fontSize:12 }}/>
              </div>
            </HCol>
            <HCol gap={2}>
              <div className="hifi-caption">Depth</div>
              <HRow gap={2} style={{ padding:2, background:'var(--gray-100)', borderRadius:7 }}>
                {['1','2','3'].map((s,i)=>(
                  <div key={s} style={{
                    padding:'4px 12px', fontSize:12, fontWeight:500, borderRadius:5,
                    background: i===1?'#fff':'transparent',
                    color: i===1?'var(--navy-900)':'var(--slate-500)',
                    boxShadow: i===1?'0 1px 2px rgba(14,34,53,0.08)':'none',
                  }}>{s} hop</div>
                ))}
              </HRow>
            </HCol>
            <HCol gap={2}>
              <div className="hifi-caption">Layout</div>
              <HRow gap={2} style={{ padding:2, background:'var(--gray-100)', borderRadius:7 }}>
                {['Force','Hierarchy','Radial'].map((s,i)=>(
                  <div key={s} style={{
                    padding:'4px 12px', fontSize:12, fontWeight:500, borderRadius:5,
                    background: i===0?'#fff':'transparent',
                    color: i===0?'var(--navy-900)':'var(--slate-500)',
                    boxShadow: i===0?'0 1px 2px rgba(14,34,53,0.08)':'none',
                  }}>{s}</div>
                ))}
              </HRow>
            </HCol>
            <button className="hifi-btn primary"><HIcon name="play" size={14}/>Load</button>
          </HRow>
          <HRow gap={6}>
            <button className="hifi-btn sm"><HIcon name="download" size={12}/>PNG</button>
            <button className="hifi-btn sm"><HIcon name="download" size={12}/>JSON</button>
            <button className="hifi-btn icon sm"><HIcon name="fit" size={13}/></button>
          </HRow>
        </HRow>
      </div>

      {/* Graph canvas */}
      <div style={{ position:'absolute', left:368, right:528, top:122, bottom:40 }}>
        <svg viewBox="0 0 1080 720" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          {edges.map(([a,b,label,conf],i)=>{
            const A = nodes.find(n=>n.id===a); const B = nodes.find(n=>n.id===b);
            if (!A || !B) return null;
            const sw = conf==='high'?1.8:conf==='med'?1.2:1;
            const dash = conf==='low'?'5 5':'0';
            const stroke = conf==='high'?'var(--ocean-500)':'var(--slate-500)';
            const ax = A.x - 368; const ay = A.y - 122;
            const bx = B.x - 368; const by = B.y - 122;
            const mx = (ax+bx)/2, my = (ay+by)/2;
            return (
              <g key={i}>
                <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} opacity="0.7"/>
                <rect x={mx-30} y={my-8} width="60" height="14" rx="3" fill="#fff" opacity="0.95"/>
                <text x={mx} y={my+2} fill="var(--slate-500)" fontSize="9.5" textAnchor="middle" fontFamily="Inter" fontWeight="500">{label}</text>
              </g>
            );
          })}
        </svg>
        {nodes.map(n=>{
          const st = kindStyles[n.kind];
          const sel = n.id==='v1';
          return (
            <div key={n.id} style={{
              position:'absolute',
              left: n.x - 368 - 78, top: n.y - 122 - 24,
              width:156, padding:'9px 11px',
              background: st.bg,
              border: sel?'2px solid var(--ocean-500)':'1px solid var(--gray-200)',
              borderRadius:10,
              boxShadow: sel ? '0 8px 24px rgba(58,127,184,0.20)' : 'var(--shadow-card)',
              cursor:'pointer'
            }}>
              <div style={{ position:'absolute', left:-1, top:-1, bottom:-1, width:4, background:st.stripe, borderRadius:'10px 0 0 10px' }}/>
              <HRow gap={8} style={{ marginLeft:6 }}>
                <div style={{ width:24, height:24, borderRadius:6, background: st.iconBg, color: st.iconColor, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <HIcon name={st.icon} size={13}/>
                </div>
                <HCol gap={1} style={{ flex:1, minWidth:0 }}>
                  <HRow gap={4}>
                    <span style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.label}</span>
                    {n.sanctioned && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--risk-critical)' }}/>}
                  </HRow>
                  <span style={{ fontSize:10, color:'var(--slate-500)' }}>{n.sub}</span>
                </HCol>
              </HRow>
            </div>
          );
        })}

        {/* Legend (bottom-left) */}
        <div className="hifi-panel" style={{ position:'absolute', left:8, bottom:8, padding:'8px 12px', fontSize:11 }}>
          <HRow gap={12}>
            <HCol gap={3}>
              <span className="hifi-caption">Confidence</span>
              <HRow gap={10}>
                <HRow gap={4}><div style={{ width:18, height:2, background:'var(--ocean-500)' }}/>high</HRow>
                <HRow gap={4}><div style={{ width:18, height:2, background:'var(--slate-500)' }}/>med</HRow>
                <HRow gap={4}><div style={{ width:18, height:0, borderTop:'1.5px dashed var(--slate-500)' }}/>low</HRow>
              </HRow>
            </HCol>
            <div style={{ width:1, alignSelf:'stretch', background:'var(--gray-200)' }}/>
            <HCol gap={3}>
              <span className="hifi-caption">Node type</span>
              <HRow gap={10}>
                <HRow gap={4}><div style={{ width:8, height:8, borderRadius:2, background:'var(--ocean-500)' }}/>vessel</HRow>
                <HRow gap={4}><div style={{ width:8, height:8, borderRadius:2, background:'var(--navy-700)' }}/>entity</HRow>
                <HRow gap={4}><div style={{ width:8, height:8, borderRadius:2, background:'var(--risk-critical)' }}/>risk</HRow>
                <HRow gap={4}><div style={{ width:8, height:8, borderRadius:2, background:'var(--slate-500)' }}/>evidence</HRow>
              </HRow>
            </HCol>
          </HRow>
        </div>
      </div>

      {/* Right inspector */}
      <div className="hifi-panel-solid" style={{
        position:'absolute', right:24, top:24, bottom:24, width:480,
        display:'flex', flexDirection:'column', zIndex:5,
      }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--gray-200)' }}>
          <HRow justify="space-between">
            <HCol gap={3}>
              <div className="hifi-caption">SELECTED NODE</div>
              <div className="hifi-h1" style={{ fontSize:20 }}>NORTHERN STAR</div>
            </HCol>
            <button className="hifi-btn icon sm ghost"><HIcon name="x" size={14}/></button>
          </HRow>
        </div>
        <div className="hifi-scroll" style={{ flex:1, overflow:'auto', padding:18 }}>
          <HCol gap={14}>
            <HRow gap={6}><HChip>vessel</HChip><HPill kind="high" solid dot>High risk</HPill></HRow>
            <div className="hifi-card subtle" style={{ padding:12 }}>
              <div className="hifi-caption" style={{ marginBottom:6 }}>Identity</div>
              <HCol gap={4} style={{ fontSize:12.5 }}>
                <HRow justify="space-between"><span style={{ color:'var(--slate-500)' }}>IMO</span><span className="hifi-mono">9876543</span></HRow>
                <HRow justify="space-between"><span style={{ color:'var(--slate-500)' }}>MMSI</span><span className="hifi-mono">538009123</span></HRow>
                <HRow justify="space-between"><span style={{ color:'var(--slate-500)' }}>Flag</span><span>{flag('SG')} Singapore</span></HRow>
                <HRow justify="space-between"><span style={{ color:'var(--slate-500)' }}>Type</span><span>Tanker · Crude</span></HRow>
              </HCol>
            </div>

            <HCol gap={8}>
              <div className="hifi-caption">Connections · 4</div>
              <HCol gap={6}>
                {[
                  ['Aurora Shipping Ltd','bldg','owns','high','crit'],
                  ['Aurora Mgmt SG','bldg','manages','high',null],
                  ['Dark AIS · 4h','shield','flagged','high','high'],
                  ['Sanctions match','shield','flagged','high','crit'],
                ].map(([t,ic,rel,conf,risk],i)=>(
                  <div key={i} className="hifi-card" style={{ padding:'10px 12px' }}>
                    <HRow justify="space-between">
                      <HRow gap={8}>
                        <div style={{ width:24, height:24, borderRadius:6, background:'var(--gray-100)', color: risk==='crit'?'var(--risk-critical)':risk==='high'?'var(--risk-high)':'var(--slate-500)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <HIcon name={ic} size={13}/>
                        </div>
                        <span style={{ fontSize:12.5, fontWeight:500 }}>{t}</span>
                      </HRow>
                      <HRow gap={4}>
                        <HPill>{rel}</HPill>
                        <span className="hifi-mono" style={{ fontSize:10.5, color:'var(--slate-500)' }}>{conf}</span>
                      </HRow>
                    </HRow>
                  </div>
                ))}
              </HCol>
            </HCol>

            <HCol gap={8}>
              <div className="hifi-caption">Linked evidence · 2</div>
              <HCol gap={4}>
                {[['#4821','OCEANS-X position'],['#4820','OFAC SDN entry']].map(([id,t])=>(
                  <HRow key={id} gap={8} style={{ padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, fontSize:12 }}>
                    <HIcon name="db" size={13} color="var(--slate-500)"/>
                    <span className="hifi-mono" style={{ fontWeight:600 }}>{id}</span>
                    <span style={{ flex:1, color:'var(--slate-500)' }}>{t}</span>
                    <span style={{ color:'var(--ocean-500)', fontWeight:500, cursor:'pointer' }}>View JSON</span>
                  </HRow>
                ))}
              </HCol>
            </HCol>
          </HCol>
        </div>
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--gray-200)', background:'var(--gray-50)' }}>
          <HRow gap={6}>
            <button className="hifi-btn primary sm" style={{ flex:1 }}><HIcon name="ship" size={12}/>Open vessel</button>
            <button className="hifi-btn sm"><HIcon name="ext" size={12}/></button>
          </HRow>
        </div>
      </div>
    </div>
  );
};

/* =============================================================
 * 12. SCHEMA PAGE
 * ===========================================================*/
const HSchema = () => {
  const tables = [
    {id:'vessels', x:120, y:120, domain:'maritime', cols:[['id','int'],['imo','varchar'],['mmsi','varchar'],['name','varchar'],['flag_state','varchar fk'],['vessel_type_id','int fk'],['gross_tonnage','int'],['created_at','timestamptz']]},
    {id:'entities', x:120, y:420, domain:'maritime', cols:[['id','int'],['name','varchar'],['entity_type','varchar'],['country','varchar fk'],['external_id','varchar'],['created_at','timestamptz']]},
    {id:'vessel_events', x:430, y:120, domain:'maritime', cols:[['id','int'],['vessel_id','int fk'],['event_type','varchar'],['port_id','int fk'],['observed_at','timestamptz'],['evidence_id','int fk']]},
    {id:'ports', x:430, y:420, domain:'reference', cols:[['id','int'],['unlocode','varchar'],['name','varchar'],['country','varchar fk'],['lat','numeric'],['lon','numeric']]},
    {id:'risk_flags', x:740, y:120, domain:'risk', cols:[['id','int'],['subject_type','varchar'],['subject_id','int'],['flag_type','varchar'],['severity','varchar'],['summary','text'],['evidence_id','int fk'],['resolved_at','timestamptz']]},
    {id:'evidence_observations', x:740, y:420, domain:'evidence', cols:[['id','int'],['source','varchar fk'],['observation_type','varchar'],['observed_at','timestamptz'],['fetched_at','timestamptz'],['payload_hash','varchar'],['source_record_id','varchar']]},
    {id:'sources', x:1030, y:420, domain:'ingestion', cols:[['id','int'],['name','varchar'],['kind','varchar'],['health_status','varchar'],['last_success_at','timestamptz']]},
    {id:'flag_states', x:1030, y:120, domain:'reference', cols:[['code','varchar pk'],['name','varchar'],['iso2','varchar']]},
  ];
  const domainColors = {
    maritime:  'var(--ocean-500)',
    risk:      'var(--risk-critical)',
    evidence:  'var(--cyan-400)',
    reference: 'var(--slate-500)',
    ingestion: 'var(--navy-700)',
  };
  const edges = [
    ['vessels','flag_states','flag_state'],
    ['vessel_events','vessels','vessel_id'],
    ['vessel_events','ports','port_id'],
    ['vessel_events','evidence_observations','evidence_id'],
    ['risk_flags','evidence_observations','evidence_id'],
    ['evidence_observations','sources','source'],
    ['ports','flag_states','country'],
    ['entities','flag_states','country'],
  ];
  return (
    <div className="hifi" data-screen-label="12 Schema" style={{ width:1440, height:900, position:'relative', background:'var(--gray-50)' }}>
      <HCommandPanel activeNav="schema" showFilters={false}/>

      {/* Canvas bg */}
      <div style={{
        position:'absolute', left:352, right:24, top:24, bottom:24, borderRadius:14,
        background:'#fff', border:'1px solid var(--gray-200)',
        backgroundImage: 'linear-gradient(var(--gray-100) 1px, transparent 1px), linear-gradient(90deg, var(--gray-100) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}/>

      {/* Toolbar */}
      <div className="hifi-panel" style={{
        position:'absolute', left:368, right:528, top:40,
        padding:10, zIndex:5,
      }}>
        <HRow justify="space-between">
          <HRow gap={10}>
            <HCol gap={2}>
              <div className="hifi-caption">Domain</div>
              <div className="hifi-input" style={{ width:200, height:28 }}>
                <span style={{ flex:1, fontSize:12 }}>All domains</span>
                <HIcon name="chevD" size={12}/>
              </div>
            </HCol>
            <HCol gap={2}>
              <div className="hifi-caption">Filter</div>
              <HRow gap={4} style={{ flexWrap:'wrap' }}>
                {Object.keys(domainColors).map((d,i)=>(
                  <HChip key={d} selected={i===0}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:domainColors[d], display:'inline-block', marginRight:3 }}/>
                    {d}
                  </HChip>
                ))}
              </HRow>
            </HCol>
          </HRow>
          <HRow gap={6}>
            <button className="hifi-btn sm"><HIcon name="fit" size={12}/>Fit view</button>
            <button className="hifi-btn sm"><HIcon name="download" size={12}/>Export SVG</button>
          </HRow>
        </HRow>
      </div>

      {/* Schema canvas */}
      <div style={{ position:'absolute', left:368, right:528, top:122, bottom:40, overflow:'hidden' }}>
        <svg viewBox="0 0 1080 720" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          {edges.map(([a,b,col],i)=>{
            const A = tables.find(t=>t.id===a); const B = tables.find(t=>t.id===b);
            if (!A || !B) return null;
            const ax = A.x - 368 + 110; const ay = A.y - 122 + 60;
            const bx = B.x - 368 + 110; const by = B.y - 122 + 60;
            const mx = (ax+bx)/2, my = (ay+by)/2;
            return (
              <g key={i}>
                <line x1={ax} y1={ay} x2={bx} y2={by} stroke="var(--ocean-500)" strokeWidth="1" opacity="0.5"/>
                <circle cx={ax} cy={ay} r="3" fill="var(--ocean-500)"/>
                <circle cx={bx} cy={by} r="3" fill="var(--ocean-500)"/>
                <rect x={mx-32} y={my-8} width="64" height="14" rx="3" fill="#fff" stroke="var(--gray-200)"/>
                <text x={mx} y={my+2} fill="var(--slate-500)" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono">{col}</text>
              </g>
            );
          })}
        </svg>
        {tables.map(t=>{
          const sel = t.id==='vessels';
          return (
            <div key={t.id} style={{
              position:'absolute',
              left: t.x - 368, top: t.y - 122,
              width:220,
              background:'#fff',
              border: sel?'2px solid var(--ocean-500)':'1px solid var(--gray-200)',
              borderRadius:8,
              boxShadow: sel?'0 8px 24px rgba(58,127,184,0.2)':'var(--shadow-card)',
              overflow:'hidden',
              cursor:'pointer'
            }}>
              <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--gray-200)', background:'var(--gray-50)' }}>
                <HRow gap={8}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background: domainColors[t.domain] }}/>
                  <span className="hifi-mono" style={{ fontSize:12, fontWeight:600, color:'var(--navy-900)' }}>{t.id}</span>
                  <span style={{ marginLeft:'auto', fontSize:9.5, color:'var(--slate-500)', textTransform:'uppercase', letterSpacing:0.5 }}>{t.domain}</span>
                </HRow>
              </div>
              <HCol gap={0}>
                {t.cols.slice(0, 6).map(([c,type],i)=>(
                  <HRow key={c} justify="space-between" style={{ padding:'5px 12px', borderBottom: i<t.cols.length-1?'1px solid var(--gray-100)':'none', fontSize:11 }}>
                    <span className="hifi-mono" style={{ color:'var(--navy-900)' }}>{c}</span>
                    <span className="hifi-mono" style={{ color:'var(--slate-400)', fontSize:10 }}>{type}</span>
                  </HRow>
                ))}
                {t.cols.length > 6 && (
                  <div style={{ padding:'5px 12px', fontSize:10, color:'var(--slate-400)', fontStyle:'italic' }}>
                    +{t.cols.length - 6} more columns
                  </div>
                )}
              </HCol>
            </div>
          );
        })}
      </div>

      {/* Right inspector */}
      <div className="hifi-panel-solid" style={{
        position:'absolute', right:24, top:24, bottom:24, width:480,
        display:'flex', flexDirection:'column', zIndex:5,
      }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--gray-200)' }}>
          <HRow justify="space-between">
            <HCol gap={3}>
              <div className="hifi-caption">SELECTED TABLE</div>
              <div className="hifi-h1" style={{ fontSize:20, fontFamily:'JetBrains Mono', fontWeight:600 }}>vessels</div>
            </HCol>
            <button className="hifi-btn icon sm ghost"><HIcon name="x" size={14}/></button>
          </HRow>
        </div>
        <div className="hifi-scroll" style={{ flex:1, overflow:'auto', padding:18 }}>
          <HCol gap={16}>
            <HRow gap={6}>
              <HChip><span style={{ width:6, height:6, borderRadius:'50%', background:'var(--ocean-500)', marginRight:3, display:'inline-block' }}/>maritime</HChip>
              <HPill>12,481 rows</HPill>
            </HRow>

            <HCol gap={8}>
              <div className="hifi-caption">Columns · 12</div>
              <HCol gap={0} style={{ border:'1px solid var(--gray-200)', borderRadius:8, overflow:'hidden' }}>
                {[
                  ['id','int','pk',false],
                  ['imo','varchar(7)','unique',false],
                  ['mmsi','varchar(9)','idx',true],
                  ['name','varchar(120)','',false],
                  ['call_sign','varchar','',true],
                  ['flag_state','varchar','fk → flag_states.code',false],
                  ['vessel_type_id','int','fk → vessel_types.id',true],
                  ['gross_tonnage','int','',true],
                  ['year_built','int','',true],
                  ['length_overall','numeric','',true],
                ].map(([c,t,note,nullable],i)=>(
                  <HRow key={c} style={{ padding:'8px 12px', borderTop: i?'1px solid var(--gray-100)':'none', fontSize:12 }} gap={8}>
                    <span className="hifi-mono" style={{ flex:1, fontWeight:500 }}>{c}</span>
                    <span className="hifi-mono" style={{ fontSize:11, color:'var(--slate-500)' }}>{t}</span>
                    {note && <span style={{ fontSize:10, color:'var(--ocean-500)' }}>{note}</span>}
                    {!nullable && <HPill>NOT NULL</HPill>}
                  </HRow>
                ))}
              </HCol>
            </HCol>

            <HCol gap={8}>
              <div className="hifi-caption">API routes that touch this table · 5</div>
              <HCol gap={4} style={{ fontSize:11.5 }}>
                {[
                  ['GET','/api/map/vessels'],
                  ['GET','/api/vessels/search'],
                  ['GET','/api/vessels/:id'],
                  ['POST','/api/dev/ingestion/positions-snapshot'],
                  ['POST','/api/dev/ingestion/vessel-particulars/:id'],
                ].map(([m,p])=>(
                  <HRow key={p} gap={8} style={{ padding:'7px 10px', background:'var(--gray-50)', borderRadius:6 }}>
                    <span className="hifi-mono" style={{ fontSize:10, padding:'1px 5px', borderRadius:3, background: m==='GET'?'rgba(46,143,91,0.15)':'rgba(58,127,184,0.15)', color: m==='GET'?'var(--health-ok)':'var(--ocean-500)', fontWeight:600 }}>{m}</span>
                    <span className="hifi-mono" style={{ color:'var(--navy-700)' }}>{p}</span>
                  </HRow>
                ))}
              </HCol>
            </HCol>
          </HCol>
        </div>
      </div>
    </div>
  );
};

/* =============================================================
 * 13. EVIDENCE JSON INSPECTOR
 * ===========================================================*/
const HEvidenceJSON = () => (
  <div className="hifi" data-screen-label="13 Evidence JSON" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase showHalos={false}/>
    <HCommandRail activeNav="vessels"/>
    <HMapUtilBar/>

    <HInspector
      title="Evidence #4821"
      breadcrumb="OCEANS-X · POSITION · OBSERVED 08:32:14 UTC"
      tabs={['Payload','Subjects','Lineage']}
      footer={
        <HRow gap={6}>
          <button className="hifi-btn primary sm"><HIcon name="ship" size={12}/>Open subject vessel</button>
          <button className="hifi-btn sm"><HIcon name="copy" size={12}/>Copy hash</button>
          <button className="hifi-btn sm ghost" style={{ marginLeft:'auto' }}><HIcon name="download" size={12}/>Download JSON</button>
        </HRow>
      }
      width={720}
    >
      <HCol gap={14}>
        {/* Meta strip */}
        <div className="hifi-card subtle" style={{ padding:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, fontSize:12 }}>
            <HCol gap={3}>
              <span className="hifi-caption">Source</span>
              <span style={{ fontWeight:600 }}>OCEANS-X</span>
            </HCol>
            <HCol gap={3}>
              <span className="hifi-caption">Observation type</span>
              <span className="hifi-mono">position</span>
            </HCol>
            <HCol gap={3}>
              <span className="hifi-caption">Source record ID</span>
              <span className="hifi-mono" style={{ fontSize:11 }}>OXP-2024-9876543-082314</span>
            </HCol>
            <HCol gap={3}>
              <span className="hifi-caption">Observed at</span>
              <span className="hifi-mono" style={{ fontSize:11 }}>2026-05-12 08:32:14 UTC</span>
            </HCol>
            <HCol gap={3}>
              <span className="hifi-caption">Fetched at</span>
              <span className="hifi-mono" style={{ fontSize:11 }}>2026-05-12 08:32:16 UTC</span>
            </HCol>
            <HCol gap={3}>
              <span className="hifi-caption">Payload hash</span>
              <HRow gap={4}><span className="hifi-mono" style={{ fontSize:11 }}>7b21a3f9c4…</span><HIcon name="copy" size={11} color="var(--slate-500)"/></HRow>
            </HCol>
          </div>
        </div>

        {/* JSON viewer */}
        <div style={{ border:'1px solid var(--gray-200)', borderRadius:10, overflow:'hidden', background:'#0E2235' }}>
          <HRow justify="space-between" style={{ padding:'8px 14px', background:'var(--navy-900)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
            <HRow gap={8}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--cyan-400)' }}/>
              <span className="hifi-mono" style={{ fontSize:11, color:'#fff' }}>payload.json</span>
              <span className="hifi-mono" style={{ fontSize:10, color:'rgba(255,255,255,0.5)' }}>· 1.2 KB · 38 lines</span>
            </HRow>
            <HRow gap={4}>
              <button className="hifi-btn icon sm ghost" style={{ color:'#fff' }}><HIcon name="search" size={13}/></button>
              <button className="hifi-btn icon sm ghost" style={{ color:'#fff' }}><HIcon name="copy" size={13}/></button>
            </HRow>
          </HRow>
          <pre style={{
            margin:0, padding:'14px 18px',
            fontFamily:'JetBrains Mono, monospace', fontSize:11.5, lineHeight:1.7,
            color:'#cdd9e8', background:'transparent', overflow:'auto', maxHeight:340,
          }}>
{`{
  "`}<span style={{ color:'#7cc4d6' }}>vessel</span>{`": {
    "`}<span style={{ color:'#7cc4d6' }}>imo</span>{`": `}<span style={{ color:'#ffb86c' }}>9876543</span>{`,
    "`}<span style={{ color:'#7cc4d6' }}>mmsi</span>{`": "`}<span style={{ color:'#a8e1bd' }}>538009123</span>{`",
    "`}<span style={{ color:'#7cc4d6' }}>name</span>{`": "`}<span style={{ color:'#a8e1bd' }}>NORTHERN STAR</span>{`",
    "`}<span style={{ color:'#7cc4d6' }}>flag_state</span>{`": "`}<span style={{ color:'#a8e1bd' }}>SG</span>{`"
  },
  "`}<span style={{ color:'#7cc4d6' }}>position</span>{`": {
    "`}<span style={{ color:'#7cc4d6' }}>lat</span>{`": `}<span style={{ color:'#ffb86c' }}>52.3128</span>{`,
    "`}<span style={{ color:'#7cc4d6' }}>lon</span>{`": `}<span style={{ color:'#ffb86c' }}>4.0721</span>{`,
    "`}<span style={{ color:'#7cc4d6' }}>speed_knots</span>{`": `}<span style={{ color:'#ffb86c' }}>14.2</span>{`,
    "`}<span style={{ color:'#7cc4d6' }}>course_degrees</span>{`": `}<span style={{ color:'#ffb86c' }}>87</span>{`,
    "`}<span style={{ color:'#7cc4d6' }}>nav_status</span>{`": "`}<span style={{ color:'#a8e1bd' }}>under_way</span>{`",
    "`}<span style={{ color:'#7cc4d6' }}>timestamp</span>{`": "`}<span style={{ color:'#a8e1bd' }}>2026-05-12T08:32:14Z</span>{`"
  },
  "`}<span style={{ color:'#7cc4d6' }}>source_meta</span>{`": { `}<span style={{ color:'rgba(255,255,255,0.4)' }}>// 6 keys collapsed</span>{` ▸ },
  "`}<span style={{ color:'#7cc4d6' }}>provenance</span>{`": {
    "`}<span style={{ color:'#7cc4d6' }}>upstream_id</span>{`": "`}<span style={{ color:'#a8e1bd' }}>OXP-2024-9876543-082314</span>{`",
    "`}<span style={{ color:'#7cc4d6' }}>fetched_via</span>{`": "`}<span style={{ color:'#a8e1bd' }}>positions-snapshot</span>{`",
    "`}<span style={{ color:'#7cc4d6' }}>job_id</span>{`": "`}<span style={{ color:'#a8e1bd' }}>J2341</span>{`"
  }
}`}
          </pre>
        </div>

        {/* Subjects */}
        <HCol gap={8}>
          <div className="hifi-caption">Linked subjects · 2</div>
          <HCol gap={4}>
            <HRow gap={10} style={{ padding:'10px 12px', background:'var(--ocean-50)', borderRadius:8 }}>
              <HIcon name="ship" size={14} color="var(--ocean-500)"/>
              <span style={{ fontWeight:600, fontSize:13 }}>NORTHERN STAR</span>
              <span className="hifi-mono" style={{ fontSize:11, color:'var(--slate-500)' }}>IMO 9876543</span>
              <span style={{ marginLeft:'auto', fontSize:12, color:'var(--ocean-500)', fontWeight:500, cursor:'pointer' }}>Open →</span>
            </HRow>
            <HRow gap={10} style={{ padding:'10px 12px', background:'var(--gray-50)', borderRadius:8 }}>
              <HIcon name="shield" size={14} color="var(--risk-high)"/>
              <span style={{ fontWeight:600, fontSize:13 }}>Risk flag · Dark AIS</span>
              <HPill kind="high" solid dot>HIGH</HPill>
              <span style={{ marginLeft:'auto', fontSize:12, color:'var(--ocean-500)', fontWeight:500, cursor:'pointer' }}>Open →</span>
            </HRow>
          </HCol>
        </HCol>
      </HCol>
    </HInspector>
  </div>
);

Object.assign(window, { HOpsConsole, HGraph, HSchema, HEvidenceJSON });
