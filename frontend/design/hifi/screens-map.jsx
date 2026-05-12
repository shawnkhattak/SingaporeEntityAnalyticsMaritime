// Hi-fi map workspace screens.

/* =============================================================
 * 1. MAP — LOADED (canonical default)
 * ===========================================================*/
const HMapLoaded = () => (
  <div className="hifi" data-screen-label="01 Map — loaded" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase/>
    <HCommandPanel activeNav="map"/>
    <HMapUtilBar/>
    <HScaleBar/>

    {/* Selected vessel */}
    <div style={{ position:'absolute', left:820, top:330 }}>
      <div className="hifi-vessel-ring" style={{ left:-12, top:-12, position:'absolute' }}/>
      <div className="hifi-vessel sel"/>
    </div>

    {/* Vessel popover */}
    <HVesselPopover left={846} top={282}/>

    {/* Status strip */}
    <HMapStatusStrip left="calc(50% + 168px)"/>
  </div>
);

/* =============================================================
 * 2. MAP — EMPTY / FIRST-RUN STATE
 * ===========================================================*/
const HMapEmpty = () => (
  <div className="hifi" data-screen-label="02 Map — empty / first-run" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase showVessels={false}/>
    <HCommandPanel activeNav="map" showFilters={false}/>
    <HMapUtilBar/>
    <HScaleBar/>

    {/* Centered call-to-action */}
    <div style={{ position:'absolute', left:'calc(50% + 168px)', top:'50%', transform:'translate(-50%, -50%)', zIndex:5 }}>
      <div className="hifi-glass" style={{ padding:32, width:480, textAlign:'center', borderRadius:20 }}>
        <div style={{
          width:56, height:56, margin:'0 auto 16px',
          background:'var(--ocean-50)', border:'1px solid var(--ocean-200)', borderRadius:14,
          display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ocean-500)'
        }}>
          <HIcon name="radar" size={28}/>
        </div>
        <div className="hifi-h1" style={{ fontSize:20, marginBottom:6 }}>No vessels loaded yet</div>
        <div className="hifi-sm" style={{ color:'var(--slate-500)', marginBottom:18 }}>
          Run a positions snapshot to fetch the latest AIS data from OCEANS-X. We'll populate the map and the inspectors with everything we observe.
        </div>
        <HRow gap={8} justify="center">
          <button className="hifi-btn primary lg">
            <HIcon name="play" size={14}/>
            Run positions snapshot
          </button>
          <button className="hifi-btn lg">
            <HIcon name="refresh" size={14}/>
            Refresh all live
          </button>
        </HRow>
        <div style={{ marginTop:18, fontSize:11, color:'var(--slate-400)' }}>
          POST /api/dev/ingestion/positions-snapshot?mode=live
        </div>
      </div>
    </div>

    {/* Faint hint text on the map itself */}
    <div style={{ position:'absolute', top:32, right:140, color:'var(--slate-400)', fontSize:13, fontStyle:'italic' }}>
      The map awaits.
    </div>
  </div>
);

/* =============================================================
 * 3. VESSEL DETAIL INSPECTOR
 * ===========================================================*/
