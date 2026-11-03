// journey/journey.js · the drawn journey at the top of the page (from mockups/7-drawn-opening-fixes.html).
// A desk, the court drawn on its screen, then one model the camera travels along as the reader scrolls #journey.
// The page around it (header, projects, CV, contact) is plain HTML in index.html; ?nogl or a failure here shows the text version.
async function start(){
const THREE=await import('three');
const {RoundedBoxGeometry}=await import('three/addons/geometries/RoundedBoxGeometry.js');
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#film'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7)); renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xebe8de);scene.fog=new THREE.FogExp2(0xebe8de,.031);
const camera=new THREE.PerspectiveCamera(33,1,.025,120);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const color={paper:0xf8f4e9,ink:0x3e423f,grey:0xb7b3a9,steel:0x989b96,orange:0xd95726,wood:0xc4ac8a};
const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.81});
function mesh(parent,geometry,c,x,y,z){const obj=new THREE.Mesh(geometry,c.isMaterial?c:material(c));obj.position.set(x,y,z);obj.castShadow=obj.receiveShadow=true;parent.add(obj);return obj}
function box(p,w,h,d,c,x,y,z,r=0){return mesh(p,r?new RoundedBoxGeometry(w,h,d,2,r):new THREE.BoxGeometry(w,h,d),c,x,y,z)}
function group(p,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g}
function rod(p,a,b,r,c){const delta=b.clone().sub(a);const m=mesh(p,new THREE.CylinderGeometry(r,r,delta.length(),8),c,0,0,0);m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return m}
const floor=box(scene,190,.12,160,0xe6e1d4,0,-.08,0);
const sky=new THREE.HemisphereLight(0xfffaf1,0xbdb29f,2.1);scene.add(sky);
const sun=new THREE.DirectionalLight(0xfff1dc,2.8);sun.position.set(-9,15,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:16,bottom:-16});sun.shadow.normalBias=.012;scene.add(sun);
const desk=group(scene,0,0,-4.4);
box(desk,4.55,.12,1.75,color.wood,0,1,0,.035);
for(const x of [-2.08,2.08])for(const z of [-.70,.70])box(desk,.09,1,.09,color.steel,x,.5,z);
box(desk,1.18,.04,.35,color.ink,-.12,1.085,.48,.025);
for(let row=0;row<3;row++)for(let col=0;col<12;col++)box(desk,.066,.014,.059,color.grey,-.62+col*.09,1.109,.39+row*.09);
box(desk,.18,.069,.27,color.grey,.77,1.09,.47,.035);
const monitor=group(desk,0,1.07,-.12);
box(monitor,1.3,.055,.53,color.steel,0,.04,0,.02);box(monitor,.13,.55,.1,color.steel,0,.29,-.04);
box(monitor,3.2,1.84,.09,color.ink,0,1.32,0,.035);
const courtCanvas=document.createElement('canvas');courtCanvas.width=2048;courtCanvas.height=1152;
const court=courtCanvas.getContext('2d');court.scale(2,2);court.lineCap='round';
const courtLines=[[65,63,959,63],[959,63,959,513],[65,513,65,63],[355,63,355,513],[512,63,512,513],[669,63,669,513],[65,513,959,513]];
// The court draws itself on the screen line by line; the orange baseline comes last.
function drawCourt(p){
  court.fillStyle='#e8e3d6';court.fillRect(0,0,1024,576);
  courtLines.forEach(([x1,y1,x2,y2],i)=>{
    const t=Math.min(1,Math.max(0,p*courtLines.length-i));if(!t)return;
    const last=i===courtLines.length-1;court.strokeStyle=last?'#d95824':'#77756d';court.lineWidth=last?8:4;
    court.beginPath();court.moveTo(x1,y1);court.lineTo(x1+(x2-x1)*t,y1+(y2-y1)*t);court.stroke();
  });
  map.needsUpdate=true;
}
const map=new THREE.CanvasTexture(courtCanvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=renderer.capabilities.getMaxAnisotropy();
// The screen shows its own light, so it skips tone mapping and stays crisp and true to colour.
const screenMat=new THREE.MeshBasicMaterial({map,toneMapped:false});
mesh(monitor,new THREE.PlaneGeometry(3.08,1.73),screenMat,0,1.32,.051);
function screenCard(lines,ending=false){
  const card=printSurface(monitor,3.08,1.73,0,1.32,.055,(ctx,w,h)=>{
    ctx.fillStyle='#f5f1e7';ctx.fillRect(0,0,w,h);ctx.textAlign='center';
    ctx.fillStyle='#924426';ctx.font='25px monospace';ctx.fillText('FLORIAN HABERHAUER',w/2,h*.20);
    ctx.fillStyle='#282b27';ctx.font='44px Georgia';
    lines.forEach((line,i)=>ctx.fillText(line,w/2,h*(.39+i*.14)));
    if(ending){ctx.fillStyle='#c45c32';ctx.fillRect(w*.45,h*.75,w*.1,3)}
  },3);
  card.material.toneMapped=false;return card;
}
const welcome=screenCard(['Before the numbers.']);
const invitation=screenCard(['Are you ready to be','part of my journey?'],true);invitation.material.transparent=true;
const smooth=x=>THREE.MathUtils.smoothstep(x,0,1);
const progress=(s,a,b)=>smooth((s-a)/(b-a));
const sheetGeo=new THREE.PlaneGeometry(1,1,1,56);const sheetMat=material(color.paper);sheetMat.map=map;sheetMat.side=THREE.DoubleSide;
const sheet=mesh(scene,sheetGeo,sheetMat,0,0,0);sheet.frustumCulled=false;
const coords=sheetGeo.attributes.position,uv=sheetGeo.attributes.uv;
function unroll(t){sheet.visible=t>.002;for(let i=0;i<coords.count;i++){const along=(1-uv.getY(i))*t;const turn=Math.min(1,along/.17);const width=3.08+5.8*smooth(Math.min(1,along/.48));coords.setXYZ(i,(uv.getX(i)-.5)*width,.022+1.50*(1-smooth((along-.12)/.24)),-4.464+along*8.02)}coords.needsUpdate=true;sheetGeo.computeVertexNormals()}
const net=group(scene,0,.025,-.5);
for(const z of [-2.8,2.8])rod(net,V(0,0,z),V(0,1.85,z),.028,color.steel);
for(let j=0;j<=7;j++)rod(net,V(0,1.03+j*.105,-2.8),V(0,1.03+j*.105,2.8),j===7?.018:.006,color.ink);
for(let j=0;j<=35;j++)rod(net,V(0,1.03,-2.8+j*.16),V(0,1.765,-2.8+j*.16),.004,color.ink);
const ORANGE=color.orange; const cache=new Map(); function gk(key,build){if(!cache.has(key))cache.set(key,build());return cache.get(key)}
const rbox=(w,h,d,r)=>gk([w,h,d,r].join(),()=>new RoundedBoxGeometry(w,h,d,2,r));
const FIGM = { orange: new THREE.MeshStandardMaterial({ color: ORANGE, roughness: .55 }), white: new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: .7 }), hair: new THREE.MeshStandardMaterial({ color: 0xcdcac3, roughness: .8 }) };
const FS = .8;   // figures at 80 %, about 1.45 m: a court with twelve players still fits
function figure(col = 'white') {
  const m = FIGM[col], mine = col === 'orange', root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(FS);
  const part = (p, w, h, d, r, x, y, z) => { const o = new THREE.Mesh(rbox(w, h, d, r), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
  const limb = (w, h, d, x, y) => { const j = new THREE.Group(); j.position.set(x, y, 0); body.add(j); part(j, w, h, d, Math.min(w, d) * .45, 0, -h / 2, 0); return j; };
  const ll = limb(.2, .56, .24, .13, .6), rl = limb(.2, .56, .24, -.13, .6); [ll, rl].forEach(l => part(l, .22, .1, .3, .04, 0, -.55, .03));
  const la = limb(.15, .52, .17, .36, 1.18), ra = limb(.15, .52, .17, -.36, 1.18);
  [la, ra].forEach(a => { const h = new THREE.Mesh(gk('hand', () => new THREE.SphereGeometry(.08, 12, 10)), m); h.position.y = -.56; h.castShadow = true; a.add(h); });
  part(body, .58, .64, .34, .12, 0, .9, 0); if (mine) part(body, .46, .2, .16, .07, 0, 1.2, -.17);
  const head = new THREE.Group(); head.position.y = 1.22; body.add(head);
  const hd = new THREE.Mesh(gk('fhead', () => new THREE.SphereGeometry(.3, 24, 18)), m); hd.position.y = .3; hd.castShadow = true; head.add(hd);
  const hair = new THREE.Mesh(gk('fhair', () => new THREE.SphereGeometry(.315, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.15)), mine ? m : FIGM.hair); hair.position.set(0, .35, -.03); hair.rotation.x = -.15; hair.castShadow = true; head.add(hair);
  if (mine) { [-.11, .11].forEach(x => part(head, .16, .11, .03, .025, x, .31, .285)); part(head, .07, .02, .02, .008, 0, .33, .3); }
  const f = { root, body, head, la, ra, ll, rl }; pose(f, P.stand); return f;
}
const P = {
  stand: {},
  walk: ph => ({ llx: Math.sin(ph) * .55, rlx: -Math.sin(ph) * .55, lax: -Math.sin(ph) * .55, rax: Math.sin(ph) * .55 }),
  ready: { spine: .18, lax: -.7, rax: -.7, laz: .1, raz: .1, head: -.2 },
  hit: { lax: -2.9, rax: -2.9, laz: .14, raz: .14, head: -.3 },
  sit: { y: .03, llx: -1.5, rlx: -1.5 },
  type: { y: .03, llx: -1.5, rlx: -1.5, spine: .06, lax: -1.15, rax: -1.15, laz: .1, raz: .1 },
  cheer: { laz: 2.6, raz: 2.6, head: -.2 },
  present: { rax: -1.6, raz: .15, look: .2 },
  hold: { lax: -1.0, rax: -1.0, laz: .12, raz: .12, head: .25 },
  lookup: { head: -.45 },
  wave: ph => ({ raz: 2.75 + Math.sin(ph) * .25 }),
};
function pose(f, p) { const g = k => p[k] || 0;
  f.body.position.y = g('y'); f.root.rotation.x = g('lie'); f.body.rotation.x = g('spine'); f.head.rotation.set(g('head'), g('look'), 0);
  f.la.rotation.set(g('lax'), 0, g('laz')); f.ra.rotation.set(g('rax'), 0, -g('raz')); f.ll.rotation.x = g('llx'); f.rl.rotation.x = g('rlx'); }
const players=[];for(const side of [-1,1])for(const [x,z] of [[1,-1.2],[1,.8],[2.8,-1],[2.7,1.25]]){const hero=side===1&&x===1&&z===.8;const f=figure(hero?'orange':'white');scene.add(f.root);players.push({f,x:x*side,z,side,hero})}
const protagonist=players.find(a=>a.hero).f;
// Only the player under the ball jumps for it; the rest hold their ready stance.
for(const side of [-1,1]){const hx=side*2.45,hz=.26+.55*side,d=a=>(a.x-hx)**2+(a.z-hz)**2;players.filter(a=>a.side===side).sort((a,b)=>d(a)-d(b))[0].jumper=true}
const ball=mesh(scene,new THREE.SphereGeometry(.15,32,24),color.paper,0,0,0);
for(const angle of [-.7,.7,1.55]){const seam=mesh(ball,new THREE.TorusGeometry(.149,.002,6,48),color.grey,0,0,0);seam.rotation.set(.5,angle,.55)}
const bench=group(scene,2.5,0,2.95);for(let i=0;i<3;i++)box(bench,2.15,.06,.13,color.wood,0,.48,(i-1)*.15,.016);
for(const x of [-.83,.83])box(bench,.065,.48,.42,color.steel,x,.24,0);
const dealer=group(scene,11,0,0);
box(dealer,5,.12,3,color.grey,-1,.07,-2);box(dealer,5.2,.15,3.2,color.paper,-1,2.45,-2);
box(dealer,5,2.3,.12,color.paper,-1,1.22,-3.4);for(const x of [-3.4,1.4])box(dealer,.09,2.3,.09,color.steel,x,1.22,-.55);
const car=group(dealer,-1,.13,-1.8);box(car,2.5,.44,1.12,color.paper,0,.45,0,.14);box(car,1.38,.4,.99,color.grey,-.1,.78,0,.12);
for(const x of [-.8,.8])for(const z of [-.53,.53]){const wheel=mesh(car,new THREE.CylinderGeometry(.235,.235,.14,24),color.ink,x,.25,z);wheel.rotation.x=Math.PI/2}
const counter=group(dealer,0,0,1.65);box(counter,1.85,.76,.75,color.wood,0,.38,0,.025);box(counter,2,.085,.85,color.paper,0,.80,0,.025);
const keys=group(counter,.17,.855,.09);keys.rotation.y=-.5;
const ring=mesh(keys,new THREE.TorusGeometry(.083,.011,8,40),color.steel,0,.013,0);ring.rotation.x=Math.PI/2;
const fob=box(keys,.14,.029,.235,0x695746,.026,.017,-.165,.014);fob.rotation.y=-.21;
const key=group(keys,.085,.015,-.015);key.rotation.y=-.7;box(key,.085,.024,.114,color.ink,0,0,0,.009);box(key,.03,.015,.13,color.steel,0,0,.104);
for(let i=0;i<3;i++)box(key,.023,.014,.011,color.steel,.016,0,.08+i*.027);
const alpine=group(dealer,4.7,0,-5.1);
for(const [x,z,h,r] of [[-2,-2,3.3,2.3],[1,-3,4.8,3],[3.2,-2.7,3.4,2]]){const peak=mesh(alpine,new THREE.ConeGeometry(r,h,5),0xd7d5c7,x,h/2,z);peak.rotation.y=x}
box(alpine,2.7,1.18,1.1,color.paper,0,.59,.3);box(alpine,2.85,.1,1.2,color.grey,0,1.2,.3);for(let i=0;i<7;i++)box(alpine,.19,.43,.03,color.steel,-1.05+i*.35,.71,.865);
const path=new THREE.CatmullRomCurve3([V(10,.016,2.85),V(12.3,.016,2.15),V(13.4,.016,.2),V(15.5,.016,-3.4)]);
const route=mesh(scene,new THREE.TubeGeometry(path,64,.015,6,false),color.orange,0,0,0);
// The same desk changes jobs: a campaign print, a pile of reports, then one daily refresh.
// sharp: extra canvas resolution for surfaces the camera gets close to, like the monitor.
function printSurface(parent,w,h,x,y,z,paint,sharp=1) {
  const canvas=document.createElement('canvas');
  canvas.width=768*sharp; canvas.height=Math.round(768*sharp*h/w);
  const ctx=canvas.getContext('2d');ctx.scale(sharp,sharp);
  paint(ctx,768,Math.round(768*h/w));
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return mesh(parent,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}),x,y,z);
}
function worktable(parent,x,z,width=2.4){
  const table=group(parent,x,0,z);
  box(table,width,.075,.99,color.wood,0,.85,0,.025);
  for(const end of [-1,1])box(table,.07,.82,.78,color.grey,end*(width/2-.12),.43,0);
  return table;
}
function reportPrint(ctx,w,h){
  ctx.fillStyle='#f6f3e8';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#3e443f';ctx.font='bold 57px Arial';ctx.fillText('Sales reporting',42,91);
  ctx.fillStyle='#b64d2b';ctx.fillRect(44,124,70,7);
  for(let i=0;i<6;i++){ctx.fillStyle='#d7d4c9';ctx.fillRect(44,164+i*36,w-94,3);ctx.fillStyle='#858c82';ctx.fillRect(44,176+i*36,85+(i*37)%160,5);}
}
const studio=group(scene,21,0,-3);
const table=worktable(studio,0,0,3.6);
const board=group(studio,-2.5,0,-1.05);board.rotation.y=.15;
box(board,.07,1.96,.10,color.wood,0,.98,0);
box(board,1.48,1.81,.09,color.paper,0,1.65,0);
printSurface(board,1.4,1.73,0,1.65,.05,(ctx,w,h)=>{
  ctx.fillStyle='#d2ccc0';ctx.fillRect(0,0,w,h);ctx.fillStyle='#42443e';ctx.font='38px Georgia';ctx.fillText('Silhouette',55,90);
  ctx.strokeStyle='#55584e';ctx.lineWidth=12;
  for(const x of [w*.29,w*.71]){ctx.beginPath();ctx.ellipse(x,h*.5,w*.17,h*.092,-.12,0,Math.PI*2);ctx.stroke()}
  ctx.beginPath();ctx.moveTo(w*.46,h*.49);ctx.quadraticCurveTo(w*.5,h*.46,w*.54,h*.49);ctx.stroke();
});
const papers=group(table,-.97,.89,.13);
for(let i=0;i<18;i++){const leaf=box(papers,.68,.019,.49,i%3?color.paper:color.grey,0,i*.021,0);leaf.rotation.y=.045*Math.sin(i)}
const topSheet=printSurface(papers,.67,.48,0,.371,0,reportPrint);topSheet.rotation.x=-Math.PI/2;
box(table,.54,.035,.27,color.grey,.69,.91,-.2);
box(table,.075,.36,.06,color.steel,.69,1.08,-.24);
box(table,1.18,.75,.06,color.ink,.69,1.52,-.23,.025);
printSurface(table,1.1,.68,.69,1.52,-.195,reportPrint);
const daily=printSurface(table,1.1,.68,.69,1.52,-.19,(ctx,w,h)=>{
  ctx.fillStyle='#e9eee5';ctx.fillRect(0,0,w,h);ctx.fillStyle='#414a40';ctx.font='30px monospace';ctx.fillText('SALES REPORT',44,73);
  ctx.font='94px Georgia';ctx.fillText('Updated',42,214);ctx.fillStyle='#a64725';ctx.font='34px Arial';ctx.fillText('Daily refresh',44,305);
});
box(table,.64,.035,.22,color.grey,.69,.91,.2,.015);
const rollout=group(studio,2.55,0,-1.3);
box(rollout,.085,1.65,.08,color.wood,0,.825,-.08);
box(rollout,2.14,1.16,.065,color.paper,0,1.6,0,.018);
function rolloutFace(title,lines,z){
  return printSurface(rollout,2.06,1.08,0,1.6,z,(ctx,w,h)=>{
    ctx.fillStyle='#f3eee1';ctx.fillRect(0,0,w,h);ctx.fillStyle='#915033';ctx.font='30px monospace';ctx.fillText('SALESFORCE',34,58);
    ctx.fillStyle='#313830';ctx.font='50px Georgia';ctx.fillText(title,32,140);
    ctx.font='34px Arial';lines.forEach((line,i)=>ctx.fillText(line,37,228+i*63));
  });
}
rolloutFace('Testing the rollout',['Requirements','User acceptance testing'],.036);
const leadBoard=rolloutFace('Owning delivery',['Service Cloud  /  Marketing Cloud','Testing, launch and adoption'],.041);
// The name card in front of the reports flips from intern to data analyst.
const promo=group(table,-.55,.89,.43);
box(promo,.34,.02,.07,color.wood,0,.01,0,.008);
const promoCard=group(promo,0,.105,0);
box(promoCard,.62,.16,.012,color.paper,0,0,0);
printSurface(promoCard,.6,.15,0,0,.007,(ctx,w,h)=>{
  ctx.fillStyle='#f6f3e8';ctx.fillRect(0,0,w,h);ctx.textAlign='center';
  ctx.fillStyle='#7b7a71';ctx.font='22px monospace';ctx.fillText('DIGITAL BUSINESS',w/2,52);
  ctx.fillStyle='#3e443f';ctx.font='64px Georgia';ctx.fillText('Intern',w/2,140);
});
printSurface(promoCard,.6,.15,0,0,-.007,(ctx,w,h)=>{
  ctx.fillStyle='#c95b2d';ctx.fillRect(0,0,w,h);ctx.textAlign='center';
  ctx.fillStyle='#fbe9dc';ctx.font='22px monospace';ctx.fillText('CONSUMER & DIGITAL BUSINESS',w/2,52);
  ctx.fillStyle='#fff';ctx.font='64px Georgia';ctx.fillText('Data Analyst',w/2,140);
}).rotation.y=Math.PI;
// One Barcelona street in a locked shot: the day desk and the evening classroom face the same pavement.
const city=group(scene,26,0,-12);
box(city,8.4,.07,4.2,0xd5cabc,0,.015,0);
const facade=group(city,-2.6,0,-1.25);
box(facade,2.55,3.1,.8,0xd3c2aa,0,1.55,0);
for(let row=0;row<2;row++)for(const x of [-.78,0,.78]){
  const y=.94+row*1.35;
  box(facade,.43,.85,.055,color.ink,x,y,.42);box(facade,.65,.06,.35,color.paper,x,y-.42,.51);
  for(const dx of [-.24,0,.24])box(facade,.022,.21,.024,color.grey,x+dx,y-.3,.655);
  box(facade,.55,.024,.026,color.grey,x,y-.2,.655);
}
const campus=group(city,2.07,0,-1);
box(campus,3.25,2.25,.12,color.paper,0,1.125,-.68);
box(campus,3.45,.14,1.53,color.paper,0,2.24,0);
for(const x of [-1.56,1.56])box(campus,.09,2.2,1.46,color.grey,x,1.1,0);
const windowLight=material(0xeee7d4);windowLight.emissive.setHex(0xffbf79);
box(campus,2.92,1.62,.04,windowLight,0,1.17,-.60);
printSurface(campus,2.38,.31,0,2.13,.78,(ctx,w,h)=>{ctx.fillStyle='#f3ecde';ctx.fillRect(0,0,w,h);ctx.fillStyle='#3f423b';ctx.font='44px Arial';ctx.fillText('EAE BUSINESS SCHOOL',65,65)});
const classDesk=worktable(campus,0,.05,2);const cafe=worktable(city,-2.1,.55,1.45);
function laptop(table,x=0){
  box(table,.6,.025,.39,color.steel,x,.90,.03,.01);
  box(table,.6,.37,.03,color.ink,x,1.09,-.14,.009);
  printSurface(table,.55,.32,x,1.09,-.123,reportPrint);
}
laptop(classDesk);laptop(cafe);
const seat=(parent,x,z)=>{box(parent,.43,.06,.45,color.wood,x,.46,z);box(parent,.08,.44,.08,color.grey,x,.22,z)};
seat(city,-2.1,1.27);seat(campus,0,.7);
// At home, the three kinds of personal work share one desk.
const workshop=group(scene,17,0,-16);
const lastTable=worktable(workshop,0,0,3.1);
seat(workshop,0,.68);
box(workshop,.48,.46,.055,color.wood,0,.69,.91,.025);
const projectPrints=[
  ['APPS',['Porchlight','Marginalia'],0xb96139],
  ['PLUGINS',['sprintkit','refine / build / review'],0x668176],
  ['ANALYSIS',['KlimaTicket','Barcelona rent cap'],0x727b98]
];
box(lastTable,.69,.032,.32,color.grey,0,.907,.19,.013);
box(lastTable,1.78,.87,.055,color.ink,0,1.40,-.24,.025);
projectPrints.forEach(([label,items,tint],i)=>{
  printSurface(lastTable,.552,.78,(i-1)*.57,1.40,-.208,(ctx,w,h)=>{
    ctx.fillStyle='#eee9dd';ctx.fillRect(0,0,w,h);ctx.fillStyle='#313830';ctx.font='bold 85px monospace';ctx.fillText(label,36,144);
    ctx.fillStyle='#'+tint.toString(16);ctx.fillRect(40,210,w-80,14);
    ctx.lineWidth=13;ctx.strokeStyle=ctx.fillStyle;
    if(i===0){ctx.strokeRect(270,325,205,330);ctx.fillRect(320,560,100,16)}
    if(i===1){ctx.font='140px monospace';ctx.fillText('>_',230,545)}
    if(i===2){ctx.beginPath();ctx.moveTo(112,597);ctx.lineTo(271,497);ctx.lineTo(424,549);ctx.lineTo(625,336);ctx.stroke()}
    ctx.fillStyle='#363831';ctx.font='53px Arial';items.forEach((item,n)=>ctx.fillText(item,36,817+n*75,w-72));
  });
});
// Each sheet takes the same journey from a manual report to its place in the daily screen.
const paperLeaves=papers.children.slice(0,-1);
function automateReports(s){
  paperLeaves.forEach((leaf,i)=>{
    const delay=(paperLeaves.length-1-i)*.013;
    const t=progress(s,6.66+delay,7.11+delay);
    leaf.visible=t<1;
    leaf.position.set(t*1.66,i*.021*(1-t)+.64*t+Math.sin(Math.PI*t)*.85,.13*Math.sin(Math.PI*t)-.30*t);
    leaf.rotation.set(-t*Math.PI/2,.045*Math.sin(i)*(1-t),.3*Math.sin(Math.PI*t));
    leaf.scale.setScalar(1-t*.92);
  });
  topSheet.visible=s<6.71;
  daily.visible=s>=7.14;
}

