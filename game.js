(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const damp=(a,b,l,dt)=>b+(a-b)*Math.exp(-l*dt);
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const UP=new THREE.Vector3(0,1,0);
const hex=n=>'#'+(n>>>0).toString(16).padStart(6,'0');
function fmtTime(t){if(!isFinite(t)||t<=0)return '--:--.---';const m=Math.floor(t/60),s=Math.floor(t%60),ms=Math.floor((t%1)*1000);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;}
function fmtShort(t){return fmtTime(t).replace(/^00:/,'');}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.anisotropy=4;if('colorSpace'in t)t.colorSpace=THREE.SRGBColorSpace;return t;}
function softTexture(){return canvasTexture(128,128,(x,w,h)=>{const g=x.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.32,'rgba(210,225,240,.55)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,w,h);});}
const SOFT=softTexture();
const CARBON_TEX=canvasTexture(64,64,(x,w,h)=>{x.fillStyle='#11151c';x.fillRect(0,0,w,h);for(let yy=0;yy<h;yy+=8)for(let xx=0;xx<w;xx+=8){x.fillStyle=((xx+yy)/8)%2===0?'#272d36':'#080b10';x.fillRect(xx,yy,8,8);x.fillStyle='rgba(255,255,255,.035)';x.fillRect(xx+1,yy+1,6,1);} });CARBON_TEX.wrapS=CARBON_TEX.wrapT=THREE.RepeatWrapping;CARBON_TEX.repeat.set(2,2);
function envTexture(){
  return canvasTexture(512,256,(x,w,h)=>{
    const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#020515');g.addColorStop(.46,'#191034');g.addColorStop(.58,'#67134f');g.addColorStop(.72,'#09172a');g.addColorStop(1,'#02030a');
    x.fillStyle=g;x.fillRect(0,0,w,h);
    for(let i=0;i<22;i++){const xx=Math.random()*w,yy=h*(.32+Math.random()*.3);x.fillStyle=i%3===0?'rgba(57,244,255,.65)':i%3===1?'rgba(255,47,136,.55)':'rgba(214,255,63,.38)';x.fillRect(xx,yy,6+Math.random()*70,2+Math.random()*7);}
    x.fillStyle='rgba(255,220,160,.24)';x.fillRect(0,h*.48,w,2);
  });
}
const ENV_TEX=envTexture();ENV_TEX.mapping=THREE.EquirectangularReflectionMapping;
function signTexture(main,sub,color){return canvasTexture(512,220,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle='rgba(4,7,16,.92)';x.fillRect(0,0,w,h);x.strokeStyle=color;x.lineWidth=8;x.strokeRect(8,8,w-16,h-16);x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.font='900 76px "Arial Narrow","Microsoft YaHei",sans-serif';x.fillText(main,w/2,h*.48);x.font='700 22px "Arial Narrow","Microsoft YaHei",sans-serif';x.fillStyle='rgba(240,247,255,.78)';x.fillText(sub,w/2,h*.76);});}

const CARS=[
{id:'kaze',name:'KAZE GT',cn:'岚切',role:'轻量后驱 / 漂移机器',top:62,accel:16.4,grip:7.0,steer:1.72,brake:27,color:0x22e5ff,accent:0xff38ce,visual:{length:4.15,width:1.92,bodyH:.49,cabinW:1.45,cabinH:.48,cabinLen:1.55,wheelR:.35,wheelW:.28,wheelbase:2.5,spoiler:true}},
{id:'viper',name:'VIPER-09',cn:'蚀影',role:'四驱全能 / 街霸首选',top:66,accel:18.8,grip:9.0,steer:1.38,brake:31,color:0xff3b5f,accent:0x39f4ff,visual:{length:4.6,width:2.16,bodyH:.57,cabinW:1.62,cabinH:.5,cabinLen:1.85,wheelR:.39,wheelW:.32,wheelbase:2.72,spoiler:true}},
{id:'titan',name:'TITAN-X',cn:'泰坦',role:'大马力后驱 / 直线暴徒',top:73,accel:21,grip:7.6,steer:1.07,brake:25,color:0xffc431,accent:0xff2f88,visual:{length:5.05,width:2.28,bodyH:.68,cabinW:1.7,cabinH:.56,cabinLen:2.18,wheelR:.44,wheelW:.38,wheelbase:2.95,spoiler:false}}
];
const MODES={
  circuit:{kicker:'GRAND PRIX / 01',title:'环湾竞速',desc:'与三台 AI 同场竞速，漂移攒氮，冲线定胜负。',meta:['2 LAPS','4 CARS',' 2:30'],color:'#39f4ff',icon:'<svg viewBox="0 0 24 24"><path d="M4 19V5h8l-2 3 2 3H4"/><path d="M8 19c4-1 2-8 7-7s2 5 5 4 2-4 2-7"/><path d="M13 6h7"/></svg>'},
  time:{kicker:'TIME ATTACK / 02',title:'极速计时',desc:'单车单圈，用最快时间换取金牌与高额 CR。',meta:['1 LAP','SOLO','GOLD RUSH'],color:'#d6ff3f',icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7"/><path d="M12 13V8M9 3h6M12 3v3"/><path d="M18 5l2 2"/></svg>'},
  drift:{kicker:'DRIFT TRIAL / 03',title:'漂移试炼',desc:'90 秒内连续漂移，倍率越高，结算奖励越高。',meta:['90 SEC','CHAIN','SCORE'],color:'#ff3f9a',icon:'<svg viewBox="0 0 24 24"><path d="M3 17c4 0 4-6 8-6s3 5 7 5 3-3 3-3"/><path d="M4 20c4 0 6-3 10-3 2 0 3 1 5 2"/><path d="M15 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></svg>'}
};
const MAPS={
  neon:{name:'霓虹湾',en:'NEON BAY',theme:'city',rampCenter:.56,checkpoints:[.24,.49,.74,0],points:[[0,0,0],[85,0,18],[150,1,80],[165,3,150],[125,6,210],[45,5,230],[-35,3,205],[-85,1,155],[-160,0,170],[-220,2,110],[-220,0,30],[-170,0,-35],[-85,0,-45],[-30,0,-15]]},
  port:{name:'铁潮港',en:'IRON TIDE',theme:'port',rampCenter:.53,checkpoints:[.235,.49,.745,0],points:[[0,0,0],[80,0,22],[165,1,70],[220,2,150],[210,3,235],[145,2,285],[55,1,275],[-20,0,225],[-85,1,250],[-150,1,205],[-195,1,130],[-175,0,55],[-105,0,5],[-35,0,-20]]}
};
const DEFAULT_PROFILE={credits:1600,selectedCar:0,upgrades:{kaze:{engine:0,tires:0,nitro:0},viper:{engine:0,tires:0,nitro:0},titan:{engine:0,tires:0,nitro:0}},best:{circuit:0,time:0,drift:0},settings:{night:true,rain:true,sound:true,quality:'auto',mouseDrive:false,uiTheme:'cyan',uiOpacity:.82,uiMinimap:true,uiMotion:true}};
function loadProfile(){try{const s=JSON.parse(localStorage.getItem('nightshift.profile.v1')||'{}');return{...DEFAULT_PROFILE,...s,credits:Number(s.credits??1600),selectedCar:Number(s.selectedCar??0),upgrades:{...DEFAULT_PROFILE.upgrades,...(s.upgrades||{})},best:{...DEFAULT_PROFILE.best,...(s.best||{})},settings:{...DEFAULT_PROFILE.settings,...(s.settings||{})}};}catch(e){return JSON.parse(JSON.stringify(DEFAULT_PROFILE));}}
function saveProfile(p){try{localStorage.setItem('nightshift.profile.v1',JSON.stringify(p));}catch(e){}}
function statsFor(def,up){up=up||{engine:0,tires:0,nitro:0};return{topSpeed:def.top*(1+.045*up.engine),accel:def.accel*(1+.055*up.engine),grip:def.grip*(1+.07*up.tires),steer:def.steer*(1+.025*up.tires),brake:def.brake*(1+.05*up.tires),boostAccel:def.accel*.9*(1+.10*up.nitro),nitroMax:100*(1+.18*up.nitro)};}
function upgradeCost(l){return 350+l*300;}

function loftGeometry(stations,segments){
  const pos=[],idx=[];
  for(const st of stations){
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2;
      pos.push(Math.cos(a)*st.hw,st.cy+Math.sin(a)*st.hh,st.z);
    }
  }
  for(let s=0;s<stations.length-1;s++)for(let i=0;i<segments;i++){
    const a=s*segments+i,b=s*segments+(i+1)%segments,c=(s+1)*segments+i,d=(s+1)*segments+(i+1)%segments;
    idx.push(a,c,b,b,c,d);
  }
  const last=stations[stations.length-1],fc=pos.length/3;
  pos.push(0,last.cy,last.z);
  for(let i=0;i<segments;i++)idx.push((stations.length-1)*segments+i,fc,(stations.length-1)*segments+(i+1)%segments);
  const first=stations[0],rc=pos.length/3;pos.push(0,first.cy,first.z);
  for(let i=0;i<segments;i++)idx.push(rc,i,(i+1)%segments);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setIndex(idx);geo.computeVertexNormals();return geo;
}
function mergeStaticCar(g){
  const parts=g.children.filter(o=>o.isMesh&&o.userData.staticPart);
  if(parts.length<2)return;
  const groups=new Map();
  for(const m of parts){
    m.updateMatrix();const geo=m.geometry.clone();geo.applyMatrix4(m.matrix);
    const key=m.material.uuid;
    if(!groups.has(key))groups.set(key,{mat:m.material,geos:[]});
    groups.get(key).geos.push(geo);
  }
  for(const m of parts){g.remove(m);m.geometry.dispose();}
  for(const entry of groups.values()){
    const {mat,geos}=entry,names=new Set();
    for(const geo of geos)for(const name in geo.attributes)names.add(name);
    let totalV=0,totalI=0;
    for(const geo of geos){const n=geo.attributes.position.count;totalV+=n;totalI+=geo.index?geo.index.count:n;}
    const merged=new THREE.BufferGeometry();
    for(const name of names){
      const first=geos.find(g=>g.attributes[name]);const itemSize=first.attributes[name].itemSize;const Arr=first.attributes[name].array.constructor;
      const arr=new Arr(totalV*itemSize);let off=0;
      for(const geo of geos){const attr=geo.attributes[name];if(attr){arr.set(attr.array,off);off+=attr.count*itemSize;}else{off+=geo.attributes.position.count*itemSize;}}
      merged.setAttribute(name,new THREE.BufferAttribute(arr,itemSize));
    }
    const Idx=totalV>65535?Uint32Array:Uint16Array;const inds=new Idx(totalI);let io=0,base=0;
    for(const geo of geos){
      if(geo.index){const a=geo.index.array;for(let i=0;i<a.length;i++)inds[io++]=a[i]+base;}
      else{const n=geo.attributes.position.count;for(let i=0;i<n;i++)inds[io++]=i+base;}
      base+=geo.attributes.position.count;
    }
    merged.setIndex(new THREE.BufferAttribute(inds,1));merged.computeBoundingSphere();
    const mm=new THREE.Mesh(merged,mat);g.add(mm);
    for(const geo of geos)geo.dispose();
  }
}

function makeCar(def,opts={}){
  const paintColor=opts.color||def.color,accentColor=opts.accent||def.accent;
  const g=new THREE.Group(),v=def.visual,L=v.length,W=v.width,bh=v.bodyH;
  const paint=new THREE.MeshPhysicalMaterial({color:paintColor,metalness:.72,roughness:.2,clearcoat:1,clearcoatRoughness:.08,side:THREE.DoubleSide,envMap:ENV_TEX,envMapIntensity:1.05,emissive:new THREE.Color(paintColor).multiplyScalar(.055)});
  const accent=new THREE.MeshStandardMaterial({color:accentColor,emissive:accentColor,emissiveIntensity:1.35,metalness:.6,roughness:.22});
  const glass=new THREE.MeshPhysicalMaterial({color:0x071522,metalness:.42,roughness:.05,transparent:true,opacity:.56,side:THREE.DoubleSide,clearcoat:1,envMap:ENV_TEX,envMapIntensity:1.55});
  const rubber=new THREE.MeshStandardMaterial({color:0x07090d,roughness:.96,metalness:.0});
  const trim=new THREE.MeshStandardMaterial({color:0x080b11,metalness:.68,roughness:.38});const carbon=new THREE.MeshStandardMaterial({map:CARBON_TEX,color:0x2b3038,metalness:.36,roughness:.5,envMap:ENV_TEX,envMapIntensity:.5});
  const chrome=new THREE.MeshStandardMaterial({color:0xd7e4ee,metalness:.98,roughness:.1,envMap:ENV_TEX,envMapIntensity:1.3});
  const headMat=new THREE.MeshStandardMaterial({color:0xe9fbff,emissive:0xbcefff,emissiveIntensity:2.5,metalness:.2,roughness:.12});
  const tailMat=new THREE.MeshStandardMaterial({color:0x3b0208,emissive:0xff173d,emissiveIntensity:1.2,metalness:.35,roughness:.22});
  const signalL=new THREE.MeshStandardMaterial({color:0x3b1c00,emissive:0xff9c1a,emissiveIntensity:.35,metalness:.2,roughness:.25});
  const signalR=new THREE.MeshStandardMaterial({color:0x3b1c00,emissive:0xff9c1a,emissiveIntensity:.35,metalness:.2,roughness:.25});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.userData.staticPart=true;g.add(m);return m;};
  const box=(w,h,d,mat,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
  const baseY=.24;
  const zs=[-L/2,-L*.4,-L*.25,-L*.08,L*.08,L*.27,L*.43,L/2];
  const wf=[.58,.86,1,1,.99,.92,.76,.48];
  const hf=[.5,.84,1,1,.97,.84,.62,.4];
  const body=loftGeometry(zs.map((z,i)=>({z,hw:W*.5*wf[i],cy:baseY+bh*.48,hh:bh*.5*hf[i]})),18);
  const bodyMesh=new THREE.Mesh(body,paint);bodyMesh.userData.staticPart=true;g.add(bodyMesh);
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI*.54),glass);
  canopy.scale.set(W*.34,v.cabinH*1.22,v.cabinLen*.54);
  canopy.userData.staticPart=true;canopy.position.set(0,baseY+bh-.01,-.05);g.add(canopy);
  const roof=new THREE.Mesh(new THREE.SphereGeometry(1,18,8,0,Math.PI*2,0,Math.PI*.35),paint);
  roof.userData.staticPart=true;roof.scale.set(W*.255,.13,v.cabinLen*.37);roof.position.set(0,baseY+bh+v.cabinH*.72,-.09);g.add(roof);
  box(W*.9,.08,L*.28,trim,0,baseY+bh*.82,L*.24);
  box(W*.93,.1,.32,trim,0,.3,-L/2+.1);
  box(W*.96,.12,.34,trim,0,.3,L/2-.12);
  box(W*.8,.16,.18,trim,0,.88,-L/2+.08);
  box(W*.22,.03,L*.7,accent,0,baseY+bh+.025,.02);box(W*.92,.06,.34,carbon,0,.31,L/2+.13);box(W*.82,.11,.3,carbon,0,.25,-L/2-.08);for(const sx of[-1,1])box(.1,.09,L*.34,carbon,sx*(W*.5+.015),.27,.02);box(W*.56,.025,.42,carbon,0,baseY+bh+.035,L*.12);
  for(const sx of[-1,1]){
    box(.1,.12,L*.52,accent,sx*(W*.5+.005),baseY+bh*.42,.02);
    box(.08,.22,L*.2,trim,sx*(W*.5+.012),baseY+bh*.42,-L*.29);
    box(.12,.13,.25,trim,sx*(W*.47),baseY+bh*.63,.1);
  }
  for(const sx of[-1,1]){
    const housing=box(.34,.17,.09,trim,sx*W*.29,baseY+bh*.62,L/2-.03);
    const lens=box(.26,.1,.035,headMat,sx*W*.29,baseY+bh*.63,L/2+.025);
    box(.31,.13,.055,tailMat,sx*W*.3,baseY+bh*.58,-L/2-.015);
    const sig=sx<0?signalL:signalR;
    box(.075,.055,.035,sig,sx*W*.455,baseY+bh*.52,L/2+.028);
    box(.075,.055,.035,sig,sx*W*.455,baseY+bh*.52,-L/2-.02);
  }
  box(W*.68,.055,.05,tailMat,0,baseY+bh*.78,-L/2-.018);
  if(v.spoiler){
    box(W*.94,.07,.42,accent,0,baseY+bh+.43,-L*.43);
    box(.07,.42,.08,trim,-W*.33,baseY+bh+.22,-L*.43);
    box(.07,.42,.08,trim,W*.33,baseY+bh+.22,-L*.43);
    box(.06,.16,.46,trim,-W*.47,baseY+bh+.36,-L*.43);
    box(.06,.16,.46,trim,W*.47,baseY+bh+.36,-L*.43);
  }
  box(W*.72,.18,.45,trim,0,.22,-L*.26);
  box(W*.82,.07,.22,accent,0,baseY+bh*.38,L/2+.13);
  box(W*.46,.16,.08,trim,0,baseY+bh*.18,L/2+.12);
  for(const sx of[-1,1]){
    box(.05,.06,.28,trim,sx*W*.5,baseY+bh*.47,L*.06);
    box(.19,.11,.09,paint,sx*W*.56,baseY+bh*.54,L*.06);
    box(.07,.2,.32,trim,sx*W*.42,.34,L/2+.03);
    box(.07,.055,.55,accent,sx*W*.45,baseY+bh*.64,L*.18);
    box(.045,.32,.04,trim,sx*W*.24,.24,-L*.48);
    box(.045,.32,.04,trim,sx*W*.12,.24,-L*.48);
    box(.045,.32,.04,trim,sx*(-W*.02),.24,-L*.48);
  }
  for(const sx of[-1,1])for(const sz of[-1,1]){
    const arch=add(new THREE.TorusGeometry(v.wheelR*1.22,.07,5,14,Math.PI),trim,sx*(W/2+.02),v.wheelR,sz*v.wheelbase/2);
    arch.rotation.y=Math.PI/2;
  }
  const cyl=(r,h,mat,x,y,z)=>{const m=add(new THREE.CylinderGeometry(r,r,h,10),mat,x,y,z);m.rotation.x=Math.PI/2;return m;};
  if(def.id==='kaze'){
    box(W*.58,.026,.035,headMat,0,baseY+bh*.63,L/2+.058);
    box(W*.42,.08,.26,carbon,0,baseY+bh*.79,L*.19);
    for(const sx of[-1,1]){box(.055,.17,.32,carbon,sx*W*.43,.35,-L*.34);box(.08,.05,.48,accent,sx*W*.46,baseY+bh*.48,L*.12);}
  }else if(def.id==='viper'){
    box(W*.42,.18,.055,trim,0,baseY+bh*.31,L/2+.05);box(W*.34,.05,.03,accent,0,baseY+bh*.44,L/2+.07);
    for(const sx of[-1,1])for(const yy of[0,1]){const tl=cyl(.072,.045,tailMat,sx*W*.31,baseY+bh*(.51+yy*.09),-L/2-.025);}
    box(W*.32,.06,.34,carbon,0,baseY+bh+.1,-L*.33);
  }else{
    box(W*.42,.15,.58,carbon,0,baseY+bh*.79,L*.16);box(W*.28,.035,.38,trim,0,baseY+bh*.87,L*.16);
    for(const sx of[-1,1])for(const xx of[.16,.31])cyl(.065,.12,chrome,sx*W*xx,.31,-L/2-.02);
    box(W*.34,.09,.38,carbon,0,.26,-L/2+.04);
  }
  const wheels=[];
  for(const front of[true,false])for(const sx of[-1,1]){
    const steer=new THREE.Group();steer.position.set(sx*(W/2-.015),v.wheelR,(front?1:-1)*v.wheelbase/2);g.add(steer);
    const spin=new THREE.Group();steer.add(spin);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(v.wheelR,v.wheelR,v.wheelW,16,1),rubber);tire.rotation.z=Math.PI/2;tire.userData.staticPart=true;spin.add(tire);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(v.wheelR*.64,v.wheelR*.64,v.wheelW+.025,12),accent);rim.rotation.z=Math.PI/2;rim.userData.staticPart=true;spin.add(rim);
    const spokeCount=def.id==='kaze'?10:def.id==='viper'?5:6;
    for(let k=0;k<spokeCount;k++){
      const spoke=new THREE.Mesh(new THREE.BoxGeometry(v.wheelW+.04,.032,v.wheelR*1.1),chrome);
      spoke.rotation.x=k/spokeCount*Math.PI*2;spoke.userData.staticPart=true;spin.add(spoke);
    }
    for(const side of[-1,1]){
      const wall=new THREE.Mesh(new THREE.TorusGeometry(v.wheelR*.76,v.wheelW*.19,6,18),rubber);
      wall.rotation.y=Math.PI/2;wall.position.x=side*(v.wheelW*.5+.01);wall.userData.staticPart=true;spin.add(wall);
      const lip=new THREE.Mesh(new THREE.TorusGeometry(v.wheelR*.64,.025,4,18),accent);lip.rotation.y=Math.PI/2;lip.position.x=side*(v.wheelW*.5+.03);lip.userData.staticPart=true;spin.add(lip);
    }
    for(let k=0;k<10;k++){const a=k/10*Math.PI*2,tread=new THREE.Mesh(new THREE.BoxGeometry(v.wheelW*.86,.045,.14),rubber);tread.position.set(0,Math.cos(a)*v.wheelR,Math.sin(a)*v.wheelR);tread.rotation.x=-a;tread.userData.staticPart=true;spin.add(tread);}
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(v.wheelR*.43,v.wheelR*.43,.035,12),chrome);disc.rotation.z=Math.PI/2;disc.userData.staticPart=true;spin.add(disc);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(v.wheelR*.17,v.wheelR*.17,v.wheelW+.04,10),accent);cap.rotation.z=Math.PI/2;cap.userData.staticPart=true;spin.add(cap);
    const caliper=new THREE.Mesh(new THREE.BoxGeometry(v.wheelW+.06,.18,.09),accent);caliper.position.set(0,-v.wheelR*.3,v.wheelR*.33);caliper.userData.staticPart=true;spin.add(caliper);
    mergeStaticCar(spin);wheels.push({steer,spin,front,radius:v.wheelR});
  }
  const flameRoot=new THREE.Group();flameRoot.position.set(0,baseY+bh*.34,-L/2-.04);g.add(flameRoot);
  const flames=[];
  for(const sx of[-1,1]){
    const fg=new THREE.Group();fg.position.x=sx*W*.23;flameRoot.add(fg);
    const om=new THREE.MeshBasicMaterial({color:accentColor,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const im=new THREE.MeshBasicMaterial({color:0xd9ffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const outer=new THREE.Mesh(new THREE.ConeGeometry(.18,1.45,12),om);outer.rotation.x=-Math.PI/2;outer.position.z=-.725;fg.add(outer);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(.085,.95,9),im);inner.rotation.x=-Math.PI/2;inner.position.z=-.475;fg.add(inner);
    const tm=new THREE.MeshBasicMaterial({color:accentColor,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const trail=new THREE.Mesh(new THREE.ConeGeometry(.32,3.2,10,1,true),tm);trail.rotation.x=-Math.PI/2;trail.position.z=-1.6;fg.add(trail);
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(.085,.1,.16,10),chrome);tip.rotation.x=Math.PI/2;tip.position.set(0,0,.08);fg.add(tip);
    const halo=new THREE.Mesh(new THREE.TorusGeometry(.12,.028,5,10),accent);halo.position.z=-.02;fg.add(halo);
    flames.push({group:fg,outer:om,inner:im,trailMat:tm});
  }
  const exhaustLight=new THREE.PointLight(accentColor,0,8,2);exhaustLight.position.set(0,baseY+bh*.35,-L/2-.45);g.add(exhaustLight);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(W*2.5,L*1.45),new THREE.MeshBasicMaterial({map:SOFT,color:accentColor,transparent:true,opacity:.48,blending:THREE.AdditiveBlending,depthWrite:false}));
  glow.rotation.x=-Math.PI/2;glow.position.y=.02;glow.renderOrder=3;g.add(glow);
  g.userData={headMat,tailMat,signalL,signalR,glow,spot:null,wheels,flames,exhaustLight,paint,accentMat:accent};
  mergeStaticCar(g);
  return g;
}
function addHeadlight(g){
  const s=new THREE.SpotLight(0xd5ebff,5.2,110,Math.PI/5.2,.52,1.1);
  s.position.set(0,1.0,1.7);s.target.position.set(0,.05,34);s.castShadow=false;
  g.add(s);g.add(s.target);g.userData.spot=s;
  const cm=new THREE.MeshBasicMaterial({color:0xa8e8ff,transparent:true,opacity:.055,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const cone=new THREE.Mesh(new THREE.ConeGeometry(3.1,18,14,1,true),cm);
  cone.rotation.x=-Math.PI/2;cone.position.set(0,.95,9.0);cone.renderOrder=1;cone.visible=false;
  g.add(cone);g.userData.beamCone=cone;
}

class Track{
 constructor(scene,mapKey='neon'){
   this.scene=scene;this.mapKey=MAPS[mapKey]?mapKey:'neon';this.map=MAPS[this.mapKey];this.N=720;this.halfWidth=12.6;this.wallLimit=this.halfWidth+.42;
   this.points=this.map.points.map(p=>new THREE.Vector3(p[0],p[1],p[2]));
   this.curve=new THREE.CatmullRomCurve3(this.points,true,'catmullrom',.35);this.curve.arcLengthDivisions=1200;this.length=this.curve.getLength();this.samples=[];
   for(let i=0;i<this.N;i++){const u=i/this.N,p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u).normalize(),side=new THREE.Vector3().crossVectors(UP,t).normalize();this.samples.push({u,p,t,side});}
   this.rampCenter=Math.floor(this.N*this.map.rampCenter);this.rampHalf=8;this.checkpointProgress=this.map.checkpoints.slice();this.gateMats=[];this.gates=[];
   this.build();this.buildBounds();
 }
 rampHeightAtProgress(progress){const center=this.rampCenter/this.N;let d=Math.abs(progress-center);d=Math.min(d,1-d);const span=this.rampHalf/this.N;if(d>=span)return 0;return Math.cos((d/span)*Math.PI*.5)*1.9;}
 nearest(x,z){let bestD=Infinity,bestI=0,bestT=0;for(let i=0;i<this.N;i++){const a=this.samples[i].p,b=this.samples[(i+1)%this.N].p,abx=b.x-a.x,abz=b.z-a.z,den=abx*abx+abz*abz||1;let t=((x-a.x)*abx+(z-a.z)*abz)/den;t=clamp(t,0,1);const px=a.x+abx*t,pz=a.z+abz*t,dx=x-px,dz=z-pz,d=dx*dx+dz*dz;if(d<bestD){bestD=d;bestI=i;bestT=t;}}const a=this.samples[bestI],b=this.samples[(bestI+1)%this.N],p=new THREE.Vector3().lerpVectors(a.p,b.p,bestT),tangent=new THREE.Vector3().lerpVectors(a.t,b.t,bestT).normalize(),side=new THREE.Vector3().crossVectors(UP,tangent).normalize(),lateral=(x-p.x)*side.x+(z-p.z)*side.z;return{index:bestI,t:bestT,p,tangent,side,lateral,distance:Math.sqrt(bestD),progress:(bestI+bestT)/this.N};}
 clearPoint(x,z,margin=2){return this.nearest(x,z).distance>=this.halfWidth+margin;}
  clearFootprint(x,z,w,d,rot,margin=2.5){
    const c=Math.cos(rot),s=Math.sin(rot),hw=w*.5,hd=d*.5,pts=[[0,0],[-hw,-hd],[hw,-hd],[-hw,hd],[hw,hd],[-hw,0],[hw,0],[0,-hd],[0,hd]];
    for(const [lx,lz] of pts){const wx=x+lx*c+lz*s,wz=z-lx*s+lz*c;if(this.nearest(wx,wz).distance<this.halfWidth+margin)return false;}
    return true;
  }
  addRibbon(offA,offB,hA,hB,mat,colorFn){const pos=[],norm=[],col=[],idx=[],uv=[];for(let i=0;i<=this.N;i++){const s=this.samples[i%this.N],ax=s.p.x+s.side.x*offA,az=s.p.z+s.side.z*offA,ay=s.p.y+hA,bx=s.p.x+s.side.x*offB,bz=s.p.z+s.side.z*offB,by=s.p.y+hB;pos.push(ax,ay,az,bx,by,bz);norm.push(0,1,0,0,1,0);uv.push(0,i/this.N*24,1,i/this.N*24);if(colorFn){const c=new THREE.Color(colorFn(i%this.N));col.push(c.r,c.g,c.b,c.r,c.g,c.b);}}for(let i=0;i<this.N;i++){const a=i*2,b=a+1,c=((i+1)%this.N)*2,d=c+1;idx.push(a,c,b,b,c,d);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));if(colorFn)geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeBoundingSphere();const m=new THREE.Mesh(geo,mat);this.scene.add(m);return m;}
 addWall(offset,mat){const pos=[],idx=[];for(let i=0;i<=this.N;i++){const s=this.samples[i%this.N],x=s.p.x+s.side.x*offset,z=s.p.z+s.side.z*offset;pos.push(x,s.p.y+.08,z,x,s.p.y+1.05,z);}for(let i=0;i<this.N;i++){const a=i*2,b=a+1,c=((i+1)%this.N)*2,d=c+1;idx.push(a,b,c,b,d,c);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();geo.computeBoundingSphere();const m=new THREE.Mesh(geo,mat);this.scene.add(m);return m;}
 addDashes(){const pos=[],idx=[];let v=0;for(let d=0;d<this.length;d+=13){const u=d/this.length,p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u).normalize(),side=new THREE.Vector3().crossVectors(UP,t).normalize();const a=p.clone().addScaledVector(t,-2.8).addScaledVector(side,-.08),b=p.clone().addScaledVector(t,-2.8).addScaledVector(side,.08),c=p.clone().addScaledVector(t,2.8).addScaledVector(side,-.08),e=p.clone().addScaledVector(t,2.8).addScaledVector(side,.08);for(const q of[a,b,c,e])pos.push(q.x,q.y+.085,q.z);idx.push(v,v+2,v+1,v+1,v+2,v+3);v+=4;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();this.scene.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xdffaff,transparent:true,opacity:.82,blending:THREE.AdditiveBlending,depthWrite:false})));}
 buildRamp(){const arr=[],start=this.rampCenter-this.rampHalf,end=this.rampCenter+this.rampHalf;for(let i=start;i<end;i++){const a=this.samples[(i+this.N)%this.N],b=this.samples[(i+1+this.N)%this.N],ah=this.rampHeightAtProgress(i/this.N)+.11,bh=this.rampHeightAtProgress((i+1)/this.N)+.11;const aL=[a.p.x-a.side.x*this.halfWidth,a.p.y+ah,a.p.z-a.side.z*this.halfWidth],aR=[a.p.x+a.side.x*this.halfWidth,a.p.y+ah,a.p.z+a.side.z*this.halfWidth],bL=[b.p.x-b.side.x*this.halfWidth,b.p.y+bh,b.p.z-b.side.z*this.halfWidth],bR=[b.p.x+b.side.x*this.halfWidth,b.p.y+bh,b.p.z+b.side.z*this.halfWidth];arr.push(...aL,...aR,...bL,...aR,...bR,...bL);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));geo.computeVertexNormals();this.scene.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xf6c63b,emissive:0x5d4200,emissiveIntensity:.35,roughness:.52,metalness:.16})));}
 buildStartLine(){const tex=canvasTexture(256,64,(x,w,h)=>{x.fillStyle='#e8eef7';x.fillRect(0,0,w,h);x.fillStyle='#0a0d14';for(let y=0;y<4;y++)for(let xx=0;xx<16;xx++)if((xx+y)%2===0)x.fillRect(xx*w/16,y*h/4,w/16,h/4);});const p=this.samples[0].p.clone(),t=this.samples[0].t.clone(),side=this.samples[0].side.clone();const mesh=new THREE.Mesh(new THREE.PlaneGeometry(this.halfWidth*2,2.7),new THREE.MeshBasicMaterial({map:tex}));mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side,t.clone().negate(),UP));mesh.position.copy(p);mesh.position.y+=.09;this.scene.add(mesh);}
 buildGates(){const gr=this.halfWidth+.7;for(let k=0;k<4;k++){const u=this.checkpointProgress[k],p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u).normalize(),g=new THREE.Group();g.position.copy(p);g.rotation.y=Math.atan2(t.x,t.z);const mat=new THREE.MeshStandardMaterial({color:0xff3f9a,emissive:0xff3f9a,emissiveIntensity:.8,metalness:.3,roughness:.3}),torus=new THREE.Mesh(new THREE.TorusGeometry(gr,.22,8,44),mat);torus.position.y=gr+.15;g.add(torus);for(const sx of[-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(.32,gr,.32),new THREE.MeshStandardMaterial({color:0x172030,metalness:.7,roughness:.3}));post.position.set(sx*(gr+.16),gr*.5,0);g.add(post);}this.scene.add(g);this.gateMats.push(mat);this.gates.push(g);}}
 buildGantry(){const p=this.samples[0].p.clone(),t=this.samples[0].t.clone(),g=new THREE.Group();g.position.copy(p);g.rotation.y=Math.atan2(t.x,t.z);const metal=new THREE.MeshStandardMaterial({color:0x151d2b,metalness:.82,roughness:.22}),tx=this.halfWidth+2.2;for(const sx of[-1,1]){const tw=new THREE.Mesh(new THREE.BoxGeometry(.7,8.2,.7),metal);tw.position.set(sx*tx,4.1,0);g.add(tw);}const beam=new THREE.Mesh(new THREE.BoxGeometry(tx*2+.7,.8,.75),metal);beam.position.y=8.05;g.add(beam);const tex=signTexture(this.mapKey==='port'?'IRON TIDE':'NIGHTSHIFT',this.mapKey==='port'?'铁潮港 / IRON TIDE':'霓虹湾 / NEON BAY','#d6ff3f');const sign=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(18,this.halfWidth*1.15),2.8),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));sign.position.set(0,9.6,.05);g.add(sign);const lg=new THREE.InstancedMesh(new THREE.SphereGeometry(.16,8,6),new THREE.MeshBasicMaterial({color:0xffffff}),5),lc=new THREE.Color(),ld=new THREE.Object3D();for(let i=0;i<5;i++){ld.position.set((i-2)*1.65,7.45,.42);ld.updateMatrix();lg.setMatrixAt(i,ld.matrix);lc.setHex(i===2?0xd6ff3f:0xff243f);lg.setColorAt(i,lc);}lg.instanceMatrix.needsUpdate=true;if(lg.instanceColor)lg.instanceColor.needsUpdate=true;g.add(lg);this.scene.add(g);}
 buildGroundDetails(){
    const group=new THREE.Group(),dummy=new THREE.Object3D();
    const cwSample=this.samples[Math.floor(this.N*.93)],cwN=9,cwGeo=new THREE.BoxGeometry(.42,.014,2.8),cwMat=new THREE.MeshStandardMaterial({color:0xeaf7ff,roughness:.38,metalness:.03,emissive:0xffffff,emissiveIntensity:.08}),cross=new THREE.InstancedMesh(cwGeo,cwMat,cwN);
    for(let i=0;i<cwN;i++){const off=-this.halfWidth+1.2+(2*this.halfWidth-2.4)*i/(cwN-1),p=cwSample.p.clone().addScaledVector(cwSample.side,off);dummy.position.set(p.x,p.y+.06,p.z);dummy.rotation.set(0,Math.atan2(cwSample.t.x,cwSample.t.z),0);dummy.scale.set(1,1,1);dummy.updateMatrix();cross.setMatrixAt(i,dummy.matrix);}cross.instanceMatrix.needsUpdate=true;group.add(cross);
    const manN=14,manGeo=new THREE.CylinderGeometry(.34,.34,.035,12),manMat=new THREE.MeshStandardMaterial({color:0x3f4651,roughness:.5,metalness:.65,emissive:0x10151e,emissiveIntensity:.25}),man=new THREE.InstancedMesh(manGeo,manMat,manN);
    for(let i=0;i<manN;i++){const ss=this.samples[(i*47+23)%this.N],sign=i%2?1:-1,p=ss.p.clone().addScaledVector(ss.side,sign*(this.halfWidth+2.45));dummy.position.set(p.x,p.y+.225,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();man.setMatrixAt(i,dummy.matrix);}man.instanceMatrix.needsUpdate=true;group.add(man);
    const seamN=Math.floor(this.N/8)*2,seamGeo=new THREE.BoxGeometry(4.7,.014,.055),seamMat=new THREE.MeshStandardMaterial({color:0x3a414b,roughness:.9,metalness:.04}),seam=new THREE.InstancedMesh(seamGeo,seamMat,seamN);let si=0;
    for(const side of[-1,1])for(let i=0;i<this.N;i+=8){const ss=this.samples[i],p=ss.p.clone().addScaledVector(ss.side,side*(this.halfWidth+3.2));dummy.position.set(p.x,p.y+.205,p.z);dummy.rotation.set(0,Math.atan2(ss.t.x,ss.t.z),0);dummy.scale.set(1,1,1);dummy.updateMatrix();seam.setMatrixAt(si++,dummy.matrix);}seam.instanceMatrix.needsUpdate=true;group.add(seam);
    this.groundDetails=group;this.scene.add(group);
  }
  buildTireBarriers(){
    const capacity=30,geo=new THREE.TorusGeometry(.46,.14,6,12),mat=new THREE.MeshStandardMaterial({color:0x0a0d12,roughness:.92,metalness:.08,emissive:0x08060c,emissiveIntensity:.2}),mesh=new THREE.InstancedMesh(geo,mat,capacity),dummy=new THREE.Object3D();let placed=0;
    for(let k=0;k<10;k++){
      const ss=this.samples[(Math.floor(k*this.N/10)+37)%this.N],sign=k%2?1:-1,p=ss.p.clone().addScaledVector(ss.side,sign*(this.halfWidth+3.2));
      if(this.nearest(p.x,p.z).distance<this.halfWidth+2.2)continue;
      for(let level=0;level<3;level++){dummy.position.set(p.x,p.y+.16+level*.29,p.z);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(placed++,dummy.matrix);}
    }
    mesh.count=placed;mesh.instanceMatrix.needsUpdate=true;this.tireBarriers=mesh;this.scene.add(mesh);
  }
  buildCurbBlocks(){
    const step=3,count=Math.ceil(this.N/step)*2,geo=new THREE.BoxGeometry(1.04,.18,4.18);
    const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.48,metalness:.08});
    const mesh=new THREE.InstancedMesh(geo,mat,count),dummy=new THREE.Object3D(),col=new THREE.Color();let n=0;
    for(const side of[-1,1])for(let i=0;i<this.N;i+=step){
      const ss=this.samples[i],p=ss.p.clone().addScaledVector(ss.side,side*(this.halfWidth+.58));
      dummy.position.set(p.x,p.y+.13,p.z);dummy.rotation.set(-Math.asin(ss.t.y),Math.atan2(ss.t.x,ss.t.z),0,'YXZ');dummy.scale.set(1,1,1);dummy.updateMatrix();
      mesh.setMatrixAt(n,dummy.matrix);col.setHex(((Math.floor(i/step)+ (side>0?1:0))%2)===0?0xf3f7ff:0xff294d);mesh.setColorAt(n,col);n++;
    }
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;this.curbBlocks=mesh;this.scene.add(mesh);
  }
  buildGuardBarriers(){
    const step=3,count=Math.ceil(this.N/step)*2,geo=new THREE.BoxGeometry(.46,.78,4.12);
    const mat=new THREE.MeshStandardMaterial({color:0x172335,roughness:.72,metalness:.25,emissive:0x07131d,emissiveIntensity:.32});
    const mesh=new THREE.InstancedMesh(geo,mat,count),stripGeo=new THREE.BoxGeometry(.48,.09,2.45),stripMat=new THREE.MeshBasicMaterial({color:0xffffff});
    const stripe=new THREE.InstancedMesh(stripGeo,stripMat,count),dummy=new THREE.Object3D(),col=new THREE.Color();let n=0;
    const colors=[0xff2f88,0x39f4ff,0xff9e45];
    for(const side of[-1,1])for(let i=0;i<this.N;i+=step){
      const ss=this.samples[i],p=ss.p.clone().addScaledVector(ss.side,side*(this.halfWidth+1.62));
      dummy.position.set(p.x,p.y+.48,p.z);dummy.rotation.set(-Math.asin(ss.t.y),Math.atan2(ss.t.x,ss.t.z),0,'YXZ');dummy.scale.set(1,1,1);dummy.updateMatrix();
      mesh.setMatrixAt(n,dummy.matrix);
      const q=p.clone().addScaledVector(ss.side,-side*.245);
      dummy.position.set(q.x,p.y+.73,q.z);dummy.updateMatrix();stripe.setMatrixAt(n,dummy.matrix);col.setHex(colors[Math.floor(i/9)%3]);stripe.setColorAt(n,col);n++;
    }
    mesh.instanceMatrix.needsUpdate=true;stripe.instanceMatrix.needsUpdate=true;if(stripe.instanceColor)stripe.instanceColor.needsUpdate=true;
    this.guardMesh=mesh;this.guardStripe=stripe;this.scene.add(mesh,stripe);
  }
  buildRoadsideProps(){
    const step=37,count=Math.ceil(this.N/step),coneGeo=new THREE.ConeGeometry(.27,.78,8),coneMat=new THREE.MeshStandardMaterial({color:0xff5a1f,roughness:.52,metalness:.05,emissive:0x6b1700,emissiveIntensity:.45});
    const bandGeo=new THREE.CylinderGeometry(.23,.27,.13,8),bandMat=new THREE.MeshStandardMaterial({color:0xf7fbff,roughness:.4,emissive:0x292000,emissiveIntensity:.25});
    const cones=new THREE.InstancedMesh(coneGeo,coneMat,count),bands=new THREE.InstancedMesh(bandGeo,bandMat,count),dummy=new THREE.Object3D();
    for(let i=0;i<count;i++){
      const ss=this.samples[(i*step+17)%this.N],sign=i%2?1:-1,p=ss.p.clone().addScaledVector(ss.side,sign*(this.halfWidth+3.4));
      dummy.position.set(p.x,p.y+.42,p.z);dummy.rotation.set(0,Math.atan2(ss.t.x,ss.t.z),0);dummy.scale.set(1,1,1);dummy.updateMatrix();cones.setMatrixAt(i,dummy.matrix);
      dummy.position.y=p.y+.33;dummy.updateMatrix();bands.setMatrixAt(i,dummy.matrix);
    }
    cones.instanceMatrix.needsUpdate=true;bands.instanceMatrix.needsUpdate=true;this.props=new THREE.Group();this.props.add(cones,bands);this.scene.add(this.props);
  }
  build(){const asphalt=canvasTexture(256,256,(x,w,h)=>{x.fillStyle='#3a4049';x.fillRect(0,0,w,h);const r=mulberry32(721);for(let i=0;i<2400;i++){const g=36+Math.floor(r()*48);x.fillStyle=`rgba(${g},${g+2},${g+7},${.12+r()*.18})`;x.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}x.strokeStyle='rgba(15,18,24,.22)';x.lineWidth=1;for(let i=0;i<8;i++){x.beginPath();let xx=r()*w,yy=0;x.moveTo(xx,yy);for(let y=0;y<h;y+=14){xx+=(r()-.5)*5;x.lineTo(xx,y);}x.stroke();}x.fillStyle='rgba(15,17,22,.15)';x.fillRect(w*.18,0,w*.1,h);x.fillRect(w*.72,0,w*.1,h);});
    asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;
    this.roadMat=new THREE.MeshPhysicalMaterial({color:0xffffff,map:asphalt,bumpMap:asphalt,bumpScale:.014,roughness:.34,metalness:.35,clearcoat:.78,clearcoatRoughness:.13,envMap:ENV_TEX,envMapIntensity:.72});this.addRibbon(-this.halfWidth,this.halfWidth,.045,.045,this.roadMat);this.curbMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.08,emissive:0x260811,emissiveIntensity:.35});this.addRibbon(-this.halfWidth-1.15,-this.halfWidth,.10,.10,this.curbMat,i=>(Math.floor(i/3)%2)?0xf1f5ff:0xff294d);this.addRibbon(this.halfWidth,this.halfWidth+1.15,.10,.10,this.curbMat,i=>(Math.floor(i/3)%2)?0xf1f5ff:0xff294d);const walk=new THREE.MeshStandardMaterial({color:0x202634,roughness:.8,metalness:.08});this.addRibbon(-this.halfWidth-5.4,-this.halfWidth-1.25,.19,.19,walk);this.addRibbon(this.halfWidth+1.25,this.halfWidth+5.4,.19,.19,walk);const rail=new THREE.MeshStandardMaterial({color:0x121d28,metalness:.8,roughness:.28,emissive:0x073d47,emissiveIntensity:.3,side:THREE.DoubleSide});this.buildGuardBarriers();this.buildCurbBlocks();this.buildRoadsideProps();const neon=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.96,blending:THREE.AdditiveBlending,depthWrite:false});const railColor=i=>[0xff2f88,0x39f4ff,0xff9e45][Math.floor(i/14)%3];this.addRibbon(-this.halfWidth-1.56,-this.halfWidth-1.42,1.08,1.08,neon,railColor);this.addRibbon(this.halfWidth+1.42,this.halfWidth+1.56,1.08,1.08,neon,i=>railColor(i+7));const wetPink=new THREE.MeshBasicMaterial({color:0xff2f88,transparent:true,opacity:.085,blending:THREE.AdditiveBlending,depthWrite:false});const wetCyan=new THREE.MeshBasicMaterial({color:0x39f4ff,transparent:true,opacity:.085,blending:THREE.AdditiveBlending,depthWrite:false});this.addRibbon(-this.halfWidth*.96,-this.halfWidth*.55,.056,.056,wetPink);this.addRibbon(this.halfWidth*.55,this.halfWidth*.96,.056,.056,wetCyan);const line=new THREE.MeshBasicMaterial({color:0xbffcff,transparent:true,opacity:.86,blending:THREE.AdditiveBlending,depthWrite:false});const lane=this.halfWidth*.5;this.addRibbon(-lane-.06,-lane+.06,.065,.065,line);this.addRibbon(lane-.06,lane+.06,.065,.065,line);const edge=this.halfWidth-.34;const edgeMat=new THREE.MeshBasicMaterial({color:0xdff9ff,transparent:true,opacity:.46,blending:THREE.AdditiveBlending,depthWrite:false});this.addRibbon(-edge,-edge+.1,.067,.067,edgeMat);this.addRibbon(edge-.1,edge,.067,.067,edgeMat);this.addDashes();this.buildRamp();this.buildStartLine();this.buildGates();this.buildGantry();this.buildGroundDetails();this.buildTireBarriers();}
 buildBounds(){let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(const s of this.samples){minX=Math.min(minX,s.p.x);maxX=Math.max(maxX,s.p.x);minZ=Math.min(minZ,s.p.z);maxZ=Math.max(maxZ,s.p.z);}this.bounds={minX,maxX,minZ,maxZ};}
 setWet(on){if(!this.roadMat)return;this.roadMat.roughness=on?.22:.38;this.roadMat.metalness=on?.58:.38;this.roadMat.envMapIntensity=on?1.15:.65;this.roadMat.clearcoatRoughness=on?.06:.18;}
 setActiveGate(index){this.gateMats.forEach((m,k)=>{const a=k===index;m.color.setHex(a?0xd6ff3f:0x41516b);m.emissive.setHex(a?0xd6ff3f:0x40122c);m.emissiveIntensity=a?2.4:.45;});}
}

