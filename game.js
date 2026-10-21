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
const DEFAULT_PROFILE={credits:1600,selectedCar:0,upgrades:{kaze:{engine:0,tires:0,nitro:0},viper:{engine:0,tires:0,nitro:0},titan:{engine:0,tires:0,nitro:0}},best:{circuit:0,time:0,drift:0},settings:{night:true,rain:true,sound:true,quality:'auto',mouseDrive:false}};
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
function makeCar(def){
  const g=new THREE.Group(),v=def.visual,L=v.length,W=v.width,bh=v.bodyH;
  const paint=new THREE.MeshPhysicalMaterial({color:def.color,metalness:.72,roughness:.2,clearcoat:1,clearcoatRoughness:.08,side:THREE.DoubleSide,envMap:ENV_TEX,envMapIntensity:1.05,emissive:new THREE.Color(def.color).multiplyScalar(.055)});
  const accent=new THREE.MeshStandardMaterial({color:def.accent,emissive:def.accent,emissiveIntensity:1.35,metalness:.6,roughness:.22});
  const glass=new THREE.MeshPhysicalMaterial({color:0x071522,metalness:.42,roughness:.05,transparent:true,opacity:.56,side:THREE.DoubleSide,clearcoat:1,envMap:ENV_TEX,envMapIntensity:1.55});
  const rubber=new THREE.MeshStandardMaterial({color:0x07090d,roughness:.96,metalness:.0});
  const trim=new THREE.MeshStandardMaterial({color:0x080b11,metalness:.68,roughness:.38});
  const chrome=new THREE.MeshStandardMaterial({color:0xd7e4ee,metalness:.98,roughness:.1,envMap:ENV_TEX,envMapIntensity:1.3});
  const headMat=new THREE.MeshStandardMaterial({color:0xe9fbff,emissive:0xbcefff,emissiveIntensity:2.5,metalness:.2,roughness:.12});
  const tailMat=new THREE.MeshStandardMaterial({color:0x3b0208,emissive:0xff173d,emissiveIntensity:1.2,metalness:.35,roughness:.22});
  const signalL=new THREE.MeshStandardMaterial({color:0x3b1c00,emissive:0xff9c1a,emissiveIntensity:.35,metalness:.2,roughness:.25});
  const signalR=new THREE.MeshStandardMaterial({color:0x3b1c00,emissive:0xff9c1a,emissiveIntensity:.35,metalness:.2,roughness:.25});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;};
  const box=(w,h,d,mat,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
  const baseY=.27;
  const zs=[-L/2,-L*.4,-L*.25,-L*.08,L*.08,L*.27,L*.43,L/2];
  const wf=[.58,.86,1,1,.99,.92,.76,.48];
  const hf=[.5,.84,1,1,.97,.84,.62,.4];
  const body=loftGeometry(zs.map((z,i)=>({z,hw:W*.5*wf[i],cy:baseY+bh*.48,hh:bh*.5*hf[i]})),18);
  const bodyMesh=new THREE.Mesh(body,paint);g.add(bodyMesh);
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI*.54),glass);
  canopy.scale.set(W*.34,v.cabinH*1.22,v.cabinLen*.54);
  canopy.position.set(0,baseY+bh-.01,-.05);g.add(canopy);
  const roof=new THREE.Mesh(new THREE.SphereGeometry(1,18,8,0,Math.PI*2,0,Math.PI*.35),paint);
  roof.scale.set(W*.255,.13,v.cabinLen*.37);roof.position.set(0,baseY+bh+v.cabinH*.72,-.09);g.add(roof);
  box(W*.9,.08,L*.28,trim,0,baseY+bh*.82,L*.24);
  box(W*.93,.1,.32,trim,0,.3,-L/2+.1);
  box(W*.96,.12,.34,trim,0,.3,L/2-.12);
  box(W*.8,.16,.18,trim,0,.88,-L/2+.08);
  box(W*.22,.03,L*.7,accent,0,baseY+bh+.025,.02);
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
  const wheels=[];
  for(const front of[true,false])for(const sx of[-1,1]){
    const steer=new THREE.Group();steer.position.set(sx*(W/2-.015),v.wheelR,(front?1:-1)*v.wheelbase/2);g.add(steer);
    const spin=new THREE.Group();steer.add(spin);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(v.wheelR,v.wheelR,v.wheelW,20,1),rubber);tire.rotation.z=Math.PI/2;spin.add(tire);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(v.wheelR*.64,v.wheelR*.64,v.wheelW+.025,14),accent);rim.rotation.z=Math.PI/2;spin.add(rim);
    for(let k=0;k<6;k++){
      const spoke=new THREE.Mesh(new THREE.BoxGeometry(v.wheelW+.04,.035,v.wheelR*1.08),chrome);
      spoke.rotation.x=k/6*Math.PI;spin.add(spoke);
    }
    for(const side of[-1,1]){
      const wall=new THREE.Mesh(new THREE.TorusGeometry(v.wheelR*.76,v.wheelW*.19,6,18),rubber);
      wall.rotation.y=Math.PI/2;wall.position.x=side*(v.wheelW*.5+.01);spin.add(wall);
    }
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(v.wheelR*.43,v.wheelR*.43,.035,16),chrome);disc.rotation.z=Math.PI/2;spin.add(disc);
    wheels.push({steer,spin,front,radius:v.wheelR});
  }
  const flameRoot=new THREE.Group();flameRoot.position.set(0,baseY+bh*.34,-L/2-.04);g.add(flameRoot);
  const flames=[];
  for(const sx of[-1,1]){
    const fg=new THREE.Group();fg.position.x=sx*W*.23;flameRoot.add(fg);
    const om=new THREE.MeshBasicMaterial({color:def.accent,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const im=new THREE.MeshBasicMaterial({color:0xd9ffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const outer=new THREE.Mesh(new THREE.ConeGeometry(.18,1.15,10),om);outer.rotation.x=-Math.PI/2;outer.position.z=-.57;fg.add(outer);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(.085,.78,8),im);inner.rotation.x=-Math.PI/2;inner.position.z=-.39;fg.add(inner);
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(.085,.1,.16,10),chrome);tip.rotation.x=Math.PI/2;tip.position.set(0,0,.08);fg.add(tip);
    flames.push({group:fg,outer:om,inner:im});
  }
  const exhaustLight=new THREE.PointLight(def.accent,0,8,2);exhaustLight.position.set(0,baseY+bh*.35,-L/2-.45);g.add(exhaustLight);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(W*2.5,L*1.45),new THREE.MeshBasicMaterial({map:SOFT,color:def.accent,transparent:true,opacity:.48,blending:THREE.AdditiveBlending,depthWrite:false}));
  glow.rotation.x=-Math.PI/2;glow.position.y=.02;glow.renderOrder=3;g.add(glow);
  g.userData={headMat,tailMat,signalL,signalR,glow,spot:null,wheels,flames,exhaustLight,paint};
  return g;
}
function addHeadlight(g){
  const s=new THREE.SpotLight(0xd5ebff,5.2,110,Math.PI/5.2,.52,1.1);
  s.position.set(0,1.0,1.7);s.target.position.set(0,.05,34);s.castShadow=false;
  g.add(s);g.add(s.target);g.userData.spot=s;
}

