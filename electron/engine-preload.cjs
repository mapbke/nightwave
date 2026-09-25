const EQ_FREQS = [60,170,310,600,1000,3000,6000,12000,14000,16000];
const chains = [];
let eqEnabled = true;
let eqGains = [0,0,0,0,0,0,0,0,0,0];

function installEq(Ctx) {
  if (!Ctx?.prototype?.createMediaElementSource || Ctx.prototype.__nwHook) return;
  Ctx.prototype.__nwHook = true;
  const original = Ctx.prototype.createMediaElementSource;
  Ctx.prototype.createMediaElementSource = function(media) {
    const source = original.call(this, media);
    try {
      const filters = EQ_FREQS.map((freq, i) => {
        const f = this.createBiquadFilter();
        f.type = i === 0 ? 'lowshelf' : i === 9 ? 'highshelf' : 'peaking';
        f.frequency.value = freq;
        f.Q.value = 1;
        f.gain.value = eqEnabled ? Number(eqGains[i] || 0) : 0;
        return f;
      });
      for (let i=0;i<filters.length-1;i++) filters[i].connect(filters[i+1]);
      const nativeConnect = AudioNode.prototype.connect;
      nativeConnect.call(source, filters[0]);
      source.connect = function(){ return nativeConnect.apply(filters[filters.length-1], arguments); };
      chains.push(filters);
    } catch {}
    return source;
  };
}
try { installEq(window.AudioContext); } catch {}
try { installEq(window.webkitAudioContext); } catch {}