class World{
 constructor(scene,track,renderer,mapKey='neon'){this.scene=scene;this.track=track;this.renderer=renderer;this.mapKey=mapKey;this.theme=MAPS[mapKey]?MAPS[mapKey].theme:'city';this.night=true;this.rainOn=true;this.quality='auto';this.buildSky();this.buildGround();this.buildCity();this.buildLandmarks();this.buildLamps();this.buildSigns();this.buildBay();if(this.mapKey==='port')this.buildPortYard();this.buildAtmosphere();this.buildRain();this.setNight(true);this.setRain(true);}
 buildSky(){
    this.hemi=new THREE.HemisphereLight(0x9fc4ff,0x180b22,.92);this.ambient=new THREE.AmbientLight(0x334b7a,.34);this.sun=new THREE.DirectionalLight(0xffc08a,1.65);this.sun.position.set(-90,120,-50);this.scene.add(this.hemi,this.ambient,this.sun);
    this.skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uTop:{value:new THREE.Color(0x02040c)},uHorizon:{value:new THREE.Color(0x36194f)},uSunDir:{value:new THREE.Vector3(-.4,.3,-.7).normalize()},uSunColor:{value:new THREE.Color(0xff9e54)},uNight:{value:1},uTime:{value:0}},vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'precision highp float;varying vec3 vDir;uniform vec3 uTop,uHorizon,uSunDir,uSunColor;uniform float uNight,uTime;float hash(vec3 p){p=fract(p*0.3183099+vec3(.1,.2,.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}void main(){vec3 d=normalize(vDir);float h=clamp(d.y*.5+.5,0.0,1.0);vec3 col=mix(uHorizon,uTop,pow(h,.66));float sun=pow(max(dot(d,normalize(uSunDir)),0.0),900.0);col+=uSunColor*sun*(1.0-uNight)*2.2;float glow=pow(max(0.0,1.0-abs(d.y)*5.0),7.0);col+=vec3(1.0,.16,.60)*glow*.16*uNight;col+=vec3(1.0,.42,.18)*glow*.10*(1.0-uNight);float cloud=sin(d.x*4.0+uTime*.025)+sin(d.z*5.0-uTime*.018);float cm=smoothstep(.55,1.5,cloud)*smoothstep(.05,.45,d.y)*(1.0-smoothstep(.55,.9,d.y));col+=vec3(.07,.02,.12)*cm*(.28+uNight*.5);vec3 sp=floor(d*690.0);float star=step(.9965,hash(sp));col+=vec3(.9,.95,1.0)*star*uNight*smoothstep(.02,.2,d.y);gl_FragColor=vec4(col,1.0);}'});
    this.sky=new THREE.Mesh(new THREE.SphereGeometry(700,32,18),this.skyMat);this.sky.frustumCulled=false;this.sky.renderOrder=-100;this.scene.add(this.sky);
  }
  buildGround(){const tex=canvasTexture(256,256,(x,w,h)=>{x.fillStyle='#1b202b';x.fillRect(0,0,w,h);const r=mulberry32(998);for(let i=0;i<2600;i++){const g=24+Math.floor(r()*38);x.fillStyle=`rgba(${g},${g+3},${g+8},${.08+r()*.16})`;x.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}x.strokeStyle='rgba(80,100,120,.08)';for(let i=0;i<4;i++){x.beginPath();x.moveTo(0,r()*h);x.lineTo(w,r()*h);x.stroke();}});tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(18,18);const mat=new THREE.MeshStandardMaterial({color:0xffffff,map:tex,roughness:.92,metalness:.05}),g=new THREE.Mesh(new THREE.PlaneGeometry(2200,2200),mat);g.rotation.x=-Math.PI/2;g.position.y=-.18;this.scene.add(g);}
 buildCity(){
    const makeWindowTex=(variant)=>{
      return canvasTexture(256,512,(x,w,h)=>{
        const walls=['#68707b','#827b6e','#3a526d','#416b73'],wall=walls[variant];
        x.fillStyle=wall;x.fillRect(0,0,w,h);
        const r=mulberry32(1200+variant*977);
        const cols=[10,14,9,8][variant],rows=[24,28,18,16][variant],padX=12,padY=12,cw=(w-padX*2)/cols,ch=(h-padY*2)/rows;
        const warm=['#ffc37b','#ffd9a1','#ffad55'],cool=['#78e8ff','#a7f6ff','#67bfff'],white=['#eef8ff','#ffffff'];
        for(let ry=0;ry<rows;ry++){
          const darkFloor=r()<[.18,.32,.22,.28][variant];
          const floorY=padY+ry*ch;
          x.fillStyle=darkFloor?'rgba(10,16,24,.28)':'rgba(235,245,255,.07)';x.fillRect(padX-3,floorY-1,w-padX*2+6,2);
          for(let cx=0;cx<cols;cx++){
            const lit=!darkFloor&&r()>[.36,.48,.3,.42][variant];
            if(!lit){x.fillStyle=r()<.5?'#1b2837':'#263241';}else{const pool=r();const palette=pool<.45?warm:pool<.82?cool:white;x.fillStyle=palette[Math.floor(r()*palette.length)];if(r()<.09)x.fillStyle='#ff4fbf';}
            const ww=Math.max(2,cw*(.34+r()*.38)),hh=Math.max(2,ch*(.25+r()*.34)),wx=padX+cx*cw+(cw-ww)*.5,wy=floorY+(ch-hh)*.5;
            x.fillRect(wx,wy,ww,hh);x.strokeStyle='rgba(6,10,16,.46)';x.lineWidth=1;x.strokeRect(wx-.5,wy-.5,ww+1,hh+1);
          }
        }
        x.fillStyle='rgba(255,255,255,.06)';for(let cx=0;cx<=cols;cx++)x.fillRect(padX+cx*cw-1,padY,1,h-padY*2);
        if(variant===2||variant===3){
          const count=variant===3?8:4;
          for(let i=0;i<count;i++){x.fillStyle=['#ff2f88','#39f4ff','#d6ff3f','#ff9e45'][i%4];x.fillRect(10+r()*(w-80),20+r()*(h-50),25+r()*55,5+r()*14);}
        }
      });
    };
    const textures=[0,1,2,3].map(makeWindowTex);
    this.buildingMats=textures.map(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;return new THREE.MeshStandardMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:1.15,color:0xffffff,roughness:.62,metalness:.27});});
    const target=this.mapKey==='port'?105:180,r=mulberry32(91273),data=[];let tries=0;
    while(data.length<target&&tries<target*18){
      tries++;
      const ss=this.track.samples[(Math.floor(r()*this.track.N))%this.track.N],sign=r()>.5?1:-1,off=this.track.halfWidth+16+r()*62,p=ss.p.clone().addScaledVector(ss.side,sign*off).addScaledVector(ss.t,(r()-.5)*26),w=5+r()*10,d=5+r()*10,h=this.mapKey==='port'?9+r()*r()*50:20+r()*r()*105,rot=r()*Math.PI;
      if(!this.track.clearFootprint(p.x,p.z,w,d,rot,3.2))continue;
      data.push({x:p.x,z:p.z,w,h,d,rot,variant:data.length%4});
    }
    const count=data.length;
    const dummy=new THREE.Object3D(),col=new THREE.Color();this.buildingMeshes=[];
    for(let v=0;v<4;v++){
      const items=data.filter(b=>b.variant===v),mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),this.buildingMats[v],items.length);mesh.geometry.translate(0,.5,0);
      for(let i=0;i<items.length;i++){const b=items[i];dummy.position.set(b.x,0,b.z);dummy.rotation.set(0,b.rot,0);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);const walls=[0x7d8795,0x9b9281,0x496984,0x507e84];col.setHex(walls[i%4]);col.offsetHSL(0,0,(r()-.5)*.12);mesh.setColorAt(i,col);}
      mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;this.scene.add(mesh);this.buildingMeshes.push(mesh);
    }
    const trim=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.14,1),new THREE.MeshBasicMaterial({color:0xffffff}),count);
    const acCount=Math.floor(count/2),ac=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x19263a,metalness:.5,roughness:.62,emissive:0x0b2638,emissiveIntensity:.3}),acCount);ac.geometry.translate(0,.5,0);
    const antennaCount=Math.ceil(count/3),antGeo=new THREE.CylinderGeometry(.06,.12,7,5);antGeo.translate(0,3.5,0);const ant=new THREE.InstancedMesh(antGeo,new THREE.MeshStandardMaterial({color:0x1c2636,metalness:.75,roughness:.35}),antennaCount);
    const beaconPos=new Float32Array(antennaCount*3),trimColors=[0x39f4ff,0xff2f88,0xff9e45],adPos=[],adCol=[],palette=[[1,.22,.55],[.22,.95,1],[1,.65,.25],[.85,1,.18]];
    for(let i=0;i<count;i++){
      const b=data[i];dummy.rotation.set(0,b.rot,0);dummy.scale.set(b.w*1.025,1,b.d*1.025);dummy.position.set(b.x,b.h+.03,b.z);dummy.updateMatrix();trim.setMatrixAt(i,dummy.matrix);col.setHex(trimColors[i%3]);trim.setColorAt(i,col);
      if(i%2===0){const j=i/2;dummy.rotation.set(0,b.rot,0);dummy.scale.set(Math.max(1.2,b.w*.22),1.1+((i*7)%5)*.35,Math.max(1.2,b.d*.22));dummy.position.set(b.x+b.w*.18,b.h,b.z-b.d*.12);dummy.updateMatrix();ac.setMatrixAt(j,dummy.matrix);}
      if(i%3===0){const k=i/3;dummy.rotation.set(0,b.rot,0);dummy.scale.set(1,1,1);dummy.position.set(b.x+(i%2?1:-1)*b.w*.26,b.h,b.z+(i%5-2)*b.d*.12);dummy.updateMatrix();ant.setMatrixAt(k,dummy.matrix);beaconPos[k*3]=dummy.position.x;beaconPos[k*3+1]=b.h+7.1;beaconPos[k*3+2]=dummy.position.z;}
      if(i%5===0){const c=palette[i%4];adPos.push(b.x+(r()-.5)*b.w*.7,b.h*(.3+r()*.6),b.z+b.d*.51);adCol.push(c[0],c[1],c[2]);}
    }
    trim.instanceMatrix.needsUpdate=true;if(trim.instanceColor)trim.instanceColor.needsUpdate=true;ac.instanceMatrix.needsUpdate=true;ant.instanceMatrix.needsUpdate=true;
    const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(beaconPos,3));const beacons=new THREE.Points(bg,new THREE.PointsMaterial({map:SOFT,color:0xff3344,size:.72,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));beacons.frustumCulled=false;
    const ag=new THREE.BufferGeometry();ag.setAttribute('position',new THREE.Float32BufferAttribute(adPos,3));ag.setAttribute('color',new THREE.Float32BufferAttribute(adCol,3));this.adGlow=new THREE.Points(ag,new THREE.PointsMaterial({map:SOFT,vertexColors:true,size:1.1,transparent:true,opacity:.34,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));this.adGlow.frustumCulled=false;
    const edgeCount=Math.max(1,data.length*2),edge=new THREE.InstancedMesh(new THREE.BoxGeometry(.085,1,.085),new THREE.MeshBasicMaterial({color:0xffffff}),edgeCount),edgeColors=[0xff2f88,0x39f4ff,0xff9e45];let ei=0;
    for(let i=0;i<data.length;i++){const b=data[i],c=Math.cos(b.rot),s=Math.sin(b.rot);for(const sx of[-1,1]){const lx=sx*b.w*.51,px=b.x+lx*c,pz=b.z-lx*s;dummy.position.set(px,b.h*.45,pz);dummy.rotation.set(0,b.rot,0);dummy.scale.set(1,b.h*.86,1);dummy.updateMatrix();edge.setMatrixAt(ei,dummy.matrix);col.setHex(edgeColors[(i+(sx>0?1:0))%3]);edge.setColorAt(ei,col);ei++;}}
    edge.count=ei;edge.instanceMatrix.needsUpdate=true;if(edge.instanceColor)edge.instanceColor.needsUpdate=true;
    this.cityDetails=new THREE.Group();this.cityDetails.add(trim,ac,ant,beacons,this.adGlow,edge);this.scene.add(this.cityDetails);this.buildingData=data;
    
  }
  buildLandmarks(){
    const g=new THREE.Group(),stone=new THREE.MeshStandardMaterial({color:0x45536a,metalness:.42,roughness:.46,emissive:0x101c2e,emissiveIntensity:.36}),glass=this.buildingMats?this.buildingMats[1]:stone,sailMat=new THREE.MeshStandardMaterial({color:0xc6d3df,metalness:.12,roughness:.38,emissive:0x152b3d,emissiveIntensity:.2}),bridgeMat=new THREE.MeshStandardMaterial({color:0x8e4b35,metalness:.58,roughness:.38,emissive:0x3d140b,emissiveIntensity:.42}),mountainMat=new THREE.MeshStandardMaterial({color:0x0b2130,roughness:.98,metalness:.02,emissive:0x08161f,emissiveIntensity:.24});
    const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.userData.staticPart=true;g.add(m);return m;};
    const b=this.track.bounds,cx=(b.minX+b.maxX)*.5,cz=(b.minZ+b.maxZ)*.5;
    const safePlace=(angle,radius,w,d,rot,make)=>{
      for(let k=0;k<8;k++){
        const r=radius+k*44,x=cx+Math.cos(angle)*r,z=cz+Math.sin(angle)*r;
        if(this.track.clearFootprint(x,z,w,d,rot,10)){make(x,z,r);return;}
      }
    };
    safePlace(.72,315,24,24,0,(x,z)=>{const m=add(new THREE.CylinderGeometry(2.2,11,112,4),glass,x,56,z);m.rotation.y=Math.PI/4;add(new THREE.CylinderGeometry(.2,.48,22,6),stone,x,122,z);});
    safePlace(2.28,325,24,24,.2,(x,z)=>{add(new THREE.CylinderGeometry(7,9,88,12),glass,x,44,z);add(new THREE.CylinderGeometry(5.5,7,12,12),stone,x,93,z);});
    safePlace(3.45,325,26,26,0,(x,z)=>{add(new THREE.CylinderGeometry(3.2,7.4,70,10),stone,x,35,z);const dome=add(new THREE.SphereGeometry(10.5,14,8,0,Math.PI*2,0,Math.PI/2),glass,x,69,z);dome.scale.y=.72;});
    safePlace(4.55,340,28,28,.1,(x,z)=>{add(new THREE.BoxGeometry(24,96,24),glass,x,48,z);add(new THREE.BoxGeometry(24,96,24),glass,x+30,48,z+18);});
    safePlace(5.45,335,38,12,.2,(x,z)=>{for(let i=0;i<3;i++){const sh=add(new THREE.SphereGeometry(1,12,7,0,Math.PI*2,0,Math.PI*.56),sailMat,x+i*16,7+i*3,z+i*18);sh.scale.set(18,20,5);sh.rotation.set(0,.3-i*.25,.1);}});
    const bx=this.track.bounds.maxX+(this.mapKey==='port'?420:340),bz=cz;
    add(new THREE.BoxGeometry(17,1.8,410),bridgeMat,bx,17,bz);
    for(const zz of[bz-118,bz+118])for(const sx of[-1,1])add(new THREE.BoxGeometry(1.2,50,1.2),bridgeMat,bx+sx*8.5,25,zz);
    for(const zz of[bz-118,bz+118])add(new THREE.BoxGeometry(18,.9,1),bridgeMat,bx,40,zz);
    const cablePos=[];
    for(const sx of[-1,1]){const x=bx+sx*8.2;for(let i=0;i<34;i++){const t0=i/34,t1=(i+1)/34,z0=bz-190+380*t0,z1=bz-190+380*t1,y0=18+29*Math.pow(Math.abs(2*t0-1),1.7),y1=18+29*Math.pow(Math.abs(2*t1-1),1.7);cablePos.push(x,y0,z0,x,y1,z1);}for(let zz=bz-180;zz<=bz+180;zz+=15){const t=(zz-(bz-190))/380,y=18+29*Math.pow(Math.abs(2*t-1),1.7);if(y>18.7)cablePos.push(x,y,zz,x,18,zz);}}
    const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(cablePos,3));this.landmarkCables=new THREE.LineSegments(cg,new THREE.LineBasicMaterial({color:0xff9d61,transparent:true,opacity:.62}));g.add(this.landmarkCables);
    const dl=[];for(let zz=bz-190;zz<=bz+190;zz+=20)for(const sx of[-1,1])dl.push(bx+sx*6.8,19.5,zz);const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(dl,3));this.landmarkGlow=new THREE.Points(dg,new THREE.PointsMaterial({map:SOFT,color:0xffb469,size:1.15,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));g.add(this.landmarkGlow);
    const mountainGeo=new THREE.ConeGeometry(1,1,5);mountainGeo.translate(0,.5,0);const mr=mulberry32(4455);for(let i=0;i<22;i++){const ang=i/22*Math.PI*2,rad=610+mr()*45,m=add(mountainGeo,mountainMat,Math.cos(ang)*rad,0,Math.sin(ang)*rad);m.scale.set(42+mr()*55,34+mr()*64,42+mr()*55);m.rotation.y=mr()*Math.PI;}
    mergeStaticCar(g);this.scene.add(g);this.landmarks=g;
  }
  buildLamps(){
    const count=58,step=Math.floor(this.track.N/count),postGeo=new THREE.CylinderGeometry(.075,.12,5,6);postGeo.translate(0,2.5,0);
    const headGeo=new THREE.BoxGeometry(.72,.14,1.5);headGeo.translate(0,5.05,0);
    const postMat=new THREE.MeshStandardMaterial({color:0x111827,metalness:.8,roughness:.35});
    this.lampHeadMat=new THREE.MeshBasicMaterial({color:0xc8fbff});
    const posts=new THREE.InstancedMesh(postGeo,postMat,count),heads=new THREE.InstancedMesh(headGeo,this.lampHeadMat,count),dummy=new THREE.Object3D();
    this.lampLights=[];const glowPos=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const ss=this.track.samples[(i*step)%this.track.N],sign=i%2?1:-1;let off=this.track.halfWidth+3.05,p=ss.p.clone().addScaledVector(ss.side,sign*off);
      for(let k=0;k<7&&this.track.nearest(p.x,p.z).distance<this.track.halfWidth+2.4;k++){off+=5;p=ss.p.clone().addScaledVector(ss.side,sign*off);}
      dummy.position.copy(p);dummy.rotation.set(0,Math.atan2(ss.t.x,ss.t.z),0);dummy.scale.set(1,1,1);dummy.updateMatrix();
      posts.setMatrixAt(i,dummy.matrix);heads.setMatrixAt(i,dummy.matrix);
      glowPos[i*3]=p.x;glowPos[i*3+1]=p.y+5.0;glowPos[i*3+2]=p.z;
      if(i%15===0){const pl=new THREE.PointLight(0x86e8ff,0,24,2);pl.position.copy(p);pl.position.y+=4.9;this.scene.add(pl);this.lampLights.push(pl);}
    }
    posts.instanceMatrix.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;this.lampPosts=posts;this.scene.add(posts,heads);
    const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.BufferAttribute(glowPos,3));
    this.lampGlow=new THREE.Points(gg,new THREE.PointsMaterial({map:SOFT,color:0x7feaff,size:4.2,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
    this.lampGlow.frustumCulled=false;this.scene.add(this.lampGlow);
  }
  buildSigns(){
    const specs=this.mapKey==='port'?[[.08,'铁潮港','IRON TIDE / 01','#ff9e45'],[.24,'CARGO 09','PORT AUTHORITY','#39f4ff'],[.43,'DOCK 7','NIGHT SHIFT','#d6ff3f'],[.64,'IRON TIDE','HEAVY FREIGHT','#ff3f9a'],[.83,'NO LIMIT','HARBOR AFTER DARK','#ff9e45']]:[[.075,'霓虹湾','NEON BAY / 01','#39f4ff'],[.18,'BAY 09','HARBOR / DOCKS','#ff9e45'],[.34,'NIGHTSHIFT','STREET DIVISION','#d6ff3f'],[.51,'SEA GLASS','NIGHT MARKET','#39f4ff'],[.62,'KAZE','DRIFT FREQUENCY','#ff38ce'],[.83,'NO LIMIT','NEON BAY AFTER DARK','#ff9e45']];
    const frameMat=new THREE.MeshStandardMaterial({color:0x101a28,metalness:.82,roughness:.26,emissive:0x0b2236,emissiveIntensity:.34});
    for(let i=0;i<specs.length;i++){
      const[u,main,sub,color]=specs[i],p=this.track.curve.getPointAt(u),t=this.track.curve.getTangentAt(u).normalize(),side=new THREE.Vector3().crossVectors(UP,t).normalize();let off=this.track.halfWidth+9,pos=p.clone().addScaledVector(side,(i%2?1:-1)*off).add(new THREE.Vector3(0,6,0));for(let tr=0;tr<7&&!this.track.clearPoint(pos.x,pos.z,8);tr++){off+=7;pos=p.clone().addScaledVector(side,(i%2?1:-1)*off).add(new THREE.Vector3(0,6,0));}const tex=signTexture(main,sub,color),group=new THREE.Group();
      group.position.copy(pos);group.lookAt(p.x,pos.y,p.z);
      const plane=new THREE.Mesh(new THREE.PlaneGeometry(13.8,5.8),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));plane.position.z=.19;plane.userData.staticPart=true;group.add(plane);
      const back=new THREE.Mesh(new THREE.BoxGeometry(14.8,6.6,.34),frameMat);back.userData.staticPart=true;group.add(back);
      for(const sx of[-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(.36,6.8,.36),frameMat);post.position.set(sx*4.9,-3.2,-.05);post.userData.staticPart=true;group.add(post);}
      mergeStaticCar(group);this.scene.add(group);
    }
  }
  buildBay(){
    this.waterTime=0;this.waterFrame=0;
    const geo=new THREE.PlaneGeometry(500,800,34,34);
    this.waterBase=Float32Array.from(geo.attributes.position.array);
    this.waterMat=new THREE.MeshPhysicalMaterial({color:0x031a2e,metalness:.68,roughness:.12,clearcoat:1,clearcoatRoughness:.06,envMap:ENV_TEX,envMapIntensity:1.35,transparent:true,opacity:.96,emissive:0x071c33,emissiveIntensity:.26});
    this.water=new THREE.Mesh(geo,this.waterMat);this.water.rotation.x=-Math.PI/2;const wx=this.mapKey==='port'?650:490;this.water.position.set(wx,-.35,120);this.water.frustumCulled=false;this.scene.add(this.water);
    const glintCount=140,gp=new Float32Array(glintCount*3),r=mulberry32(3388);
    const gx0=this.mapKey==='port'?420:260;for(let i=0;i<glintCount;i++){gp[i*3]=gx0+r()*430;gp[i*3+1]=.05+r()*.05;gp[i*3+2]=-240+r()*660;}
    const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.BufferAttribute(gp,3));
    this.bayGlints=new THREE.Points(gg,new THREE.PointsMaterial({map:SOFT,color:0x8eeaff,size:.9,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
    this.bayGlints.frustumCulled=false;this.scene.add(this.bayGlints);
    const whGeo=new THREE.BoxGeometry(1,1,1);whGeo.translate(0,.5,0);
    const whMat=new THREE.MeshStandardMaterial({color:0x09131f,roughness:.72,metalness:.28,emissive:0x08263c,emissiveIntensity:.42});
    const wh=new THREE.InstancedMesh(whGeo,whMat,22),dummy=new THREE.Object3D(),rr=mulberry32(7781),whData=[];let wtries=0;
    while(whData.length<22&&wtries<120){
      wtries++;
      const w=16+rr()*30,h=6+rr()*15,d=16+rr()*30,x=228+rr()*30,z=-220+rr()*620,rot=rr()*.35;
      if(!this.track.clearFootprint(x,z,w,d,rot,4.0))continue;
      dummy.position.set(x,0,z);dummy.rotation.y=rot;dummy.scale.set(w,h,d);dummy.updateMatrix();wh.setMatrixAt(whData.length,dummy.matrix);whData.push({x,z,w,h,d,rot});
    }
    wh.count=whData.length;wh.instanceMatrix.needsUpdate=true;this.warehouses=wh;this.scene.add(wh);
    const whTrim=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.12,1),new THREE.MeshBasicMaterial({color:0xffffff}),whData.length),whCol=new THREE.Color(),wc=[0x39f4ff,0xff2f88,0xff9e45];
    for(let i=0;i<whData.length;i++){const b=whData[i];dummy.position.set(b.x,b.h+.06,b.z);dummy.rotation.set(0,b.rot,0);dummy.scale.set(b.w*1.02,1,b.d*1.02);dummy.updateMatrix();whTrim.setMatrixAt(i,dummy.matrix);whCol.setHex(wc[i%3]);whTrim.setColorAt(i,whCol);}whTrim.instanceMatrix.needsUpdate=true;if(whTrim.instanceColor)whTrim.instanceColor.needsUpdate=true;this.warehouseTrim=whTrim;this.scene.add(whTrim);
    const craneMat=new THREE.MeshStandardMaterial({color:0x243445,metalness:.82,roughness:.32,emissive:0x0a2a3e,emissiveIntensity:.35});
    for(const z of(this.mapKey==='port'?[-170,-55,60,190]:[-95,85])){
      const mast=new THREE.Mesh(new THREE.BoxGeometry(.85,27,.85),craneMat);mast.position.set(270,13.5,z);this.scene.add(mast);
      const boom=new THREE.Mesh(new THREE.BoxGeometry(19,.7,.7),craneMat);boom.position.set(279.2,26.2,z);this.scene.add(boom);
      const tip=new THREE.Mesh(new THREE.SphereGeometry(.55,8,6),new THREE.MeshBasicMaterial({color:0xffad55}));tip.position.set(288.7,26.2,z);this.scene.add(tip);
    }
    const towerMat=new THREE.MeshStandardMaterial({color:0x162338,metalness:.55,roughness:.4,emissive:0x10243c,emissiveIntensity:.35});
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(3.2,6,34,10),towerMat);tower.position.set(318,16.6,-170);this.scene.add(tower);
    const lamp=new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.2,3.4,10),new THREE.MeshStandardMaterial({color:0xffe0a0,emissive:0xffbd66,emissiveIntensity:3,roughness:.2}));lamp.position.set(318,34.5,-170);this.scene.add(lamp);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(6.4,5,10),towerMat);roof.position.set(318,38.6,-170);this.scene.add(roof);
    const ringMat=new THREE.MeshStandardMaterial({color:0x5a3a22,metalness:.85,roughness:.22,emissive:0xff9e45,emissiveIntensity:1.1});
    for(const yy of[9,17,25,32.5]){const rr0=5.0-yy*.032;const ring=new THREE.Mesh(new THREE.TorusGeometry(rr0,.1,5,18),ringMat);ring.rotation.x=Math.PI/2;ring.position.set(318,yy,-170);this.scene.add(ring);}
    const rail=new THREE.Mesh(new THREE.TorusGeometry(5.55,.075,5,20),ringMat);rail.rotation.x=Math.PI/2;rail.position.set(318,32.2,-170);this.scene.add(rail);
    this.lighthouseBeamMat=new THREE.MeshBasicMaterial({color:0xffc56e,transparent:true,opacity:.075,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    this.lighthouseBeam=new THREE.Group();this.lighthouseBeam.position.set(318,34.5,-170);
    for(const dir of[-1,1]){const b=new THREE.Mesh(new THREE.ConeGeometry(11,115,12,1,true),this.lighthouseBeamMat);b.rotation.z=dir*Math.PI/2;b.position.x=dir*57.5;this.lighthouseBeam.add(b);}
    this.scene.add(this.lighthouseBeam);
    this.lighthouseLight=new THREE.PointLight(0xffc56e,0,55,2);this.lighthouseLight.position.set(318,35,-170);this.scene.add(this.lighthouseLight);
  }
  buildPortYard(){
    const count=120,r=mulberry32(55179),geo=new THREE.BoxGeometry(1,1,1);geo.translate(0,.5,0);
    const mat=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.46,roughness:.48,emissive:0x081820,emissiveIntensity:.24});
    const mesh=new THREE.InstancedMesh(geo,mat,count),dummy=new THREE.Object3D(),col=new THREE.Color(),palette=[0xb84b2e,0x1f6f78,0x7c3347,0x3c5f7a,0xb4882f];let placed=0;
    for(let i=0;i<count;i++){
      const ss=this.track.samples[(i*13+31)%this.track.N],sign=i%2?1:-1,off=this.track.halfWidth+4.6+(i%5)*3.9+r()*1.2,p=ss.p.clone().addScaledVector(ss.side,sign*off).addScaledVector(ss.t,(r()-.5)*4),rot=Math.atan2(ss.t.x,ss.t.z);
      if(!this.track.clearFootprint(p.x,p.z,2.55,6.1,rot,2.0))continue;
      const stack=i%7===0;dummy.position.set(p.x,-.12,p.z);dummy.rotation.set(0,rot,0);dummy.scale.set(2.55,stack?5.2:2.6,6.1);dummy.updateMatrix();mesh.setMatrixAt(placed,dummy.matrix);col.setHex(palette[i%palette.length]);mesh.setColorAt(placed,col);placed++;
    }
    mesh.count=placed;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;this.portYard=new THREE.Group();this.portYard.add(mesh);
    const ship=new THREE.Group(),hull=new THREE.Mesh(new THREE.BoxGeometry(92,7,22),new THREE.MeshStandardMaterial({color:0x13212b,metalness:.6,roughness:.38,emissive:0x071a24,emissiveIntensity:.3}));hull.position.y=3.4;ship.add(hull);
    const deck=new THREE.Mesh(new THREE.BoxGeometry(78,1,18),new THREE.MeshStandardMaterial({color:0x384650,metalness:.45,roughness:.5}));deck.position.set(-3,7.2,0);ship.add(deck);
    for(let i=0;i<10;i++){const box=new THREE.Mesh(new THREE.BoxGeometry(4.8,2.5,4.2),new THREE.MeshStandardMaterial({color:palette[i%palette.length],roughness:.55,metalness:.35}));box.position.set(-34+i*7,9.2,(i%2?.2:0)+2.2);ship.add(box);}
    const bridge=new THREE.Mesh(new THREE.BoxGeometry(13,12,16),new THREE.MeshStandardMaterial({color:0x263b4c,metalness:.5,roughness:.4,emissive:0x0b2638,emissiveIntensity:.45}));bridge.position.set(35,12,0);ship.add(bridge);
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.16,.3,13,6),new THREE.MeshStandardMaterial({color:0x263744,metalness:.7,roughness:.3}));mast.position.set(35,24,0);ship.add(mast);
    const top=new THREE.Mesh(new THREE.SphereGeometry(.65,8,6),new THREE.MeshBasicMaterial({color:0xff4455}));top.position.set(35,30.8,0);ship.add(top);
    ship.position.set(this.mapKey==='port'?650:520,0,150);ship.rotation.y=-.25;this.portYard.add(ship);
    const ferry=new THREE.Group(),hullMat=new THREE.MeshStandardMaterial({color:0x1b3a3a,metalness:.58,roughness:.36,emissive:0x08262a,emissiveIntensity:.35}),trimMat=new THREE.MeshStandardMaterial({color:0xd2ddd8,metalness:.25,roughness:.45}),winMat=new THREE.MeshBasicMaterial({color:0xffd38a}),lightMat=new THREE.MeshBasicMaterial({color:0x6ff4ff});const fh=new THREE.Mesh(new THREE.BoxGeometry(23,2.4,7),hullMat);fh.position.y=1.4;ferry.add(fh);const fdeck=new THREE.Mesh(new THREE.BoxGeometry(17,2,5.4),trimMat);fdeck.position.y=3.2;ferry.add(fdeck);const fupper=new THREE.Mesh(new THREE.BoxGeometry(11,1.8,4.5),trimMat);fupper.position.y=4.9;ferry.add(fupper);const windows=new THREE.Mesh(new THREE.BoxGeometry(15.8,.55,5.55),winMat);windows.position.y=3.8;ferry.add(windows);const roofLight=new THREE.Mesh(new THREE.BoxGeometry(9,.22,.22),lightMat);roofLight.position.set(0,6,.5);ferry.add(roofLight);const fmast=new THREE.Mesh(new THREE.CylinderGeometry(.1,.18,5,6),trimMat);fmast.position.set(0,7.3,0);ferry.add(fmast);ferry.position.set(this.mapKey==='port'?760:540,-.2,20);this.ferry=ferry;this.ferryBaseZ=20;this.scene.add(ferry);this.scene.add(this.portYard);
  }
  buildAtmosphere(){
    const r=mulberry32(99117),dustCount=110,dp=new Float32Array(dustCount*3);
    for(let i=0;i<dustCount;i++){const s=this.track.samples[(i*41)%this.track.N];dp[i*3]=s.p.x+(r()-.5)*38;dp[i*3+1]=.7+r()*8;dp[i*3+2]=s.p.z+(r()-.5)*38;}
    const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
    this.dust=new THREE.Points(dg,new THREE.PointsMaterial({map:SOFT,color:0xff62c8,size:.22,transparent:true,opacity:.46,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));this.dust.frustumCulled=false;this.scene.add(this.dust);
    const mistCount=80,mp=new Float32Array(mistCount*3);
    for(let i=0;i<mistCount;i++){mp[i*3]=250+r()*400;mp[i*3+1]=.4+r()*7;mp[i*3+2]=-260+r()*700;}
    const mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.BufferAttribute(mp,3));
    this.mist=new THREE.Points(mg,new THREE.PointsMaterial({map:SOFT,color:0x69cfff,size:8,transparent:true,opacity:.035,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));this.mist.frustumCulled=false;this.scene.add(this.mist);
  }
  buildRain(){const count=540,pos=new Float32Array(count*3),r=mulberry32(477);for(let i=0;i<count;i++){pos[i*3]=(r()-.5)*140;pos[i*3+1]=r()*55;pos[i*3+2]=(r()-.5)*140;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));this.rainMat=new THREE.PointsMaterial({color:0x9dccff,size:.13,transparent:true,opacity:.55,depthWrite:false,sizeAttenuation:true});this.rain=new THREE.Points(geo,this.rainMat);this.rain.frustumCulled=false;this.scene.add(this.rain);}
 updateAtmosphere(){const n=this.night,rain=this.rainOn;this.skyMat.uniforms.uNight.value=n?1:0;this.skyMat.uniforms.uTop.value.setHex(n?(this.mapKey==='port'?0x041820:0x061126):0x3f78bc);this.skyMat.uniforms.uHorizon.value.setHex(n?(this.mapKey==='port'?0x713744:0x482264):0xffc287);this.skyMat.uniforms.uSunColor.value.setHex(n?0xff9e54:0xffe0a8);this.sun.intensity=n?.36:2.1;this.hemi.intensity=n?.94:1.1;if(this.ambient)this.ambient.intensity=n?.34:.45;this.hemi.color.setHex(n?0x85a6ff:0xcfe3ff);this.hemi.groundColor.setHex(n?0x140a1c:0x4c4037);this.scene.fog.color.setHex(n?(this.mapKey==='port'?0x1a1822:0x11152d):0xaac2d4);this.scene.fog.density=(n?.00165:.00115)*(rain?1.28:1);if(this.buildingMats)for(const bm of this.buildingMats)bm.emissiveIntensity=n?1.2:.16;if(this.lampHeadMat)this.lampHeadMat.color.setHex(n?(this.mapKey==='port'?0xffc27a:0xc8fbff):0x3a4858);if(this.rainMat)this.rainMat.color.setHex(n?0x9dccff:0xcfe9ff);if(this.renderer)this.renderer.toneMappingExposure=n?1.2:1.16;if(this.lampLights)for(const l of this.lampLights)l.intensity=n?3.0:0;if(this.lampGlow){this.lampGlow.material.opacity=n?.86:.03;this.lampGlow.material.color.setHex(n?(this.mapKey==='port'?0xffb35a:0x7feaff):0x40505f);}if(this.waterMat){this.waterMat.color.setHex(n?0x031a2e:0x0e3a55);this.waterMat.emissiveIntensity=n?.3:.08;}if(this.bayGlints)this.bayGlints.material.opacity=n?.38:.1;if(this.lighthouseBeamMat)this.lighthouseBeamMat.opacity=n?.075:.015;if(this.lighthouseLight)this.lighthouseLight.intensity=n?1.8:0;if(this.dust)this.dust.material.opacity=n?.46:.15;if(this.mist)this.mist.material.opacity=n?.045:.02;if(this.adGlow)this.adGlow.material.opacity=n?.34:.08;}
  setNight(on){this.night=!!on;this.updateAtmosphere();}
 setRain(on){this.rainOn=!!on;this.track.setWet(this.rainOn);this.updateAtmosphere();if(this.rain)this.rain.visible=this.rainOn&&this.quality!=='low';}
 setQuality(q){this.quality=q;if(this.rain)this.rain.visible=this.rainOn&&q!=='low';if(this.cityDetails)this.cityDetails.visible=q!=='low';if(this.portYard)this.portYard.visible=q!=='low';if(this.landmarkCables)this.landmarkCables.visible=q!=='low';if(this.landmarkGlow)this.landmarkGlow.visible=q!=='low';if(this.mist)this.mist.visible=q!=='low';if(this.bayGlints)this.bayGlints.visible=q!=='low';}
 update(dt,camera){
    this.sky.position.copy(camera.position);this.skyMat.uniforms.uTime.value+=dt;
    if(this.water){
      this.waterTime+=dt;this.waterFrame++;
      const a=this.water.geometry.attributes.position.array,b=this.waterBase;
      for(let i=0;i<a.length;i+=3)a[i+2]=Math.sin(b[i]*.12+this.waterTime*1.1)*.22+Math.cos(b[i+1]*.1+this.waterTime*.85)*.12;
      this.water.geometry.attributes.position.needsUpdate=true;
      if(this.waterFrame%4===0)this.water.geometry.computeVertexNormals();
    }
    if(this.lighthouseBeam)this.lighthouseBeam.rotation.y+=dt*.42;if(this.ferry){this.ferry.position.z=this.ferryBaseZ+Math.sin(this.waterTime*.08)*28;this.ferry.rotation.y=-.25+Math.sin(this.waterTime*.05)*.12;}
    if(this.dust){
      const a=this.dust.geometry.attributes.position.array;
      for(let i=0;i<a.length;i+=3){a[i+1]+=dt*(.18+(i%7)*.03);if(a[i+1]>9)a[i+1]=.5;}
      this.dust.geometry.attributes.position.needsUpdate=true;
    }
    if(this.bayGlints)this.bayGlints.material.opacity=.24+.13*(.5+.5*Math.sin(this.waterTime*1.4));if(this.adGlow)this.adGlow.material.opacity=.26+.15*(.5+.5*Math.sin(this.waterTime*2.1));
    if(this.rain.visible){
      this.rain.position.set(camera.position.x,0,camera.position.z);
      const a=this.rain.geometry.attributes.position.array;
      for(let i=0;i<a.length;i+=3){a[i+1]-=dt*(42+(i%13)*2);if(a[i+1]<0)a[i+1]+=55;}
      this.rain.geometry.attributes.position.needsUpdate=true;
    }
  }

}