const careerPoints=[
 [4.95,15.5,-3.4],[5.65,19.3,-1.95],[6.42,22.1,-1.95],[7.44,22.4,-1.95],
 // Round the right end of the table and stop beside the rollout board before Barcelona.
 [7.76,25.1,-3.0],[8.44,23.9,-10.73],[9.29,28.07,-12.3],[10.45,17.05,-14.97]
];
const trail=group(scene);
for(let i=1;i<careerPoints.length;i++){
  const [,x,z]=careerPoints[i-1],[,nx,nz]=careerPoints[i];
  const section=group(trail,x,.064,z), delta=V(nx-x,0,nz-z);
  section.rotation.y=Math.atan2(delta.x,delta.z);
  box(section,.033,.01,delta.length(),color.orange,0,0,delta.length()/2);
}
// In the last pullback, the orange line runs out of the screen through the whole model, then winds back into it.
// Its shape remembers a rally, the turn at the keys, and the street crossed at night.
const memoryPath=new THREE.CatmullRomCurve3([
  V(0,2.39,-4.4),V(-.9,1.6,-3.2),V(-2.8,.08,-1.6),V(-1.4,1.5,-.4),V(.1,2.55,.3),V(2.05,.18,3.48),
  V(6,.065,3.2),V(10,.065,2.85),V(13.4,.07,.2),V(15.5,.07,-3.4),
  V(18,.08,-2.0),V(21.6,1.55,-3.18),V(23,.08,-5.2),
  V(23.9,.08,-10.73),V(26,.09,-10.6),V(28.07,.12,-12.3),
  V(26,.1,-14.6),V(20,.12,-15.1),V(18.45,1.34,-15.35)
]);
const memorySegments=220;
const memoryLine=mesh(scene,new THREE.TubeGeometry(memoryPath,memorySegments,.046,6,false),
  new THREE.MeshBasicMaterial({color:0xc95b2d}),0,0,0);
