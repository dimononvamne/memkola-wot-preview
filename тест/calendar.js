/* MEMKOLA BLITZ EU calendar v1.  Separate from MEM CUP and its live results. */
const $=id=>document.getElementById(id);
const cfg=window.TANK_TIER_CONFIG||{};
const TABLE='memkola_blitz_calendar_events';
const MONTH_TABLE='memkola_blitz_calendar_months';
const BUCKET='memkola-blitz-calendar-backgrounds';
const fmtNames={'1x1':'1 на 1','2x2':'2 на 2','3x3':'3 на 3','5x5':'5 на 5','7x7':'7 на 7',other:'Особый'};
const tones={gold:'#ffb55e',purple:'#b28aff',green:'#75dc8f',blue:'#60c8fa',red:'#f57c8c'};
const formats=new Set(Object.keys(fmtNames)),colors=new Set(Object.keys(tones));
const months=['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ','ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];
const state={sb:null,admin:false,month:'',events:[],monthSettings:null,selectedDate:null,editing:null,detail:null,refreshSerial:0,backgroundFile:null,backgroundPreview:null,timeout:0,deeplinkConsumed:false};
const isDate=s=>/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(s||''))&&new Date(`${s}T12:00:00Z`).toISOString().slice(0,10)===s;
const isMonth=s=>/^\d{4}-(0[1-9]|1[0-2])$/.test(String(s||''));
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
function todayEu(){return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((a,p)=>{a[p.type]=p.value;return a;},{});}
function getCurrentMonth(){const d=todayEu();return `${d.year}-${d.month}`;}
function nextMonth(month,delta){const [y,m]=month.split('-').map(Number);const dt=new Date(Date.UTC(y,m-1+delta,1));return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}`;}
function monthTitle(m){const [y,mm]=m.split('-').map(Number);return `${months[mm-1]} ${y}`;}
function readableDate(date){const [y,m,d]=date.split('-').map(Number);return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d)));}
function shortDate(date){return new Intl.DateTimeFormat('ru-RU',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));}
function linkOk(raw){if(!raw)return '';try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.toString():'';}catch{return '';}}
function toast(message){const x=$('cal-toast');x.textContent=message;x.classList.add('show');clearTimeout(state.timeout);state.timeout=setTimeout(()=>x.classList.remove('show'),3900);}
function colorOf(e){return tones[colors.has(e.color)?e.color:'blue'];}
function styleTone(element,event){element.style.setProperty('--tone',colorOf(event));const c=colors.has(event.color)?event.color:'blue';element.style.setProperty('--tone-bg',{gold:'#7e5d2699',purple:'#64477b99',green:'#286b5199',blue:'#275d8499',red:'#75354a99'}[c]);}
function setUrl(month=state.month,eventId=null){const u=new URL(location.href);u.searchParams.set('m',month);if(eventId)u.searchParams.set('e',eventId);else u.searchParams.delete('e');history.replaceState(null,'',u);}
function validMonthDay(month,day){const d=Number(day);return d>=1&&d<=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).getUTCDate();}
function updateStatus(msg){$('cal-state').textContent=msg;}
function safeImageUrl(row){const path=row?.image_path;if(!path||typeof path!=='string'||path.includes('..')||path.startsWith('/')||!/^[-\w./]+$/.test(path))return '';return state.sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;}
function paintPhoto(){const row=state.monthSettings;const url=state.sb&&row?safeImageUrl(row):'';$('cal-photo').style.backgroundImage=url?`url(${JSON.stringify(url)})`:'';$('cal-month-shade').style.background=`linear-gradient(180deg,rgba(11,19,30,${Math.max(.2,Math.min(.9,Number(row?.overlay_opacity??.62)))}),rgba(8,15,25,.86))`;}
function publishedEvents(){return state.admin?state.events:state.events.filter(x=>x.published);}
function sortEvents(a,b){return a.event_date.localeCompare(b.event_date)||(a.time_eu||'99:99').localeCompare(b.time_eu||'99:99')||a.title.localeCompare(b.title,'ru');}
function visibleForDate(d){return publishedEvents().filter(x=>x.event_date===d).sort(sortEvents);}
function renderCalendar(){
 const m=state.month,[y,mm]=m.split('-').map(Number);
 $('cal-month').value=m;$('cal-month-label').textContent='';$('cal-month-label').append(document.createTextNode(months[mm-1]+' '+y+' '),el('span','', '(EU)'));
 const first=(new Date(Date.UTC(y,mm-1,1)).getUTCDay()+6)%7;
 const count=new Date(Date.UTC(y,mm,0)).getUTCDate();
 const cellCount=Math.ceil((first+count)/7)*7;
 const dayRoot=$('cal-days');dayRoot.replaceChildren();
 const t=todayEu(),today=`${t.year}-${t.month}-${t.day}`;
 const fragment=document.createDocumentFragment();
 for(let index=0;index<cellCount;index++){
  const day=index-first+1;
  const dateObj=new Date(Date.UTC(y,mm-1,day));
  const dayIso=`${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth()+1).padStart(2,'0')}-${String(dateObj.getUTCDate()).padStart(2,'0')}`;
  const isInside=day>=1&&day<=count;
  const cell=el('div','cal-day');cell.setAttribute('role','gridcell');cell.tabIndex=0;cell.setAttribute('aria-label',readableDate(dayIso));
  if(!isInside)cell.classList.add('is-outside');if(dayIso===today)cell.classList.add('is-today');if(dayIso===state.selectedDate)cell.classList.add('is-selected');
  cell.append(el('span','cal-day-num',String(dateObj.getUTCDate())));
  const dayEvents=isInside?visibleForDate(dayIso):[];
  const stack=el('div','cal-day-events');
  for(const event of dayEvents.slice(0,3)){
   const pill=el('button','cal-event-pill');pill.type='button';styleTone(pill,event);
   // Show the editor's 'Подробности' directly under each calendar event name.
   const content=el('span','cal-pill-content');
   content.append(el('span','cal-pill-title',event.title));
   if(event.notes?.trim())content.append(el('span','cal-pill-notes',event.notes.trim()));
   pill.append(el('span','cal-pill-time',event.time_eu||'⚡'),content);
   pill.title=[event.title,event.notes?.trim(),event.prize].filter(Boolean).join(' — ');
   if(!event.published)pill.classList.add('is-draft');
   pill.addEventListener('click',ev=>{ev.stopPropagation();showDetail(event.id);});stack.append(pill);
  }
  if(dayEvents.length>3)stack.append(el('span','cal-pill-extra',`+${dayEvents.length-3}`));
  cell.append(stack);
  if(dayEvents.length){const badge=el('span','cal-mobile-count');const marker=el('i');styleTone(marker,dayEvents[0]);badge.append(marker,document.createTextNode(`${dayEvents.length} турн.`));cell.append(badge);}
  const choose=()=>{if(!isInside){changeMonth(dayIso.slice(0,7),dayIso);return;}state.selectedDate=state.selectedDate===dayIso?null:dayIso;renderCalendar();renderAgenda();};
  cell.addEventListener('click',choose);cell.addEventListener('keydown',ev=>{if(ev.target===cell&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();choose();}});
  fragment.append(cell);
 }
 dayRoot.append(fragment);
}
function renderAgenda(){
 const root=$('cal-agenda');root.replaceChildren();
 const all=publishedEvents().sort(sortEvents),filtered=state.selectedDate?all.filter(e=>e.event_date===state.selectedDate):all;
 $('cal-total').textContent=`${all.length} ${plural(all.length,'событие','события','событий')}`;
 $('cal-show-all').hidden=!state.selectedDate;$('cal-selection').hidden=!state.selectedDate;
 if(state.selectedDate)$('cal-selection').textContent=`Выбрано: ${readableDate(state.selectedDate)}`;
 if(!filtered.length){const empty=el('div','cal-no-events');empty.append(el('strong','',state.selectedDate?'В этот день нет турниров':'События ещё не добавлены'),el('span','',state.selectedDate?'Выбери другую дату или покажи весь месяц.':'Редактор добавит сюда выбранные турниры.'));root.append(empty);return;}
 let prev='';
 for(const event of filtered){
  if(prev!==event.event_date){prev=event.event_date;root.append(el('div','cal-agenda-date',shortDate(prev)));}
  const card=el('button','cal-agenda-card');card.type='button';styleTone(card,event);
  const dot=el('i','cal-agenda-dot');dot.setAttribute('aria-hidden','true');
  const info=el('span','cal-agenda-info');const heading=el('strong','',event.title);
  if(!event.published)heading.append(el('span','cal-draft','ЧЕРНОВИК'));
  const suffix=[event.time_eu?event.time_eu+' EU':null,fmtNames[event.format]||'Особый',event.prize||null].filter(Boolean).join(' · ');
  info.append(heading);
  // Repeat the same notes in the right-side list, without changing the full event dialog.
  if(event.notes?.trim())info.append(el('span','cal-agenda-notes',event.notes.trim()));
  if(suffix)info.append(el('small','',suffix));
  card.append(dot,info);card.addEventListener('click',()=>showDetail(event.id));root.append(card);
 }
}
function plural(n,a,b,c){const mod10=n%10,mod100=n%100;return mod10===1&&mod100!==11?a:(mod10>=2&&mod10<=4&&(mod100<12||mod100>14))?b:c;}
function render(){paintPhoto();renderCalendar();renderAgenda();}
async function loadMonth({quiet=false}={}){
 if(!state.sb)return;
 const seq=++state.refreshSerial,m=state.month;
 if(!quiet)updateStatus('Загружаем турниры…');
 try{
  const [{data:events,error:er},{data:settings,error:sr}]=await Promise.all([
   state.sb.from(TABLE).select('id,event_date,time_eu,title,format,color,prize,notes,registration_url,published,updated_at').gte('event_date',m+'-01').lt('event_date',nextMonth(m,1)+'-01').order('event_date',{ascending:true}).order('time_eu',{ascending:true}),
   state.sb.from(MONTH_TABLE).select('month_key,image_path,overlay_opacity,updated_at').eq('month_key',m).maybeSingle()
  ]);
  if(seq!==state.refreshSerial)return;
  if(er)throw er;if(sr)throw sr;
  state.events=events||[];state.monthSettings=settings||null;
  render();updateStatus(`Турниры EU · ${state.events.length} ${plural(state.events.length,'запись','записи','записей')}${state.admin?' (включая черновики)':''}`);
  const deeplink=new URL(location.href).searchParams.get('e');
  if(!state.deeplinkConsumed && deeplink){state.deeplinkConsumed=true;if(state.events.some(e=>e.id===deeplink))showDetail(deeplink,false);}
 }catch(error){if(seq!==state.refreshSerial)return;if(!quiet){state.events=[];state.monthSettings=null;render();}updateStatus('Календарь ещё не подключён к базе. Нужно выполнить SQL из инструкции.');console.warn('Calendar load:',error);}
}
function changeMonth(month,chosen=null){if(!isMonth(month)||Number(month.slice(0,4))<2020||Number(month.slice(0,4))>2100)return;state.month=month;state.selectedDate=isDate(chosen)&&chosen.slice(0,7)===month?chosen:null;state.events=[];state.monthSettings=null;setUrl();renderCalendar();renderAgenda();loadMonth();}
async function checkAdmin(){const {data:{user},error}=await state.sb.auth.getUser();if(error||!user)return false;const {data,error:err}=await state.sb.from('tier_admins').select('user_id').eq('user_id',user.id).maybeSingle();return !err&&!!data;}
async function syncRole(){state.admin=await checkAdmin();$('cal-auth').textContent=state.admin?'Выйти из редактора':'Вход для автора';$('cal-admin-panel').hidden=!state.admin;await loadMonth();}
async function doLogin(ev){ev.preventDefault();$('cal-login-error').textContent='';const submit=ev.target.querySelector('[type=submit]');submit.disabled=true;try{const {error}=await state.sb.auth.signInWithPassword({email:$('cal-email').value.trim(),password:$('cal-password').value});if(error)throw error;if(!(await checkAdmin())){await state.sb.auth.signOut();throw Error('Этот аккаунт не имеет прав редактора.');}$('cal-login-dialog').close();$('cal-password').value='';await syncRole();toast('Редактор календаря включён');}catch(e){$('cal-login-error').textContent=e.message;}finally{submit.disabled=false;}}
function eventForm(event=null){if(!state.admin)return;state.editing=event?.id||null;const form=$('cal-event-form');form.reset();$('cal-event-heading').textContent=event?'Изменить турнир':'Добавить турнир';$('ce-title').value=event?.title||'';$('ce-date').value=event?.event_date||state.selectedDate||`${state.month}-01`;$('ce-time').value=event?.time_eu||'';$('ce-format').value=formats.has(event?.format)?event.format:'7x7';$('ce-color').value=colors.has(event?.color)?event.color:'blue';$('ce-prize').value=event?.prize||'';$('ce-url').value=event?.registration_url||'';$('ce-notes').value=event?.notes||'';$('ce-published').checked=event?.published??true;$('ce-delete').hidden=!event;$('ce-error').textContent='';$('cal-event-dialog').showModal();}
async function saveEvent(ev){ev.preventDefault();if(!state.admin)return;
 const title=$('ce-title').value.trim(),date=$('ce-date').value,rawUrl=$('ce-url').value.trim(),url=linkOk(rawUrl);
 if(title.length<2||title.length>130||!isDate(date)){$('ce-error').textContent='Проверь название и дату.';return;}
 if(rawUrl&&!url){$('ce-error').textContent='Укажи правильную ссылку http:// или https://.';return;}
 const payload={event_date:date,time_eu:$('ce-time').value||null,title,format:formats.has($('ce-format').value)?$('ce-format').value:'other',color:colors.has($('ce-color').value)?$('ce-color').value:'blue',prize:$('ce-prize').value.trim(),notes:$('ce-notes').value.trim(),registration_url:url||null,published:$('ce-published').checked};
 const button=$('ce-save');button.disabled=true;$('ce-error').textContent='';
 try{
  const req=state.editing?state.sb.from(TABLE).update(payload).eq('id',state.editing).select('id').single():state.sb.from(TABLE).insert(payload).select('id').single();const {error}=await req;if(error)throw error;
  $('cal-event-dialog').close();toast('Турнир сохранён');
  if(date.slice(0,7)!==state.month)changeMonth(date.slice(0,7),date);
  else await loadMonth();
 }catch(e){$('ce-error').textContent='Ошибка сохранения: '+e.message;}finally{button.disabled=false;}
}
async function deleteEvent(){if(!state.admin||!state.editing)return;const ev=state.events.find(e=>e.id===state.editing);if(!confirm(`Удалить «${ev?.title||'турнир'}» из календаря?`))return;const b=$('ce-delete');b.disabled=true;try{const {error}=await state.sb.from(TABLE).delete().eq('id',state.editing);if(error)throw error;$('cal-event-dialog').close();toast('Турнир удалён');await loadMonth();}catch(e){$('ce-error').textContent='Ошибка удаления: '+e.message;}finally{b.disabled=false;}}
function showDetail(id,updateUrl=true){const event=state.events.find(e=>e.id===id);if(!event||(!event.published&&!state.admin))return;state.detail=id;$('cd-title').textContent=event.title;$('cd-date').textContent=readableDate(event.event_date)+(event.time_eu?' · '+event.time_eu+' EU':'');$('cd-format').textContent=fmtNames[event.format]||'Особый';$('cd-prize').textContent=event.prize||'Награды уточняются';$('cd-notes').textContent=event.notes||'';$('cd-notes-wrap').hidden=!event.notes;const url=linkOk(event.registration_url);$('cd-link').hidden=!url;if(url)$('cd-link').href=url;else $('cd-link').removeAttribute('href');$('cd-edit').hidden=!state.admin;state.selectedDate=event.event_date;renderCalendar();renderAgenda();if(updateUrl)setUrl(state.month,id);if(!$('cal-detail-dialog').open)$('cal-detail-dialog').showModal();}
function closeDetail(){state.detail=null;setUrl();}
async function shareDetail(){const ev=state.events.find(e=>e.id===state.detail);if(!ev)return;const url=new URL(location.href);url.searchParams.set('m',ev.event_date.slice(0,7));url.searchParams.set('e',ev.id);try{await navigator.clipboard.writeText(url.toString());toast('Ссылка на турнир скопирована');}catch{toast('Скопируй ссылку из адресной строки');}}
function clearPreview(){if(state.backgroundPreview)URL.revokeObjectURL(state.backgroundPreview);state.backgroundPreview=null;state.backgroundFile=null;}
function imageDialog(){if(!state.admin)return;clearPreview();$('cal-image-form').reset();$('ci-opacity').value=Math.round((state.monthSettings?.overlay_opacity??.62)*100);$('ci-reset').checked=false;$('ci-file').value='';$('ci-error').textContent='';updateImagePreview();$('cal-image-dialog').showModal();}
function updateImagePreview(){const url=state.backgroundPreview||(state.sb&&state.monthSettings?safeImageUrl(state.monthSettings):'');const preview=$('ci-preview');preview.style.backgroundImage=url?`linear-gradient(#09152155,#09152166),url(${JSON.stringify(url)})`:'';preview.textContent=url?'Предпросмотр фона':'Стандартный фон сайта';$('ci-opacity-val').textContent=$('ci-opacity').value+'%';}
async function saveImage(ev){ev.preventDefault();if(!state.admin)return;const btn=$('ci-save');btn.disabled=true;$('ci-error').textContent='';try{
 const file=state.backgroundFile,reset=$('ci-reset').checked;
 if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024))throw Error('Файл должен быть JPG, PNG или WEBP размером до 5 МБ.');
 let path=reset?null:state.monthSettings?.image_path||null;
 if(!reset&&file){const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];path=`monthly/${state.month}/${crypto.randomUUID()}.${ext}`;const {error}=await state.sb.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type});if(error)throw Error('Загрузка фона: '+error.message);}
 const {error}=await state.sb.from(MONTH_TABLE).upsert({month_key:state.month,image_path:path,overlay_opacity:Number($('ci-opacity').value)/100},{onConflict:'month_key'});if(error)throw error;
 $('cal-image-dialog').close();clearPreview();await loadMonth();toast('Оформление месяца сохранено');
 }catch(e){$('ci-error').textContent='Ошибка: '+e.message;}finally{btn.disabled=false;}}
