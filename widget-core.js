/* MEMKOLA Widgets v17. Public read-only widget settings, no secrets or admin permissions. */
(function (global) {
  'use strict';
  const idRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const fieldLabels = Object.freeze({
    battles:'БОИ',wins:'ПОБЕДЫ',losses:'БЕЗ ПОБЕДЫ',winrate:'ВИНРЕЙТ',
    avgDamage:'СР. УРОН',totalDamage:'ВСЕГО УРОНА',kills:'ФРАГИ',spotted:'ЗАСВЕТ',survived:'ВЫЖИЛ',rating:'РЕЙТИНГ'
  });
  const fieldKeys=Object.keys(fieldLabels);
  const fonts = Object.freeze({Manrope:'Manrope',Inter:'Inter',Roboto:'Roboto',Oswald:'Oswald',Montserrat:'Montserrat',Orbitron:'Orbitron',Arial:'Arial'});
  const palettes=Object.freeze({
    gold:{accent:'#F4BD6A',text:'#F7F9FC',background:'#101B29',number:'#F4BD6A',labelColor:'#CAD7E4',border:'#86623F',liveColor:'#65E4A1'},
    blue:{accent:'#48C4FF',text:'#F4F9FF',background:'#101F37',number:'#48C4FF',labelColor:'#B4D6F0',border:'#356F9F',liveColor:'#6DF2CA'},
    green:{accent:'#65E4A1',text:'#F3FFF9',background:'#10241C',number:'#65E4A1',labelColor:'#BAE3CD',border:'#328257',liveColor:'#77F5C2'},
    red:{accent:'#FF676D',text:'#FFF8F8',background:'#2A121A',number:'#FF676D',labelColor:'#F1C5CB',border:'#934451',liveColor:'#FFBF77'},
    white:{accent:'#E5F0FF',text:'#FFFFFF',background:'#25364A',number:'#E5F0FF',labelColor:'#D9E5F0',border:'#8194AE',liveColor:'#84F0BD'},
    transparent:{accent:'#FFFFFF',text:'#FFFFFF',background:'#101B29',number:'#FFFFFF',labelColor:'#FFFFFF',border:'#FFFFFF',liveColor:'#70EEBB'}
  });
  const presets=Object.freeze({compact:{width:400,height:120},standard:{width:800,height:220},wide:{width:1200,height:180},vertical:{width:320,height:720},mobile:{width:360,height:640}});
  const defaults=Object.freeze({
    theme:'gold',layout:'cards',mode:'all',id:'',preset:'standard',width:800,height:220,
    title:'МОЯ СЕССИЯ',subtitle:'',footer:'ОБЩАЯ СТАТИСТИКА',brandText:'MEMKOLA WOT',liveText:'● LIVE',endedText:'ЗАВЕРШЕНА',timeText:'Обновлено',
    accent:'#F4BD6A',text:'#F7F9FC',background:'#101B29',number:'#F4BD6A',labelColor:'#CAD7E4',border:'#86623F',liveColor:'#65E4A1',opacity:88,
    font:'Manrope',numberFont:'Orbitron',titleSize:14,nameSize:22,numberSize:28,labelSize:11,footerSize:11,fontWeight:800,letterSpacing:0,
    radius:16,padding:18,gap:9,borderWidth:1,blur:7,shadow:20,align:'left',animate:true,
    showName:true,showLive:true,showBrand:true,showTime:true,showTitle:true,showFooter:true,
    fields:['battles','wins','winrate','avgDamage','totalDamage'],labels:{},fieldColors:{},fieldLabelColors:{},fieldNumberSizes:{},fieldLabelSizes:{}
  });
  const nf=new Intl.NumberFormat('ru-RU');
  const safeNumber=(n)=>Number.isFinite(Number(n))?Number(n):0;
  const fmt=(n)=>nf.format(Math.max(0,Math.round(safeNumber(n))));
  const bounded=(v,min,max,def)=>{if(v===undefined||v===null||v==='')return def;const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n))):def;};
  const color=(s,def)=>typeof s==='string'&&/^#[\da-f]{6}$/i.test(s)?s:def;
  const short=(s,def,max=80)=>String(s==null?def:s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').slice(0,max);
  function validId(id){return typeof id==='string'&&idRE.test(id.trim());}
  function safeMap(value,fallbacks,max=50){const obj=value&&typeof value==='object'&&!Array.isArray(value)?value:{};const out={};for(const k of fieldKeys){if(Object.hasOwn(obj,k))out[k]=fallbacks==='color'?color(obj[k],defaults.number):short(obj[k],fieldLabels[k],max);}return out;}
  function sizeMap(value,min,max){const obj=value&&typeof value==='object'&&!Array.isArray(value)?value:{};const result={};for(const k of fieldKeys){if(Object.hasOwn(obj,k))result[k]=bounded(obj[k],min,max,min);}return result;}
  function normalize(input={}){
    const theme=Object.hasOwn(palettes,input.theme)?input.theme:defaults.theme, pal=palettes[theme];
    const preset=Object.hasOwn(presets,input.preset)?input.preset:'custom';
    const fields=Array.isArray(input.fields)?[...new Set(input.fields.filter(k=>fieldKeys.includes(k)))]:defaults.fields.slice();
    const s={theme,layout:['cards','bar','vertical','minimal','ticker'].includes(input.layout)?input.layout:defaults.layout,
      mode:input.mode==='rating'?'rating':'all', id:validId(input.id)?input.id.trim():'',preset,
      width:bounded(input.width,240,1920,defaults.width),height:bounded(input.height,90,1080,defaults.height),
      title:short(input.title,defaults.title,90),subtitle:short(input.subtitle,defaults.subtitle,90),footer:short(input.footer,defaults.footer,90),
      brandText:short(input.brandText,defaults.brandText,60),liveText:short(input.liveText,defaults.liveText,36),endedText:short(input.endedText,defaults.endedText,36),timeText:short(input.timeText,defaults.timeText,36),
      accent:color(input.accent,pal.accent),text:color(input.text,pal.text),background:color(input.background,pal.background),number:color(input.number,pal.number),labelColor:color(input.labelColor,pal.labelColor),border:color(input.border,pal.border),liveColor:color(input.liveColor,pal.liveColor),
      opacity:bounded(input.opacity,0,100,defaults.opacity),font:Object.hasOwn(fonts,input.font)?input.font:defaults.font,
      numberFont:Object.hasOwn(fonts,input.numberFont)?input.numberFont:defaults.numberFont,
      titleSize:bounded(input.titleSize,8,72,defaults.titleSize),nameSize:bounded(input.nameSize,10,72,defaults.nameSize),
      numberSize:bounded(input.numberSize,12,120,defaults.numberSize),labelSize:bounded(input.labelSize,8,48,defaults.labelSize),footerSize:bounded(input.footerSize,8,36,defaults.footerSize),
      fontWeight:bounded(input.fontWeight,400,900,defaults.fontWeight),letterSpacing:bounded(input.letterSpacing,-2,10,defaults.letterSpacing),
      radius:bounded(input.radius,0,48,defaults.radius),padding:bounded(input.padding,0,55,defaults.padding),gap:bounded(input.gap,0,40,defaults.gap),
      borderWidth:bounded(input.borderWidth,0,8,defaults.borderWidth),blur:bounded(input.blur,0,30,defaults.blur),shadow:bounded(input.shadow,0,50,defaults.shadow),
      align:['left','center','right'].includes(input.align)?input.align:defaults.align,
      animate:input.animate!==false,showName:input.showName!==false,showLive:input.showLive!==false,
      showBrand:input.showBrand!==false,showTime:input.showTime!==false,showTitle:input.showTitle!==false,showFooter:input.showFooter!==false,
      fields:fields.length?fields:['battles'],labels:safeMap(input.labels),fieldColors:safeMap(input.fieldColors,'color'),fieldLabelColors:safeMap(input.fieldLabelColors,'color'),fieldNumberSizes:sizeMap(input.fieldNumberSizes,12,120),fieldLabelSizes:sizeMap(input.fieldLabelSizes,8,48)};
    return s;
  }
  // Encoded settings keep link self-contained; decode with size guard for public links.
  function encode(raw){const bytes=new TextEncoder().encode(JSON.stringify(normalize(raw)));let str='';for(const b of bytes)str+=String.fromCharCode(b);return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function decode(input){if(!input||input.length>11000||!/^[A-Za-z0-9_-]+$/.test(input))return null;try{const str=atob(input.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-input.length%4)%4));return JSON.parse(new TextDecoder().decode(Uint8Array.from(str,c=>c.charCodeAt(0))));}catch{return null;}}
  function fromSearch(search){const q=new URLSearchParams(search);const stored=decode(q.get('s'));if(stored&&typeof stored==='object')return normalize({...stored,id:q.get('id')||stored.id});
    // Legacy v16 links remain functional.
    const inp={id:q.get('id')||'',theme:q.get('theme')||undefined,layout:q.get('layout')||undefined,mode:q.get('mode')||undefined,
      title:q.get('title')||undefined,accent:q.get('accent')||undefined,text:q.get('text')||undefined,
      background:q.get('background')||undefined,opacity:q.get('opacity')??undefined,
      showName:q.get('name')!=='0',showLive:q.get('live')!=='0',showBrand:q.get('brand')!=='0'};
    if(q.has('fields'))inp.fields=String(q.get('fields')).split(',');
    if(q.has('size')){const v=bounded(q.get('size'),70,160,100);inp.numberSize=Math.round(defaults.numberSize*v/100);inp.nameSize=Math.round(defaults.nameSize*v/100);}
    if(inp.layout==='bar'){inp.width=900;inp.height=170;}else if(inp.layout==='minimal'){inp.width=600;inp.height=200;}
    return normalize(inp);
  }
  function makeURL(settings){const s=normalize(settings);const q=new URLSearchParams();q.set('id',s.id);q.set('s',encode(s));return new URL('./overlay.html?'+q.toString(),location.href).href;}
  function api(action,body={}){const cfg=global.TANK_TIER_CONFIG||{};
    if(!cfg.supabaseUrl||!cfg.supabaseAnonKey)return Promise.reject(new Error('Не заполнен config.js для Supabase'));
    const url=String(cfg.supabaseUrl).replace(/\/$/,'')+'/functions/v1/memkola-session-api';
    return fetch(url,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.supabaseAnonKey},body:JSON.stringify({action,...body})}).then(async r=>{const data=await r.json().catch(()=>({}));if(!r.ok||!data.ok)throw new Error(data.error||'Ошибка сервера '+r.status);return data;});
  }
  function delta(current={},base={}){const a=current&&typeof current==='object'?current:{},b=base&&typeof base==='object'?base:{};
    const difference=(key)=>Math.max(0,safeNumber(a[key])-safeNumber(b[key]));
    return {battles:difference('battles'),wins:difference('wins'),damage:difference('damage_dealt'),kills:difference('frags'),spotted:difference('spotted'),survived:difference('survived_battles'),rating:safeNumber(a.mm_rating??a.rating)};
  }
  function values(session,mode){const before=session?.baseline?.statistics?.[mode]||{},now=session?.latest?.statistics?.[mode]||{};
    const d=delta(now,before),n=d.battles;return {battles:fmt(n),wins:fmt(d.wins),losses:fmt(Math.max(0,n-d.wins)),winrate:n?(100*d.wins/n).toFixed(1).replace('.',',')+'%':'—',avgDamage:n?fmt(d.damage/n):'—',totalDamage:fmt(d.damage),kills:fmt(d.kills),spotted:fmt(d.spotted),survived:fmt(d.survived),rating:d.rating?fmt(d.rating):'—'};
  }
  function rgba(hex,opacity){const c=color(hex,'#101B29');return `rgba(${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)},${opacity/100})`;}
  function elem(tag,klass,value){const node=document.createElement(tag);if(klass)node.className=klass;if(value!==undefined&&value!==null)node.textContent=String(value);return node;}
  function draw(root,raw,session,{preview=false,error=''}={}){
    const s=normalize(raw),vals=session?values(session,s.mode):Object.fromEntries(fieldKeys.map(k=>[k,'—']));
    root.replaceChildren();root.className='mw-outer layout-'+s.layout+(s.animate?' mw-animated':'');
    root.style.width=s.width+'px';root.style.height=s.height+'px';
    const vars={'--mw-accent':s.accent,'--mw-text':s.text,'--mw-label':s.labelColor,'--mw-number':s.number,'--mw-border':s.border,
      '--mw-live':s.liveColor,'--mw-bg':rgba(s.background,s.opacity),'--mw-font':`"${s.font}",Arial,sans-serif`,'--mw-digits':`"${s.numberFont}",Arial,sans-serif`,
      '--mw-title-size':s.titleSize+'px','--mw-name-size':s.nameSize+'px','--mw-value-size':s.numberSize+'px',
      '--mw-label-size':s.labelSize+'px','--mw-footer-size':s.footerSize+'px','--mw-radius':s.radius+'px',
      '--mw-padding':s.padding+'px','--mw-gap':s.gap+'px','--mw-bw':s.borderWidth+'px','--mw-blur':s.blur+'px',
      '--mw-shadow':s.shadow+'px','--mw-weight':s.fontWeight,'--mw-spacing':s.letterSpacing+'px','--mw-align':s.align};
    for(const [key,val] of Object.entries(vars))root.style.setProperty(key,val);
    const card=elem('section','mw-card');
    if(preview)card.append(elem('span','mw-demo-mark',session?'ПРЕДПРОСМОТР':'ПРЕДПРОСМОТР • ДЕМО'));
    const head=elem('header','mw-head');const titles=elem('div','mw-head-main');
    if(s.showTitle&&s.title)titles.append(elem('div','mw-title',s.title));
    if(s.showName)titles.append(elem('div','mw-nickname',session?.nickname||'Твой ник'));
    if(s.subtitle)titles.append(elem('div','mw-subtitle',s.subtitle));
    if(titles.childNodes.length)head.append(titles);
    if(s.showLive){const ended=session?.status==='completed';head.append(elem('div','mw-live'+(ended?' mw-ended':''),ended?s.endedText:s.liveText));}
    if(head.childNodes.length)card.append(head);
    if(error)card.append(elem('div','mw-error',error));
    const stats=elem('div','mw-stats');for(const f of s.fields){
      const one=elem('div','mw-stat');one.dataset.field=f;
      const val=elem('div','mw-stat-value',vals[f]);val.style.color=s.fieldColors[f]||s.number;if(s.fieldNumberSizes[f])val.style.fontSize=s.fieldNumberSizes[f]+'px';
      const label=elem('div','mw-stat-label',Object.hasOwn(s.labels,f)?s.labels[f]:fieldLabels[f]);label.style.color=s.fieldLabelColors[f]||s.labelColor;if(s.fieldLabelSizes[f])label.style.fontSize=s.fieldLabelSizes[f]+'px';
      one.append(val,label);stats.append(one);
    }card.append(stats);
    const foot=elem('footer','mw-foot');if(s.showFooter&&s.footer)foot.append(elem('span','mw-foot-text',s.footer));
    if(s.showBrand&&s.brandText)foot.append(elem('span','mw-brand',s.brandText));
    if(s.showTime&&session?.last_refreshed_at){const d=new Date(session.last_refreshed_at);if(!Number.isNaN(d.getTime()))foot.append(elem('span','mw-time',s.timeText+' '+d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})));}
    if(foot.childNodes.length)card.append(foot);root.append(card);
    // Keep numbers on a single line. Reduce actual size only when the chosen
    // font/width cannot fit the value (e.g. “1 234 567” in a narrow bar).
    if(typeof global.requestAnimationFrame==='function')global.requestAnimationFrame(()=>{
      if(!root.isConnected)return;
      for(const value of root.querySelectorAll('.mw-stat-value')){
        const available=value.clientWidth;
        if(available>0&&value.scrollWidth>available){
          const current=parseFloat(getComputedStyle(value).fontSize);
          const fitted=Math.max(10,Math.floor(current*(available-3)/value.scrollWidth));
          value.style.fontSize=fitted+'px';
        }
      }
    });
    return root;
  }
  global.MemkolaWidget={defaults,palettes,presets,fonts,metrics:fieldLabels,fieldKeys,validId,normalize,encode,decode,fromSearch,makeURL,api,delta,values,draw};
})(window);