class InputHub{
  constructor(){
    this.keys=new Set();
    this.touch={left:false,right:false,accel:false,brake:false,nitro:false};
    this.pointers=new Map();
    this.actions={camera:false,reset:false,pause:false,beam:false};
    this.bindKeyboard();this.bindTouch();
  }
  bindKeyboard(){
    window.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
      this.keys.add(e.code);
      if(e.repeat)return;
      if(e.code==='KeyC')this.actions.camera=true;
      if(e.code==='KeyH')this.actions.beam=true;
      if(e.code==='KeyR')this.actions.reset=true;
      if(e.code==='Escape')this.actions.pause=true;
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>{this.keys.clear();this.resetTouch();});
  }
  bindTouch(){
    const hold=(id,key)=>{
      const el=$(id);if(!el)return;
      el.addEventListener('pointerdown',e=>{
        e.preventDefault();e.stopPropagation();
        if(this.pointers.has(e.pointerId))return;
        this.pointers.set(e.pointerId,{key,el});
        this.touch[key]=true;el.classList.add('down');
        try{el.setPointerCapture(e.pointerId);}catch(err){}
        if(key==='nitro'&&navigator.vibrate)navigator.vibrate(10);
      },{passive:false});
    };
    hold('#btnLeft','left');hold('#btnRight','right');hold('#btnGas','accel');hold('#btnBrake','brake');hold('#btnNitro','nitro');
    const release=e=>{
      const rec=this.pointers.get(e.pointerId);if(!rec)return;
      this.pointers.delete(e.pointerId);this.touch[rec.key]=false;rec.el.classList.remove('down');
      try{rec.el.releasePointerCapture(e.pointerId);}catch(err){}
    };
    window.addEventListener('pointerup',release,true);
    window.addEventListener('pointercancel',release,true);
    window.addEventListener('lostpointercapture',release,true);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.resetTouch();});
    const stop=e=>e.preventDefault();
    document.addEventListener('gesturestart',stop,{passive:false});
    document.addEventListener('gesturechange',stop,{passive:false});
    document.addEventListener('gestureend',stop,{passive:false});
    document.addEventListener('dblclick',stop,{passive:false});
    let lastTouchEnd=0;
    document.addEventListener('touchend',e=>{
      const now=Date.now();
      if(now-lastTouchEnd<320)e.preventDefault();
      lastTouchEnd=now;
    },{passive:false});
    document.addEventListener('contextmenu',e=>{if(matchMedia('(pointer:coarse)').matches)e.preventDefault();},{passive:false});
  }
  resetTouch(){
    this.pointers.clear();
    this.touch={left:false,right:false,accel:false,brake:false,nitro:false};
    $$('#touch .down').forEach(el=>el.classList.remove('down'));
  }
  clearActions(){this.actions.camera=false;this.actions.reset=false;this.actions.pause=false;this.actions.beam=false;}
  consume(n){if(!this.actions[n])return false;this.actions[n]=false;return true;}
  poll(){
    return {
      left:this.keys.has('ArrowLeft')||this.touch.left,
      right:this.keys.has('ArrowRight')||this.touch.right,
      accel:this.keys.has('ArrowUp')||this.touch.accel,
      brake:this.keys.has('ArrowDown')||this.touch.brake,
      nitro:this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')||this.touch.nitro
    };
  }
}