function setupEvents(){
 $('cal-prev').addEventListener('click',()=>changeMonth(nextMonth(state.month,-1)));
 $('cal-next').addEventListener('click',()=>changeMonth(nextMonth(state.month,1)));
 $('cal-month').addEventListener('change',ev=>changeMonth(ev.target.value));
 $('cal-show-all').addEventListener('click',()=>{state.selectedDate=null;render();});
 $('cal-auth').addEventListener('click',async()=>{if(!state.sb){toast('Сначала подключи Supabase');return;}if(state.admin){const {error}=await state.sb.auth.signOut();if(error){toast('Ошибка выхода: '+error.message);return;}await syncRole();toast('Выход из редактора');}else $('cal-login-dialog').showModal();});
 $('cal-login-form').addEventListener('submit',doLogin);
 $('cal-create').addEventListener('click',()=>eventForm());$('cal-event-form').addEventListener('submit',saveEvent);$('ce-delete').addEventListener('click',deleteEvent);
 $('cd-edit').addEventListener('click',()=>{const event=state.events.find(e=>e.id===state.detail);$('cal-detail-dialog').close();if(event)eventForm(event);});
 $('cd-copy').addEventListener('click',shareDetail);
 $('cal-detail-dialog').addEventListener('close',closeDetail);
 $('cal-background-open').addEventListener('click',imageDialog);$('cal-image-form').addEventListener('submit',saveImage);
 $('ci-file').addEventListener('change',ev=>{clearPreview();const file=ev.target.files?.[0];if(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){$('ci-error').textContent='Только JPG, PNG или WEBP до 5 МБ.';ev.target.value='';return;}state.backgroundFile=file;state.backgroundPreview=URL.createObjectURL(file);}updateImagePreview();});
 $('ci-opacity').addEventListener('input',updateImagePreview);
 $('ci-reset').addEventListener('change',ev=>{if(ev.target.checked){clearPreview();$('ci-file').value='';}updateImagePreview();if(ev.target.checked){$('ci-preview').style.backgroundImage='';$('ci-preview').textContent='Стандартный фон сайта';}});
 $('cal-image-dialog').addEventListener('close',clearPreview);
 document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',ev=>{if(ev.target===d)d.close();}));
 window.addEventListener('focus',()=>{if(state.sb&&!document.querySelector('dialog[open]'))loadMonth({quiet:true});});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.sb&&!document.querySelector('dialog[open]'))loadMonth({quiet:true});});
 setInterval(()=>{if(state.sb&&!document.hidden&&!document.querySelector('dialog[open]'))loadMonth({quiet:true});},60000);
}
async function init(){
 const params=new URLSearchParams(location.search);state.month=isMonth(params.get('m'))?params.get('m'):getCurrentMonth();
 setupEvents();setUrl(state.month,params.get('e'));render();
 if(!cfg.supabaseUrl||!cfg.supabaseAnonKey){updateStatus('Нет настроек базы данных в config.js');return;}
 try{const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');state.sb=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);await syncRole();}catch(e){updateStatus('Не удалось подключиться к базе. Повтори попытку позже.');console.error(e);}
}
init();