class Track{
 constructor(scene){
   this.scene=scene;this.N=720;this.halfWidth=9;this.wallLimit=9.42;
   this.points=[new THREE.Vector3(0,0,0),new THREE.Vector3(85,0,18),new THREE.Vector3(150,1,80),new THREE.Vector3(165,3,150),new THREE.Vector3(125,6,210),new THREE.Vector3(45,5,230),new THREE.Vector3(-35,3,205),new THREE.Vector3(-85,1,155),new THREE.Vector3(-160,0,170),new THREE.Vector3(-220,2,110),new THREE.Vector3(-220,0,30),new THREE.Vector3(-170,0,-35),new THREE.Vector3(-85,0,-45),new THREE.Vector3(-30,0,-15)];
   this.curve=new THREE.CatmullRomCurve3(this.points,true,'catmullrom',.35);this.curve.arcLengthDivisions=1200;this.length=this.curve.getLength();this.samples=[];
   for(let i=0;i<this.N;i++){const u=i/this.N,p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u).normalize(),side=new THREE.Vector3().crossVectors(UP,t).normalize();this.samples.push({u,p,t,side});}
   this.rampCenter=Math.floor(this.N*.56);this.rampHalf=7;this.checkpointProgress=[.24,.49,.74,0];this.gateMats=[];this.gates=[];
   this.build();this.buildBounds();
 }
 rampHeightAtProgress(progress){const center=this.rampCenter/this.N;let d=Math.abs(progress-center);d=Math.min(d,1-d);const span=this.rampHalf/this.N;if(d>=span)return 0;return Math.cos((d/span)*Math.PI*.5)*1.9;}
 nearest(x,z){let bestD=Infinity,bestI=0,bestT=0;for(let i=0;i<this.N;i++){const a=this.samples[i].p,b=this.samples[(i+1)%this.N].p,abx=b.x-a.x,abz=b.z-a.z,den=abx*abx+abz*abz||1;let t=((x-a.x)*abx+(z-a.z)*abz)/den;t=clamp(t,0,1);const px=a.x+abx*t,pz=a.z+abz*t,dx=x-px,dz=z-pz,d=dx*dx+dz*dz;if(d<bestD){bestD=d;bestI=i;bestT=t;}}const a=this.samples[bestI],b=this.samples[(bestI+1)%this.N],p=new THREE.Vector3().lerpVectors(a.p,b.p,bestT),tangent=new THREE.Vector3().lerpVectors(a.t,b.t,bestT).normalize(),side=new THREE.Vector3().crossVectors(UP,tangent).normalize(),lateral=(x-p.x)*side.x+(z-p.z)*side.z;return{index:bestI,t:bestT,p,tangent,side,lateral,distance:Math.sqrt(bestD),progress:(bestI+bestT)/this.N};}
 addRibbon(offA,offB,hA,hB,mat,colorFn){const pos=[],norm=[],col=[],idx=[];for(let i=0;i<=this.N;i++){const s=this.samples[i%this.N],ax=s.p.x+s.side.x*offA,az=s.p.z+s.side.z*offA,ay=s.p.y+hA,bx=s.p.x+s.side.x*offB,bz=s.p.z+s.side.z*offB,by=s.p.y+hB;pos.push(ax,ay,az,bx,by,bz);norm.push(0,1,0,0,1,0);if(colorFn){const c=new THREE.Color(colorFn(i%this.N));col.push(c.r,c.g,c.b,c.r,c.g,c.b);}}for(let i=0;i<this.N;i++){const a=i*2,b=a+1,c=((i+1)%this.N)*2,d=c+1;idx.push(a,c,b,b,c,d);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));if(colorFn)geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeBoundingSphere();const m=new THREE.Mesh(geo,mat);this.scene.add(m);return m;}
 addWall(offset,mat){const pos=[],idx=[];for(let i=0;i<=this.N;i++){const s=this.samples[i%this.N],x=s.p.x+s.side.x*offset,z=s.p.z+s.side.z*offset;pos.push(x,s.p.y+.08,z,x,s.p.y+1.05,z);}for(let i=0;i<this.N;i++){const a=i*2,b=a+1,c=((i+1)%this.N)*2,d=c+1;idx.push(a,b,c,b,d,c);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();geo.computeBoundingSphere();const m=new THREE.Mesh(geo,mat);this.scene.add(m);return m;}
 addDashes(){const pos=[],idx=[];let v=0;for(let d=0;d<this.length;d+=13){const u=d/this.length,p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u).normalize(),side=new THREE.Vector3().crossVectors(UP,t).normalize();const a=p.clone().addScaledVector(t,-2.8).addScaledVector(side,-.08),b=p.clone().addScaledVector(t,-2.8).addScaledVector(side,.08),c=p.clone().addScaledVector(t,2.8).addScaledVector(side,-.08),e=p.clone().addScaledVector(t,2.8).addScaledVector(side,.08);for(const q of[a,b,c,e])pos.push(q.x,q.y+.085,q.z);idx.push(v,v+2,v+1,v+1,v+2,v+3);v+=4;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();this.scene.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xdbe8ff,transparent:true,opacity:.5})));}
 buildRamp(){const arr=[],start=this.rampCenter-this.rampHalf,end=this.rampCenter+this.rampHalf;for(let i=start;i<end;i++){const a=this.samples[(i+this.N)%this.N],b=this.samples[(i+1+this.N)%this.N],ah=this.rampHeightAtProgress(i/this.N)+.11,bh=this.rampHeightAtProgress((i+1)/this.N)+.11;const aL=[a.p.x-a.side.x*this.halfWidth,a.p.y+ah,a.p.z-a.side.z*this.halfWidth],aR=[a.p.x+a.side.x*this.halfWidth,a.p.y+ah,a.p.z+a.side.z*this.halfWidth],bL=[b.p.x-b.side.x*this.halfWidth,b.p.y+bh,b.p.z-b.side.z*this.halfWidth],bR=[b.p.x+b.side.x*this.halfWidth,b.p.y+bh,b.p.z+b.side.z*this.halfWidth];arr.push(...aL,...aR,...bL,...aR,...bR,...bL);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));geo.computeVertexNormals();this.scene.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xf6c63b,emissive:0x5d4200,emissiveIntensity:.35,roughness:.52,metalness:.16})));}
 buildStartLine(){const tex=canvasTexture(256,64,(x,w,h)=>{x.fillStyle='#e8eef7';x.fillRect(0,0,w,h);x.fillStyle='#0a0d14';for(let y=0;y<4;y++)for(let xx=0;xx<16;xx++)if((xx+y)%2===0)x.fillRect(xx*w/16,y*h/4,w/16,h/4);});const p=this.samples[0].p.clone(),t=this.samples[0].t.clone(),side=this.samples[0].side.clone();const mesh=new THREE.Mesh(new THREE.PlaneGeometry(this.halfWidth*2,2.7),new THREE.MeshBasicMaterial({map:tex}));mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side,t.clone().negate(),UP));mesh.position.copy(p);mesh.position.y+=.09;this.scene.add(mesh);}
 buildGates(){for(let k=0;k<4;k++){const u=this.checkpointProgress[k],p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u).normalize(),g=new THREE.Group();g.position.copy(p);g.rotation.y=Math.atan2(t.x,t.z);const mat=new THREE.MeshStandardMaterial({color:0xff3f9a,emissive:0xff3f9a,emissiveIntensity:.8,metalness:.3,roughness:.3}),torus=new THREE.Mesh(new THREE.TorusGeometry(9,.2,8,40),mat);torus.position.y=9.15;g.add(torus);for(const sx of[-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(.28,9,.28),new THREE.MeshStandardMaterial({color:0x172030,metalness:.7,roughness:.3}));post.position.set(sx*9.15,4.5,0);g.add(post);}this.scene.add(g);this.gateMats.push(mat);this.gates.push(g);}}
 buildGantry(){const p=this.samples[0].p.clone(),t=this.samples[0].t.clone(),g=new THREE.Group();g.position.copy(p);g.rotation.y=Math.atan2(t.x,t.z);const metal=new THREE.MeshStandardMaterial({color:0x151d2b,metalness:.82,roughness:.22});for(const sx of[-1,1]){const tw=new THREE.Mesh(new THREE.BoxGeometry(.7,8.2,.7),metal);tw.position.set(sx*10.8,4.1,0);g.add(tw);}const beam=new THREE.Mesh(new THREE.BoxGeometry(22.3,.8,.75),metal);beam.position.y=8.05;g.add(beam);const tex=signTexture('NIGHTSHIFT','霓虹湾 / NEON BAY','#d6ff3f');const sign=new THREE.Mesh(new THREE.PlaneGeometry(14,2.8),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));sign.position.set(0,9.6,.05);g.add(sign);this.scene.add(g);}
 build(){this.roadMat=new THREE.MeshPhysicalMaterial({color:0x111521,roughness:.38,metalness:.38,clearcoat:.65,clearcoatRoughness:.18,envMap:ENV_TEX,envMapIntensity:.65});this.addRibbon(-this.halfWidth,this.halfWidth,.045,.045,this.roadMat);this.curbMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.08,emissive:0x260811,emissiveIntensity:.35});this.addRibbon(-this.halfWidth-1.15,-this.halfWidth,.10,.10,this.curbMat,i=>(Math.floor(i/3)%2)?0xf1f5ff:0xff294d);this.addRibbon(this.halfWidth,this.halfWidth+1.15,.10,.10,this.curbMat,i=>(Math.floor(i/3)%2)?0xf1f5ff:0xff294d);const walk=new THREE.MeshStandardMaterial({color:0x202634,roughness:.8,metalness:.08});this.addRibbon(-this.halfWidth-5.4,-this.halfWidth-1.25,.19,.19,walk);this.addRibbon(this.halfWidth+1.25,this.halfWidth+5.4,.19,.19,walk);const rail=new THREE.MeshStandardMaterial({color:0x121d28,metalness:.8,roughness:.28,emissive:0x073d47,emissiveIntensity:.3,side:THREE.DoubleSide});this.addWall(-this.halfWidth-1.5,rail);this.addWall(this.halfWidth+1.5,rail);const neon=new THREE.MeshBasicMaterial({color:0x2ff3ff,transparent:true,opacity:.72});this.addRibbon(-this.halfWidth-1.56,-this.halfWidth-1.42,1.08,1.08,neon);this.addRibbon(this.halfWidth+1.42,this.halfWidth+1.56,1.08,1.08,neon);const line=new THREE.MeshBasicMaterial({color:0x9db3cf,transparent:true,opacity:.5});this.addRibbon(-4.48,-4.38,.065,.065,line);this.addRibbon(4.38,4.48,.065,.065,line);this.addDashes();this.buildRamp();this.buildStartLine();this.buildGates();this.buildGantry();}
 buildBounds(){let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(const s of this.samples){minX=Math.min(minX,s.p.x);maxX=Math.max(maxX,s.p.x);minZ=Math.min(minZ,s.p.z);maxZ=Math.max(maxZ,s.p.z);}this.bounds={minX,maxX,minZ,maxZ};}
 setWet(on){if(!this.roadMat)return;this.roadMat.roughness=on?.22:.38;this.roadMat.metalness=on?.58:.38;this.roadMat.envMapIntensity=on?1.15:.65;this.roadMat.clearcoatRoughness=on?.06:.18;}
 setActiveGate(index){this.gateMats.forEach((m,k)=>{const a=k===index;m.color.setHex(a?0xd6ff3f:0x41516b);m.emissive.setHex(a?0xd6ff3f:0x40122c);m.emissiveIntensity=a?2.4:.45;});}
}

