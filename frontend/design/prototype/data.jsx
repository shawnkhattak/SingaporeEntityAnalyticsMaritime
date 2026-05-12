// Mock dataset for the prototype — vessels with positions, risk flags, entities, etc.

const VESSELS = [
  { id: 1, name:'NORTHERN STAR', imo:'9876543', mmsi:'538009123', callSign:'S6BG3', flag:'SG', type:'Tanker', subtype:'Crude', gt:74990, year:2014, loa:274, beam:48, dwt:158000, x:820, y:330, lat:52.31, lon:4.07, speed:14.2, course:87, navStatus:'UnderWay', risk:'high', flags:['Dark AIS','News'], owner:1, manager:2, operator:3 },
  { id: 2, name:'BLUE HORIZON', imo:'9712384', mmsi:'477821000', callSign:'VRMQ4', flag:'HK', type:'Bulker', gt:91200, year:2011, loa:292, beam:45, x:880, y:520, lat:25.04, lon:56.32, speed:11.8, course:142, navStatus:'UnderWay', risk:'crit', flags:['Sanctions','Dark AIS'], owner:1 },
  { id: 3, name:'CARIB DAWN', imo:'9558721', mmsi:'312456000', callSign:'J8MK2', flag:'BZ', type:'Container', gt:42100, year:2009, loa:294, beam:32, x:1080, y:300, lat:1.28, lon:103.85, speed:0.2, course:180, navStatus:'AtAnchor', risk:'high', flags:['PSC detain'] },
  { id: 4, name:'KAVALA', imo:'9601234', mmsi:'240900000', callSign:'SVAS7', flag:'IT', type:'Tanker', gt:65800, year:2012, loa:248, beam:43, x:820, y:310, lat:14.5, lon:43.2, speed:9.4, course:65, navStatus:'UnderWay', risk:'high', flags:['Geofence'] },
  { id: 5, name:'MERIDIAN', imo:'9501288', mmsi:'247000000', callSign:'IBAR8', flag:'IT', type:'Cargo', gt:38400, year:2008, loa:189, beam:32, x:600, y:210, lat:37.51, lon:14.92, speed:13.1, course:248, navStatus:'UnderWay', risk:'high', flags:['Sanctions','PSC'] },
  { id: 6, name:'PACIFIC GLOW', imo:'9621034', mmsi:'372900000', callSign:'3FAB7', flag:'PA', type:'Tanker', gt:71200, year:2013, loa:268, beam:46, x:940, y:640, lat:22.21, lon:91.78, speed:22.1, course:115, navStatus:'UnderWay', risk:'med', flags:['Anomaly'] },
  { id: 7, name:'SOUTHERN MIST', imo:'9712909', mmsi:'311000000', callSign:'V7FG2', flag:'BZ', type:'Bulker', gt:88100, year:2010, loa:289, beam:45, x:1020, y:540, lat:-3.14, lon:80.5, speed:12.0, course:90, navStatus:'UnderWay', risk:'med', flags:['News'] },
  { id: 8, name:'ATLANTIC PRIDE', imo:'9612400', mmsi:'248000000', callSign:'9HZN8', flag:'MT', type:'Container', gt:49800, year:2010, loa:299, beam:38, x:340, y:640, lat:39.4, lon:-9.1, speed:18.4, course:200, navStatus:'UnderWay', risk:'low', flags:['Flag chg'] },
  { id: 9, name:'AURORA WIND', imo:'9744321', mmsi:'538003344', callSign:'9V5MQ', flag:'SG', type:'Tanker', gt:62100, year:2013, loa:244, beam:42, x:760, y:560, lat:5.6, lon:99.4, speed:13.6, course:280, navStatus:'UnderWay', risk:null, flags:[] },
  { id:10, name:'POLARIS LIGHT', imo:'9821400', mmsi:'257800100', callSign:'LADX5', flag:'NO', type:'LNG', gt:101000, year:2017, loa:295, beam:46, x:480, y:260, lat:60.3, lon:5.4, speed:0.0, course:0, navStatus:'AtAnchor', risk:null, flags:[] },
];