class CarController{
  constructor(def,upgrades,scene,opts={}){
    this.def=def;this.stats=statsFor(def,upgrades);
    if(opts.skill){this.stats.topSpeed*=opts.skill;this.stats.accel*=opts.skill;}
    this.model=makeCar(def,opts);if(opts.headlight)addHeadlight(this.model);scene.add(this.model);
    this.scene=scene;this.isAI=!!opts.isAI;this.laneOffset=opts.laneOffset||0;if(this.isAI)this.model.userData.exhaustLight.visible=false;
    this.pos=new THREE.Vector3();this.velocity=new THREE.Vector3();this.forward=new THREE.Vector3(0,0,1);this.right=new THREE.Vector3(-1,0,0);
    this.yaw=0;this.pitch=0;this.roll=0;this.steer=0;this.vy=0;this.airborne=false;this.speedKmh=0;this.rpm=.1;this.gear=1;
    this.nitro=this.stats.nitroMax;this.boosting=false;this.boostVfx=0;this.brakeInput=false;this.highBeam=false;this.signalLeft=false;this.signalRight=false;this.boostPulse=false;this.wasBoost=false;
    this.drifting=false;this.driftTimer=0;this.combo=1;this.driftScore=0;this.maxCombo=1;
    this.collisionPulse=0;this.impactEvent=false;this.impactCooldown=0;this.lastInfo=null;
    this.finished=false;this.finishTime=Infinity;this.lap=0;this.nextCp=0;this.lapTimes=[];this.lapStart=0;this.stuckTimer=0;
  }
  resetTo(pos,yaw){
    this.pos.copy(pos);this.yaw=yaw;this.velocity.set(0,0,0);this.vy=0;this.airborne=false;
    this.pitch=0;this.roll=0;this.steer=0;this.speedKmh=0;this.rpm=.1;this.gear=1;
    this.drifting=false;this.boosting=false;this.boostVfx=0;this.brakeInput=false;this.signalLeft=false;this.signalRight=false;this.boostPulse=false;this.wasBoost=false;this.collisionPulse=0;
    this.forward.set(Math.sin(yaw),0,Math.cos(yaw));this.right.set(-Math.cos(yaw),0,Math.sin(yaw));this.sync();
  }
  setNight(n){
    const u=this.model.userData;
    if(u.spot){u.spot.intensity=n?(this.highBeam?8.8:5.2):0;u.spot.angle=this.highBeam?Math.PI/4.2:Math.PI/5.2;u.spot.distance=this.highBeam?155:110;}
    if(u.beamCone){u.beamCone.visible=!!n;u.beamCone.material.opacity=n?(this.highBeam?.11:.052):0;u.beamCone.scale.set(this.highBeam?1.42:1,this.highBeam?1.28:1,this.highBeam?1.42:1);}
    if(u.headMat)u.headMat.emissiveIntensity=n?(this.highBeam?4.3:2.6):.45;
    if(u.glow)u.glow.material.opacity=n?.5:.24;
  }
  sync(){this.model.position.copy(this.pos);this.model.rotation.set(this.pitch,this.yaw,this.roll,'YXZ');}
  visuals(dt,vf){
    const u=this.model.userData;
    if(u.wheels)for(const w of u.wheels){
      w.spin.rotation.x+=vf/w.radius*dt;
      if(w.front)w.steer.rotation.y=-this.steer*.43;
    }
    const k=this.boostVfx,t=performance.now()*.001;
    if(u.flames)for(let i=0;i<u.flames.length;i++){
      const f=u.flames[i];f.group.visible=k>.025;
      if(k>.025){
        f.group.scale.set(.78+k*.52,.78+k*.52,.35+k*(2.18+Math.sin(t*38+i*2)*.18));
        f.outer.opacity=k*(.68+.3*Math.abs(Math.sin(t*41+i)));
        f.inner.opacity=k*.98;
        if(f.trailMat)f.trailMat.opacity=k*.18;
      }else if(f.trailMat)f.trailMat.opacity=0;
    }
    if(u.exhaustLight)u.exhaustLight.intensity=k*(4.5+Math.min(12,this.speedKmh*.06));
    const blink=Math.sin(t*16)>0;
    if(u.signalL)u.signalL.emissiveIntensity=(this.signalLeft&&blink)?4.2:.35;
    if(u.signalR)u.signalR.emissiveIntensity=(this.signalRight&&blink)?4.2:.35;
    if(u.tailMat)u.tailMat.emissiveIntensity=this.brakeInput?3.9:1.1;
    if(u.headMat&&!this.isAI)u.headMat.emissiveIntensity=this.highBeam?4.2:2.6;
  }
  step(dt,input,track,canDrive=true){
    dt=Math.min(dt,.05);
    input=input||{left:false,right:false,accel:false,brake:false,nitro:false};
    const st=this.stats;
    const targetSteer=canDrive?((input.right?1:0)-(input.left?1:0)):0;
    this.steer=damp(this.steer,targetSteer,11,dt);
    const throttle=canDrive&&input.accel?1:0;
    const brake=canDrive&&input.brake?1:0;
    this.brakeInput=!!brake;this.signalLeft=canDrive&&!!input.left&&!input.right;this.signalRight=canDrive&&!!input.right&&!input.left;
    const wantBoost=canDrive&&!!input.nitro&&this.nitro>.4;
    let info=track.nearest(this.pos.x,this.pos.z);this.lastInfo=info;
    const speed=Math.hypot(this.velocity.x,this.velocity.z),onRoad=Math.abs(info.lateral)<=track.halfWidth+.6;
    const handbrake=brake>0&&speed>14&&Math.abs(this.steer)>.18;
    if(!this.airborne){
      const authority=clamp(speed/3.5,0,1),turn=st.steer*(.68+.42/(1+speed*.02))*authority*1.12;
      this.yaw-=this.steer*turn*dt*(handbrake?1.7:1);
    }
    this.forward.set(Math.sin(this.yaw),0,Math.cos(this.yaw));this.right.set(-Math.cos(this.yaw),0,Math.sin(this.yaw));
    let vf=this.velocity.dot(this.forward),vl=this.velocity.dot(this.right);
    if(throttle>0){const limit=st.topSpeed*(wantBoost?1.18:1),ratio=clamp(vf/limit,0,1);vf+=st.accel*throttle*(1-ratio*ratio)*dt*(wantBoost?1.5:1);}
    if(brake>0){if(vf>.2)vf=Math.max(0,vf-st.brake*brake*dt);else vf=Math.max(-13,vf-st.accel*.35*brake*dt);}
    if(handbrake)vf*=Math.exp(-.75*dt);
    vf-=(.45*Math.sign(vf)+.00055*vf*Math.abs(vf))*dt;
    if(wantBoost){vf+=st.boostAccel*dt;this.nitro=Math.max(0,this.nitro-24*dt);this.boosting=true;}
    else this.boosting=false;
    this.boostPulse=wantBoost&&!this.wasBoost;this.wasBoost=wantBoost;
    this.boostVfx=damp(this.boostVfx,wantBoost?1:0,11,dt);
    const grip=st.grip*(handbrake?.3:1)*(onRoad?1:.42)*(this.airborne?.05:1);
    vl*=Math.exp(-grip*dt);
    if(!onRoad)vf*=Math.exp(-1.2*dt);
    const maxForward=st.topSpeed*(this.boosting?1.2:1.02);
    if(vf>maxForward)vf=damp(vf,maxForward,4,dt);if(vf<-14)vf=-14;
    this.velocity.set(this.forward.x*vf+this.right.x*vl,0,this.forward.z*vf+this.right.z*vl);
    this.pos.x+=this.velocity.x*dt;this.pos.z+=this.velocity.z*dt;
    info=track.nearest(this.pos.x,this.pos.z);this.lastInfo=info;
    if(Math.abs(info.lateral)>track.wallLimit){
      const sgn=Math.sign(info.lateral),excess=Math.abs(info.lateral)-track.wallLimit;
      this.pos.addScaledVector(info.side,-sgn*excess);
      const outward=this.velocity.dot(info.side)*sgn;
      if(outward>0)this.velocity.addScaledVector(info.side,-sgn*outward*1.45);
      this.velocity.multiplyScalar(.92);this.collisionPulse=Math.min(1,this.collisionPulse+.55+outward*.02);
      if(this.impactCooldown<=0){this.impactEvent=true;this.impactCooldown=.25;}
      this.driftTimer=0;this.combo=1;
    }else if(Math.abs(info.lateral)>track.halfWidth-.4)this.collisionPulse=Math.max(this.collisionPulse,.16);
    const groundY=info.p.y+track.rampHeightAtProgress(info.progress);
    if(!this.airborne){
      const dy=groundY-this.pos.y;
      if(dy>.03)this.pos.y=Math.min(groundY,this.pos.y+Math.max(14,speed*2.4)*dt);
      else if(dy<-.26&&speed>12){this.airborne=true;this.vy=Math.max(3.2,speed*.14);}
      else this.pos.y=groundY;
    }else{
      this.vy-=26*dt;this.pos.y+=this.vy*dt;
      if(this.pos.y<=groundY){this.pos.y=groundY;this.airborne=false;this.vy=0;this.collisionPulse=Math.max(this.collisionPulse,.35);this.velocity.multiplyScalar(.955);}
    }
    if(!this.airborne){
      const slope=Math.asin(clamp(info.tangent.y,-.8,.8));
      this.pitch=damp(this.pitch,-slope,10,dt);
      this.roll=damp(this.roll,-this.steer*clamp(speed/45,0,1)*.14,8,dt);
    }else{
      this.pitch-=(throttle-brake)*1.15*dt;this.roll+=this.steer*1.35*dt;
      this.pitch=clamp(this.pitch,-.8,.8);this.roll=clamp(this.roll,-.9,.9);
      this.yaw-=this.steer*1.0*dt;this.forward.set(Math.sin(this.yaw),0,Math.cos(this.yaw));this.right.set(-Math.cos(this.yaw),0,Math.sin(this.yaw));
    }
    const totalSpeed=Math.hypot(this.velocity.x,this.velocity.z);
    this.speedKmh=totalSpeed*3.6;this.gear=Math.min(6,Math.max(1,Math.floor(this.speedKmh/42)+1));
    const rev=clamp((this.speedKmh%42)/42,0,1);this.rpm=clamp(.12+rev*.72+throttle*.32,0,1);
    this.drifting=false;
    if(!this.airborne&&canDrive&&totalSpeed>9&&Math.abs(vl)>2.3&&Math.abs(this.steer)>.1){
      this.drifting=true;this.driftTimer+=dt;this.combo=1+Math.min(4,Math.floor(this.driftTimer/1.3));this.maxCombo=Math.max(this.maxCombo,this.combo);
      this.driftScore+=Math.abs(vl)*Math.max(4,totalSpeed)*dt*.55;this.nitro=Math.min(st.nitroMax,this.nitro+(6+this.combo*2)*dt);
    }else if(this.driftTimer>0){this.driftTimer=0;this.combo=1;}
    this.collisionPulse=Math.max(0,this.collisionPulse-dt*1.8);this.impactCooldown=Math.max(0,this.impactCooldown-dt);
    this.sync();this.visuals(dt,vf);
  }
}

