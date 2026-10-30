(function(root){
  const enc=new TextEncoder();
  function bytes(s){return enc.encode(s);}
  function u16(n){return new Uint8Array([n>>8&255,n&255]);}
  function cat(parts){const n=parts.reduce((s,p)=>s+p.length,0),o=new Uint8Array(n);let i=0;for(const p of parts){o.set(p,i);i+=p.length;}return o;}
  function str(s){const b=bytes(s);return cat([u16(b.length),b]);}
  function rest(n){const o=[];do{let d=n%128;n=Math.floor(n/128);if(n)d|=128;o.push(d);}while(n);return new Uint8Array(o);}
  function packet(type,body){const r=rest(body.length),o=new Uint8Array(1+r.length+body.length);o[0]=type;o.set(r,1);o.set(body,1+r.length);return o;}
  function rdRest(buf,i){let m=1,v=0,b,start=i;if(i>=buf.length)return null;do{if(i>=buf.length||i-start>3)return null;b=buf[i++];v+=(b&127)*m;m*=128;}while(b&128);return [v,i];}
  async function sha(salt,password){
    const buf=await crypto.subtle.digest('SHA-256',bytes(salt+':'+password));
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function loadUsers(){try{return JSON.parse(localStorage.getItem('ns-accounts')||'{}');}catch(e){return {};}}
  function saveUsers(u){localStorage.setItem('ns-accounts',JSON.stringify(u));}
  const DEFAULT_PASSWORD='12345678';
  const NightAuth={
    defaultPassword:DEFAULT_PASSWORD,
    normalize(email){return String(email||'').trim().toLowerCase();},
    validEmail(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);},
    session(){try{return JSON.parse(localStorage.getItem('ns-session')||'null');}catch(e){return null;}},
    async register(email,password){
      email=this.normalize(email);password=password||DEFAULT_PASSWORD;
      if(!this.validEmail(email))return {ok:false,error:'请填写邮箱'};
      if(password.length<6)return {ok:false,error:'密码至少 6 位'};
      const users=loadUsers();
      if(users[email])return {ok:false,error:'这个邮箱已经注册，直接登录'};
      const salt=Math.random().toString(36).slice(2)+Date.now().toString(36);
      users[email]={salt,hash:await sha(salt,password)};
      saveUsers(users);localStorage.setItem('ns-session',JSON.stringify({email}));
      return {ok:true,email};
    },
    async login(email,password){
      email=this.normalize(email);password=password||DEFAULT_PASSWORD;
      if(!this.validEmail(email))return {ok:false,error:'请填写邮箱'};
      const user=loadUsers()[email];
      if(!user)return {ok:false,error:'这个邮箱还没注册'};
      if(await sha(user.salt,password)!==user.hash)return {ok:false,error:'密码不对。没改过的话是 12345678'};
      localStorage.setItem('ns-session',JSON.stringify({email}));
      return {ok:true,email};
    },
    async changePassword(oldPassword,newPassword){
      const s=this.session();if(!s)return {ok:false,error:'请先登录'};
      if(s.guest)return {ok:false,error:'游客没有密码'};
      oldPassword=oldPassword||DEFAULT_PASSWORD;newPassword=newPassword||'';
      if(newPassword.length<6)return {ok:false,error:'新密码至少 6 位'};
      const users=loadUsers(),user=users[s.email];
      if(!user||await sha(user.salt,oldPassword)!==user.hash)return {ok:false,error:'原来的密码不对'};
      user.hash=await sha(user.salt,newPassword);saveUsers(users);
      return {ok:true};
    },
    guest(){
      let name=localStorage.getItem('ns-guest-name');
      if(!name){name='游客'+String(1000+Math.floor(Math.random()*9000));localStorage.setItem('ns-guest-name',name);}
      localStorage.setItem('ns-session',JSON.stringify({email:name,guest:true}));
      return {ok:true,email:name,guest:true};
    },
    logout(){localStorage.removeItem('ns-session');}
  };
  class NightRoom{
    constructor(game){this.game=game;this.code='';this.host=false;this.id=sessionStorage.getItem('ns-id');if(!this.id){this.id=Math.random().toString(36).slice(2,10);sessionStorage.setItem('ns-id',this.id);}this.peers=new Map();this.ws=null;this.open=false;this.topic='';this.acc=new Uint8Array(0);this.sendT=0;this.ping=0;this.keep=0;}
    others(){return [...this.peers.values()].filter(p=>p.id!==this.id);}
    me(){const email=(this.game.user&&this.game.user.email)||'racer@local';return {id:this.id,name:email.split('@')[0].slice(0,16),car:this.game.profile.selectedCar||0,host:this.host};}
    status(text){const el=document.getElementById('roomStatus');if(el)el.textContent=text||'';}
    render(){
      const idle=document.getElementById('roomIdle'),live=document.getElementById('roomLive'),code=document.getElementById('roomCode'),list=document.getElementById('roomPlayers'),who=document.getElementById('menuUser');
      if(who)who.textContent=this.game.user?this.game.user.email:'';
      if(!idle||!live)return;
      const on=!!this.code;idle.hidden=on;live.hidden=!on;
      if(code)code.textContent=this.code||'';
      if(list){
        const rows=[this.me(),...this.others()];
        list.innerHTML=rows.map(p=>`<li>${p.host?'房主':'好友'} · ${p.name}</li>`).join('');
      }
    }
    restore(){try{const s=JSON.parse(sessionStorage.getItem('ns-room')||'null');if(s&&s.code)this.connect(s.code,!!s.host);}catch(e){}}
    create(){const code=String(1000+Math.floor(Math.random()*9000));this.connect(code,true);}
    join(code){code=String(code||'').replace(/\D/g,'').slice(0,4);if(code.length!==4){this.status('房间号是 4 位数字');return;}this.connect(code,false);}
    connect(code,host){
      this.leave(false);this.code=code;this.host=!!host;this.topic='nsbay/room/'+code;this.peers.clear();
      sessionStorage.setItem('ns-room',JSON.stringify({code:this.code,host:this.host}));
      this.status('正在连接房间 '+code+' …');this.render();
      let ws;try{ws=new WebSocket('wss://broker.hivemq.com:8884/mqtt',['mqtt']);}catch(e){this.status('房间连不上，请稍后再试');return;}
      this.ws=ws;ws.binaryType='arraybuffer';
      ws.onopen=()=>{this.open=true;ws.send(packet(0x10,cat([str('MQTT'),new Uint8Array([4,0x02,0,20]),str('ns'+this.id)])));};
      ws.onmessage=(ev)=>this.inbox(new Uint8Array(ev.data));
      ws.onerror=()=>this.status('房间连接失败');
      ws.onclose=()=>{this.open=false;if(this.code)this.status('房间已断开');};
    }
    leave(note){if(this.open)this.send({t:'bye'});if(this.ws){this.ws.onclose=null;try{this.ws.close();}catch(e){}this.ws=null;}this.open=false;this.code='';this.host=false;this.peers.clear();this.acc=new Uint8Array(0);sessionStorage.removeItem('ns-room');if(note!==false)this.status('');this.render();}
    inbox(chunk){
      const acc=new Uint8Array(this.acc.length+chunk.length);acc.set(this.acc);acc.set(chunk,this.acc.length);this.acc=acc;
      let i=0;const b=this.acc;
      while(i<b.length){
        const type=b[i],start=i;const rr=rdRest(b,i+1);if(!rr)break;const len=rr[0];i=rr[1];if(i+len>b.length){i=start;break;}
        const body=b.slice(i,i+len);i+=len;this.frame(type,body);
      }
      this.acc=b.slice(i);
    }
    frame(type,body){
      const op=type>>4;
      if(op===2){if(body[1]!==0){this.status('房间服务器拒绝了连接');return;}this.ws.send(packet(0x82,cat([u16(1),str(this.topic),new Uint8Array([0])])));this.hello();this.status(this.host?'房间已开，把号码发给好友':'已加入房间');const auto=this.game.autoMode;if(auto&&this.host){this.game.autoMode=null;this.game.startRace(auto);this.send({t:'start',mode:auto,map:this.game.currentMap});}}
      else if(op===3){let n=(body[0]<<8)|body[1];const topic=new TextDecoder().decode(body.slice(2,2+n));if(topic!==this.topic)return;const msg=JSON.parse(new TextDecoder().decode(body.slice(2+n)));this.onMsg(msg);}
    }
    hello(){const m=this.me();this.send({t:'hello',name:m.name,car:m.car,host:this.host});}
    send(obj){if(!this.ws||this.ws.readyState!==1||!this.topic)return;obj.id=this.id;const payload=bytes(JSON.stringify(obj));this.ws.send(packet(0x30,cat([str(this.topic),payload])));}
    onMsg(msg){
      if(!msg||msg.id===this.id)return;
      if(msg.t==='bye'){this.peers.delete(msg.id);this.render();return;}
      if(msg.t==='hello'||msg.t==='state'||msg.t==='start'){
        const known=this.peers.has(msg.id);
        const prev=this.peers.get(msg.id)||{};
        this.peers.set(msg.id,{id:msg.id,name:msg.name||prev.name||'好友',car:msg.car!=null?msg.car:(prev.car||0),host:!!(msg.host||prev.host),seen:performance.now()});
        this.render();
        if(msg.t==='hello'&&!known)this.hello();
      }
      if(msg.t==='hello'&&this.game.spawnRemote)this.game.spawnRemote(this.peers.get(msg.id));
      if(msg.t==='state'){const car=this.game.race&&this.game.race.cars.find(c=>c.netId===msg.id);if(car)car.netTarget=msg;}
      if(msg.t==='start'&&!this.host){
        if(msg.map&&msg.map!==this.game.currentMap){const u=new URL(location.href);u.searchParams.set('map',msg.map);u.searchParams.set('auto',msg.mode||'circuit');u.searchParams.set('room',this.code);location.href=u.toString();return;}
        if(this.game.state!=='race')this.game.startRace(msg.mode||'circuit');
      }
    }
    tick(dt){
      if(!this.open)return;this.keep+=dt;if(this.keep>2){this.keep=0;this.hello();if(this.ws&&this.ws.readyState===1)this.ws.send(new Uint8Array([0xC0,0]));}
      const now=performance.now();for(const [id,p] of this.peers)if(now-p.seen>8000)this.peers.delete(id);
      if(this.game.state!=='race'||!this.game.race.player)return;
      this.sendT-=dt;if(this.sendT>0)return;this.sendT=.1;const c=this.game.race.player;
      this.send({t:'state',x:+c.pos.x.toFixed(2),z:+c.pos.z.toFixed(2),y:+c.pos.y.toFixed(2),yaw:+c.yaw.toFixed(3),spd:Math.round(c.speedKmh)});
    }
  }
  root.NightAuth=NightAuth;root.NightRoom=NightRoom;
})(typeof window!=='undefined'?window:globalThis);