const HVesselInspector = () => (
  <div className="hifi" data-screen-label="03 Vessel detail" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase showHalos={false}/>
    <HCommandRail activeNav="vessels"/>
    <HMapUtilBar/>

    {/* Highlight selected vessel breadcrumb (right of inspector) */}
    <svg style={{ position:'absolute', left:680, top:240, width:280, height:140, pointerEvents:'none', zIndex:3 }}>
      <path d="M 20 110 Q 100 80 160 50 T 260 20" stroke="var(--ocean-500)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.7"/>
      <circle cx="20" cy="110" r="4" fill="var(--ocean-500)" opacity="0.6"/>
      <circle cx="160" cy="50" r="4" fill="var(--ocean-500)" opacity="0.8"/>
      <circle cx="260" cy="20" r="6" fill="var(--ocean-500)"/>
      <circle cx="260" cy="20" r="14" fill="var(--ocean-500)" opacity="0.2"/>
    </svg>

    <HInspector
      title="NORTHERN STAR"
      breadcrumb="VESSELS / IMO 9876543"
      tabs={['Overview','Position history','Port calls',['Evidence',24],['Risk',3],'Graph']}
      footer={
        <HRow gap={6}>
          <button className="hifi-btn primary sm"><HIcon name="refresh" size={12}/>Refresh particulars</button>
          <button className="hifi-btn sm"><HIcon name="refresh" size={12}/>Refresh movements</button>
          <button className="hifi-btn sm"><HIcon name="net" size={12}/>Open in graph</button>
          <button className="hifi-btn sm ghost" style={{ marginLeft:'auto' }}><HIcon name="note" size={12}/>Note</button>
        </HRow>
      }
    >
      <HCol gap={18}>
        {/* Hero metadata */}
        <HCol gap={8}>
          <HRow gap={8} style={{ flexWrap:'wrap', alignItems:'center' }}>
            <span className="hifi-mono" style={{ fontSize:12, color:'var(--navy-700)' }}>IMO 9876543</span>
            <span style={{ color:'var(--slate-400)' }}>·</span>
            <span className="hifi-mono" style={{ fontSize:12, color:'var(--navy-700)' }}>MMSI 538009123</span>
            <span style={{ color:'var(--slate-400)' }}>·</span>
            <span className="hifi-mono" style={{ fontSize:12, color:'var(--navy-700)' }}>S6BG3</span>
          </HRow>
          <HRow gap={6} style={{ flexWrap:'wrap' }}>
            <HChip>{flag('SG')} Singapore</HChip>
            <HChip>Tanker · Crude</HChip>
            <HChip>74,990 GT</HChip>
            <span style={{ fontSize:11, color:'var(--slate-400)', marginLeft:'auto' }}>Source updated 12 min ago</span>
          </HRow>
        </HCol>

        {/* Two-up metric cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="hifi-card" style={{ padding:14 }}>
            <div className="hifi-caption" style={{ marginBottom:8 }}>Latest position</div>
            <div className="hifi-mono" style={{ fontSize:14, fontWeight:600 }}>52.31°N · 4.07°E</div>
            <HRow gap={14} style={{ marginTop:8, alignItems:'baseline' }}>
              <div><span className="hifi-num" style={{ fontSize:18 }}>14.2</span><span style={{ fontSize:11, color:'var(--slate-500)', marginLeft:3 }}>kn</span></div>
              <div><span className="hifi-num" style={{ fontSize:18 }}>087°</span></div>
            </HRow>
            <HRow justify="space-between" style={{ marginTop:10 }}>
              <HPill kind="info" dot>UnderWay</HPill>
              <span style={{ fontSize:11, color:'var(--slate-400)' }}>3 min ago</span>
            </HRow>
            <HRow gap={4} style={{ marginTop:10, fontSize:12, color:'var(--ocean-500)', fontWeight:500, cursor:'pointer' }}>
              <HIcon name="pin" size={12}/><span>Center map</span><HIcon name="arrowR" size={12}/>
            </HRow>
          </div>
          <div className="hifi-card" style={{ padding:14 }}>
            <div className="hifi-caption" style={{ marginBottom:8 }}>Identity</div>
            <HCol gap={6} style={{ fontSize:13 }}>
              {[['Year built','2014'],['LOA','274 m'],['Beam','48 m'],['DWT','158,000 t'],['Gross tonnage','74,990']].map(([k,v])=>(
                <HRow key={k} justify="space-between">
                  <span style={{ color:'var(--slate-500)' }}>{k}</span>
                  <span className="hifi-mono" style={{ fontWeight:500 }}>{v}</span>
                </HRow>
              ))}
            </HCol>
          </div>
        </div>

        {/* Active risk flags */}
        <HCol gap={8}>
          <HRow justify="space-between">
            <div className="hifi-caption">Active risk flags · 3</div>
            <span className="hifi-sm" style={{ color:'var(--ocean-500)', cursor:'pointer' }}>View all in Risk tab →</span>
          </HRow>
          <HCol gap={6}>
            {[
              ['high','Dark AIS','12h AIS gap over Persian Gulf','#4821','2h ago'],
              ['med','News mention','Reuters: detained at Singapore PSC','#4815','11h ago'],
              ['low','Flag change','Re-flagged Liberia → Singapore','#4790','3w ago'],
            ].map(([k,t,s,ev,when],i)=>(
              <div key={i} className={`hifi-card hifi-stripe-${k}`} style={{ padding:'10px 12px' }}>
                <HRow justify="space-between" style={{ marginBottom:2 }}>
                  <HRow gap={8}>
                    <HPill kind={k} solid dot>{k.toUpperCase()}</HPill>
                    <span style={{ fontSize:13, fontWeight:600 }}>{t}</span>
                  </HRow>
                  <span style={{ fontSize:11, color:'var(--slate-400)' }}>{when}</span>
                </HRow>
                <div style={{ fontSize:12.5, color:'var(--navy-700)' }}>{s}</div>
                <HRow gap={6} style={{ marginTop:6, fontSize:11, color:'var(--slate-500)' }}>
                  <span className="hifi-mono">{ev}</span>
                  <HIcon name="ext" size={11}/>
                </HRow>
              </div>
            ))}
          </HCol>
        </HCol>

        {/* Entities */}
        <HCol gap={8}>
          <div className="hifi-caption">Entities</div>
          <HCol gap={6}>
            {[
              ['Aurora Shipping Ltd','Owner','Singapore','crit'],
              ['Aurora Mgmt SG','Manager','Singapore',null],
              ['SeaTrans Bunkers','Operator','UAE',null],
            ].map(([n,role,c,risk],i)=>(
              <div key={i} className="hifi-card" style={{ padding:'10px 12px' }}>
                <HRow justify="space-between">
                  <HRow gap={10}>
                    <div style={{
                      width:32, height:32, borderRadius:8,
                      background:'var(--gray-100)', display:'flex', alignItems:'center', justifyContent:'center',
                      color: risk==='crit'?'var(--risk-critical)':'var(--slate-500)',
                    }}>
                      <HIcon name="bldg" size={16}/>
                    </div>
                    <HCol gap={2}>
                      <span style={{ fontSize:13, fontWeight:600 }}>{n}</span>
                      <span style={{ fontSize:11, color:'var(--slate-500)' }}>{role} · {c}</span>
                    </HCol>
                  </HRow>
                  <HRow gap={6}>
                    {risk==='crit' && <HPill kind="crit" solid dot>Sanctioned</HPill>}
                    <HIcon name="chevR" size={14} color="var(--slate-400)"/>
                  </HRow>
                </HRow>
              </div>
            ))}
          </HCol>
        </HCol>

        {/* Recent port calls */}
        <HCol gap={8}>
          <HRow justify="space-between">
            <div className="hifi-caption">Recent port calls · 14 total</div>
            <span className="hifi-sm" style={{ color:'var(--ocean-500)', cursor:'pointer' }}>View all →</span>
          </HRow>
          <HCol gap={0} style={{ border:'1px solid var(--gray-200)', borderRadius:10, overflow:'hidden' }}>
            {[
              ['departure','Rotterdam','NLRTM','2 days ago'],
              ['arrival','Rotterdam','NLRTM','5 days ago'],
              ['departure','Suez','EGSUZ','11 days ago'],
              ['arrival','Suez','EGSUZ','12 days ago'],
            ].map(([t,p,code,when],i)=>(
              <HRow key={i} gap={12} style={{ padding:'10px 14px', borderTop: i?'1px solid var(--gray-100)':'none', fontSize:13 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:'var(--gray-100)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--slate-500)' }}>
                  <HIcon name={t==='arrival'?'arrowL':'arrowR'} size={13}/>
                </div>
                <span style={{ flex:1 }}>{t === 'arrival' ? 'Arrival at' : 'Departure from'} <strong>{p}</strong></span>
                <span className="hifi-mono" style={{ fontSize:11, color:'var(--slate-500)' }}>{code}</span>
                <span style={{ fontSize:11, color:'var(--slate-400)', width:80, textAlign:'right' }}>{when}</span>
              </HRow>
            ))}
          </HCol>
        </HCol>
      </HCol>
    </HInspector>
  </div>
);