class Smoke{
  constructor(scene,color=0xb9d2e8,opacity=.34,size=1.35){
    this.count=120;this.cursor=0;this.pos=new Float32Array(this.count*3);this.vel=new Float32Array(this.count*3);this.age=new Float32Array(this.count);this.life=new Float32Array(this.count);
    for(let i=0;i<this.count;i++)this.pos[i*3+1]=-999;
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.pos,3));
    const mat=new THREE.PointsMaterial({map:SOFT,color,size,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
    this.points=new THREE.Points(geo,mat);this.points.frustumCulled=false;this.points.renderOrder=4;scene.add(this.points);
  }
  spawn(x,y,z,vx=0,vy=.8,vz=0){
    const i=this.cursor++%this.count,k=i*3;this.pos[k]=x;this.pos[k+1]=y;this.pos[k+2]=z;
    this.vel[k]=vx+(Math.random()-.5)*1.3;this.vel[k+1]=vy+Math.random()*1.7;this.vel[k+2]=vz+(Math.random()-.5)*1.3;
    this.age[i]=0;this.life[i]=.6+Math.random()*.7;
  }
  update(dt){
    for(let i=0;i<this.count;i++){
      if(this.age[i]>=this.life[i])continue;
      const k=i*3;this.age[i]+=dt;this.pos[k]+=this.vel[k]*dt;this.pos[k+1]+=this.vel[k+1]*dt;this.pos[k+2]+=this.vel[k+2]*dt;
      this.vel[k]*=.98;this.vel[k+2]*=.98;if(this.age[i]>=this.life[i])this.pos[k+1]=-999;
    }
    this.points.geometry.attributes.position.needsUpdate=true;
  }
}