class World{
 constructor(scene,track,renderer){this.scene=scene;this.track=track;this.renderer=renderer;this.night=true;this.rainOn=true;this.quality='auto';this.buildSky();this.buildGround();this.buildCity();this.buildLamps();this.buildSigns();this.buildRain();this.setNight(true);this.setRain(true);}
 buildSky(){this.hemi=new THREE.HemisphereLight(0x94bcff,0x120b18,.8);this.sun=new THREE.DirectionalLight(0xffc58e,1.6);this.sun.position.set(-90,120,-50);this.scene.add(this.hemi,this.sun);this.skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uTop:{value:new THREE.Color(0x02040c)},uHorizon:{value:new THREE.Color(0x2b1636)},uSunDir:{value:new THREE.Vector3(-.4,.3,-.7).normalize()},uSunColor:{value:new THREE.Color(0xff9e54)},uNight:{value:1}},vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'precision highp float;varying vec3 vDir;uniform vec3 uTop,uHorizon,uSunDir,uSunColor;uniform float uNight;float hash(vec3 p){p=fract(p*0.3183099+vec3(.1,.2,.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}void main(){vec3 d=normalize(vDir);float h=clamp(d.y*.5+.5,0.0,1.0);vec3 col=mix(uHorizon,uTop,pow(h,.68));float sun=pow(max(dot(d,normalize(uSunDir)),0.0),900.0);col+=uSunColor*sun*(1.0-uNight)*2.2;float glow=pow(max(0.0,1.0-abs(d.y)*5.0),5.0)*.12*(1.0-uNight);col+=vec3(1.0,.42,.18)*glow;vec3 sp=floor(d*690.0);float star=step(.9965,hash(sp));col+=vec3(.9,.95,1.0)*star*uNight*smoothstep(.02,.2,d.y);gl_FragColor=vec4(col,1.0);}'});this.sky=new THREE.Mesh(new THREE.SphereGeometry(700,32,18),this.skyMat);this.sky.frustumCulled=false;this.sky.renderOrder=-100;this.scene.add(this.sky);}
 buildGround(){const mat=new THREE.MeshStandardMaterial({color:0x070910,roughness:.96,metalness:.03}),g=new THREE.Mesh(new THREE.PlaneGeometry(2200,2200),mat);g.rotation.x=-Math.PI/2;g.position.y=-.18;this.scene.add(g);}
 buildCity(){const tex=canvasTexture(128,256,(x,w,h)=>{x.fillStyle='#05070f';x.fillRect(0,0,w,h);const r=mulberry32(1024);for(let y=8;y<h;y+=17)for(let xx=7;xx<w;xx+=15){const on=r()>.42;x.fillStyle=on?(r()>.5?'#ffc37b':'#78e8ff'):'#111a2b';x.fillRect(xx,y,9,7);}});tex.wrapS=tex.wrapT=THREE.RepeatWrapping;this.buildingMat=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:0xffa45f,emissiveIntensity:1.25,color:0xffffff,roughness:.63,metalness:.26});const count=130,mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),this.buildingMat,count);mesh.geometry.translate(0,.5,0);const r=mulberry32(91273),dummy=new THREE.Object3D(),col=new THREE.Color();for(let i=0;i<count;i++){const s=this.track.samples[(i*29+13)%this.track.N],sign=i%2?1:-1,off=22+r()*54,p=s.p.clone().addScaledVector(s.side,sign*off).addScaledVector(s.t,(r()-.5)*22),w=7+r()*14,d=7+r()*14,h=12+r()*r()*74;dummy.position.set(p.x,0,p.z);dummy.rotation.y=r()*Math.PI;dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);col.setHSL(.58+r()*.14,.3,.13+r()*.14);mesh.setColorAt(i,col);}mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;this.scene.add(mesh);for(const[x,z,w,h]of[[-250,-150,36,92],[260,-170,30,78],[-255,225,34,110],[245,245,28,84]]){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),new THREE.MeshStandardMaterial({color:0x0c1423,metalness:.6,roughness:.4,emissive:0x0b2d49,emissiveIntensity:.4}));m.position.set(x,h/2,z);this.scene.add(m);}}
 buildLamps(){
    const count=58,step=Math.floor(this.track.N/count),postGeo=new THREE.CylinderGeometry(.075,.12,5,6);postGeo.translate(0,2.5,0);
    const headGeo=new THREE.BoxGeometry(.72,.14,1.5);headGeo.translate(0,5.05,0);
    const postMat=new THREE.MeshStandardMaterial({color:0x111827,metalness:.8,roughness:.35});
    this.lampHeadMat=new THREE.MeshBasicMaterial({color:0xc8fbff});
    const posts=new THREE.InstancedMesh(postGeo,postMat,count),heads=new THREE.InstancedMesh(headGeo,this.lampHeadMat,count),dummy=new THREE.Object3D();
    this.lampLights=[];const glowPos=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const ss=this.track.samples[(i*step)%this.track.N],sign=i%2?1:-1,p=ss.p.clone().addScaledVector(ss.side,sign*(this.track.halfWidth+3.05));
      dummy.position.copy(p);dummy.rotation.set(0,Math.atan2(ss.t.x,ss.t.z),0);dummy.scale.set(1,1,1);dummy.updateMatrix();
      posts.setMatrixAt(i,dummy.matrix);heads.setMatrixAt(i,dummy.matrix);
      glowPos[i*3]=p.x;glowPos[i*3+1]=p.y+5.0;glowPos[i*3+2]=p.z;
      if(i%10===0){const pl=new THREE.PointLight(0x86e8ff,0,24,2);pl.position.copy(p);pl.position.y+=4.9;this.scene.add(pl);this.lampLights.push(pl);}
    }
    posts.instanceMatrix.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;this.scene.add(posts,heads);
    const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.BufferAttribute(glowPos,3));
    this.lampGlow=new THREE.Points(gg,new THREE.PointsMaterial({map:SOFT,color:0x7feaff,size:4.2,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
    this.lampGlow.frustumCulled=false;this.scene.add(this.lampGlow);
  }
  buildSigns(){const specs=[[.075,'霓虹湾','NEON BAY / 01','#39f4ff'],[.34,'NIGHTSHIFT','STREET DIVISION','#d6ff3f'],[.62,'KAZE','DRIFT FREQUENCY','#ff38ce'],[.83,'NO LIMIT','NEON BAY AFTER DARK','#ff9e45']];for(let i=0;i<specs.length;i++){const[u,main,sub,color]=specs[i],p=this.track.curve.getPointAt(u),t=this.track.curve.getTangentAt(u).normalize(),side=new THREE.Vector3().crossVectors(UP,t).normalize(),pos=p.clone().addScaledVector(side,(i%2?1:-1)*(this.track.halfWidth+9)).add(new THREE.Vector3(0,6,0)),tex=signTexture(main,sub,color);const plane=new THREE.Mesh(new THREE.PlaneGeometry(14,6),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));plane.position.copy(pos);plane.lookAt(p.x,pos.y,p.z);this.scene.add(plane);}}
 buildRain(){const count=850,pos=new Float32Array(count*3),r=mulberry32(477);for(let i=0;i<count;i++){pos[i*3]=(r()-.5)*140;pos[i*3+1]=r()*55;pos[i*3+2]=(r()-.5)*140;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));this.rainMat=new THREE.PointsMaterial({color:0x9dccff,size:.13,transparent:true,opacity:.55,depthWrite:false,sizeAttenuation:true});this.rain=new THREE.Points(geo,this.rainMat);this.rain.frustumCulled=false;this.scene.add(this.rain);}
 updateAtmosphere(){const n=this.night,rain=this.rainOn;this.skyMat.uniforms.uNight.value=n?1:0;this.skyMat.uniforms.uTop.value.setHex(n?0x02040c:0x3f78bc);this.skyMat.uniforms.uHorizon.value.setHex(n?0x2b1636:0xffc287);this.skyMat.uniforms.uSunColor.value.setHex(n?0xff9e54:0xffe0a8);this.sun.intensity=n?.24:2.1;this.hemi.intensity=n?.72:1.05;this.hemi.color.setHex(n?0x85a6ff:0xcfe3ff);this.hemi.groundColor.setHex(n?0x140a1c:0x4c4037);this.scene.fog.color.setHex(n?0x0a0c1b:0xaac2d4);this.scene.fog.density=(n?.00165:.00115)*(rain?1.28:1);if(this.buildingMat)this.buildingMat.emissiveIntensity=n?1.25:.12;if(this.lampHeadMat)this.lampHeadMat.color.setHex(n?0xc8fbff:0x3a4858);if(this.rainMat)this.rainMat.color.setHex(n?0x9dccff:0xcfe9ff);if(this.renderer)this.renderer.toneMappingExposure=n?1.06:1.16;if(this.lampLights)for(const l of this.lampLights)l.intensity=n?2.1:0;if(this.lampGlow)this.lampGlow.material.opacity=n?.72:.03;}
 setNight(on){this.night=!!on;this.updateAtmosphere();}
 setRain(on){this.rainOn=!!on;this.track.setWet(this.rainOn);this.updateAtmosphere();if(this.rain)this.rain.visible=this.rainOn&&this.quality!=='low';}
 setQuality(q){this.quality=q;if(this.rain)this.rain.visible=this.rainOn&&q!=='low';}
 update(dt,camera){this.sky.position.copy(camera.position);if(this.rain.visible){this.rain.position.set(camera.position.x,0,camera.position.z);const a=this.rain.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]-=dt*(42+(i%13)*2);if(a[i+1]<0)a[i+1]+=55;}this.rain.geometry.attributes.position.needsUpdate=true;}}
}