function roots() {
  const out = [document];
  const seen = new Set(out);
  for (let i = 0; i < out.length; i++) {
    const root = out[i];
    let els = [];
    try { els = root.querySelectorAll ? [...root.querySelectorAll('*')] : []; } catch {}
    for (const el of els) {
      if (el.shadowRoot && !seen.has(el.shadowRoot)) {
        seen.add(el.shadowRoot);
        out.push(el.shadowRoot);
      }
    }
  }
  return out;
}
function all(sel) {
  const out = [];
  for (const root of roots()) {
    try { out.push(...root.querySelectorAll(sel)); } catch {}
  }
  return out;
}
function first(sel) { return all(sel)[0] || null; }
function abs(href){
  try { return new URL(href || '', location.href || 'https://soundcloud.com').href; }
  catch { return ''; }
}
function clean(s){ return String(s || '').replace(/\s+/g,' ').trim(); }
function signal(el){
  if(!el) return '';
  return clean([
    el.getAttribute?.('aria-label'),
    el.getAttribute?.('title'),
    el.getAttribute?.('data-testid'),
    el.textContent
  ].filter(Boolean).join(' ')).toLowerCase();
}
function bg(el){
  if(!el)return '';
  const raw=el.style?.backgroundImage||getComputedStyle(el).backgroundImage||'';
  const m=raw.match(/url\(["']?(.*?)["']?\)/);
  return m?m[1].replace(/-t\d+x\d+\./,'-t500x500.'):'';
}
function mediaEl(){ return first('audio,video'); }

function clickSelectors(selectors){
  for (const s of selectors) {
    const e = first(s);
    if (e && !e.disabled) {
      try { e.click(); return true; } catch {}
    }
  }
  return false;
}
function clickSemantic(words, reject=[]) {
  const candidates = all('button,[role="button"],a[href]');
  for (const el of candidates) {
    const s = signal(el);
    if (!s) continue;
    if (reject.some(x=>s.includes(x))) continue;
    if (words.some(x=>s === x || s.startsWith(x+' ') || s.includes(' '+x+' ') || s.includes(x))) {
      try { el.click(); return true; } catch {}
    }
  }
  return false;
}

function hydrationTracks(){
  const out=[], seen=new Set(), visited=new WeakSet();
  const blocked = new Set(['search','discover','stream','you','charts','upload','settings','notifications','messages','terms-of-use','pages']);
  function add(o){
    if(!o || typeof o!=='object') return;
    const url = clean(o.permalink_url || o.permalinkUrl || o.url || '');
    const title = clean(o.title || o.name || '');
    if(!url.startsWith('https://soundcloud.com/') || !title) return;
    let u; try{u=new URL(url);}catch{return;}
    const parts=u.pathname.split('/').filter(Boolean);
    if(parts.length!==2 || blocked.has(parts[0])) return;
    if(seen.has(url)) return;
    const user=o.user||o.publisher_metadata||{};
    const artist=clean(user.username||user.name||o.username||parts[0]);
    const artwork=clean(o.artwork_url||o.artworkUrl||o.avatar_url||'').replace(/-large\./,'-t500x500.');
    out.push({title,artist,url,artwork,duration:Number(o.duration||0)});
    seen.add(url);
  }
  function walk(v,depth=0){
    if(depth>8 || v==null) return;
    if(Array.isArray(v)){ for(const x of v) walk(x,depth+1); return; }
    if(typeof v!=='object') return;
    if(visited.has(v)) return; visited.add(v);
    add(v);
    for(const k of Object.keys(v)){
      if(k==='media' || k==='waveform_url') continue;
      try{walk(v[k],depth+1);}catch{}
      if(out.length>=60) return;
    }
  }
  try{ walk(window.__sc_hydration); }catch{}
  try{ walk(window.__APOLLO_STATE__); }catch{}
  try{ walk(window.__NEXT_DATA__); }catch{}
  return out;
}

function domTracks(){
  const out=[], seen=new Set();
  const blocked=new Set(['search','discover','stream','you','charts','upload','settings','notifications','messages','terms-of-use','pages','popular','stations']);
  const candidates=all('a[href]');
  for(const a of candidates){
    const href=abs(a.getAttribute('href')||'');
    let u; try{u=new URL(href);}catch{continue;}
    if(u.hostname!=='soundcloud.com' && !u.hostname.endsWith('.soundcloud.com')) continue;
    const parts=u.pathname.split('/').filter(Boolean);
    if(parts.length!==2 || blocked.has(parts[0])) continue;
    const url='https://soundcloud.com/'+parts.map(decodeURIComponent).join('/');
    if(seen.has(url)) continue;
    const row=a.closest?.('li,article,[role="listitem"],.soundList__item,.searchItem,.sound,.trackItem,.audibleTile')||a.parentElement?.parentElement||a.parentElement;
    let title=clean(a.getAttribute('title')||a.getAttribute('aria-label')||a.textContent);
    if(!title || title.length>180 || title.toLowerCase()===parts[0].toLowerCase()){
      const t=row?.querySelector?.('[class*="title" i],[data-testid*="title" i],h2,h3');
      title=clean(t?.getAttribute?.('title')||t?.textContent||title);
    }
    if(!title || title.length>180) continue;
    let artist=parts[0];
    const artistEl=row?.querySelector?.('[class*="username" i],[class*="artist" i],[data-testid*="artist" i]');
    if(artistEl) artist=clean(artistEl.getAttribute?.('title')||artistEl.textContent)||artist;
    let artwork='';
    const img=row?.querySelector?.('img[src]');
    if(img) artwork=img.currentSrc||img.src||'';
    if(!artwork) artwork=bg(row?.querySelector?.('[style*="background-image"],.sc-artwork'));
    out.push({title,artist,url,artwork,duration:0});
    seen.add(url);
    if(out.length>=50) break;
  }
  return out;
}

function scrape(){
  const merged=[], seen=new Set();
  for(const list of [hydrationTracks(),domTracks()]){
    for(const t of list){
      if(!t?.url||seen.has(t.url))continue;
      seen.add(t.url); merged.push(t);
      if(merged.length>=40) return merged;
    }
  }
  return merged;
}

function nowPlaying(){
  try {
    const media=mediaEl();
    const meta=navigator.mediaSession?.metadata;
    const titleEl=first('.playbackSoundBadge__titleLink,[data-testid*="track-title" i],a[href][title]');
    const artistEl=first('.playbackSoundBadge__lightLink,[data-testid*="artist" i]');
    const title=clean(meta?.title||titleEl?.getAttribute?.('title')||titleEl?.textContent||'');
    const artist=clean(meta?.artist||artistEl?.getAttribute?.('title')||artistEl?.textContent||'');
    let url='';
    const href=titleEl?.getAttribute?.('href');
    if(href) url=abs(href);
    if(!url && /^\/[^/]+\/[^/]+\/?$/.test(location.pathname)) url='https://soundcloud.com'+location.pathname.replace(/\/$/,'');
    const artwork=clean(meta?.artwork?.at?.(-1)?.src||bg(first('.playbackSoundBadge .sc-artwork,.playbackSoundBadge__avatar span,[style*="background-image"]'))||'');
    const position=Number(media?.currentTime||0);
    const duration=Number(media?.duration||0);
    let playing=Boolean(media && !media.paused && !media.ended);
    if(!media && title){
      const p=first('.playControl,button[aria-label*="Pause" i],button[title*="Pause" i]');
      playing=Boolean(p);
    }
    return {
      title,artist,url,artwork,
      position:Number.isFinite(position)?position:0,
      duration:Number.isFinite(duration)?duration:0,
      playing
    };
  } catch {
    return {title:'',artist:'',url:'',artwork:'',position:0,duration:0,playing:false};
  }
}

async function ensurePlay(){
  const m=mediaEl();
  if(m && (m.currentSrc || m.src)){
    if(!m.paused && !m.ended) return true;
    try { await m.play(); if(!m.paused) return true; } catch {}
  }
  const pauseBtn=first('button[aria-label*="Pause" i],button[title*="Pause" i],.playControl[aria-label*="Pause" i]');
  if(pauseBtn) return true;
  const ok=clickSelectors([
    '.playControl',
    '.sc-button-play',
    'button[aria-label="Play"]',
    'button[title="Play"]',
    'button[aria-label*="Play" i]',
    'button[title*="Play" i]',
    '[role="button"][aria-label*="Play" i]'
  ]) || clickSemantic(['play'],['playlist','replay']);
  return Boolean(ok);
}
async function togglePlay(){
  const m=mediaEl();
  if(m && (m.currentSrc || m.src)){
    if(!m.paused && !m.ended){ try{m.pause();return true;}catch{} }
    try{await m.play();return true;}catch{}
  }
  return clickSelectors([
    '.playControl',
    'button[aria-label*="Pause" i]',
    'button[aria-label*="Play" i]',
    'button[title*="Pause" i]',
    'button[title*="Play" i]'
  ]) || clickSemantic(['pause','play'],['playlist']);
}
function seekRatio(r){
  const m=mediaEl(); r=Math.max(0,Math.min(1,Number(r)||0));
  if(m&&Number.isFinite(m.duration)&&m.duration>0){m.currentTime=m.duration*r;return true;}
  return false;
}
function seekRel(d){
  const m=mediaEl();
  if(m&&Number.isFinite(m.duration)&&m.duration>0){
    m.currentTime=Math.max(0,Math.min(m.duration,m.currentTime+Number(d||0)));return true;
  }
  return false;
}
function volume(v){
  v=Math.max(0,Math.min(1,Number(v)||0));
  const ms=all('audio,video');
  if(!ms.length) return false;
  ms.forEach(m=>{try{m.volume=v}catch{}});
  return true;
}

window.__nightwaveEngine = {
  version:'0.4.3',
  nowPlaying,
  scrape,
  setEq(enabled,gains){
    eqEnabled=Boolean(enabled);
    if(Array.isArray(gains)&&gains.length===10)eqGains=gains.map(Number);
    for(const fs of chains)fs.forEach((f,i)=>{try{f.gain.value=eqEnabled?(eqGains[i]||0):0}catch{}});
    return true;
  },
  async command(action,payload){
    switch(String(action)){
      case 'play': return ensurePlay();
      case 'playpause': return togglePlay();
      case 'next':
        return clickSelectors(['.skipControl__next','button[title*="Next" i]','button[aria-label*="Next" i]']) || clickSemantic(['next']);
      case 'prev':
        return clickSelectors(['.skipControl__previous','button[title*="Previous" i]','button[aria-label*="Previous" i]']) || clickSemantic(['previous','back']);
      case 'seek-relative': return seekRel(payload);
      case 'seek-to': return seekRatio(payload);
      case 'volume': return volume(payload);
      case 'mute': {
        const m=mediaEl();
        if(m){m.muted=!m.muted;return true;}
        return clickSelectors(['.volume__button','button[aria-label*="Mute" i]','button[title*="Mute" i]']);
      }
      case 'like':
        return clickSelectors(['.playbackSoundBadge__like','button[title*="Like" i]','button[aria-label*="Like" i]']) || clickSemantic(['like'],['unlike']);
    }
    return false;
  }
};