class SkidMarks{
  constructor(scene){
    this.max=420;this.cursor=0;this.pos=new Float32Array(this.max*18);
    for(let i=0;i<this.pos.length;i+=3)this.pos[i+1]=-999;
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.pos,3));
    const mat=new THREE.MeshBasicMaterial({color:0x07040c,transparent:true,opacity:.62,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    this.mesh=new THREE.Mesh(geo,mat);this.mesh.frustumCulled=false;this.mesh.renderOrder=2;scene.add(this.mesh);
    this.prev={'-1':null,'1':null};
  }
  break(){this.prev={'-1':null,'1':null};}
  emit(car){
    const v=car.def.visual;
    for(const side of[-1,1]){
      const p=car.pos.clone().addScaledVector(car.forward,-v.wheelbase/2).addScaledVector(car.right,side*v.width*.41);p.y=car.pos.y+.055;
      const key=String(side);
      if(this.prev[key])this.addQuad(this.prev[key],p);
      this.prev[key]=p;
    }
  }
  addQuad(a,b){
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.09)return;
    const nx=-dz/len*.085,nz=dx/len*.085,o=this.cursor*18;
    const v=[a.x+nx,a.y,a.z+nz,b.x+nx,b.y,b.z+nz,a.x-nx,a.y,a.z-nz,a.x-nx,a.y,a.z-nz,b.x+nx,b.y,b.z+nz,b.x-nx,b.y,b.z-nz];
    for(let i=0;i<18;i++)this.pos[o+i]=v[i];
    this.cursor=(this.cursor+1)%this.max;this.mesh.geometry.attributes.position.needsUpdate=true;
  }
}

class Sparks{
  constructor(scene){
    this.count=120;this.cursor=0;this.pos=new Float32Array(this.count*3);this.vel=new Float32Array(this.count*3);this.age=new Float32Array(this.count);this.life=new Float32Array(this.count);
    for(let i=0;i<this.count;i++)this.pos[i*3+1]=-999;
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.pos,3));
    this.mat=new THREE.PointsMaterial({map:SOFT,color:0xffb23a,size:.26,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
    this.points=new THREE.Points(geo,this.mat);this.points.frustumCulled=false;this.points.renderOrder=6;scene.add(this.points);
  }
  burst(car){
    for(let n=0;n<24;n++){
      const i=this.cursor++%this.count,k=i*3,p=car.pos.clone().addScaledVector(car.forward,1.05).addScaledVector(car.right,(Math.random()-.5)*2.0);
      this.pos[k]=p.x;this.pos[k+1]=p.y+.28;this.pos[k+2]=p.z;
      this.vel[k]=car.forward.x*(-3-Math.random()*5)+car.right.x*(Math.random()-.5)*7;
      this.vel[k+1]=3+Math.random()*8;
      this.vel[k+2]=car.forward.z*(-3-Math.random()*5)+car.right.z*(Math.random()-.5)*7;
      this.age[i]=0;this.life[i]=.32+Math.random()*.5;
    }
  }
  update(dt){
    for(let i=0;i<this.count;i++){
      if(this.age[i]>=this.life[i])continue;
      const k=i*3;this.age[i]+=dt;this.vel[k+1]-=18*dt;
      this.pos[k]+=this.vel[k]*dt;this.pos[k+1]+=this.vel[k+1]*dt;this.pos[k+2]+=this.vel[k+2]*dt;
      if(this.age[i]>=this.life[i])this.pos[k+1]=-999;
    }
    this.points.geometry.attributes.position.needsUpdate=true;
  }
}

class SpeedLines{
  constructor(camera){
    this.count=48;this.x=new Float32Array(this.count);this.y=new Float32Array(this.count);this.z=new Float32Array(this.count);this.len=new Float32Array(this.count);this.pos=new Float32Array(this.count*6);this.col=new Float32Array(this.count*6);
    const palette=[[.35,1,1],[1,.2,.55],[.84,1,.25]];
    for(let i=0;i<this.count;i++){
      const a=Math.random()*Math.PI*2,r=2.2+Math.random()*11;
      this.x[i]=Math.cos(a)*r;this.y[i]=Math.sin(a)*r*.72;this.z[i]=-4-Math.random()*28;this.len[i]=1.5+Math.random()*4.5;
      const c=palette[i%3],k=i*6;this.col[k]=c[0];this.col[k+1]=c[1];this.col[k+2]=c[2];this.col[k+3]=c[0]*.25;this.col[k+4]=c[1]*.25;this.col[k+5]=c[2]*.25;
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.pos,3));geo.setAttribute('color',new THREE.BufferAttribute(this.col,3));
    this.mat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false});
    this.lines=new THREE.LineSegments(geo,this.mat);this.lines.frustumCulled=false;this.lines.renderOrder=30;this.lines.visible=false;camera.add(this.lines);
  }
  update(dt,car){
    const boost=car?car.boostVfx:0,speed=car?car.speedKmh:0;
    this.mat.opacity=damp(this.mat.opacity,boost*.72,9,dt);this.lines.visible=this.mat.opacity>.012;
    if(!this.lines.visible)return;
    const a=this.lines.geometry.attributes.position.array;
    for(let i=0;i<this.count;i++){
      this.z[i]+=(24+speed*.55)*dt;
      if(this.z[i]>-1){this.z[i]=-28-Math.random()*8;this.x[i]=(Math.random()-.5)*16;this.y[i]=(Math.random()-.5)*10;}
      const k=i*6;a[k]=this.x[i];a[k+1]=this.y[i];a[k+2]=this.z[i];a[k+3]=this.x[i];a[k+4]=this.y[i];a[k+5]=this.z[i]-this.len[i];
    }
    this.lines.geometry.attributes.position.needsUpdate=true;
  }
}

class Sound{
 constructor(){this.ctx=null;this.ready=false;this.enabled=true;}
 unlock(){if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;try{this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=this.enabled?.24:0;this.master.connect(this.ctx.destination);this.eng=this.ctx.createOscillator();this.eng.type='sawtooth';this.engFilter=this.ctx.createBiquadFilter();this.engFilter.type='lowpass';this.engFilter.frequency.value=600;this.engGain=this.ctx.createGain();this.engGain.gain.value=0;this.eng.connect(this.engFilter);this.engFilter.connect(this.engGain);this.engGain.connect(this.master);this.eng.start();const buf=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noise=buf;this.tire=this.ctx.createBufferSource();this.tire.buffer=buf;this.tire.loop=true;this.tireFilter=this.ctx.createBiquadFilter();this.tireFilter.type='bandpass';this.tireFilter.frequency.value=1900;this.tireFilter.Q.value=.7;this.tireGain=this.ctx.createGain();this.tireGain.gain.value=0;this.tire.connect(this.tireFilter);this.tireFilter.connect(this.tireGain);this.tireGain.connect(this.master);this.tire.start();this.wind=this.ctx.createBufferSource();this.wind.buffer=buf;this.wind.loop=true;this.windFilter=this.ctx.createBiquadFilter();this.windFilter.type='lowpass';this.windFilter.frequency.value=420;this.windGain=this.ctx.createGain();this.windGain.gain.value=0;this.wind.connect(this.windFilter);this.windFilter.connect(this.windGain);this.windGain.connect(this.master);this.wind.start();this.ready=true;}catch(e){}}
 setEnabled(on){this.enabled=on;if(this.master&&this.ctx)this.master.gain.setTargetAtTime(on?.24:0,this.ctx.currentTime,.05);}
 update(car){if(!this.ready)return;const t=this.ctx.currentTime,rpm=car?car.rpm:.1;this.eng.frequency.setTargetAtTime(42+rpm*132,t,.06);this.engFilter.frequency.setTargetAtTime(280+rpm*1800,t,.08);this.engGain.gain.setTargetAtTime(car?(.022+rpm*.034):0,t,.08);this.tireGain.gain.setTargetAtTime(car&&car.drifting?.055:0,t,.05);this.windGain.gain.setTargetAtTime(car?Math.min(.03,(car.speedKmh||0)/8500):0,t,.2);}
 boostBurst(){if(!this.ready)return;const t=this.ctx.currentTime,src=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();src.buffer=this.noise;f.type='bandpass';f.frequency.setValueAtTime(520,t);f.frequency.exponentialRampToValueAtTime(2600,t+.18);f.Q.value=.9;src.connect(f);f.connect(g);g.connect(this.master);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.12,t+.018);g.gain.exponentialRampToValueAtTime(.001,t+.26);src.start(t);src.stop(t+.28);const o=this.ctx.createOscillator(),og=this.ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(360,t+.22);og.gain.setValueAtTime(.04,t);og.gain.exponentialRampToValueAtTime(.001,t+.24);o.connect(og);og.connect(this.master);o.start(t);o.stop(t+.25);}
  impact(){if(!this.ready)return;const t=this.ctx.currentTime,src=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();src.buffer=this.noise;f.type='lowpass';f.frequency.value=190;src.connect(f);f.connect(g);g.connect(this.master);g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);src.start(t);src.stop(t+.2);}
 ui(){if(!this.ready)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(700,t);o.frequency.exponentialRampToValueAtTime(1080,t+.06);g.gain.setValueAtTime(.04,t);g.gain.exponentialRampToValueAtTime(.001,t+.09);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.1);}
}

