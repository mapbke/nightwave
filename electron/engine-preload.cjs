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
        f.frequency.value = freq; f.Q.value = 1; f.gain.value = eqEnabled ? Number(eqGains[i] || 0) : 0;
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

function abs(href){ try { return new URL(href || '', 'https://soundcloud.com').href; } catch { return ''; } }
function click(selectors){ for (const s of selectors){ const e=document.querySelector(s); if(e){ e.click(); return true; } } return false; }
function bg(el){ if(!el)return ''; const raw=el.style?.backgroundImage||getComputedStyle(el).backgroundImage||''; const m=raw.match(/url\(["']?(.*?)["']?\)/); return m?m[1].replace(/-t\d+x\d+\./,'-t500x500.'):''; }

function nowPlaying(){
  try {
    const titleEl=document.querySelector('.playbackSoundBadge__titleLink');
    const artistEl=document.querySelector('.playbackSoundBadge__lightLink');
    const timeline=document.querySelector('.playbackTimeline__progressWrapper');
    const media=document.querySelector('audio,video');
    const meta=navigator.mediaSession?.metadata;
    const play=document.querySelector('.playControl');
    const title=String(titleEl?.getAttribute('title')||titleEl?.textContent||meta?.title||'').trim();
    const artist=String(artistEl?.getAttribute('title')||artistEl?.textContent||meta?.artist||'').trim();
    const url=abs(titleEl?.getAttribute('href'));
    const artEl=document.querySelector('.playbackSoundBadge .sc-artwork,.playbackSoundBadge__avatar span');
    const artwork=bg(artEl)||(meta?.artwork?.at(-1)?.src||'');
    const pos=Number(timeline?.getAttribute('aria-valuenow'));
    const dur=Number(timeline?.getAttribute('aria-valuemax'));
    const label=String(play?.getAttribute('aria-label')||play?.getAttribute('title')||'').toLowerCase();
    return { title, artist, url, artwork, position:Number.isFinite(pos)?pos:Number(media?.currentTime||0), duration:Number.isFinite(dur)&&dur>0?dur:Number(media?.duration||0), playing:Boolean(title && (media ? !media.paused : label.includes('pause'))) };
  } catch { return {title:'',artist:'',url:'',artwork:'',position:0,duration:0,playing:false}; }
}

function scrape(){
  const out=[], seen=new Set();
  const blocked=new Set(['search','discover','stream','you','charts','upload','settings','notifications','messages','terms-of-use','pages']);
  let candidates=[...document.querySelectorAll('.soundTitle__title a,a.soundTitle__title,.soundTitle__titleLink,.searchItem a[href],.audibleTile a[href]')];
  if(candidates.length<3)candidates=[...document.querySelectorAll('a[href]')];
  for(const a0 of candidates){
    const a=a0.tagName==='A'?a0:a0.querySelector?.('a[href]'); if(!a)continue;
    const href=a.getAttribute('href')||''; if(!href.startsWith('/'))continue;
    const path=href.split(/[?#]/)[0]; const parts=path.split('/').filter(Boolean); if(parts.length!==2||blocked.has(parts[0]))continue;
    const url=`https://soundcloud.com${path}`; if(seen.has(url))continue;
    const row=a.closest('li,article,.soundList__item,.searchItem,.sound,.trackItem,.audibleTile')||a.parentElement?.parentElement||a.parentElement;
    const title=(a.getAttribute('title')||a.textContent||'').trim(); if(!title||title.length>180)continue;
    let artist=''; const artistEl=row?.querySelector('.soundTitle__username,.soundTitle__usernameText,.soundTitle__secondary a'); if(artistEl)artist=(artistEl.getAttribute('title')||artistEl.textContent||'').trim();
    let artwork=''; const img=row?.querySelector('img[src]'); if(img)artwork=img.src; if(!artwork)artwork=bg(row?.querySelector('.sc-artwork,[style*="background-image"]'));
    out.push({title,artist,url,artwork,duration:0}); seen.add(url); if(out.length>=40)break;
  }
  return out;
}

function seekRatio(r){ const m=document.querySelector('audio,video'); r=Math.max(0,Math.min(1,Number(r)||0)); if(m&&Number.isFinite(m.duration)&&m.duration>0){m.currentTime=m.duration*r;return true;} return false; }
function seekRel(d){ const m=document.querySelector('audio,video'); if(m&&Number.isFinite(m.duration)&&m.duration>0){m.currentTime=Math.max(0,Math.min(m.duration,m.currentTime+Number(d||0)));return true;} return false; }
function volume(v){ v=Math.max(0,Math.min(1,Number(v)||0)); document.querySelectorAll('audio,video').forEach(m=>{try{m.volume=v}catch{}}); return true; }

window.__nightwaveEngine = {
  nowPlaying,
  scrape,
  setEq(enabled,gains){ eqEnabled=Boolean(enabled); if(Array.isArray(gains)&&gains.length===10)eqGains=gains.map(Number); for(const fs of chains)fs.forEach((f,i)=>{try{f.gain.value=eqEnabled?(eqGains[i]||0):0}catch{}}); return true; },
  command(action,payload){
    switch(String(action)){
      case 'playpause': return click(['.playControl','button[aria-label*="Play" i].playControl','button[aria-label*="Pause" i].playControl']);
      case 'next': return click(['.skipControl__next','button[title*="Next" i]','button[aria-label*="Next" i]']);
      case 'prev': return click(['.skipControl__previous','button[title*="Previous" i]','button[aria-label*="Previous" i]']);
      case 'seek-relative': return seekRel(payload);
      case 'seek-to': return seekRatio(payload);
      case 'volume': return volume(payload);
      case 'mute': { const m=document.querySelector('audio,video'); if(m){m.muted=!m.muted;return true;} return click(['.volume__button']); }
      case 'like': return click(['.playbackSoundBadge__like','button[title*="Like" i]','button[aria-label*="Like" i]']);
    }
    return false;
  }
};