class InputHub{
  constructor(){
    this.keys=new Set();
    this.touch={left:false,right:false,accel:false,brake:false,nitro:false};
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
    window.addEventListener('blur',()=>this.keys.clear());
  }
  bindTouch(){
    const hold=(id,key)=>{
      const el=$(id);if(!el)return;
      const on=e=>{e.preventDefault();e.stopPropagation();this.touch[key]=true;el.classList.add('down');el.setPointerCapture?.(e.pointerId);if(key==='nitro'&&navigator.vibrate)navigator.vibrate(10);};
      const off=e=>{e.preventDefault();this.touch[key]=false;el.classList.remove('down');};
      el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('lostpointercapture',off);
    };
    hold('#btnLeft','left');hold('#btnRight','right');hold('#btnGas','accel');hold('#btnBrake','brake');hold('#btnNitro','nitro');
  }
  resetTouch(){
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
    this.model=makeCar(def);if(opts.headlight)addHeadlight(this.model);scene.add(this.model);
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
    if(u.spot){u.spot.intensity=n?(this.highBeam?8.2:5.2):0;u.spot.angle=this.highBeam?Math.PI/4.2:Math.PI/5.2;u.spot.distance=this.highBeam?155:110;}
    if(u.headMat)u.headMat.emissiveIntensity=n?(this.highBeam?3.8:2.4):.45;
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
        f.group.scale.set(.78+k*.42,.78+k*.42,.35+k*(1.7+Math.sin(t*38+i*2)*.16));
        f.outer.opacity=k*(.54+.34*Math.abs(Math.sin(t*41+i)));
        f.inner.opacity=k*.95;
      }
    }
    if(u.exhaustLight)u.exhaustLight.intensity=k*(3+Math.min(9,this.speedKmh*.045));
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
    this.steer=damp(this.steer,targetSteer,8.5,dt);
    const throttle=canDrive&&input.accel?1:0;
    const brake=canDrive&&input.brake?1:0;
    this.brakeInput=!!brake;this.signalLeft=canDrive&&!!input.left&&!input.right;this.signalRight=canDrive&&!!input.right&&!input.left;
    const wantBoost=canDrive&&!!input.nitro&&this.nitro>.4;
    let info=track.nearest(this.pos.x,this.pos.z);this.lastInfo=info;
    const speed=Math.hypot(this.velocity.x,this.velocity.z),onRoad=Math.abs(info.lateral)<=track.halfWidth+.6;
    const handbrake=brake>0&&speed>14&&Math.abs(this.steer)>.18;
    if(!this.airborne){
      const authority=clamp(speed/5,0,1),turn=st.steer*(.6+.4/(1+speed*.02))*authority;
      this.yaw-=this.steer*turn*dt*(handbrake?1.6:1);
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
      this.yaw-=this.steer*.85*dt;this.forward.set(Math.sin(this.yaw),0,Math.cos(this.yaw));this.right.set(-Math.cos(this.yaw),0,Math.sin(this.yaw));
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
    this.count=190;this.cursor=0;this.pos=new Float32Array(this.count*3);this.vel=new Float32Array(this.count*3);this.age=new Float32Array(this.count);this.life=new Float32Array(this.count);
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
    this.count=180;this.cursor=0;this.pos=new Float32Array(this.count*3);this.vel=new Float32Array(this.count*3);this.age=new Float32Array(this.count);this.life=new Float32Array(this.count);
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
    this.count=72;this.x=new Float32Array(this.count);this.y=new Float32Array(this.count);this.z=new Float32Array(this.count);this.len=new Float32Array(this.count);this.pos=new Float32Array(this.count*6);this.col=new Float32Array(this.count*6);
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
 start(mode){this.clear();this.mode=mode;this.laps=mode==='circuit'?2:1;this.raceTime=0;this.countdown=3;this.phase='countdown';this.goTimer=0;this.finishTimer=0;this.summarySent=false;this.timeLimit=90;this.game.input.resetTouch();this.game.input.clearActions();const p=this.game.profile,pdef=CARS[p.selectedCar];this.player=new CarController(pdef,p.upgrades[pdef.id],this.game.scene,{headlight:true});this.cars.push(this.player);if(mode==='circuit'){for(let i=0;i<3;i++){const def=CARS[(p.selectedCar+i+1)%CARS.length],car=new CarController(def,{engine:1,tires:1+(i%2),nitro:1},this.game.scene,{isAI:true,skill:.925+i*.018,laneOffset:i%2?2.1:-2.1});car.isAI=true;this.cars.push(car);this.ai.push(car);}}this.cars.forEach((c,i)=>{c.nextCp=0;c.lap=0;c.lapTimes=[];c.lapStart=0;c.finished=false;c.finishTime=Infinity;c.driftScore=0;c.maxCombo=1;c.driftTimer=0;c.combo=1;c.stuckTimer=0;c.nitro=c.stats.nitroMax;this.grid(c,i);c.setNight(this.game.world.night);});this.track.setActiveGate(mode==='drift'?-1:0);this.game.toast(mode==='circuit'?'环湾竞速 / GO IN 3':mode==='time'?'极速计时 / 单圈冲刺':'漂移试炼 / 90 秒',1500);}
 grid(car,slot){const back=.003+slot*.0045,u=(1-back)%1,p=this.track.curve.getPointAt(u),t=this.track.curve.getTangentAt(u).normalize(),side=new THREE.Vector3().crossVectors(UP,t).normalize(),lane=(slot%2?1:-1)*2.1,pos=p.clone().addScaledVector(side,lane);pos.y=p.y;car.resetTo(pos,Math.atan2(t.x,t.z));car.nitro=car.stats.nitroMax;}
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
 constructor(){this.profile=loadProfile();this.canvas=$('#game');this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setSize(innerWidth,innerHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));if('outputColorSpace'in this.renderer)this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;this.renderer.setClearColor(0x02030a,1);this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0x0a0c1b,.00165);this.camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.08,900);this.scene.add(this.camera);this.input=new InputHub();this.sound=new Sound();this.track=new Track(this.scene);this.world=new World(this.scene,this.track,this.renderer);this.smoke=new Smoke(this.scene);this.boostSmoke=new Smoke(this.scene,0xff6a2e,.3,1.0);this.skidMarks=new SkidMarks(this.scene);this.sparks=new Sparks(this.scene);this.speedLines=new SpeedLines(this.camera);this.cameraRig=new CameraRig(this.camera);this.race=new Race(this);this.preview=null;this.state='menu';this.paused=false;this.showroomTime=0;this.highBeam=false;this.clock=new THREE.Clock();this.perfTime=0;this.perfFrames=0;this.mapClock=0;this.dpr=1;this.dprCap=1;this.lastMode='circuit';this.sound.setEnabled(this.profile.settings.sound);this.bindUI();this.bindResize();this.bindOrientation();this.applyQuality(true);this.updateSettingsUI();this.showMenu();this.animate();requestAnimationFrame(()=>{const b=$('#boot');b.classList.add('done');setTimeout(()=>b.style.display='none',520);});}
 bindUI(){document.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;this.sound.unlock();if(btn.dataset.race){this.startRace(btn.dataset.race);return;}if(btn.dataset.car!==undefined){this.profile.selectedCar=Number(btn.dataset.car);saveProfile(this.profile);this.replacePreview();this.renderGarage();this.sound.ui();return;}if(btn.dataset.upgrade){this.buyUpgrade(btn.dataset.upgrade);return;}if(btn.dataset.setting){this.toggleSetting(btn.dataset.setting);return;}const a=btn.dataset.action;if(!a)return;if(a==='garage')this.openGarage();else if(a==='menu')this.showMenu();else if(a==='pause')this.togglePause();else if(a==='resume')this.togglePause();else if(a==='camera')this.toggleCamera();else if(a==='beam')this.toggleBeam();else if(a==='retry')this.startRace(this.race.mode||this.lastMode);});this.canvas.addEventListener('pointerdown',()=>this.sound.unlock());}
 bindResize(){window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight,false);this.applyQuality(false);});}
 bindOrientation(){const update=()=>{const p=innerHeight>innerWidth&&matchMedia('(pointer:coarse)').matches;$('#portrait').style.display=p?'flex':'none';};window.addEventListener('resize',update);window.addEventListener('orientationchange',()=>setTimeout(update,200));update();}
 applyQuality(force){const q=this.profile.settings.quality,coarse=matchMedia('(pointer:coarse)').matches;this.dprCap=q==='low'?.85:q==='high'?2:(coarse?1.15:1.5);this.dprCap=Math.min(this.dprCap,devicePixelRatio||1);if(force)this.dpr=this.dprCap;this.dpr=clamp(this.dpr,.65,this.dprCap);this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(innerWidth,innerHeight,false);this.world.setQuality(q);}
 toggleSetting(k){const s=this.profile.settings;if(k==='night'){s.night=!s.night;this.world.setNight(s.night);}else if(k==='rain'){s.rain=!s.rain;this.world.setRain(s.rain);}else if(k==='sound'){s.sound=!s.sound;this.sound.setEnabled(s.sound);}else if(k==='quality'){s.quality=s.quality==='auto'?'high':s.quality==='high'?'low':'auto';this.applyQuality(true);}saveProfile(this.profile);this.updateSettingsUI();this.sound.ui();}
 updateSettingsUI(){const s=this.profile.settings;$('#setNight').textContent='昼夜  '+(s.night?'夜':'昼');$('#setRain').textContent='雨  '+(s.rain?'开':'关');$('#setSound').textContent='音效  '+(s.sound?'开':'关');$('#setQuality').textContent='画质  '+(s.quality==='auto'?'自动':s.quality==='high'?'高':'低');}
 updateMenuStats(){const d=CARS[this.profile.selectedCar];$('#menuCar').textContent=d.name+' / '+d.cn;$('#menuCredits').textContent=this.profile.credits+' CR';$('#menuBest').textContent=fmtShort(Math.max(this.profile.best.time||0,this.profile.best.circuit||0));}
 createPreview(){if(this.preview){this.scene.remove(this.preview.model);this.preview=null;}const d=CARS[this.profile.selectedCar],car=new CarController(d,this.profile.upgrades[d.id],this.scene,{headlight:true}),u=.985,p=this.track.curve.getPointAt(u),t=this.track.curve.getTangentAt(u).normalize(),side=new THREE.Vector3().crossVectors(UP,t).normalize(),pos=p.clone().addScaledVector(side,-1.8);pos.y=p.y;car.resetTo(pos,Math.atan2(t.x,t.z));car.setNight(this.world.night);this.preview=car;this.showroomTime=0;}
 replacePreview(){this.createPreview();}
 showMenu(){this.state='menu';this.paused=false;document.body.classList.remove('racing','paused');this.race.clear();this.createPreview();this.showScreen('screen-menu');this.updateMenuStats();}
 openGarage(){this.state='garage';this.showScreen('screen-garage');if(!this.preview)this.createPreview();this.renderGarage();this.updateSettingsUI();}
 showScreen(id){$$('.screen').forEach(e=>e.classList.toggle('active',e.id===id));}
 renderGarage(){const d=CARS[this.profile.selectedCar],up=this.profile.upgrades[d.id];$('#garageCredits').textContent=this.profile.credits;$('#carCards').innerHTML=CARS.map((c,i)=>{const st=statsFor(c,this.profile.upgrades[c.id]);return`<button class="car-card ${i===this.profile.selectedCar?'selected':''}" data-car="${i}" style="--c:${hex(c.color)}"><div class="car-index">0${i+1} / ${c.cn}</div><div class="car-swatch"></div><h3>${c.name}</h3><p>${c.role}<br>${Math.round(st.topSpeed*3.6)} KM/H  ${Math.round(st.accel*10)/10} ACC</p></button>`;}).join('');$('#garageCarName').textContent=d.name+' / '+d.cn;$('#garageCarRole').textContent=d.role;const st=statsFor(d,up),stat=(l,v,m,t)=>`<div class="statline"><span>${l}</span><div class="bar"><i style="width:${clamp(v/m*100,3,100)}%"></i></div><b>${t}</b></div>`;$('#garageStats').innerHTML=stat('极速',st.topSpeed,82,Math.round(st.topSpeed*3.6))+stat('加速',st.accel,23,st.accel.toFixed(1))+stat('抓地',st.grip,12,st.grip.toFixed(1))+stat('转向',st.steer,2,st.steer.toFixed(2))+stat('刹车',st.brake,40,st.brake.toFixed(0));const names={engine:['引擎','极速 / 加速'],tires:['轮胎','抓地 / 转向'],nitro:['氮气','容量 / 推力']};$('#upgradeList').innerHTML=Object.keys(names).map(k=>{const lv=up[k],max=lv>=3,cost=upgradeCost(lv),cant=this.profile.credits<cost;return`<div class="upgrade-row"><div class="name">${names[k][0]}<small>${names[k][1]}</small></div><div class="pips">${[0,1,2].map(i=>`<i class="${i<lv?'on':''}"></i>`).join('')}</div><button data-upgrade="${k}" ${max||cant?'disabled':''}>${max?'MAX':cost+' CR'}</button></div>`;}).join('');}
 buyUpgrade(part){const d=CARS[this.profile.selectedCar],up=this.profile.upgrades[d.id];if(up[part]>=3)return;const cost=upgradeCost(up[part]);if(this.profile.credits<cost)return;this.profile.credits-=cost;up[part]++;saveProfile(this.profile);this.replacePreview();this.renderGarage();this.updateMenuStats();this.sound.ui();}
 startRace(mode){if(!['circuit','time','drift'].includes(mode))mode='circuit';this.sound.unlock();if(this.preview){this.scene.remove(this.preview.model);this.preview=null;}this.race.start(mode);this.state='race';this.paused=false;this.lastMode=mode;this.showScreen('screen-hud');document.body.classList.add('racing');document.body.classList.remove('paused');this.cameraRig.mode=0;this.cameraRig.snap(this.race.player);this.input.resetTouch();this.input.clearActions();this.showroomTime=0;}
 togglePause(){if(this.state!=='race'||this.race.phase==='finished')return;this.paused=!this.paused;if(this.paused){this.showScreen('screen-pause');document.body.classList.add('paused');this.input.resetTouch();this.input.clearActions();}else{this.showScreen('screen-hud');document.body.classList.remove('paused');this.input.resetTouch();this.input.clearActions();}this.sound.ui();}
 toggleCamera(){if(this.state!=='race')return;this.cameraRig.mode=this.cameraRig.mode?0:1;this.toast(this.cameraRig.mode?'第一人称 / HOOD CAM':'第三人称 / CHASE CAM');}
  toggleBeam(){if(this.state!=='race'||!this.race.player)return;this.highBeam=!this.highBeam;this.race.player.highBeam=this.highBeam;this.race.player.setNight(this.world.night);this.toast(this.highBeam?'远光 / HIGH BEAM':'近光 / LOW BEAM');}
 toast(text,ms=1300){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(this._toastTimer);this._toastTimer=setTimeout(()=>el.classList.remove('show'),ms);}
 endRace(s){this.state='results';this.paused=false;document.body.classList.remove('racing','paused');const p=this.profile;if(s.mode==='time'&&(p.best.time===0||s.time<p.best.time)){s.newBest=true;p.best.time=s.time;}if(s.mode==='circuit'&&(p.best.circuit===0||s.time<p.best.circuit)){s.newBest=true;p.best.circuit=s.time;}if(s.mode==='drift'&&s.driftScore>p.best.drift){s.newBest=true;p.best.drift=Math.floor(s.driftScore);}if(s.newBest)s.reward+=100;p.credits+=s.reward;saveProfile(p);$('#resKicker').textContent=s.mode==='circuit'?'CIRCUIT / 环湾竞速':s.mode==='time'?'TIME ATTACK / 极速计时':'DRIFT TRIAL / 漂移试炼';$('#resTitle').textContent=s.mode==='circuit'?`第 ${s.rank} 名`:s.mode==='time'?s.medal:`${Math.floor(s.driftScore)} DRIFT`;const rows=s.mode==='circuit'?[['名次',`${s.rank} / ${s.total}`],['总时间',fmtTime(s.time)],['最快圈',fmtTime(s.bestLap)],['漂移分',Math.floor(s.driftScore)]]:s.mode==='time'?[['奖牌',s.medal],['总时间',fmtTime(s.time)],['最快圈',fmtTime(s.bestLap)],['漂移分',Math.floor(s.driftScore)]]:[['漂移得分',Math.floor(s.driftScore)],['最高连击','x'+s.maxCombo],['用时','90.0 s'],['奖励等级',s.reward>=800?'S':s.reward>=600?'A':'B']];$('#resStats').innerHTML=rows.map(([a,b])=>`<div class="result-stat"><span>${a}</span><b>${b}</b></div>`).join('');$('#resReward').textContent='+'+s.reward;$('#resNote').textContent=s.newBest?'NEW RECORD / 新纪录已写入车库。':'去车库升级，下一局更快。';this.showScreen('screen-results');this.updateMenuStats();this.toast(s.newBest?'新纪录！':'比赛完成');}
 updateHud(){const r=this.race,c=r.player;if(!c)return;$('#hudSpeed').textContent=String(Math.round(c.speedKmh)).padStart(3,'0');$('#hudGear').textContent=c.speedKmh<1?'N':c.gear;$('#hudNitro').style.width=(c.nitro/c.stats.nitroMax*100)+'%';$('#hudRpm').style.width=(c.rpm*100)+'%';$('#hudTimer').textContent=fmtTime(r.mode==='drift'?Math.max(0,r.timeLimit-r.raceTime):r.raceTime);$('#hudPos').textContent=r.mode==='circuit'?`${r.rank()} / ${r.cars.length}`:r.mode==='time'?'SOLO':'DRIFT';$('#hudMode').textContent=r.mode==='circuit'?'CIRCUIT':r.mode==='time'?'TIME ATTACK':'DRIFT TRIAL';if(r.mode==='drift'){$('#hudLap').textContent=Math.ceil(Math.max(0,r.timeLimit-r.raceTime))+' s';$('#hudCp').textContent='CHAIN '+Math.floor(c.driftScore);}else{$('#hudLap').textContent=`LAP ${Math.min(c.lap+1,r.laps)} / ${r.laps}`;$('#hudCp').textContent=`CP ${Math.min(c.nextCp+1,4)} / 4`;}$('#hudDrift').classList.toggle('on',c.drifting||c.driftTimer>0);$('#driftCombo').textContent='x'+c.combo+' DRIFT';$('#driftScore').textContent=Math.floor(c.driftScore);$('#btnCamTop').textContent='CAM  '+(this.cameraRig.mode?'1P':'3P');const cd=r.phase==='countdown'?String(Math.ceil(r.countdown)):(r.goTimer>0?'GO!':''),el=$('#countdown');if(el.textContent!==cd){el.textContent=cd;el.classList.toggle('on',!!cd);if(cd){el.style.animation='none';void el.offsetWidth;el.style.animation='';}}this.mapClock+=1/60;if(this.mapClock>.055){this.mapClock=0;this.drawMap(r);}}
 drawMap(r){const cv=$('#minimap'),ctx=cv.getContext('2d'),w=cv.width,h=cv.height,pad=13,b=this.track.bounds,map=p=>[pad+(p.x-b.minX)/(b.maxX-b.minX)*(w-pad*2),pad+(p.z-b.minZ)/(b.maxZ-b.minZ)*(h-pad*2)];ctx.clearRect(0,0,w,h);ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();for(let i=0;i<this.track.N;i+=6){const[x,y]=map(this.track.samples[i].p);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.strokeStyle='rgba(4,7,15,.8)';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='rgba(220,240,255,.32)';ctx.lineWidth=2;ctx.stroke();if(r.mode!=='drift'){const cp=this.track.samples[Math.floor(r.checkpoints[r.player.nextCp]*this.track.N)%this.track.N].p,[cx,cy]=map(cp);ctx.fillStyle='#d6ff3f';ctx.beginPath();ctx.arc(cx,cy,3.4,0,Math.PI*2);ctx.fill();}for(const ai of r.ai){const[x,y]=map(ai.pos);ctx.fillStyle=hex(ai.def.color);ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}const[px,py]=map(r.player.pos),fx=Math.sin(r.player.yaw),fy=Math.cos(r.player.yaw),rx=-Math.cos(r.player.yaw),ry=Math.sin(r.player.yaw);ctx.fillStyle=hex(r.player.def.color);ctx.beginPath();ctx.moveTo(px+fx*6,py+fy*6);ctx.lineTo(px-fx*4+rx*3.5,py-fy*4+ry*3.5);ctx.lineTo(px-fx*4-rx*3.5,py-fy*4-ry*3.5);ctx.closePath();ctx.fill();}
 update(dt){if(this.input.consume('pause'))this.togglePause();if(this.state==='race'){if(!this.paused){if(this.input.consume('camera'))this.toggleCamera();if(this.input.consume('beam'))this.toggleBeam();if(this.input.consume('reset'))this.race.resetPlayer();this.race.update(dt);this.updateHud();}}else if(this.state==='results'&&this.race.player){this.showroomTime+=dt;this.cameraRig.updateShowroom(dt,this.race.player,this.showroomTime);}else if(this.preview){this.showroomTime+=dt;this.cameraRig.updateShowroom(dt,this.preview,this.showroomTime);}if(this.state==='race'&&!this.paused)this.cameraRig.updateRace(dt,this.race.player);if(this.race.cars)for(const car of this.race.cars){const d=car.pos.distanceTo(this.camera.position),detail=d<52;if(car.model.userData.wheels)for(const w of car.model.userData.wheels)w.steer.visible=detail;if(car.isAI){if(!detail&&car.model.userData.flames)for(const f of car.model.userData.flames)f.group.visible=false;car.model.visible=d<190;}}this.world.update(dt,this.camera);this.speedLines.update(dt,this.state==='race'?this.race.player:null);this.smoke.update(dt);this.boostSmoke.update(dt);this.sparks.update(dt);this.sound.update(this.paused?null:(this.state==='race'?this.race.player:this.preview));if(this.race.player)this.race.player.setNight(this.world.night);if(this.preview)this.preview.setNight(this.world.night);this.perfTime+=dt;this.perfFrames++;if(this.perfTime>2.5){const fps=this.perfFrames/this.perfTime;if(this.state==='race'&&this.profile.settings.quality==='auto'){if(fps<28&&this.dpr>.68){this.dpr=Math.max(.68,this.dpr-.14);this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(innerWidth,innerHeight,false);}else if(fps>57&&this.dpr<this.dprCap){this.dpr=Math.min(this.dprCap,this.dpr+.08);this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(innerWidth,innerHeight,false);}}this.perfTime=0;this.perfFrames=0;}}
 animate(){const loop=()=>{requestAnimationFrame(loop);const dt=Math.min(this.clock.getDelta(),.05);this.update(dt);this.renderer.render(this.scene,this.camera);};loop();}
}
try{window.neonBayGame=new Game();}catch(err){const b=$('#bootError');if(b){b.style.display='block';b.textContent='启动失败：'+(err&&err.message?err.message:'无法创建 WebGL 场景')+'。请使用支持 WebGL 的 Chrome / Edge / Safari，并通过 HTTP 打开。';}}
})();