class CameraRig{
 constructor(camera){this.camera=camera;this.mode=0;this.look=new THREE.Vector3();}
 snap(car){this.camera.position.copy(car.pos).addScaledVector(car.forward,-9.2).add(new THREE.Vector3(0,3.4,0));this.look.copy(car.pos).addScaledVector(car.forward,6).add(new THREE.Vector3(0,1.2,0));this.camera.lookAt(this.look);}
 updateRace(dt,car){if(!car)return;const speed=car.speedKmh;if(this.mode===1){this.camera.position.copy(car.pos).addScaledVector(car.forward,.35).add(new THREE.Vector3(0,1.52,0));const target=car.pos.clone().addScaledVector(car.forward,22).add(new THREE.Vector3(0,1.12,0));this.camera.lookAt(target);this.camera.fov=damp(this.camera.fov,76+Math.min(10,speed*.05),8,dt);}else{const back=8.6+Math.min(4.5,speed*.05),desired=car.pos.clone().addScaledVector(car.forward,-back).add(new THREE.Vector3(0,3.2+speed*.008,0));this.camera.position.lerp(desired,1-Math.exp(-dt*6.5));const look=car.pos.clone().addScaledVector(car.forward,7).add(new THREE.Vector3(0,1.18,0));this.look.lerp(look,1-Math.exp(-dt*8));this.camera.lookAt(this.look);this.camera.fov=damp(this.camera.fov,65+Math.min(17,speed*.14)+(car.boostVfx||0)*10,10,dt);this.camera.position.addScaledVector(car.forward,-(car.boostVfx||0)*1.15);}const shake=car.collisionPulse*.3+(car.boosting?.035:0);if(shake>.001){this.camera.position.x+=(Math.random()-.5)*shake;this.camera.position.y+=(Math.random()-.5)*shake*.65;this.camera.position.z+=(Math.random()-.5)*shake;}this.camera.updateProjectionMatrix();}
 updateShowroom(dt,car,t){if(!car)return;const a=t*.24,desired=new THREE.Vector3(car.pos.x+Math.sin(a)*9.5,car.pos.y+3.35,car.pos.z+Math.cos(a)*9.5);this.camera.position.lerp(desired,1-Math.exp(-dt*3));this.camera.lookAt(car.pos.x,car.pos.y+.78,car.pos.z);this.camera.fov=damp(this.camera.fov,56,4,dt);this.camera.updateProjectionMatrix();}
}

class Race{
 constructor(game){this.game=game;this.track=game.track;this.cars=[];this.ai=[];this.player=null;this.mode='circuit';this.laps=2;this.raceTime=0;this.countdown=0;this.phase='idle';this.goTimer=0;this.finishTimer=0;this.summarySent=false;this.timeLimit=90;this.checkpoints=this.track.checkpointProgress;this.boostEmit=0;this.skidTimer=0;}
 clear(){for(const c of this.cars)this.game.scene.remove(c.model);this.cars=[];this.ai=[];this.player=null;this.phase='idle';}
 start(mode){this.clear();this.mode=mode;this.laps=mode==='circuit'?2:1;this.raceTime=0;this.countdown=3;this.phase='countdown';this.goTimer=0;this.finishTimer=0;this.summarySent=false;this.timeLimit=90;this.game.input.resetTouch();this.game.input.clearActions();const p=this.game.profile,pdef=CARS[p.selectedCar];this.player=new CarController(pdef,p.upgrades[pdef.id],this.game.scene,{headlight:true});this.cars.push(this.player);if(mode==='circuit'){const aiColors=[0x39f4ff,0xffa33c,0xff4fd8],aiAccents=[0xffffff,0x39f4ff,0xd6ff3f];for(let i=0;i<3;i++){const def=CARS[(p.selectedCar+i+1)%CARS.length],car=new CarController(def,{engine:1,tires:1+(i%2),nitro:1},this.game.scene,{isAI:true,color:aiColors[i%3],accent:aiAccents[i%3],skill:.925+i*.018,laneOffset:i%2?this.track.halfWidth*.23:-this.track.halfWidth*.23});car.isAI=true;this.cars.push(car);this.ai.push(car);}}this.cars.forEach((c,i)=>{c.nextCp=0;c.lap=0;c.lapTimes=[];c.lapStart=0;c.finished=false;c.finishTime=Infinity;c.driftScore=0;c.maxCombo=1;c.driftTimer=0;c.combo=1;c.stuckTimer=0;c.nitro=c.stats.nitroMax;this.grid(c,i);c.setNight(this.game.world.night);});this.track.setActiveGate(mode==='drift'?-1:0);this.game.toast(mode==='circuit'?'环湾竞速 / GO IN 3':mode==='time'?'极速计时 / 单圈冲刺':'漂移试炼 / 90 秒',1500);}
 grid(car,slot){const back=.003+slot*.0045,u=(1-back)%1,p=this.track.curve.getPointAt(u),t=this.track.curve.getTangentAt(u).normalize(),side=new THREE.Vector3().crossVectors(UP,t).normalize(),lane=(slot%2?1:-1)*this.track.halfWidth*.23,pos=p.clone().addScaledVector(side,lane);pos.y=p.y;car.resetTo(pos,Math.atan2(t.x,t.z));car.nitro=car.stats.nitroMax;}
 resetPlayer(){if(!this.player||!this.player.lastInfo)return;const u=(this.player.lastInfo.progress+.003)%1,p=this.track.curve.getPointAt(u),t=this.track.curve.getTangentAt(u).normalize(),pos=p.clone();pos.y=p.y+.05;this.player.resetTo(pos,Math.atan2(t.x,t.z));this.player.nitro=this.player.stats.nitroMax;this.game.toast('车辆已复位');}
 aiInput(car){const info=car.lastInfo||this.track.nearest(car.pos.x,car.pos.z),look=.014+Math.min(.02,car.speedKmh/9000),u=(info.progress+look)%1,p=this.track.curve.getPointAt(u),t=this.track.curve.getTangentAt(u).normalize(),side=new THREE.Vector3().crossVectors(UP,t).normalize(),target=p.clone().addScaledVector(side,car.laneOffset),desired=Math.atan2(target.x-car.pos.x,target.z-car.pos.z),diff=wrapAngle(desired-car.yaw),ad=Math.abs(diff);let left=diff>.025,right=diff<-.025,accel=ad<.9,brake=ad>.62;if(ad>.95){accel=false;brake=true;}return{left,right,accel,brake,nitro:ad<.06&&car.nitro>38};}
 updateCars(dt,canDrive){
    const pi=this.game.input.poll();
    for(const car of this.cars){
      const input=car===this.player?pi:this.aiInput(car);
      car.step(dt,input,this.track,canDrive&&!car.finished);
      if(car===this.player){
        if(car.drifting){
          const rear=car.pos.clone().addScaledVector(car.forward,-1.45);rear.addScaledVector(car.right,(Math.random()-.5)*1.7);rear.y+=.22;
          this.game.smoke.spawn(rear.x,rear.y,rear.z,0,.9,0);
          if(this.skidTimer<=0){this.game.skidMarks.emit(car);this.skidTimer=.022;}
        }else this.game.skidMarks.break();
        if(car.boostVfx>.12){
          this.boostEmit-=dt;
          if(this.boostEmit<=0){
            this.boostEmit=.022;
            const v=car.def.visual;
            for(const side of[-1,1]){
              const tip=car.pos.clone().addScaledVector(car.forward,-v.length/2-.5).addScaledVector(car.right,side*v.width*.23);tip.y+=.42;
              const back=car.forward.clone().multiplyScalar(-.9);
              this.game.boostSmoke.spawn(tip.x,tip.y,tip.z,back.x,1.25,back.z);
            }
          }
        }
      }
    }
  }
 collisions(){for(let i=0;i<this.cars.length;i++)for(let j=i+1;j<this.cars.length;j++){const a=this.cars[i],b=this.cars[j];let dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,dist=Math.hypot(dx,dz);if(dist<2.35){let nx,nz;if(dist<.001){nx=1;nz=0;dist=.001;}else{nx=dx/dist;nz=dz/dist;}const overlap=(2.35-dist)*.5;a.pos.x-=nx*overlap;a.pos.z-=nz*overlap;b.pos.x+=nx*overlap;b.pos.z+=nz*overlap;const av=a.velocity.x*nx+a.velocity.z*nz,bv=b.velocity.x*nx+b.velocity.z*nz,imp=(av-bv)*.5;a.velocity.x-=nx*imp*1.2;a.velocity.z-=nz*imp*1.2;b.velocity.x+=nx*imp*1.2;b.velocity.z+=nz*imp*1.2;a.velocity.multiplyScalar(.98);b.velocity.multiplyScalar(.98);const p=this.player;if((a===p||b===p)&&p.impactCooldown<=0){p.collisionPulse=Math.min(1,p.collisionPulse+.35);p.impactEvent=true;p.impactCooldown=.3;}}}}
 progress(car){const info=car.lastInfo;if(!info)return;if(this.mode==='circuit'||this.mode==='time'){const cp=this.checkpoints[car.nextCp],d=Math.abs(info.progress-cp),cyc=Math.min(d,1-d);if(cyc<.017){if(car.nextCp===3){car.lap++;car.lapTimes.push(this.raceTime-car.lapStart);car.lapStart=this.raceTime;car.nextCp=0;if(car===this.player&&car.lap<this.laps)this.game.toast(`LAP ${car.lap+1} / ${this.laps}`);if(car.lap>=this.laps)this.finishCar(car);}else car.nextCp++;}}}
 finishCar(car){if(car.finished)return;car.finished=true;car.finishTime=this.raceTime;if(car===this.player&&this.phase==='race'){this.phase='finished';this.finishTimer=1.15;}}
 update(dt){if(this.phase==='countdown'){this.countdown-=dt;this.updateCars(dt,false);if(this.countdown<=0){this.phase='race';this.goTimer=.9;this.raceTime=0;for(const c of this.cars)c.lapStart=0;this.game.toast('GO!',700);}return;}if(this.phase==='race'){this.raceTime+=dt;if(this.goTimer>0)this.goTimer-=dt;this.updateCars(dt,true);this.collisions();for(const car of this.cars){if(!car.finished)this.progress(car);if(car.impactEvent){if(car===this.player){this.game.sound.impact();this.game.sparks.burst(car);this.game.skidMarks.break();}car.impactEvent=false;}if(car===this.player&&car.boostPulse)this.game.sound.boostBurst();if(car.isAI&&!car.finished){if(car.speedKmh<2&&this.raceTime>5)car.stuckTimer+=dt;else car.stuckTimer=0;if(car.stuckTimer>2.2){const u=(car.lastInfo?.progress||0)+.006,p=this.track.curve.getPointAt(u%1),t=this.track.curve.getTangentAt(u%1).normalize();car.resetTo(p.clone().setY(p.y+.05),Math.atan2(t.x,t.z));car.stuckTimer=0;}}}if(this.mode==='drift'&&this.raceTime>=this.timeLimit&&!this.player.finished)this.finishCar(this.player);this.track.setActiveGate(this.mode==='drift'?-1:this.player.nextCp);return;}if(this.phase==='finished'){this.finishTimer-=dt;this.updateCars(dt,false);this.collisions();if(this.finishTimer<=0&&!this.summarySent){this.summarySent=true;this.game.endRace(this.summary());}}}
 rank(){if(this.mode!=='circuit')return 1;const p=this.player;if(!p)return 1;let ahead=0;for(const ai of this.ai){if(ai.finished&&p.finished){if(ai.finishTime<p.finishTime)ahead++;}else if(ai.finished)ahead++;else if(!p.finished){const pd=p.lap+(p.lastInfo?.progress||0),ad=ai.lap+(ai.lastInfo?.progress||0);if(ad>pd+.0001)ahead++;}}return 1+ahead;}
 summary(){const p=this.player,rank=this.rank(),total=this.cars.length,bestLap=p.lapTimes.length?Math.min(...p.lapTimes):0;let medal='',base=0;if(this.mode==='time'){const gold=this.track.length/29,silver=this.track.length/23,bronze=this.track.length/18;medal=this.raceTime<=gold?'金牌':this.raceTime<=silver?'银牌':this.raceTime<=bronze?'铜牌':'完赛';base=medal==='金牌'?900:medal==='银牌'?650:medal==='铜牌'?420:260;}else if(this.mode==='circuit')base=[0,1000,650,420,280][Math.min(4,rank)]||250;else base=clamp(Math.floor(p.driftScore/18),250,1000);const driftBonus=this.mode==='drift'?0:Math.min(200,Math.floor(p.driftScore/80));return{mode:this.mode,rank,total,time:this.raceTime,bestLap,driftScore:p.driftScore,maxCombo:p.maxCombo,reward:base+driftBonus,medal,newBest:false};}
}