const lightTip=mesh(scene,new THREE.SphereGeometry(.13,16,10),
  new THREE.MeshBasicMaterial({color:0xffb566}),0,0,0);
// Where each scene sits along the line, so the returning tip can fold them flat in order.
const linePoints=memoryPath.getSpacedPoints(400);
function lineAt(x,z){let best=0,dist=Infinity;linePoints.forEach((p,i)=>{const d=(p.x-x)**2+(p.z-z)**2;if(d<dist){dist=d;best=i}});return best/400}
const foldAt={court:lineAt(0,-.5),bench:lineAt(2.5,2.95),dealer:lineAt(11,1),studio:lineAt(21,-3),city:lineAt(26,-12),workshop:lineAt(17,-16),
  trail:careerPoints.slice(1).map(([,x,z],i)=>lineAt((x+careerPoints[i][1])/2,(z+careerPoints[i][2])/2))};
const lineBack=s=>progress(s,12.95,13.5);
function recallJourney(s){
  const back=lineBack(s);
  const drawn=back>0?1-back:progress(s,11.88,12.77);
  memoryLine.visible=drawn>0;
  memoryLine.geometry.setDrawRange(0,Math.floor(drawn*memorySegments)*36);
  lightTip.visible=drawn>0&&(drawn<1||back>0);
  if(lightTip.visible)memoryPath.getPointAt(drawn,lightTip.position);
}
const daylight=new THREE.Color(0xebe8de), dusk=new THREE.Color(0x8f969f);
function updateCareer(s,time){
  for(const [place,from,to] of [[studio,4.99,5.55],[city,7.72,8.37],[workshop,9.57,10.34]]){
    place.visible=s>from;
    place.scale.y=Math.max(.001,progress(s,from,to));
  }
  automateReports(s);
  leadBoard.visible=s>=7.55;

  recallJourney(s);
  // The far side of the street opens like the second page of a book.
  campus.rotation.x=-(1-progress(s,8.48,9.02))*Math.PI/2;
  campus.visible=s>=8.48;
  facade.rotation.x=-(1-progress(s,7.79,8.31))*.95;
  const night=progress(s,8.52,9.18)*(1-progress(s,9.48,10.26));
  scene.background.copy(daylight).lerp(dusk,night);
  scene.fog.color.copy(scene.background);
  scene.fog.density=.031*(1-progress(s,10.7,11.7)*.95);
  sky.intensity=2.1-night*1.08;sun.intensity=2.8-night*2.26;windowLight.emissiveIntensity=.05+night*.97;
  let active=0;
  trail.children.forEach((section,i)=>{
    const t=progress(s,careerPoints[i][0],careerPoints[i+1][0]);
    section.visible=t>0;section.scale.z=Math.max(.001,t);if(t>0)active=i;
  });
  if(s<=4.95)return;
  const [start,x,z]=careerPoints[active],[end,nx,nz]=careerPoints[active+1];
  const depart=[4.95,5.95,6.7,7.6,7.92,8.56,9.54][active];
  const t=progress(s,depart,end);
  protagonist.root.position.set(THREE.MathUtils.lerp(x,nx,t),0,THREE.MathUtils.lerp(z,nz,t));
  protagonist.root.rotation.y=Math.atan2(nx-x,nz-z);
  pose(protagonist,P.walk(t*Math.hypot(nx-x,nz-z)*5));
  const face=(angle,body)=>{protagonist.root.rotation.y=angle;pose(protagonist,body)};
  if(s>=5.5&&s<6.03)face(THREE.MathUtils.lerp(-2.52,1.55,progress(s,5.56,5.94)),P.stand);
  if(s>=7.27&&s<7.6)face(Math.PI,P.present);
  if(s>=7.76&&s<7.92)face(-2.27,P.present);
  if((s>=8.32&&s<8.55)||(s>=9.16&&s<9.53))face(Math.PI,P.type);
  if(s>=10.04){
    const sitDown=progress(s,10.04,10.5);
    protagonist.root.position.lerp(V(17,.01,-15.32),sitDown);
    face(Math.PI,{...P.type,lax:-1.16+.065*Math.sin(time*6),rax:-1.16-.065*Math.sin(time*6)});
  }
}