// Additional unflagged vessels scattered on the map for visual density
const EXTRA_VESSEL_DOTS = [
  [380,330,null],[450,400,'low'],[510,310,null],[640,330,null],
  [860,360,null],[950,260,null],[980,400,null],
  [300,560,null],[200,500,null],
  [440,580,null],[560,720,null],[700,610,null],[800,700,null],
  [1180,460,null],[1240,540,null],[1180,620,null],[1080,720,null],[1280,700,null],
  [120,300,null],[160,360,null],[260,260,null],[1100,140,null],[1200,260,null],
  [480,440,null],[620,460,null],[760,420,null],[920,460,null],[1080,460,null],
  [380,520,null],[520,540,null],[660,540,null],[820,440,null],[1000,480,null],
];

const ENTITIES = [
  { id:1, name:'Aurora Shipping Ltd', type:'Owner', country:'SG', externalId:'201823491N', sanctioned:true, vessels:[1,2], lists:['OpenSanctions','OFAC SDN'], confidence:0.94 },
  { id:2, name:'Aurora Mgmt SG', type:'Manager', country:'SG', externalId:'M-04412', sanctioned:false, vessels:[1] },
  { id:3, name:'Sea-Bunkers DMCC', type:'Operator', country:'AE', externalId:'DMCC-2231', sanctioned:true, vessels:[1], lists:['EU Consolidated'], confidence:0.88 },
  { id:4, name:'Polaris Holdings BV', type:'Parent', country:'NL', externalId:'NL-77131', sanctioned:true, vessels:[], lists:['OpenSanctions'], confidence:0.79 },
];

const RISK_FLAGS = [
  { id:4821, severity:'crit', type:'Sanctions', summary:'MV NORTHERN STAR matched OFAC SDN', subject:{kind:'vessel',id:1}, ev:'#4821', when:'2h ago' },
  { id:4815, severity:'crit', type:'Dark AIS', summary:'12h gap in AIS over Persian Gulf', subject:{kind:'vessel',id:2}, ev:'#4815', when:'5h ago' },
  { id:4790, severity:'crit', type:'Sanctions', summary:'Owner Aurora Shipping → EU consolidated list', subject:{kind:'entity',id:1}, ev:'#4790', when:'16h ago' },
  { id:4799, severity:'high', type:'News', summary:'Reuters: detained at Singapore PSC', subject:{kind:'vessel',id:3}, ev:'#4799', when:'11h ago' },
  { id:4791, severity:'high', type:'Geofence', summary:'Entered HRA off Yemen coast', subject:{kind:'vessel',id:4}, ev:'#4791', when:'14h ago' },
  { id:4787, severity:'high', type:'Port-state', summary:'3 detentions in last 12 months', subject:{kind:'vessel',id:5}, ev:'#4787', when:'18h ago' },
  { id:4772, severity:'med', type:'News', summary:'Mentioned in sanctions evasion report', subject:{kind:'vessel',id:7}, ev:'#4772', when:'1d ago' },
  { id:4760, severity:'med', type:'Anomaly', summary:'Speed anomaly · 22 kn in port approach lane', subject:{kind:'vessel',id:6}, ev:'#4760', when:'2d ago' },
  { id:4720, severity:'low', type:'Flag change', summary:'Re-flagged Liberia → Malta', subject:{kind:'vessel',id:8}, ev:'#4720', when:'3w ago' },
];

const PORTS = [
  { code:'NLRTM', name:'Rotterdam', country:'NL', inPort:38, due:12 },
  { code:'SGSIN', name:'Singapore', country:'SG', inPort:31, due:9 },
  { code:'CNSHA', name:'Shanghai', country:'CN', inPort:24, due:6 },
  { code:'EGSUZ', name:'Suez Canal', country:'EG', inPort:18, due:4, state:'Transit' },
  { code:'INBOM', name:'Mumbai', country:'IN', inPort:12, due:3 },
  { code:'NGLOS', name:'Lagos', country:'NG', inPort:8, due:2 },
  { code:'BEANR', name:'Antwerp', country:'BE', inPort:16, due:5 },
  { code:'DEHAM', name:'Hamburg', country:'DE', inPort:14, due:4 },
];