class Game{
 constructor(){this.profile=loadProfile();const lp=new URLSearchParams(location.search),rm=lp.get('map'),am=lp.get('auto');this.currentMap=MAPS[rm]?rm:'neon';this.selectedMap=this.currentMap;this.autoMode=MODES[am]?am:null;this.canvas=$('#game');this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:!matchMedia('(pointer:coarse)').matches,powerPreference:'high-performance'});this.renderer.shadowMap.enabled=false;this.renderer.setSize(innerWidth,innerHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));if('outputColorSpace'in this.renderer)this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;this.renderer.setClearColor(0x02030a,1);this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0x0a0c1b,.00165);this.camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.08,900);this.scene.add(this.camera);this.input=new InputHub();this.sound=new Sound();this.track=new Track(this.scene,this.currentMap);this.world=new World(this.scene,this.track,this.renderer,this.currentMap);this.smoke=new Smoke(this.scene);this.boostSmoke=new Smoke(this.scene,0xff6a2e,.3,1.0);this.skidMarks=new SkidMarks(this.scene);this.sparks=new Sparks(this.scene);this.speedLines=new SpeedLines(this.camera);this.cameraRig=new CameraRig(this.camera);this.race=new Race(this);this.preview=null;this.state='menu';this.paused=false;this.showroomTime=0;this.highBeam=false;this.clock=new THREE.Clock();this.perfTime=0;this.perfFrames=0;this.mapClock=0;this.dpr=1;this.dprCap=1;this.lastMode='circuit';this.selectedMode=this.autoMode||'circuit';this.dynamicLow=false;this.sound.setEnabled(this.profile.settings.sound);this.bindUI();this.bindResize();this.bindOrientation();this.applyQuality(true);this.updateSettingsUI();this.applyUISettings();this.showMenu();if(this.autoMode){const auto=this.autoMode;this.autoMode=null;history.replaceState(null,'',location.pathname);this.startRace(auto);}this.animate();requestAnimationFrame(()=>{const b=$('#boot');b.classList.add('done');setTimeout(()=>b.style.display='none',520);});}
 bindUI(){document.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;this.sound.unlock();if(btn.dataset.map){this.selectedMap=btn.dataset.map;this.renderModeSelect();this.sound.ui();return;}
      if(btn.dataset.uiTheme){this.profile.settings.uiTheme=btn.dataset.uiTheme;saveProfile(this.profile);this.applyUISettings();this.sound.ui();return;}
      if(btn.dataset.mode){this.selectedMode=btn.dataset.mode;this.renderModeSelect();this.sound.ui();return;}
      if(btn.dataset.race){this.startRace(btn.dataset.race);return;}if(btn.dataset.car!==undefined){this.profile.selectedCar=Number(btn.dataset.car);saveProfile(this.profile);this.replacePreview();this.renderGarage();this.sound.ui();return;}if(btn.dataset.upgrade){this.buyUpgrade(btn.dataset.upgrade);return;}if(btn.dataset.setting){this.toggleSetting(btn.dataset.setting);return;}const a=btn.dataset.action;if(!a)return;if(a==='garage')this.openGarage();else if(a==='menu')this.showMenu();else if(a==='pause')this.togglePause();else if(a==='resume')this.togglePause();else if(a==='camera')this.toggleCamera();else if(a==='beam')this.toggleBeam();else if(a==='start-mode')this.launchSelected();else if(a==='ui-settings')this.openUISettings();else if(a==='close-ui')this.closeUISettings();else if(a==='reset-ui')this.resetUISettings();else if(a==='retry')this.startRace(this.race.mode||this.lastMode);});this.canvas.addEventListener('pointerdown',()=>this.sound.unlock());
    const uop=$('#uiOpacity');if(uop)uop.addEventListener('input',e=>{this.profile.settings.uiOpacity=clamp(Number(e.target.value)/100,.5,1);this.applyUISettings();saveProfile(this.profile);});
    const umm=$('#uiMinimap');if(umm)umm.addEventListener('change',e=>{this.profile.settings.uiMinimap=!!e.target.checked;this.applyUISettings();saveProfile(this.profile);});
    const umo=$('#uiMotion');if(umo)umo.addEventListener('change',e=>{this.profile.settings.uiMotion=!!e.target.checked;this.applyUISettings();saveProfile(this.profile);});
  }
 bindResize(){window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight,false);this.applyQuality(false);});}
 bindOrientation(){
    let retried=false;
    const tryLock=()=>{
      try{
        const o=window.screen&&screen.orientation;
        if(o&&typeof o.lock==='function'){
          const p=o.lock('landscape');
          if(p&&typeof p.catch==='function')p.catch(()=>{});
        }
      }catch(e){}
    };
    const retry=()=>{if(retried)return;retried=true;tryLock();};
    tryLock();
    window.addEventListener('pointerdown',retry,{once:true,passive:true});
    window.addEventListener('touchstart',retry,{once:true,passive:true});
    window.addEventListener('keydown',retry,{once:true});
  }
 applyQuality(force){const q=this.profile.settings.quality,coarse=matchMedia('(pointer:coarse)').matches;this.isCoarse=coarse;this.dprCap=q==='low'?.8:q==='high'?1.75:(coarse?1.0:1.4);this.dprCap=Math.min(this.dprCap,devicePixelRatio||1);if(force)this.dpr=this.dprCap;this.dpr=clamp(this.dpr,.65,this.dprCap);this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(innerWidth,innerHeight,false);this.world.setQuality(q);}
 toggleSetting(k){const s=this.profile.settings;if(k==='night'){s.night=!s.night;this.world.setNight(s.night);}else if(k==='rain'){s.rain=!s.rain;this.world.setRain(s.rain);}else if(k==='sound'){s.sound=!s.sound;this.sound.setEnabled(s.sound);}else if(k==='quality'){s.quality=s.quality==='auto'?'high':s.quality==='high'?'low':'auto';this.applyQuality(true);}saveProfile(this.profile);this.updateSettingsUI();this.sound.ui();}
 updateSettingsUI(){const s=this.profile.settings;$('#setNight').textContent='昼夜  '+(s.night?'夜':'昼');$('#setRain').textContent='雨  '+(s.rain?'开':'关');$('#setSound').textContent='音效  '+(s.sound?'开':'关');$('#setQuality').textContent='画质  '+(s.quality==='auto'?'自动':s.quality==='high'?'高':'低');}
 updateMenuStats(){const d=CARS[this.profile.selectedCar];$('#menuCar').textContent=d.name+' / '+d.cn;$('#menuCredits').textContent=this.profile.credits+' CR';$('#menuBest').textContent=fmtShort(Math.max(this.profile.best.time||0,this.profile.best.circuit||0));}
 createPreview(){if(this.preview){this.scene.remove(this.preview.model);this.preview=null;}const d=CARS[this.profile.selectedCar],car=new CarController(d,this.profile.upgrades[d.id],this.scene,{headlight:true}),u=.985,p=this.track.curve.getPointAt(u),t=this.track.curve.getTangentAt(u).normalize(),side=new THREE.Vector3().crossVectors(UP,t).normalize(),pos=p.clone().addScaledVector(side,-1.8);pos.y=p.y;car.resetTo(pos,Math.atan2(t.x,t.z));car.setNight(this.world.night);this.preview=car;this.showroomTime=0;}
 replacePreview(){this.createPreview();}
 showMenu(){this.state='menu';this.paused=false;document.body.classList.remove('racing','paused');this.race.clear();this.createPreview();this.showScreen('screen-menu');this.updateMenuStats();this.renderModeSelect();}
 renderModeSelect(){
    const info=MODES[this.selectedMode]||MODES.circuit;
    const menu=$('#screen-menu');if(!menu)return;
    menu.style.setProperty('--mode',info.color);
    $$('.mode-card').forEach(b=>b.classList.toggle('selected',b.dataset.mode===this.selectedMode));
    $('#msModeKicker').textContent=info.kicker;
    $('#msModeTitle').textContent=info.title;
    $('#msModeDesc').textContent=info.desc;
    const map=MAPS[this.selectedMap]||MAPS.neon;
    $$('.track-chip').forEach(b=>b.classList.toggle('selected',b.dataset.map===this.selectedMap));
    $('#msModeMeta').innerHTML=[`<span>${map.name} / ${map.en}</span>`,...info.meta.map(t=>`<span>${t}</span>`)].join('');
    $('#msModeIcon').innerHTML=info.icon;
    this.updateMenuStats();
  }
  applyUISettings(){
    const st=this.profile.settings||{},theme=st.uiTheme||'cyan',a=clamp(Number(st.uiOpacity??.82),.5,1);
    document.body.dataset.uiTheme=theme;document.body.style.setProperty('--panel-alpha',a.toFixed(2));document.body.style.setProperty('--panel-alpha2',Math.max(.5,a-.12).toFixed(2));
    document.body.classList.toggle('no-minimap',st.uiMinimap===false);document.body.classList.toggle('reduce-ui-motion',st.uiMotion===false);this.renderUISettings();
  }
  renderUISettings(){
    const st=this.profile.settings||{};
    $$('.ui-theme').forEach(b=>b.classList.toggle('selected',b.dataset.uiTheme===(st.uiTheme||'cyan')));
    const op=$('#uiOpacity'),ov=$('#uiOpacityValue'),mm=$('#uiMinimap'),mo=$('#uiMotion');
    if(op)op.value=Math.round((st.uiOpacity??.82)*100);if(ov)ov.textContent=Math.round((st.uiOpacity??.82)*100)+'%';
    if(mm)mm.checked=st.uiMinimap!==false;if(mo)mo.checked=st.uiMotion!==false;
  }
  openUISettings(){this.uiReturn=(document.querySelector('.screen.active')||{}).id||'screen-menu';this.showScreen('screen-ui');this.renderUISettings();}
  closeUISettings(){this.showScreen(this.uiReturn||'screen-menu');}
  resetUISettings(){const st=this.profile.settings;st.uiTheme='cyan';st.uiOpacity=.82;st.uiMinimap=true;st.uiMotion=true;saveProfile(this.profile);this.applyUISettings();this.sound.ui();}
  openGarage(){this.state='garage';this.showScreen('screen-garage');if(!this.preview)this.createPreview();this.renderGarage();this.updateSettingsUI();}
 showScreen(id){$$('.screen').forEach(e=>e.classList.toggle('active',e.id===id));}
 renderGarage(){const d=CARS[this.profile.selectedCar],up=this.profile.upgrades[d.id];$('#garageCredits').textContent=this.profile.credits;$('#carCards').innerHTML=CARS.map((c,i)=>{const st=statsFor(c,this.profile.upgrades[c.id]);return`<button class="car-card ${i===this.profile.selectedCar?'selected':''}" data-car="${i}" style="--c:${hex(c.color)}"><div class="car-index">0${i+1} / ${c.cn}</div><div class="car-swatch"></div><h3>${c.name}</h3><p>${c.role}<br>${Math.round(st.topSpeed*3.6)} KM/H  ${Math.round(st.accel*10)/10} ACC</p></button>`;}).join('');$('#garageCarName').textContent=d.name+' / '+d.cn;$('#garageCarRole').textContent=d.role;const st=statsFor(d,up),stat=(l,v,m,t)=>`<div class="statline"><span>${l}</span><div class="bar"><i style="width:${clamp(v/m*100,3,100)}%"></i></div><b>${t}</b></div>`;$('#garageStats').innerHTML=stat('极速',st.topSpeed,82,Math.round(st.topSpeed*3.6))+stat('加速',st.accel,23,st.accel.toFixed(1))+stat('抓地',st.grip,12,st.grip.toFixed(1))+stat('转向',st.steer,2,st.steer.toFixed(2))+stat('刹车',st.brake,40,st.brake.toFixed(0));const names={engine:['引擎','极速 / 加速'],tires:['轮胎','抓地 / 转向'],nitro:['氮气','容量 / 推力']};$('#upgradeList').innerHTML=Object.keys(names).map(k=>{const lv=up[k],max=lv>=3,cost=upgradeCost(lv),cant=this.profile.credits<cost;return`<div class="upgrade-row"><div class="name">${names[k][0]}<small>${names[k][1]}</small></div><div class="pips">${[0,1,2].map(i=>`<i class="${i<lv?'on':''}"></i>`).join('')}</div><button data-upgrade="${k}" ${max||cant?'disabled':''}>${max?'MAX':cost+' CR'}</button></div>`;}).join('');}
 buyUpgrade(part){const d=CARS[this.profile.selectedCar],up=this.profile.upgrades[d.id];if(up[part]>=3)return;const cost=upgradeCost(up[part]);if(this.profile.credits<cost)return;this.profile.credits-=cost;up[part]++;saveProfile(this.profile);this.replacePreview();this.renderGarage();this.updateMenuStats();this.sound.ui();}
 launchSelected(){
    if(this.selectedMap!==this.currentMap){const u=new URL(location.href);u.searchParams.set('map',this.selectedMap);u.searchParams.set('auto',this.selectedMode||'circuit');location.href=u.toString();return;}
    this.startRace(this.selectedMode||'circuit');
  }
  startRace(mode){if(!['circuit','time','drift'].includes(mode))mode='circuit';this.sound.unlock();if(this.preview){this.scene.remove(this.preview.model);this.preview=null;}this.race.start(mode);this.state='race';this.paused=false;this.lastMode=mode;this.showScreen('screen-hud');document.body.classList.add('racing');document.body.classList.remove('paused');this.cameraRig.mode=0;this.cameraRig.snap(this.race.player);this.input.resetTouch();this.input.clearActions();this.showroomTime=0;}
 togglePause(){if(this.state!=='race'||this.race.phase==='finished')return;this.paused=!this.paused;if(this.paused){this.showScreen('screen-pause');document.body.classList.add('paused');this.input.resetTouch();this.input.clearActions();}else{this.showScreen('screen-hud');document.body.classList.remove('paused');this.input.resetTouch();this.input.clearActions();}this.sound.ui();}
 toggleCamera(){if(this.state!=='race')return;this.cameraRig.mode=this.cameraRig.mode?0:1;this.toast(this.cameraRig.mode?'第一人称 / HOOD CAM':'第三人称 / CHASE CAM');}
  toggleBeam(){if(this.state!=='race'||!this.race.player)return;this.highBeam=!this.highBeam;this.race.player.highBeam=this.highBeam;this.race.player.setNight(this.world.night);this.toast(this.highBeam?'远光 / HIGH BEAM':'近光 / LOW BEAM');}
 toast(text,ms=1300){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(this._toastTimer);this._toastTimer=setTimeout(()=>el.classList.remove('show'),ms);}
 endRace(s){this.state='results';this.paused=false;document.body.classList.remove('racing','paused');const p=this.profile;if(s.mode==='time'&&(p.best.time===0||s.time<p.best.time)){s.newBest=true;p.best.time=s.time;}if(s.mode==='circuit'&&(p.best.circuit===0||s.time<p.best.circuit)){s.newBest=true;p.best.circuit=s.time;}if(s.mode==='drift'&&s.driftScore>p.best.drift){s.newBest=true;p.best.drift=Math.floor(s.driftScore);}if(s.newBest)s.reward+=100;p.credits+=s.reward;saveProfile(p);$('#resKicker').textContent=s.mode==='circuit'?'CIRCUIT / 环湾竞速':s.mode==='time'?'TIME ATTACK / 极速计时':'DRIFT TRIAL / 漂移试炼';$('#resTitle').textContent=s.mode==='circuit'?`第 ${s.rank} 名`:s.mode==='time'?s.medal:`${Math.floor(s.driftScore)} DRIFT`;const rows=s.mode==='circuit'?[['名次',`${s.rank} / ${s.total}`],['总时间',fmtTime(s.time)],['最快圈',fmtTime(s.bestLap)],['漂移分',Math.floor(s.driftScore)]]:s.mode==='time'?[['奖牌',s.medal],['总时间',fmtTime(s.time)],['最快圈',fmtTime(s.bestLap)],['漂移分',Math.floor(s.driftScore)]]:[['漂移得分',Math.floor(s.driftScore)],['最高连击','x'+s.maxCombo],['用时','90.0 s'],['奖励等级',s.reward>=800?'S':s.reward>=600?'A':'B']];$('#resStats').innerHTML=rows.map(([a,b])=>`<div class="result-stat"><span>${a}</span><b>${b}</b></div>`).join('');$('#resReward').textContent='+'+s.reward;$('#resNote').textContent=s.newBest?'NEW RECORD / 新纪录已写入车库。':'去车库升级，下一局更快。';this.showScreen('screen-results');this.updateMenuStats();this.toast(s.newBest?'新纪录！':'比赛完成');}
 updateHud(){const r=this.race,c=r.player;if(!c)return;$('#hudSpeed').textContent=String(Math.round(c.speedKmh)).padStart(3,'0');$('#hudGear').textContent=c.speedKmh<1?'N':c.gear;$('#hudNitro').style.width=(c.nitro/c.stats.nitroMax*100)+'%';$('#hudRpm').style.width=(c.rpm*100)+'%';$('#hudTimer').textContent=fmtTime(r.mode==='drift'?Math.max(0,r.timeLimit-r.raceTime):r.raceTime);$('#hudPos').textContent=r.mode==='circuit'?`${r.rank()} / ${r.cars.length}`:r.mode==='time'?'SOLO':'DRIFT';$('#hudMode').textContent=r.mode==='circuit'?'CIRCUIT':r.mode==='time'?'TIME ATTACK':'DRIFT TRIAL';if(r.mode==='drift'){$('#hudLap').textContent=Math.ceil(Math.max(0,r.timeLimit-r.raceTime))+' s';$('#hudCp').textContent='CHAIN '+Math.floor(c.driftScore);}else{$('#hudLap').textContent=`LAP ${Math.min(c.lap+1,r.laps)} / ${r.laps}`;$('#hudCp').textContent=`CP ${Math.min(c.nextCp+1,4)} / 4`;}$('#hudDrift').classList.toggle('on',c.drifting||c.driftTimer>0);$('#driftCombo').textContent='x'+c.combo+' DRIFT';$('#driftScore').textContent=Math.floor(c.driftScore);$('#btnCamTop').textContent='CAM  '+(this.cameraRig.mode?'1P':'3P');const cd=r.phase==='countdown'?String(Math.ceil(r.countdown)):(r.goTimer>0?'GO!':''),el=$('#countdown');if(el.textContent!==cd){el.textContent=cd;el.classList.toggle('on',!!cd);if(cd){el.style.animation='none';void el.offsetWidth;el.style.animation='';}}this.mapClock+=1/60;if(this.mapClock>.055){this.mapClock=0;this.drawMap(r);}}
 drawMap(r){const cv=$('#minimap'),ctx=cv.getContext('2d'),w=cv.width,h=cv.height,pad=13,b=this.track.bounds,map=p=>[pad+(p.x-b.minX)/(b.maxX-b.minX)*(w-pad*2),pad+(p.z-b.minZ)/(b.maxZ-b.minZ)*(h-pad*2)];ctx.clearRect(0,0,w,h);ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();for(let i=0;i<this.track.N;i+=6){const[x,y]=map(this.track.samples[i].p);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.strokeStyle='rgba(4,7,15,.8)';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='rgba(220,240,255,.32)';ctx.lineWidth=2;ctx.stroke();if(r.mode!=='drift'){const cp=this.track.samples[Math.floor(r.checkpoints[r.player.nextCp]*this.track.N)%this.track.N].p,[cx,cy]=map(cp);ctx.fillStyle='#d6ff3f';ctx.beginPath();ctx.arc(cx,cy,3.4,0,Math.PI*2);ctx.fill();}for(const ai of r.ai){const[x,y]=map(ai.pos);ctx.fillStyle=hex(ai.def.color);ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}const[px,py]=map(r.player.pos),fx=Math.sin(r.player.yaw),fy=Math.cos(r.player.yaw),rx=-Math.cos(r.player.yaw),ry=Math.sin(r.player.yaw);ctx.fillStyle=hex(r.player.def.color);ctx.beginPath();ctx.moveTo(px+fx*6,py+fy*6);ctx.lineTo(px-fx*4+rx*3.5,py-fy*4+ry*3.5);ctx.lineTo(px-fx*4-rx*3.5,py-fy*4-ry*3.5);ctx.closePath();ctx.fill();}
 update(dt){if(this.input.consume('pause'))this.togglePause();if(this.state==='race'){if(!this.paused){if(this.input.consume('camera'))this.toggleCamera();if(this.input.consume('beam'))this.toggleBeam();if(this.input.consume('reset'))this.race.resetPlayer();this.race.update(dt);this.updateHud();}}else if(this.state==='results'&&this.race.player){this.showroomTime+=dt;this.cameraRig.updateShowroom(dt,this.race.player,this.showroomTime);}else if(this.preview){this.showroomTime+=dt;this.cameraRig.updateShowroom(dt,this.preview,this.showroomTime);}if(this.state==='race'&&!this.paused)this.cameraRig.updateRace(dt,this.race.player);if(this.race.cars)for(const car of this.race.cars){const d=car.pos.distanceTo(this.camera.position),detail=d<(this.isCoarse?40:52);if(car.model.userData.wheels)for(const w of car.model.userData.wheels)w.steer.visible=detail;if(car.isAI){if(!detail&&car.model.userData.flames)for(const f of car.model.userData.flames)f.group.visible=false;car.model.visible=d<(this.isCoarse?120:140);}}this.world.update(dt,this.camera);this.speedLines.update(dt,this.state==='race'?this.race.player:null);this.smoke.update(dt);this.boostSmoke.update(dt);this.sparks.update(dt);this.sound.update(this.paused?null:(this.state==='race'?this.race.player:this.preview));if(this.race.player)this.race.player.setNight(this.world.night);if(this.preview)this.preview.setNight(this.world.night);this.perfTime+=dt;this.perfFrames++;if(this.perfTime>2.5){const fps=this.perfFrames/this.perfTime;if(this.state==='race'&&this.profile.settings.quality==='auto'){if(fps<28&&this.dpr>.68){this.dpr=Math.max(.68,this.dpr-.14);this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(innerWidth,innerHeight,false);}else if(fps<40&&!this.dynamicLow){this.dynamicLow=true;this.world.setQuality('low');}else if(fps>52&&this.dynamicLow){this.dynamicLow=false;this.world.setQuality(this.profile.settings.quality);}else if(fps>57&&this.dpr<this.dprCap){this.dpr=Math.min(this.dprCap,this.dpr+.08);this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(innerWidth,innerHeight,false);}}this.perfTime=0;this.perfFrames=0;}}
 animate(){const loop=()=>{requestAnimationFrame(loop);const dt=Math.min(this.clock.getDelta(),.05);this.update(dt);this.renderer.render(this.scene,this.camera);};loop();}
}
try{window.neonBayGame=new Game();}catch(err){const b=$('#bootError');if(b){b.style.display='block';b.textContent='启动失败：'+(err&&err.message?err.message:'无法创建 WebGL 场景')+'。请使用支持 WebGL 的 Chrome / Edge / Safari，并通过 HTTP 打开。';}}
})();