/* =============================================================
 * 4. VESSELS LIST INSPECTOR
 * ===========================================================*/
const HVesselsList = () => (
  <div className="hifi" data-screen-label="04 Vessels list" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase/>
    <HCommandRail activeNav="vessels"/>
    <HMapUtilBar/>
    <HMapStatusStrip left="calc(50% + 312px)"/>

    <HInspector
      title="Vessels"
      breadcrumb="247 IN VIEW · 12,481 TOTAL"
      tabs={[['All',247],['Risk-flagged',23],['Watching',8]]}
    >
      <HCol gap={14}>
        {/* Search */}
        <div className="hifi-input">
          <HIcon name="search" size={14} color="var(--slate-500)"/>
          <input placeholder="Search by name, IMO, MMSI, call sign…"/>
          <HKbd>/</HKbd>
        </div>

        {/* Filter chips */}
        <HRow gap={4} style={{ flexWrap:'wrap' }}>
          <HChip selected>All risk</HChip>
          <HChip kind="crit">Critical · 3</HChip>
          <HChip kind="high">High · 9</HChip>
          <HChip>Medium · 24</HChip>
          <HChip>Low · 41</HChip>
        </HRow>

        {/* Sort row */}
        <HRow justify="space-between" style={{ fontSize:11, color:'var(--slate-500)' }}>
          <span>Showing 1–25 of 247</span>
          <HRow gap={4}>
            <span>Sort:</span>
            <span style={{ color:'var(--navy-900)', fontWeight:600 }}>Risk severity</span>
            <HIcon name="chevD" size={11}/>
          </HRow>
        </HRow>

        {/* Vessel rows */}
        <HCol gap={6}>
          {[
            ['NORTHERN STAR','9876543','538009123','SG','Tanker','crit','3 min ago',['Dark AIS','News']],
            ['BLUE HORIZON','9712384','477821000','HK','Bulker','crit','12 min ago',['Sanctions','Dark AIS']],
            ['CARIB DAWN','9558721','312456000','BZ','Container','high','1h ago',['PSC detain']],
            ['KAVALA','9601234','240900000','IT','Tanker','high','1h ago',['Geofence']],
            ['MERIDIAN','9501288','247000000','IT','Cargo','high','3h ago',['Sanctions','PSC']],
            ['PACIFIC GLOW','9621034','372900000','PA','Tanker','med','2h ago',['Anomaly']],
            ['SOUTHERN MIST','9712909','311000000','BZ','Bulker','med','4h ago',['News']],
            ['ATLANTIC PRIDE','9612400','248000000','MT','Container','low','22 min ago',['Flag chg']],
          ].map(([name,imo,mmsi,fc,type,risk,when,flags],i)=>(
            <div key={i} className="hifi-card" style={{ padding:'12px 14px', cursor:'pointer' }}>
              <HRow gap={12}>
                <div style={{
                  width:36, height:36, borderRadius:'50%',
                  background:'var(--gray-100)',
                  border: `2px solid ${
                    risk==='crit'?'var(--risk-critical)':
                    risk==='high'?'var(--risk-high)':
                    risk==='med'?'var(--risk-medium)':
                    risk==='low'?'var(--risk-low)':'var(--slate-400)'
                  }`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--slate-500)'
                }}>
                  <HIcon name="ship" size={16}/>
                </div>
                <HCol gap={3} style={{ flex:1, minWidth:0 }}>
                  <HRow gap={6}>
                    <span style={{ fontSize:14, fontWeight:600 }}>{name}</span>
                    <span>{flag(fc)}</span>
                  </HRow>
                  <HRow gap={6} style={{ fontSize:11 }}>
                    <span className="hifi-mono" style={{ color:'var(--slate-500)' }}>IMO {imo}</span>
                    <span style={{ color:'var(--slate-400)' }}>·</span>
                    <span className="hifi-mono" style={{ color:'var(--slate-500)' }}>MMSI {mmsi}</span>
                    <span style={{ color:'var(--slate-400)' }}>·</span>
                    <span style={{ color:'var(--slate-500)' }}>{type}</span>
                  </HRow>
                </HCol>
                <HCol gap={4} style={{ alignItems:'flex-end' }}>
                  <HRow gap={3}>
                    {flags.slice(0,2).map(f=><HPill kind={risk} key={f}>{f}</HPill>)}
                  </HRow>
                  <span style={{ fontSize:10.5, color:'var(--slate-400)' }}>{when}</span>
                </HCol>
              </HRow>
            </div>
          ))}
        </HCol>

        {/* Pagination */}
        <HRow justify="space-between" style={{ marginTop:6 }}>
          <span style={{ fontSize:11, color:'var(--slate-500)' }}>Page 1 of 10</span>
          <HRow gap={4}>
            <button className="hifi-btn sm" disabled><HIcon name="chevL" size={12}/>Prev</button>
            <button className="hifi-btn sm">Next<HIcon name="chevR" size={12}/></button>
          </HRow>
        </HRow>
      </HCol>
    </HInspector>
  </div>
);

Object.assign(window, { HMapLoaded, HMapEmpty, HVesselInspector, HVesselsList });
