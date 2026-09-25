const { app, BrowserWindow, ipcMain, Menu, globalShortcut, session, shell } = require('electron');
const path = require('node:path');
const { Store } = require('./store.cjs');
const { DiscordPresence } = require('./discord.cjs');
const { OverlayServer } = require('./overlay.cjs');

app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

const PARTITION='persist:nightwave-soundcloud';
const UA=`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
let mainWindow, engineWindow, authWindow, store, discord, overlay, engineReady=false, engineError='';
let lastTrackKey='';

function send(ch,data){ if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send(ch,data); }
function allowed(url){
  if(url==='about:blank') return true;
  try{ const u=new URL(url); if(u.protocol!=='https:') return false; const h=u.hostname; return h==='soundcloud.com'||h.endsWith('.soundcloud.com')||h==='accounts.google.com'||h.endsWith('.google.com')||h.endsWith('.gstatic.com')||h==='appleid.apple.com'||h.endsWith('.apple.com')||h==='facebook.com'||h.endsWith('.facebook.com'); }catch{return false;}
}

function hardenPopup(win){
  if(!win||win.isDestroyed()) return;
  win.setMenuBarVisibility(false);
  win.webContents.setUserAgent(UA);
  win.webContents.setWindowOpenHandler(({url})=>{
    if(!allowed(url)) { if(/^https:/i.test(url)) shell.openExternal(url).catch(()=>{}); return {action:'deny'}; }
    return {
      action:'allow',
      outlivesOpener:true,
      overrideBrowserWindowOptions:{
        width:520,height:720,minWidth:430,minHeight:620,
        backgroundColor:'#0b0b0b',autoHideMenuBar:true,
        webPreferences:{partition:PARTITION,nodeIntegration:false,contextIsolation:true,sandbox:true,nativeWindowOpen:true}
      }
    };
  });
  win.webContents.on('will-navigate',(e,url)=>{
    if(url==='about:blank') return;
    if(!allowed(url)){e.preventDefault(); if(/^https:/i.test(url)) shell.openExternal(url).catch(()=>{});}
  });
  win.webContents.on('did-create-window',(child)=>{ hardenPopup(child); });
}

async function authStatus(){
  try{ const cs=await session.fromPartition(PARTITION).cookies.get({url:'https://soundcloud.com'}); const token=cs.find(c=>/oauth|session/i.test(c.name)&&c.value); return {loggedIn:Boolean(token),cookieCount:cs.length}; }catch{return {loggedIn:false,cookieCount:0};}
}

function createMain(){
  mainWindow=new BrowserWindow({width:1440,height:900,minWidth:1050,minHeight:690,frame:false,show:false,backgroundColor:'#050505',icon:path.join(__dirname,'..','build','icon.ico'),webPreferences:{preload:path.join(__dirname,'main-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:false}});
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show',()=>{mainWindow.show();mainWindow.focus();setTimeout(createEngine,120);});
  mainWindow.webContents.on('did-fail-load',()=>mainWindow.show());
  mainWindow.loadFile(path.join(__dirname,'..','app','index.html'));
}

function createEngine(){
  if(engineWindow&&!engineWindow.isDestroyed())return;
  engineReady=false; engineError=''; send('nw:engine',{ready:false,status:'connecting'});
  engineWindow=new BrowserWindow({show:false,width:1100,height:760,skipTaskbar:true,backgroundColor:'#000',webPreferences:{partition:PARTITION,preload:path.join(__dirname,'engine-preload.cjs'),contextIsolation:false,nodeIntegration:false,sandbox:false,backgroundThrottling:false}});
  engineWindow.webContents.setUserAgent(UA);
  engineWindow.webContents.setAudioMuted(false);
  engineWindow.webContents.on('did-finish-load',()=>{engineReady=true;engineError='';send('nw:engine',{ready:true,status:'ready'}); applyEq();});
  engineWindow.webContents.on('did-fail-load',(_e,code,desc)=>{engineReady=false;engineError=`${code}: ${desc}`;send('nw:engine',{ready:false,status:'error',error:engineError});});
  engineWindow.webContents.setWindowOpenHandler(({url})=>{
    if(allowed(url)) return {action:'allow',outlivesOpener:true,overrideBrowserWindowOptions:{show:true,autoHideMenuBar:true,webPreferences:{partition:PARTITION,nodeIntegration:false,contextIsolation:true,sandbox:true,nativeWindowOpen:true}}};
    if(/^https:/i.test(url)) shell.openExternal(url).catch(()=>{});
    return {action:'deny'};
  });
  engineWindow.webContents.on('did-create-window',(child)=>hardenPopup(child));
  engineWindow.loadURL('https://soundcloud.com/',{userAgent:UA}).catch(err=>{engineError=String(err.message||err);send('nw:engine',{ready:false,status:'error',error:engineError});});
}

function createAuth(){
  if(authWindow&&!authWindow.isDestroyed()){authWindow.show();authWindow.focus();return;}
  authWindow=new BrowserWindow({
    width:560,height:760,minWidth:430,minHeight:620,parent:mainWindow,modal:false,
    title:'SoundCloud — Sign in',backgroundColor:'#0b0b0b',autoHideMenuBar:true,
    webPreferences:{partition:PARTITION,nodeIntegration:false,contextIsolation:true,sandbox:true,nativeWindowOpen:true}
  });
  hardenPopup(authWindow);
  authWindow.loadURL('https://soundcloud.com/signin',{userAgent:UA});
  const ping=async()=>send('nw:auth-changed',await authStatus());
  authWindow.webContents.on('did-navigate',ping); authWindow.webContents.on('did-navigate-in-page',ping);
  authWindow.on('closed',()=>{authWindow=null;setTimeout(async()=>{send('nw:auth-changed',await authStatus()); if(engineWindow&&!engineWindow.isDestroyed())engineWindow.reload();},250);});
}

async function engineEval(code){ if(!engineWindow||engineWindow.isDestroyed())createEngine(); if(!engineWindow)return null; try{return await engineWindow.webContents.executeJavaScript(code,true);}catch{return null;} }
async function control(action,payload){
  if(action==='play-url'){
    const url=String(payload||''); if(!/^https:\/\/(?:www\.)?soundcloud\.com\//i.test(url))return false;
    await engineWindow.loadURL(url,{userAgent:UA});
    for(let i=0;i<15;i++){await new Promise(r=>setTimeout(r,300)); const ok=await engineEval(`window.__nightwaveEngine?.command('playpause')`); if(ok)return true;} return false;
  }
  return Boolean(await engineEval(`window.__nightwaveEngine?.command(${JSON.stringify(String(action))},${JSON.stringify(payload)})`));
}
async function applyEq(){ if(!store)return; await engineEval(`window.__nightwaveEngine?.setEq(${store.data.eqEnabled!==false},${JSON.stringify(store.data.eqGains||Array(10).fill(0))})`); }

async function searchTracks(q){
  q=String(q||'').trim(); if(!q)return [];
  if(!engineWindow||engineWindow.isDestroyed())createEngine();
  const url=`https://soundcloud.com/search/sounds?q=${encodeURIComponent(q)}`;
  try{await engineWindow.loadURL(url,{userAgent:UA});}catch{return [];}
  for(let i=0;i<18;i++){await new Promise(r=>setTimeout(r,i===0?550:320)); const r=await engineEval('window.__nightwaveEngine?.scrape?.() || []'); if(Array.isArray(r)&&r.length)return r;}
  return [];
}

