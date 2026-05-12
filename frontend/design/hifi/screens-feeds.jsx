// Hi-fi feed inspectors — Risk, Sanctions, Ports, News, Entity.

/* =============================================================
 * 5. RISK FEED INSPECTOR
 * ===========================================================*/
const HRiskFeed = () => (
  <div className="hifi" data-screen-label="05 Risk feed" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase/>
    <HCommandRail activeNav="risk"/>
    <HMapUtilBar/>
    <HMapStatusStrip left="calc(50% + 312px)"/>

    <HInspector
      title="Risk feed"
      breadcrumb="LIVE · ALL SUBJECTS"
      tabs={[['Open',77],['Resolved',412],'By subject']}
      footer={
        <HRow justify="space-between">
          <span style={{ fontSize:11, color:'var(--slate-500)' }}>Last recompute 14 min ago · 247 vessels scanned</span>
          <button className="hifi-btn primary sm"><HIcon name="refresh" size={12}/>Recompute risk flags</button>
        </HRow>
      }
    >
      <HCol gap={16}>
        {/* Severity counters */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
          {[
            ['Critical','3','+1','crit','var(--risk-critical)'],
            ['High','9','+2','high','var(--risk-high)'],
            ['Medium','24','-3','med','var(--risk-medium)'],
            ['Low','41','+5','low','var(--risk-low)'],
          ].map(([lab,n,delta,kind,color])=>(
            <div key={lab} className="hifi-card" style={{ padding:12, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:color }}/>
              <div style={{ paddingLeft:6 }}>
                <div className="hifi-caption" style={{ color }}>{lab}</div>
                <HRow justify="space-between" style={{ alignItems:'baseline', marginTop:4 }}>
                  <span className="hifi-num" style={{ fontSize:24 }}>{n}</span>
                  <span style={{ fontSize:11, color: delta.startsWith('+')?'var(--risk-high)':'var(--health-ok)' }}>{delta}/24h</span>
                </HRow>
              </div>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <HCol gap={8}>
          <div className="hifi-caption">Flag type</div>
          <HRow gap={4} style={{ flexWrap:'wrap' }}>
            <HChip selected>All</HChip>
            <HChip>Sanctions · 4</HChip>
            <HChip>Dark AIS · 12</HChip>
            <HChip>Port-state · 6</HChip>
            <HChip>News · 18</HChip>
            <HChip>Geofence · 9</HChip>
            <HChip>Anomaly · 28</HChip>
          </HRow>
        </HCol>

        <div className="hifi-divider"/>

        {/* Risk rows */}
        <HCol gap={8}>
          {[
            ['crit','Sanctions','MV NORTHERN STAR matched OFAC SDN','ship','NORTHERN STAR','#4821','2h ago'],
            ['crit','Dark AIS','12h gap in AIS over Persian Gulf','ship','BLUE HORIZON','#4815','5h ago'],
            ['crit','Sanctions','Owner Aurora Shipping → EU consolidated list','bldg','Aurora Shipping Ltd','#4790','16h ago'],
            ['high','News','Reuters: detained at Singapore PSC','ship','CARIB DAWN','#4799','11h ago'],
            ['high','Geofence','Entered HRA off Yemen coast','ship','KAVALA','#4791','14h ago'],
            ['high','Port-state','3 detentions in last 12 months','ship','MERIDIAN','#4787','18h ago'],
            ['med','News','Mentioned in sanctions evasion report (TradeWinds)','ship','SOUTHERN MIST','#4772','1d ago'],
            ['med','Anomaly','Speed anomaly · 22 kn in port approach lane','ship','PACIFIC GLOW','#4760','2d ago'],
          ].map(([k,t,s,icon,subj,ev,when],i)=>(
            <div key={i} className={`hifi-card hifi-stripe-${k}`} style={{ padding:'12px 14px', cursor:'pointer' }}>
              <HRow justify="space-between" style={{ marginBottom:6 }}>
                <HRow gap={8}>
                  <HPill kind={k} solid dot>{k.toUpperCase()}</HPill>
                  <span style={{ fontSize:13, fontWeight:600 }}>{t}</span>
                </HRow>
                <span style={{ fontSize:11, color:'var(--slate-400)' }}>{when}</span>
              </HRow>
              <div style={{ fontSize:13.5, color:'var(--navy-900)', marginBottom:8 }}>{s}</div>
              <HRow justify="space-between">
                <HRow gap={8}>
                  <div style={{ width:24, height:24, borderRadius:6, background:'var(--gray-100)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--slate-500)' }}>
                    <HIcon name={icon} size={13}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:500 }}>{subj}</span>
                </HRow>
                <HRow gap={8} style={{ fontSize:11, color:'var(--slate-500)' }}>
                  <span className="hifi-mono">{ev}</span>
                  <HIcon name="ext" size={12}/>
                </HRow>
              </HRow>
            </div>
          ))}
        </HCol>
      </HCol>
    </HInspector>
  </div>
);

/* =============================================================
 * 6. SANCTIONS INSPECTOR (no CSV — that lives in Ops)
 * ===========================================================*/
const HSanctions = () => (
  <div className="hifi" data-screen-label="06 Sanctions matches" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase/>
    <HCommandRail activeNav="sanctions"/>
    <HMapUtilBar/>
    <HMapStatusStrip left="calc(50% + 312px)"/>

    <HInspector
      title="Sanctions"
      breadcrumb="OPEN SANCTIONS · OFAC · EU · UK"
      tabs={[['Matches',11],'By list','By subject']}
      footer={
        <HRow justify="space-between">
          <span style={{ fontSize:11, color:'var(--slate-500)' }}>
            Last refresh 3h 12m ago · <span style={{ color:'var(--risk-medium)' }}>quota 87% used</span>
          </span>
          <button className="hifi-btn danger sm"><HIcon name="refresh" size={12}/>Refresh from API</button>
        </HRow>
      }
    >
      <HCol gap={16}>
        {/* Top stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[
            ['Total matches','11','+2 / wk',null],
            ['Vessels','7','of 12,481',null],
            ['Entities','4','of 3,902',null],
            ['Avg confidence','0.86','',null],
          ].map(([lab,n,sub])=>(
            <div key={lab} className="hifi-card" style={{ padding:12 }}>
              <div className="hifi-caption">{lab}</div>
              <div className="hifi-num" style={{ fontSize:22, marginTop:2 }}>{n}</div>
              <div style={{ fontSize:10.5, color:'var(--slate-400)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Source filter */}
        <HCol gap={8}>
          <div className="hifi-caption">Source list</div>
          <HRow gap={4} style={{ flexWrap:'wrap' }}>
            <HChip selected>All sources</HChip>
            <HChip>OpenSanctions · 11</HChip>
            <HChip>OFAC SDN · 7</HChip>
            <HChip>EU Consolidated · 4</HChip>
            <HChip>UK HM Treasury · 3</HChip>
          </HRow>
        </HCol>

        <div className="hifi-divider"/>

        {/* Matches list */}
        <HCol gap={8}>
          {[
            ['Aurora Shipping Ltd','bldg','Owner · Singapore','OpenSanctions, OFAC SDN','0.94','2h ago'],
            ['MV NORTHERN STAR','ship','Tanker · IMO 9876543','OFAC SDN','0.91','4h ago'],
            ['Sea-Bunkers DMCC','bldg','Operator · UAE','EU Consolidated','0.88','11h ago'],
            ['MV BLUE HORIZON','ship','Bulker · IMO 9712384','UK HM Treasury','0.85','1d ago'],
            ['Polaris Holdings BV','bldg','Owner · Netherlands','OpenSanctions','0.79','1d ago'],
            ['MV KAVALA','ship','Tanker · IMO 9601234','OFAC SDN, EU','0.77','2d ago'],
          ].map(([name,icon,meta,sources,conf,when],i)=>(
            <div key={i} className="hifi-card hifi-stripe-crit" style={{ padding:'12px 14px' }}>
              <HRow justify="space-between">
                <HRow gap={10}>
                  <div style={{
                    width:36, height:36, borderRadius:8,
                    background:'rgba(198,40,40,0.08)', color:'var(--risk-critical)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <HIcon name={icon} size={17}/>
                  </div>
                  <HCol gap={3}>
                    <HRow gap={6}>
                      <span style={{ fontSize:14, fontWeight:600 }}>{name}</span>
                      <HPill kind="crit" solid dot>match</HPill>
                    </HRow>
                    <span style={{ fontSize:11.5, color:'var(--slate-500)' }}>{meta}</span>
                    <span style={{ fontSize:11.5, color:'var(--navy-700)' }}>{sources}</span>
                  </HCol>
                </HRow>
                <HCol gap={6} style={{ alignItems:'flex-end' }}>
                  <span className="hifi-num" style={{ fontSize:14 }}>{conf}</span>
                  <span style={{ fontSize:10.5, color:'var(--slate-400)' }}>{when}</span>
                </HCol>
              </HRow>
              <HRow gap={8} style={{ marginTop:8, fontSize:11, color:'var(--ocean-500)' }}>
                <HRow gap={4}><HIcon name="ext" size={11}/><span style={{ textDecoration:'underline' }}>Open subject</span></HRow>
                <span style={{ color:'var(--slate-400)' }}>·</span>
                <span className="hifi-mono" style={{ color:'var(--slate-500)' }}>evidence #{4820-i*3}</span>
              </HRow>
            </div>
          ))}
        </HCol>

        <div className="hifi-card subtle" style={{ padding:12, fontSize:12, color:'var(--slate-500)' }}>
          <HRow gap={8}>
            <HIcon name="upload" size={14} color="var(--slate-400)"/>
            <span>CSV upload and URL ingest are in <strong style={{ color:'var(--navy-900)' }}>Operations → Sanctions CSV</strong>.</span>
          </HRow>
        </div>
      </HCol>
    </HInspector>
  </div>
);

/* =============================================================
 * 7. PORTS INSPECTOR
 * ===========================================================*/
const HPorts = () => (
  <div className="hifi" data-screen-label="07 Ports — due to arrive" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase/>
    <HCommandRail activeNav="ports"/>
    <HMapUtilBar/>
    <HMapStatusStrip left="calc(50% + 312px)"/>

    <HInspector
      title="Ports"
      breadcrumb="ACTIVITY · NEXT 24 HOURS"
      tabs={[['Due to arrive',38],['Due to depart',24],['All ports',412]]}
    >
      <HCol gap={14}>
        <div className="hifi-input">
          <HIcon name="search" size={14} color="var(--slate-500)"/>
          <input placeholder="Search by port name or UN/LOCODE…"/>
        </div>

        <HCol gap={6}>
          {[
            ['Rotterdam','NLRTM','NL',38,12,'Active'],
            ['Singapore','SGSIN','SG',31,9,'Active'],
            ['Shanghai','CNSHA','CN',24,6,'Active'],
            ['Suez Canal','EGSUZ','EG',18,4,'Transit'],
            ['Mumbai','INBOM','IN',12,3,'Active'],
            ['Lagos','NGLOS','NG',8,2,'Active'],
            ['Antwerp','BEANR','NL',16,5,'Active'],
            ['Hamburg','DEHAM','NL',14,4,'Active'],
          ].map(([name,code,cc,total,due,state],i)=>(
            <div key={code} className="hifi-card" style={{ padding:'12px 14px', cursor:'pointer' }}>
              <HRow gap={12}>
                <div style={{
                  width:36, height:36, background:'var(--risk-medium)', transform:'rotate(45deg)',
                  border:'1.5px solid var(--white)', boxShadow:'0 1px 3px rgba(14,34,53,0.2)'
                }}/>
                <HCol gap={3} style={{ flex:1 }}>
                  <HRow gap={6}>
                    <span style={{ fontSize:14, fontWeight:600 }}>{name}</span>
                    <span>{flag(cc)}</span>
                    <HPill kind={state==='Transit'?'info':'ok'}>{state}</HPill>
                  </HRow>
                  <HRow gap={6} style={{ fontSize:11 }}>
                    <span className="hifi-mono" style={{ color:'var(--slate-500)' }}>UN/LOCODE {code}</span>
                  </HRow>
                </HCol>
                <HCol gap={3} style={{ alignItems:'flex-end' }}>
                  <span style={{ fontSize:11, color:'var(--slate-500)' }}>In port now</span>
                  <span className="hifi-num" style={{ fontSize:16 }}>{total}</span>
                </HCol>
                <HCol gap={3} style={{ alignItems:'flex-end' }}>
                  <span style={{ fontSize:11, color:'var(--slate-500)' }}>Due 24h</span>
                  <HRow gap={4}>
                    <span className="hifi-num" style={{ fontSize:16, color:'var(--ocean-500)' }}>{due}</span>
                    <HIcon name="arrowR" size={14} color="var(--ocean-500)"/>
                  </HRow>
                </HCol>
                <HIcon name="chevR" size={16} color="var(--slate-400)"/>
              </HRow>
              {i===0 && (
                <HCol gap={4} style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--gray-100)' }}>
                  {[
                    ['NORTHERN STAR','9876543','ETA 14:30','high'],
                    ['BLUE HORIZON','9712384','ETA 17:15','crit'],
                    ['ATLANTIC PRIDE','9612400','ETA 22:45',null],
                  ].map(([n,imo,eta,r])=>(
                    <HRow key={n} gap={10} style={{ fontSize:12, padding:'4px 0' }}>
                      <HIcon name="ship" size={13} color="var(--slate-500)"/>
                      <span style={{ flex:1, fontWeight:500 }}>{n}</span>
                      <span className="hifi-mono" style={{ color:'var(--slate-500)' }}>IMO {imo}</span>
                      <span className="hifi-mono" style={{ color:'var(--navy-700)' }}>{eta}</span>
                      {r && <HPill kind={r} solid>{r}</HPill>}
                    </HRow>
                  ))}
                </HCol>
              )}
            </div>
          ))}
        </HCol>
      </HCol>
    </HInspector>
  </div>
);

/* =============================================================
 * 8. NEWS INSPECTOR
 * ===========================================================*/
const HNews = () => (
  <div className="hifi" data-screen-label="08 News" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase/>
    <HCommandRail activeNav="news"/>
    <HMapUtilBar/>
    <HMapStatusStrip left="calc(50% + 312px)"/>

    <HInspector
      title="News"
      breadcrumb="RSS · 6 SOURCES · 12 ARTICLES TODAY"
      tabs={[['Recent',12],['Linked',8],['Sources',6]]}
      footer={
        <HRow justify="space-between">
          <span style={{ fontSize:11, color:'var(--slate-500)' }}>Last RSS pull 42 min ago</span>
          <button className="hifi-btn primary sm"><HIcon name="refresh" size={12}/>Refresh RSS</button>
        </HRow>
      }
    >
      <HCol gap={14}>
        <HRow gap={4} style={{ flexWrap:'wrap' }}>
          <HChip selected>All sources</HChip>
          <HChip>Reuters Maritime · 4</HChip>
          <HChip>TradeWinds · 3</HChip>
          <HChip>Lloyd's List · 2</HChip>
          <HChip>Splash 247 · 2</HChip>
          <HChip>Maritime Exec · 1</HChip>
        </HRow>

        <HCol gap={10}>
          {[
            ['Sanctions evasion ring tied to Singapore-flagged tankers','Reuters Maritime','2h ago','high',['NORTHERN STAR','Aurora Shipping']],
            ['MV BLUE HORIZON detained at Fujairah for inspection','TradeWinds','5h ago','high',['BLUE HORIZON']],
            ['Port of Rotterdam reports record-low transit times','Reuters Maritime','9h ago',null,['Rotterdam']],
            ["Lloyd's reports surge in HRA crossings near Bab-el-Mandeb",'Lloyd\'s List','14h ago','med',['KAVALA']],
            ['New OFAC additions target Iranian shadow fleet operators','Splash 247','1d ago','crit',['Aurora Shipping','Polaris Holdings']],
            ['Singapore PSC announces tightened tanker inspection regime','Maritime Exec','1d ago',null,[]],
          ].map(([title,source,when,risk,linked],i)=>(
            <div key={i} className="hifi-card" style={{ padding:'14px 16px', cursor:'pointer' }}>
              <HRow justify="space-between" style={{ marginBottom:6 }}>
                <HRow gap={6}>
                  <span style={{ fontSize:11, color:'var(--slate-500)', fontWeight:500 }}>{source}</span>
                  <span style={{ color:'var(--slate-400)', fontSize:11 }}>·</span>
                  <span style={{ fontSize:11, color:'var(--slate-400)' }}>{when}</span>
                </HRow>
                {risk && <HPill kind={risk} dot>linked risk</HPill>}
              </HRow>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--navy-900)', marginBottom:10, lineHeight:1.35 }}>
                {title}
              </div>
              <HRow justify="space-between">
                <HRow gap={4} style={{ flexWrap:'wrap' }}>
                  {linked.map(l => <HChip key={l}>{l}</HChip>)}
                </HRow>
                <HRow gap={6} style={{ fontSize:11, color:'var(--ocean-500)' }}>
                  <span style={{ textDecoration:'underline' }}>View original</span>
                  <HIcon name="ext" size={12}/>
                </HRow>
              </HRow>
            </div>
          ))}
        </HCol>
      </HCol>
    </HInspector>
  </div>
);

/* =============================================================
 * 9. ENTITY DETAIL INSPECTOR
 * ===========================================================*/
const HEntityDetail = () => (
  <div className="hifi" data-screen-label="09 Entity detail" style={{ width:1440, height:900, position:'relative', background:'var(--ocean-100)' }}>
    <HMapBase showHalos={false}/>
    <HCommandRail activeNav="entities"/>
    <HMapUtilBar/>

    <HInspector
      title="Aurora Shipping Ltd"
      breadcrumb="ENTITIES / OWNER · SINGAPORE"
      tabs={['Overview',['Vessels',7],['Relationships',12],['Risk',2],'Graph']}
      activeTab={2}
      footer={
        <HRow gap={6}>
          <button className="hifi-btn primary sm"><HIcon name="net" size={12}/>Open in graph</button>
          <button className="hifi-btn sm"><HIcon name="refresh" size={12}/>Recompute risk</button>
        </HRow>
      }
    >
      <HCol gap={16}>
        {/* Entity hero */}
        <HRow gap={14}>
          <div style={{
            width:64, height:64, borderRadius:14,
            background:'rgba(198,40,40,0.08)', color:'var(--risk-critical)',
            display:'flex', alignItems:'center', justifyContent:'center',
            border:'1px solid rgba(198,40,40,0.18)'
          }}>
            <HIcon name="bldg" size={30}/>
          </div>
          <HCol gap={6} style={{ flex:1 }}>
            <HRow gap={8}><HChip>{flag('SG')} Singapore</HChip><HChip>Owner</HChip><HPill kind="crit" solid dot>Sanctioned</HPill></HRow>
            <div className="hifi-sm" style={{ color:'var(--slate-500)' }}>
              Holding company · Reg. 201823491N · Created 2018-04-12 · Last seen in evidence 2h ago
            </div>
          </HCol>
        </HRow>

        {/* Stat tiles */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[['Vessels','7'],['Relationships','12'],['Risk flags','2'],['Sanctions lists','2']].map(([k,v])=>(
            <div key={k} className="hifi-card" style={{ padding:12 }}>
              <div className="hifi-caption">{k}</div>
              <div className="hifi-num" style={{ fontSize:22, marginTop:2 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Relationships tab content */}
        <HCol gap={8}>
          <HRow justify="space-between">
            <div className="hifi-caption">Relationships (12)</div>
            <HRow gap={4}>
              <HChip selected>All</HChip>
              <HChip>Owns</HChip>
              <HChip>Linked-to</HChip>
              <HChip>Beneficial</HChip>
            </HRow>
          </HRow>

          <HCol gap={6}>
            {[
              ['owns','MV NORTHERN STAR','ship','Tanker · IMO 9876543','0.99','crit'],
              ['owns','MV BLUE HORIZON','ship','Bulker · IMO 9712384','0.99','crit'],
              ['owns','MV ATLANTIC PRIDE','ship','Container · IMO 9612400','0.99',null],
              ['manages-via','Aurora Mgmt SG','bldg','Manager · Singapore','0.96',null],
              ['operator-of','Sea-Bunkers DMCC','bldg','Operator · UAE','0.88','crit'],
              ['beneficial-owner','Polaris Holdings BV','bldg','Parent · Netherlands','0.82','crit'],
              ['address-shared','Maritime Plaza, Floor 14','pin','Singapore','0.71',null],
            ].map(([rel,n,ic,m,c,risk],i)=>(
              <div key={i} className="hifi-card" style={{ padding:'10px 12px' }}>
                <HRow gap={10}>
                  <HPill kind="info">{rel}</HPill>
                  <div style={{ width:24, height:24, borderRadius:6, background:'var(--gray-100)', display:'flex', alignItems:'center', justifyContent:'center', color: risk==='crit'?'var(--risk-critical)':'var(--slate-500)' }}>
                    <HIcon name={ic} size={13}/>
                  </div>
                  <HCol gap={1} style={{ flex:1 }}>
                    <HRow gap={6}>
                      <span style={{ fontSize:13, fontWeight:600 }}>{n}</span>
                      {risk==='crit' && <HPill kind="crit" solid>Sanctioned</HPill>}
                    </HRow>
                    <span style={{ fontSize:11, color:'var(--slate-500)' }}>{m}</span>
                  </HCol>
                  <HCol gap={2} style={{ alignItems:'flex-end' }}>
                    <span style={{ fontSize:10, color:'var(--slate-500)' }}>confidence</span>
                    <span className="hifi-num" style={{ fontSize:12 }}>{c}</span>
                  </HCol>
                  <HIcon name="chevR" size={14} color="var(--slate-400)"/>
                </HRow>
              </div>
            ))}
          </HCol>
        </HCol>
      </HCol>
    </HInspector>
  </div>
);

Object.assign(window, { HRiskFeed, HSanctions, HPorts, HNews, HEntityDetail });