const NEWS = [
  { id:1, title:'Sanctions evasion ring tied to Singapore-flagged tankers', source:'Reuters Maritime', when:'2h ago', linked:['NORTHERN STAR','Aurora Shipping'], risk:'high' },
  { id:2, title:'MV BLUE HORIZON detained at Fujairah for inspection', source:'TradeWinds', when:'5h ago', linked:['BLUE HORIZON'], risk:'high' },
  { id:3, title:'Port of Rotterdam reports record-low transit times', source:'Reuters Maritime', when:'9h ago', linked:['Rotterdam'] },
  { id:4, title:"Lloyd's reports surge in HRA crossings near Bab-el-Mandeb", source:"Lloyd's List", when:'14h ago', linked:['KAVALA'], risk:'med' },
  { id:5, title:'New OFAC additions target Iranian shadow fleet operators', source:'Splash 247', when:'1d ago', linked:['Aurora Shipping','Polaris Holdings'], risk:'crit' },
  { id:6, title:'Singapore PSC announces tightened tanker inspection regime', source:'Maritime Exec', when:'1d ago', linked:[] },
];

const SANCTIONS = [
  { name:'Aurora Shipping Ltd', kind:'entity', subjectId:1, meta:'Owner · Singapore', sources:'OpenSanctions, OFAC SDN', conf:'0.94', when:'2h ago', ev:'#4790' },
  { name:'MV NORTHERN STAR', kind:'vessel', subjectId:1, meta:'Tanker · IMO 9876543', sources:'OFAC SDN', conf:'0.91', when:'4h ago', ev:'#4821' },
  { name:'Sea-Bunkers DMCC', kind:'entity', subjectId:3, meta:'Operator · UAE', sources:'EU Consolidated', conf:'0.88', when:'11h ago', ev:'#4760' },
  { name:'MV BLUE HORIZON', kind:'vessel', subjectId:2, meta:'Bulker · IMO 9712384', sources:'UK HM Treasury', conf:'0.85', when:'1d ago', ev:'#4815' },
  { name:'Polaris Holdings BV', kind:'entity', subjectId:4, meta:'Parent · Netherlands', sources:'OpenSanctions', conf:'0.79', when:'1d ago', ev:'#4720' },
];

const TABLE_COUNTS = {
  vessels: 12481, entities: 3902, risk_flags: 77, evidence_observations: 41209, vessel_events: 8114, port_calls: 1889,
};

const SOURCES = [
  { name:'OCEANS-X positions', health:'ok', last:'12s ago' },
  { name:'OpenSanctions API', health:'ok', last:'3h ago · 87% quota' },
  { name:'RSS · Reuters Maritime', health:'stale', last:'9h ago' },
  { name:'RSS · TradeWinds', health:'ok', last:'42m ago' },
  { name:'Geo layers', health:'ok', last:'1d ago' },
  { name:'Port activity (arrive)', health:'fail', last:'retry × 2' },
];

const JOBS = [
  { id:'#J2341', type:'positions-snapshot', status:'running', mode:'live', start:'08:32:01', end:'—' },
  { id:'#J2340', type:'sanctions', status:'success', mode:'live', start:'08:00:11', end:'08:00:42' },
  { id:'#J2339', type:'news', status:'success', mode:'live', start:'07:40:00', end:'07:40:22' },
  { id:'#J2338', type:'port-activity', status:'failure', mode:'due-arrive', start:'07:31:00', end:'07:31:01' },
  { id:'#J2337', type:'risk/recompute', status:'success', mode:'—', start:'06:00:00', end:'06:00:18' },
];

const LOGS = [
  ['INFO','08:32:17','positions: ingested 247 vessels (delta +12)'],
  ['WARN','08:31:48','sanctions: quota approaching limit (87%)'],
  ['ERROR','08:30:12','port-activity due-arrive: upstream 502'],
  ['INFO','08:30:01','risk: 14 flags recomputed, 3 new'],
  ['INFO','08:29:44','news: 12 articles indexed from 6 feeds'],
  ['INFO','08:28:11','geo layers: cache hit (TTL 86400s)'],
];

const findVessel = (id) => VESSELS.find(v => v.id === id) || null;
const findEntity = (id) => ENTITIES.find(e => e.id === id) || null;
const vesselRiskFlags = (id) => RISK_FLAGS.filter(f => f.subject.kind === 'vessel' && f.subject.id === id);
const entityRiskFlags = (id) => RISK_FLAGS.filter(f => f.subject.kind === 'entity' && f.subject.id === id);

Object.assign(window, {
  VESSELS, EXTRA_VESSEL_DOTS, ENTITIES, RISK_FLAGS, PORTS, NEWS, SANCTIONS,
  TABLE_COUNTS, SOURCES, JOBS, LOGS,
  findVessel, findEntity, vesselRiskFlags, entityRiskFlags,
});