function registerHotkeys(){
  try{globalShortcut.unregisterAll();}catch{}
  if(!store?.data.globalHotkeys)return;
  const m={MediaPlayPause:'playpause',MediaNextTrack:'next',MediaPreviousTrack:'prev','CommandOrControl+Alt+Space':'playpause','CommandOrControl+Alt+Right':'next','CommandOrControl+Alt+Left':'prev'};
  for(const [k,a] of Object.entries(m))try{globalShortcut.register(k,()=>control(a));}catch{}
}

function history(track){ if(!track?.title)return; const key=`${track.url}|${track.title}|${track.artist}`; if(key===lastTrackKey)return; lastTrackKey=key; const item={title:track.title,artist:track.artist||'',url:track.url||'',artwork:track.artwork||'',duration:track.duration||0}; store.patch({history:[item,...(store.data.history||[]).filter(x=>(x.url||`${x.title}|${x.artist}`)!==(item.url||`${item.title}|${item.artist}`))].slice(0,80)}); }

function setupIpc(){
  ipcMain.handle('nw:config-get',()=>store.public());
  ipcMain.handle('nw:config-patch',(_e,p)=>{const out=store.patch(p||{});if('globalHotkeys'in(p||{}))registerHotkeys();return out;});
  ipcMain.handle('nw:auth-status',authStatus); ipcMain.on('nw:auth-open',createAuth);
  ipcMain.handle('nw:logout',async()=>{await session.fromPartition(PARTITION).clearStorageData({origin:'https://soundcloud.com'});engineWindow?.reload();return true;});
  ipcMain.handle('nw:engine-status',()=>({ready:engineReady,status:engineReady?'ready':engineError?'error':'connecting',error:engineError}));
  ipcMain.handle('nw:search',(_e,q)=>searchTracks(q));
  ipcMain.handle('nw:control',(_e,a,p)=>control(a,p));
  ipcMain.handle('nw:eq',async(_e,en,g)=>{store.patch({eqEnabled:Boolean(en),eqGains:Array.isArray(g)?g:store.data.eqGains});await applyEq();return true;});
  ipcMain.on('nw:window-minimize',()=>mainWindow?.minimize()); ipcMain.on('nw:window-maximize',()=>mainWindow?.isMaximized()?mainWindow.unmaximize():mainWindow?.maximize()); ipcMain.on('nw:window-close',()=>mainWindow?.close());
}

function startPoll(){setInterval(async()=>{if(!engineReady)return;const np=await engineEval('window.__nightwaveEngine?.nowPlaying?.()');if(np&&typeof np==='object'){send('nw:now-playing',np);history(np);if(store.data.overlayEnabled)overlay.update({title:np.title||'Nightwave',artist:np.artist||'',artwork:np.artwork||'',playing:!!np.playing});if(store.data.discordEnabled)discord.update(np).catch(()=>{});}},700);}

const lock=app.requestSingleInstanceLock(); if(!lock)app.quit(); else {
  app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}});
  app.whenReady().then(()=>{Menu.setApplicationMenu(null);store=new Store(app.getPath('userData'));discord=new DiscordPresence();overlay=new OverlayServer();overlay.start(store.data.overlayPort);setupIpc();registerHotkeys();createMain();startPoll();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createMain();});});
}
app.on('before-quit',()=>{try{store?.save()}catch{}});app.on('will-quit',()=>{try{globalShortcut.unregisterAll()}catch{};overlay?.stop();discord?.disconnect();});app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