const captions=[
['PROLOGUE','Before the numbers.','My story starts on a volleyball court.','Enter the court'],
['2010–2018  /  VOLLEYBALL','I started at ten.','From age ten to the junior national team, volleyball gave my days their rhythm.','The last rally'],
['AGE 18  /  THE SIDELINE','Then the court went quiet.','At eighteen, my knee gave out. For the first time in eight years, I had to choose what came next.','The family business'],
['AMSTETTEN  /  THE DEALERSHIP','The keys could have been mine.','My family had run this dealership for sixty years. Taking it over was a future I could already picture.','My decision'],
['2020  /  KUFSTEIN','I left the keys.','I chose business school in Kufstein. There, I led my first two project teams.','Into Silhouette'],
['2023  /  DIGITAL BUSINESS INTERN','They trusted me with the numbers.','As an intern, I built the sales dashboards and forecasting models. I also set up the CRM data structure the team would use.','My first rollout'],
['2023–24  /  DIGITAL BUSINESS INTERN','I helped test what we were building.','On the Salesforce rollout, I helped gather requirements and test whether the system did what the business needed.','Becoming a data analyst'],
['2024  /  CONSUMER & DIGITAL BUSINESS DATA ANALYST','The reporting became mine.','I owned B2C sales and marketing reporting across markets. Senior stakeholders relied on the figures I delivered.','Automate the refresh','PROMOTED  ·  INTERN → DATA ANALYST'],
['2024  /  DATA ANALYST','I learned to automate the work.','With Python and Power Automate, I took the reports from weekly to daily and cut manual work by 90%.','Leading the rollout'],
['SILHOUETTE  /  SYSTEM OWNERSHIP','Now I was leading the rollout.','I led the business side of Service Cloud and Marketing Cloud, from requirements to adoption. I became technical owner of Service Cloud and B2C reporting.','Go to Barcelona'],
['2025–26  /  BARCELONA','A new city. Still a data analyst.','I continued as a Data Analyst at Silhouette, 25 hours a week. One assignment was to act as Scrum Master as we brought B2C fulfilment in-house.','Stay until evening'],
['2025–26  /  EAE BUSINESS SCHOOL','Each evening, I was a student again.','After work I studied Big Data & Analytics at EAE. A year later, I finished with a 9.23 out of 10 and a top grade for our thesis.','Back to my desk'],
['AFTER HOURS  /  APPS AND PLUGINS','Back at my desk, I build for myself.','I use AI coding tools to build iOS apps like Porchlight and Marginalia, and plugins like sprintkit.','My independent analysis'],
['AFTER HOURS  /  INDEPENDENT ANALYSIS','Some evenings start with a question.','Did Austria’s KlimaTicket change how people travelled? What happened to rents under Barcelona’s cap? I use public data to practise answering questions outside work.','Bring it all home'],
['YOUR MOVE','Are you ready to be part of my journey?','','Replay']
];
const stops=[0,1.45,2.65,3.7,4.95,5.57,5.99,6.55,7.36,7.78,8.44,9.31,10.49,11.45,14.25];
const cuts=[0,1.15,2.14,3.31,4.38,5.33,5.84,6.16,6.98,7.57,8.04,8.91,9.96,10.92,13.92];
const shots=[
[0,[0,2.39,.09],[0,2.39,-4.46]],
[.42,[0,2.50,.74],[0,2.39,-4.46]],
[1.15,[5.4,3.5,7.8],[0,.68,-.6]],
[1.6,[4.5,2.15,6.3],[0,1.2,-.22]],
[2.4,[3.75,1.53,7.35],[2.16,.63,2.66]],
[2.92,[3.75,1.53,7.35],[2.16,.63,2.66]],
[3.37,[11.63,1.50,3.95],[11.10,1.0,1.48]],
[3.68,[11.47,1.15,2.52],[11.17,.869,1.73]],
[4.25,[11.47,1.15,2.52],[11.17,.869,1.73]],
[4.95,[11.3,1.8,4.4],[13.4,.92,-.6]],
[5.56,[20.6,2.18,2.95],[19.5,1.14,-3.1]],
[5.99,[23.84,2.26,.36],[23.26,1.56,-4.21]],
[6.49,[19.7,2.6,.5],[20.25,.95,-2.8]],
[7.42,[19.3,3.5,2.6],[22.1,.95,-3.0]],
[7.78,[27.4,3.7,3.4],[24.2,1.0,-3.6]],
[8.38,[26.35,3.1,-2.9],[26,.99,-12.1]],
[9.5,[26.35,3.1,-2.9],[26,.99,-12.1]],
[10.49,[19.41,2.19,-12.91],[17.1,1.13,-15.76]],
[11.45,[18.72,1.98,-13.39],[17.13,1.32,-16.03]],
[12.32,[23.0,16.8,21.1],[13,.32,-6.1]],
[13.25,[23.0,16.8,21.1],[13,.32,-6.1]],
[13.6,[4.2,4.6,6.4],[0,1.4,-2.5]],
[14.0,[0,2.39,.09],[0,2.39,-4.46]],
[14.25,[0,2.39,.09],[0,2.39,-4.46]]
];
let reduced=matchMedia('(prefers-reduced-motion: reduce)'), current=-1;
const track=document.querySelector('#journey'),stage=track.querySelector('.stage');
const range=()=>Math.max(1,track.offsetHeight-innerHeight);
const play=document.querySelector('#screenPlay');
let locked=true, openedAt=performance.now(), timed=null;
history.scrollRestoration='manual';scrollTo(0,0);
const autoButton=document.querySelector('#auto');
let auto=false, captionAt=0;
function setAuto(on){auto=on;autoButton.textContent=on?'❚❚ Pause':'▶ Autoplay';autoButton.setAttribute('aria-pressed',on)}
function resetIntro(){
  timed=null;locked=true;openedAt=performance.now();setAuto(false);
  document.body.classList.add('intro');scrollTo(0,0);
}
function travel(from,to,duration){
  timed={from,to,duration,at:performance.now()};
}
function begin(){
  locked=false;play.hidden=true;document.body.classList.remove('intro');
  // Slow enough to watch the court draw itself on the screen and roll out onto the floor.
  travel(0,stops[1],reduced.matches?1:6000);
  document.querySelector('#advance').focus({preventScroll:true});
}
document.querySelector('#start').onclick=begin;
document.querySelector('#autoStart').onclick=()=>{setAuto(true);begin()};
autoButton.onclick=()=>setAuto(!auto);
// Scrolling, keys or a click on the scene take over from the camera; the control buttons do not.
function interruptTravel(e){if(e.target?.closest?.('button'))return;timed=null;setAuto(false)}
for(const event of ['wheel','touchstart','keydown','pointerdown'])addEventListener(event,interruptTravel,{passive:true});
// Autoplay moves take 1.3 s longer than a click on Next, since they carry the reading time.
function go(i,autoplay=false){
  if(i===0){resetIntro();return}
  const from=scrollY/range()*stops.at(-1);
  if(reduced.matches){scrollTo({top:range()*stops[i]/stops.at(-1),behavior:'instant'});return}
  travel(from,stops[i],i===stops.length-1?9000:(autoplay?2200:900)+Math.abs(stops[i]-from)*1000)}
