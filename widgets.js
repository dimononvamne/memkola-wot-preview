/* MEMKOLA Widgets v17: design state is local; public session retrieval uses existing Edge Function. */
(()=>{
 'use strict';
 const W=window.MemkolaWidget,by=id=>document.getElementById(id);
 function readSaved(){for(const key of ['memkola_widget_v17','memkola_widget_v16'])try{const val=JSON.parse(localStorage.getItem(key)||'null');if(val&&typeof val==='object')return val;}catch{}return {};}
 const incoming=new URLSearchParams(location.search);
 let settings=W.normalize({...W.defaults,...readSaved(),...(incoming.has('s')?W.fromSearch(location.search):{}),...(W.validId(incoming.get('id'))?{id:incoming.get('id')}:{})});
 let session=null,connecting=false;
 const regularKeys=['layout','preset','width','height','title','subtitle','footer','brandText','liveText','endedText','timeText',
   'mode','theme','accent','text','number','labelColor','background','border','liveColor','opacity','radius','padding','gap','borderWidth','blur','shadow',
   'font','numberFont','align','fontWeight','titleSize','nameSize','numberSize','labelSize','footerSize','letterSpacing',
   'showTitle','showName','showLive','showFooter','showBrand','showTime','animate'];
 const checks=new Set(['showTitle','showName','showLive','showFooter','showBrand','showTime','animate']);
 const specialRangeKeys=new Set(['opacity','radius','padding','gap','borderWidth','blur','shadow','titleSize','nameSize','numberSize','labelSize','footerSize','letterSpacing']);
 function status(msg,type=''){const x=by('status');x.textContent=msg;x.className='status'+(type?' '+type:'');}
 function getSessionId(raw){const str=String(raw||'').trim();if(W.validId(str))return str;if(str.length>2048)return '';
   try{const u=new URL(str);if(!['https:','http:'].includes(u.protocol))return '';const id=u.searchParams.get('id')||u.searchParams.get('session');return W.validId(id)?id:'';}catch{return '';}}
 function syncControls(){for(const key of regularKeys){const el=by(key);if(!el)continue;if(checks.has(key))el.checked=Boolean(settings[key]);else el.value=settings[key];}
   for(const output of document.querySelectorAll('[data-output]')){const k=output.dataset.output;output.textContent=settings[k]+(k==='opacity'?'%':' px');}}
 function drawEditor(){const host=by('stats-editor');host.replaceChildren();
   const selected=settings.fields;const sequence=[...selected,...W.fieldKeys.filter(k=>!selected.includes(k))];
   for(const key of sequence){
     const row=document.createElement('div');row.className='stat-edit';row.dataset.key=key;
     const top=document.createElement('div');top.className='stat-edit-top';const showLabel=document.createElement('label');
     const show=document.createElement('input');show.type='checkbox';show.dataset.op='show';show.checked=selected.includes(key);
     const title=document.createElement('span');title.className='stat-edit-title';title.textContent=W.metrics[key];showLabel.append(show,title);top.append(showLabel);
     const actions=document.createElement('div');actions.className='stat-edit-actions';
     for(const [dir,symbol] of [['up','↑'],['down','↓']]){const b=document.createElement('button');b.type='button';b.className='move-btn';b.dataset.op=dir;b.textContent=symbol;b.title=dir==='up'?'Поднять':'Опустить';const i=selected.indexOf(key);b.disabled=i<0||(dir==='up'&&i===0)||(dir==='down'&&i===selected.length-1);actions.append(b);}
     top.append(actions);row.append(top);
     const lower=document.createElement('div');lower.className='stat-edit-body';
     const lab=document.createElement('label');lab.textContent='Своя подпись';const input=document.createElement('input');input.type='text';input.maxLength=50;input.dataset.op='label';input.value=Object.hasOwn(settings.labels,key)?settings.labels[key]:W.metrics[key];lab.append(input);lower.append(lab);
     for(const [op,name,fallback] of [['number','Цифры',settings.number],['labelColor','Подпись',settings.labelColor]]){const l=document.createElement('label');l.textContent=name;const color=document.createElement('input');color.type='color';color.dataset.op=op;color.value=(op==='number'?settings.fieldColors[key]:settings.fieldLabelColors[key])||fallback;l.append(color);lower.append(l);}
     const sizes=document.createElement('div');sizes.className='stat-edit-sizes';
     for(const [op,name,val,min,max] of [['numberSize','Размер цифр, px',settings.fieldNumberSizes[key]||settings.numberSize,12,120],['labelSize','Размер подписи, px',settings.fieldLabelSizes[key]||settings.labelSize,8,48]]){
       const label=document.createElement('label');label.textContent=name;
       const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=1;input.dataset.op=op;input.value=val;label.append(input);sizes.append(label);
     }
     row.append(lower,sizes);host.append(row);
   }
 }
 function store(){try{localStorage.setItem('memkola_widget_v17',JSON.stringify(settings));}catch{}}
 function scalePreview(){
   const box=by('preview-surface'),stage=by('preview-stage'),preview=by('widget-preview');
   const vw=Math.max(150,box.clientWidth-24),zoom=Math.min(1,vw/settings.width);
   stage.style.width=(settings.width*zoom)+'px';stage.style.height=(settings.height*zoom)+'px';
   preview.style.width=settings.width+'px';preview.style.height=settings.height+'px';preview.style.transform=`scale(${zoom})`;
   box.style.minHeight=(Math.max(160,settings.height*zoom+26))+'px';
   by('preview-zoom').textContent='Масштаб '+Math.round(zoom*100)+'%';
 }
 function draw(){W.draw(by('widget-preview'),settings,session,{preview:true});scalePreview();
   const ready=Boolean(settings.id&&session?.id===settings.id);
   const url=ready?W.makeURL(settings):'';by('widget-url').value=url;by('copy-url').disabled=!ready;
   const open=by('open-url');open.href=url||'./overlay.html';open.classList.toggle('is-disabled',!ready);open.setAttribute('aria-disabled',String(!ready));
   by('preview-dimensions').textContent=`${settings.width} × ${settings.height} px`;
   by('obs-size').textContent=`${settings.width} × ${settings.height}`;store();
 }
 function patch(updates,{editor=false}={}){settings=W.normalize({...settings,...updates});syncControls();if(editor)drawEditor();draw();}
 async function connectSession(id){if(connecting)return;connecting=true;status('Подключаю сессию…');
   try{const data=await W.api('get',{session_id:id});if(!data.session?.id)throw new Error('Сессия не найдена');
     session=data.session;settings=W.normalize({...settings,id:data.session.id});
     by('session-source').value=new URL('./session.html?id='+encodeURIComponent(settings.id),location.href).href;
     by('source-state').textContent=`Подключено: ${session.nickname||'Игрок'} · ${session.status==='active'?'Активная':'Завершена'} сессия.`;
     status('Сессия подключена. Настрой оформление и скопируй ссылку для OBS.','success');draw();
   }catch(e){session=null;settings=W.normalize({...settings,id:''});status('Не удалось подключить: '+(e.message||'Неизвестная ошибка'),'error');draw();}
   finally{connecting=false;}
 }
 async function searchPlayer(ev){ev.preventDefault();const q=by('nickname').value.trim();if(q.length<2)return;
   const btn=by('nickname-btn');btn.disabled=true;status('Ищу игрока на EU…');
   try{const data=await W.api('search',{nickname:q}),host=by('search-results');host.replaceChildren();host.hidden=false;
     if(!data.players?.length){const line=document.createElement('p');line.className='hint';line.textContent='Ник не найден.';host.append(line);}
     for(const player of data.players||[]){const b=document.createElement('button');b.type='button';b.className='search-hit';
       const name=document.createElement('strong');name.textContent=player.nickname;const small=document.createElement('small');small.textContent='ID '+player.account_id;
       b.append(name,small);b.addEventListener('click',()=>profile(player.account_id));host.append(b);}
     status('Выбери игрока из списка.');
   }catch(e){status('Ошибка поиска: '+e.message,'error');}finally{btn.disabled=false;}
 }
 async function profile(account_id){status('Получаю открытую сессию игрока…');by('search-results').hidden=true;
   try{const data=await W.api('profile',{account_id});if(!data.active_session?.id){status('Активная сессия не найдена. Запусти её через «Сессионку» или вставь ссылку на завершённую.','error');return;}
     await connectSession(data.active_session.id);}catch(e){status('Ошибка поиска сессии: '+e.message,'error');}
 }
 async function copyURL(){const text=by('widget-url').value;if(!text)return;
   try{await navigator.clipboard.writeText(text);status('Готово! Вставь ссылку в браузерный источник OBS или веб-оверлей StreamChamp.','success');}
   catch{by('widget-url').focus();by('widget-url').select();status('Ссылка выделена. Нажми Ctrl+C для копирования.');}
 }
 function bind(){by('nickname-form').addEventListener('submit',searchPlayer);
   by('apply-session').addEventListener('click',()=>{const id=getSessionId(by('session-source').value);if(id)connectSession(id);else status('Вставь правильный ID или ссылку с параметром id=…','error');});
   by('copy-url').addEventListener('click',copyURL);
   for(const key of regularKeys){const el=by(key);if(!el)continue;
     const ev=['color','range','text'].includes(el.type)?'input':'change';
     el.addEventListener(ev,()=>{
       const val=checks.has(key)?el.checked:el.value;
       if(key==='theme'){
         const pal=W.palettes[val];const custom=val==='transparent'?{opacity:0,borderWidth:0,blur:0,shadow:0}:{};
         patch({theme:val,...pal,...custom});
       }else if(key==='layout'){
         const rec=val==='vertical'?{preset:'vertical',width:320,height:720}:val==='ticker'?{preset:'wide',width:1200,height:180}:val==='bar'?{preset:'wide',width:1200,height:180}:val==='minimal'?{preset:'standard',width:800,height:220}:{};
         patch({layout:val,...rec});
       }else if(key==='preset'){
         patch(val==='custom'?{preset:'custom'}:{preset:val,...W.presets[val]});
       }else if(key==='width'||key==='height'){
         // Number input may temporarily be blank during editing; finalize on change.
         patch({[key]:val,preset:'custom'});
       }else patch({[key]:val});
     });
   }
   const editor=by('stats-editor');
   editor.addEventListener('input',ev=>{
     const t=ev.target,row=t.closest('.stat-edit');if(!row)return;const key=row.dataset.key,op=t.dataset.op;
     if(op==='label')patch({labels:{...settings.labels,[key]:t.value}});
     if(op==='number')patch({fieldColors:{...settings.fieldColors,[key]:t.value}});
     if(op==='labelColor')patch({fieldLabelColors:{...settings.fieldLabelColors,[key]:t.value}});
   });
   editor.addEventListener('change',ev=>{const t=ev.target,row=t.closest('.stat-edit');if(!row)return;
     const op=t.dataset.op,key=row.dataset.key;
     if(op==='numberSize'){patch({fieldNumberSizes:{...settings.fieldNumberSizes,[key]:t.value}});return;}
     if(op==='labelSize'){patch({fieldLabelSizes:{...settings.fieldLabelSizes,[key]:t.value}});return;}
     if(op!=='show')return;
     const next=t.checked?[...settings.fields,key]:settings.fields.filter(k=>k!==key);
     if(!next.length){t.checked=true;status('Нужно оставить хотя бы один показатель.','error');return;}
     patch({fields:next},{editor:true});
   });
   editor.addEventListener('click',ev=>{const btn=ev.target.closest('button[data-op]');if(!btn)return;
     const key=btn.closest('.stat-edit').dataset.key,arr=settings.fields.slice(),i=arr.indexOf(key);
     if(i<0)return;const j=i+(btn.dataset.op==='up'?-1:1);if(j<0||j>=arr.length)return;
     [arr[i],arr[j]]=[arr[j],arr[i]];patch({fields:arr},{editor:true});
   });
   by('reset-labels').addEventListener('click',()=>patch({labels:{},fieldColors:{},fieldLabelColors:{},fieldNumberSizes:{},fieldLabelSizes:{}},{editor:true}));
   by('reset-all').addEventListener('click',()=>{
     if(!confirm('Вернуть все настройки оформления к стандартным? Подключённая сессия сохранится.'))return;
     settings=W.normalize({...W.defaults,id:settings.id});patch(settings,{editor:true});status('Оформление сброшено.','success');
   });
   if('ResizeObserver' in window)new ResizeObserver(()=>scalePreview()).observe(by('preview-surface'));
   window.addEventListener('resize',scalePreview,{passive:true});
 }
 syncControls();drawEditor();bind();draw();
 if(settings.id)connectSession(settings.id);
})();