// A link to the projects, CV or contact (in the URL or the header) skips the intro instead of being locked behind it.
function unlock(){locked=false;play.hidden=true;document.body.classList.remove('intro')}
addEventListener('click',e=>{const a=e.target.closest?.('a[href^="#"]');if(a&&locked&&a.getAttribute('href')!=='#journey')unlock()});
const deep=window.startHash&&window.startHash!=='#journey'&&document.getElementById(window.startHash.slice(1));
if(deep){unlock();requestAnimationFrame(()=>deep.scrollIntoView())}
document.querySelector('#advance').onclick=()=>go((current+1)%stops.length);
document.querySelector('#back').onclick=()=>go(Math.max(0,current-1));
let width=0,height=0,previousSheet=-1,previousSketch=-1;
renderer.setAnimationLoop(now=>{
if(!timed&&track.getBoundingClientRect().bottom<0)return;   // below the journey: nothing to draw
let driven=null;
if(timed){
  const elapsed=Math.min(1,Math.max(0,(now-timed.at)/timed.duration));
  driven=THREE.MathUtils.lerp(timed.from,timed.to,smooth(elapsed));
  scrollTo(0,range()*driven/stops.at(-1));
  if(elapsed===1)timed=null;
}
const raw=locked?0:driven??Math.min(stops.at(-1),Math.max(0,scrollY/range()*stops.at(-1)));const i=cuts.findLastIndex(c=>raw>=c);const s=reduced.matches?stops[i]:raw;
if(current!==i){current=i;const [label,title,voice,next,badge]=captions[i];const promoted=document.querySelector('#badge');promoted.hidden=!badge;promoted.textContent=badge||'';autoButton.hidden=i===captions.length-1;document.querySelector('#number').textContent=label;document.querySelector('#title').textContent=title;document.querySelector('#voice').textContent=voice;document.querySelector('#advance').textContent=next+' →';document.querySelector('#back').disabled=i===0;document.querySelector('#destinations').hidden=i!==captions.length-1;document.querySelector('.hint').hidden=i===captions.length-1;captionAt=now}
// Autoplay never pauses: the next camera move starts the moment one ends, and the moves are long enough to read the
// caption on the way. With reduced motion the steps jump instead of moving, so each one holds for 4 s.
if(auto&&!timed&&!locked){
  if(current===stops.length-1)setAuto(false);
  else if(!reduced.matches||now-captionAt>4000)go(current+1,true);
}
if(width!==stage.clientWidth||height!==stage.clientHeight){width=stage.clientWidth;height=stage.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=width<620?46:33;camera.updateProjectionMatrix()}
// On the way back the line's tip folds each scene flat just as it reaches it.
const back=lineBack(s),keep=u=>back>0?smooth((1-back-u)/.05):1;
const keepCourt=keep(foldAt.court),keepBench=keep(foldAt.bench),keepDealer=keep(foldAt.dealer);
const sketch=progress(s,.02,.42);if(sketch!==previousSketch){drawCourt(sketch);previousSketch=sketch}
const roll=progress(s,.42,1.2)*(1-progress(s,13.4,13.8));if(roll!==previousSheet){unroll(roll);previousSheet=roll}
const build=progress(s,.8,1.3);net.visible=build*keepCourt>0;net.scale.y=Math.max(.001,build*keepCourt);
bench.visible=s>1.55&&keepBench>0;bench.scale.setScalar(Math.max(.001,progress(s,1.55,1.98)*keepBench));
dealer.visible=s>2.9&&keepDealer>0;dealer.scale.y=Math.max(.001,keepDealer);alpine.visible=s>3.98;
alpine.children.forEach((piece,index)=>{
  const fold=progress(s,3.98+Math.min(index,3)*.08,4.67+Math.min(index,3)*.05);
  if(index<3){
    const height=piece.geometry.parameters.height;
    piece.rotation.x=-(1-fold)*Math.PI/2;
    piece.position.y=height/2*Math.sin(fold*Math.PI/2);
  }else piece.visible=fold>.38;
});
route.visible=s>=4.05&&keepDealer>0;route.geometry.setDrawRange(0,Math.floor(progress(s,4.05,4.95)*64)*36);
const time=reduced.matches ? 1.44 : now/1000;const phase=time*2.05;const hush=progress(s,1.64,2.14);
const bounce=(1-Math.cos(phase*2))*.5;
ball.visible=s>1.1&&keepBench>0;ball.scale.setScalar(Math.max(.001,keepBench));ball.position.set(THREE.MathUtils.lerp(2.45*Math.cos(phase),2.05,hush),THREE.MathUtils.lerp(1.5+bounce*1.9,.17,hush),THREE.MathUtils.lerp(.26+.55*Math.cos(phase),3.48,hush));ball.rotation.z=time*(1-hush);
for(const {f,x,z,side,hero,jumper} of players){f.root.visible=build>.01&&(hero||hush<.99);f.root.scale.setScalar(hero?build:build*(1-hush));f.root.rotation.y=-side*Math.PI/2;
const hit=jumper?Math.max(0,side*Math.cos(phase))**8:0;f.root.position.set(x,.04+hit*.36,z);pose(f,{...P.ready,lax:-.7-hit*1.9,rax:-.7-hit*1.9});
if(hero&&hush>0){f.root.position.lerp(V(2.5,.035,3.01),hush);f.root.rotation.y=-(1-hush)*Math.PI/2;pose(f,{llx:-1.5*hush,rlx:-1.5*hush,spine:.2*hush,head:.25*hush,lax:-.48,rax:-.48})}}
if(s>3.14){const u=progress(s,4.12,4.92);protagonist.root.position.copy(path.getPointAt(u));const tangent=path.getTangentAt(u);protagonist.root.rotation.y=Math.atan2(tangent.x,tangent.z);pose(protagonist,u>0&&u<1?P.walk(u*58):P.stand)}
updateCareer(s,time);
for(const [place,at] of [[studio,foldAt.studio],[city,foldAt.city],[workshop,foldAt.workshop]]){const k=keep(at);place.scale.y=Math.max(.001,place.scale.y*k);place.visible&&=k>0}
const keepHome=keep(foldAt.workshop);protagonist.root.scale.multiplyScalar(Math.max(.001,keepHome));protagonist.root.visible&&=keepHome>0;
trail.children.forEach((section,n)=>{const k=keep(foldAt.trail[n]);section.scale.z=Math.max(.001,section.scale.z*k);section.visible&&=k>0});
const flip=progress(s,6.28,6.52);promoCard.rotation.y=Math.PI*flip;promoCard.position.y=.105+.12*Math.sin(Math.PI*flip);
// The sheet rolls back into the monitor, then the question fades in over the court.
welcome.visible=locked;invitation.visible=s>=13.8;invitation.material.opacity=progress(s,13.8,14.1);
document.body.classList.toggle('closing',invitation.visible);
document.body.classList.toggle('gathering',s>11.78&&!invitation.visible);
const end=shots.findIndex(k=>k[0]>s);const a=shots[end<0?shots.length-1:Math.max(0,end-1)],b=shots[end<0?shots.length-1:end];const u=a===b?0:progress(s,a[0],b[0]);
const target=V(...a[2]).lerp(V(...b[2]),u);camera.position.copy(V(...a[1])).lerp(V(...b[1]),u);
if(camera.aspect<1){
  camera.position.sub(target).multiplyScalar(1.44).add(target);
  // Look down the long axis of the model on a tall screen.
  const wideView=progress(s,11.55,12.32)*(1-progress(s,13.25,13.7));
  camera.position.lerp(V(-11,24,17),wideView);
  target.lerp(V(12,.6,-6.5),wideView);
}
const screenDistance=camera.aspect<1?4.25/camera.aspect:4.55;
if(locked){
  const zoom=reduced.matches?1:progress(Math.max(0,now-openedAt)/1000,.62,3.15);
  camera.position.copy(V(4.5,3.4,5.1)).lerp(V(0,2.39,-4.46+screenDistance),zoom);
  target.copy(V(0,1.52,-4.4)).lerp(V(0,2.39,-4.46),zoom);
  play.hidden=zoom<.999;
}else play.hidden=true;
if(!locked&&s<.42){
  const align=1-progress(s,0,.42);
  camera.position.lerp(V(0,2.39,-4.46+screenDistance),align);
}
if(invitation.visible&&camera.aspect<1)camera.position.set(0,2.39,-4.46+screenDistance);
camera.lookAt(target);
const offset=locked?0:height*.058*progress(s,0,.4)*(1-progress(s,13.3,13.9));
camera.setViewOffset(width,height,0,offset,width,height);
camera.updateMatrixWorld();
if(locked&&!play.hidden){
  const point=V(0,2.09,-4.464).project(camera);
  play.style.left=(point.x+1)*width/2+'px';play.style.top=(1-point.y)*height/2+'px';
}
renderer.render(scene,camera)
});
}
function readStory(){document.documentElement.classList.add('text');document.body.classList.remove('intro')}
start().catch(error=>{console.error(error);readStory()});
