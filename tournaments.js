/* MEMKOLA tournament center v13. Public live results; organizer drafts remain private. */
const $ = id => document.getElementById(id);
const cfg = window.TANK_TIER_CONFIG || {};
const statuses = {announced:'Скоро',registration:'Регистрация открыта',ongoing:'Идёт турнир',completed:'Завершён'};
const st = {sb:null,admin:false,events:[],players:[],selected:null,filter:'all',loading:false,modalEditing:null,posterPath:'',toastTimeout:0};
const PLAYER_FIELDS='id,tournament_id,nickname,tank_name,participant_number,damage,map_name,place,registration_status';
const RESULTS_REFRESH_MS=5000;
const liveResults={timer:0,controller:null,epoch:0,signature:''};
let detailVersion=0;
function flash(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(st.toastTimeout);st.toastTimeout=setTimeout(()=>el.classList.remove('show'),4200);}
function fmtDate(v){ if(!v)return 'Дата уточняется';try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));}catch{return 'Дата уточняется';}}
function node(tag,props={},children=[]){let el=document.createElement(tag);for(let [k,v] of Object.entries(props)){if(k==='class')el.className=v;else if(k==='text')el.textContent=v;else if(k==='value')el.value=v;else el.setAttribute(k,v);}for(const child of children)el.append(typeof child==='string'?document.createTextNode(child):child);return el;}
function isUuid(v){return /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(v||'');}
// Extract a trusted YouTube video identifier from watch/live/shorts/embed or youtu.be URLs.
// Always create links from a validated ID rather than injecting arbitrary user supplied URLs.
function youtubeVideoId(value){
  const input=String(value||'').trim();
  if(!input || input.length>500)return null;
  let url;
  try{url=new URL(input);}catch{return null;}
  if(!['http:','https:'].includes(url.protocol))return null;
  const host=url.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'');
  let id='';
  if(host==='youtu.be')id=url.pathname.split('/').filter(Boolean)[0]||'';
  else if(host==='youtube.com' || host==='youtube-nocookie.com'){
    const parts=url.pathname.split('/').filter(Boolean);
    if(parts[0]==='watch')id=url.searchParams.get('v')||'';
    else if(['live','shorts','embed','v'].includes(parts[0]))id=parts[1]||'';
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
function youtubeWatchUrl(id){return 'https://www.youtube.com/watch?v='+encodeURIComponent(id);}
function youtubeThumbnailUrl(id){return 'https://i.ytimg.com/vi/'+encodeURIComponent(id)+'/hqdefault.jpg';}
function setYoutubeThumbnail(img,id){
  img.onerror=()=>{img.onerror=null;img.removeAttribute('src');img.hidden=true;};
  img.hidden=false;
  img.src=youtubeThumbnailUrl(id);
}
function renderYoutubeRecording(t){
  const box=$('youtube-recording-section');
  const id=youtubeVideoId(t?.youtube_url);
  box.hidden=!id;
  if(!id){$('youtube-recording-thumbnail').removeAttribute('src');return;}
  $('youtube-recording-link').href=youtubeWatchUrl(id);
  $('youtube-recording-title').textContent='Запись: '+(t.title||'турнира');
  setYoutubeThumbnail($('youtube-recording-thumbnail'),id);
}
function updateYoutubeEditorPreview(){
  const value=$('t-youtube').value.trim();
  const id=youtubeVideoId(value);
  const preview=$('t-youtube-preview');
  preview.hidden=!id;
  $('t-youtube-error').hidden=!value || !!id;
  $('t-youtube-error').textContent=value && !id?'Укажи правильную ссылку на видео YouTube.':'';
  if(!id){$('t-youtube-preview-img').removeAttribute('src');return;}
  preview.href=youtubeWatchUrl(id);
  setYoutubeThumbnail($('t-youtube-preview-img'),id);
}

// Every approved player with a recorded positive damage value receives a unique place.
// Ties are broken by participant number (smaller wins), then by nickname and ID.
// Pending/rejected players and players without a result do not receive a place.
function placeNumber(v){return v!==null && v!=='' && Number.isInteger(Number(v)) && Number(v)>0 ? Number(v) : Number.MAX_SAFE_INTEGER;}
function autoRankPlayers(players){
  const rankable=players.filter(p=>p.registration_status==='approved' && Number.isInteger(Number(p.damage)) && Number(p.damage)>0);
  rankable.sort((a,b)=>Number(b.damage)-Number(a.damage)||placeNumber(a.participant_number)-placeNumber(b.participant_number)||String(a.nickname).localeCompare(String(b.nickname),'ru')||String(a.id).localeCompare(String(b.id)));
  const positions=new Map(rankable.map((p,i)=>[String(p.id),i+1]));
  return players.map(p=>({...p,place:positions.get(String(p.id))??null}));
}
function sortPlayers(arr){return [...arr].sort((a,b)=>(a.place??1e9)-(b.place??1e9)||placeNumber(a.participant_number)-placeNumber(b.participant_number)||String(a.nickname).localeCompare(String(b.nickname),'ru'));}
function podiumClass(place){return place===1?'rank-gold':place===2?'rank-silver':place===3?'rank-bronze':'';}
function podiumSymbol(place){return place===1?'🥇 ':place===2?'🥈 ':place===3?'🥉 ':'';}
function renderEvents(){
  const list=$('events-list');list.replaceChildren();const filtered=st.events.filter(t=>st.filter==='all'||(st.filter==='completed'?t.status==='completed':t.status!=='completed'));
  $('events-empty').hidden=filtered.length>0;
  for(const t of filtered){
    const card=node('article',{class:'event-card'});
    if(t.banner_path && st.sb){const banner=node('img',{class:'event-card-banner',src:st.sb.storage.from('memkola-tournament-posters').getPublicUrl(t.banner_path).data.publicUrl,alt:`Афиша турнира ${t.title}`,loading:'lazy'});card.append(banner);}
    card.append(node('div',{class:'overline',text:statuses[t.status]||t.status}),node('h3',{text:t.title}),node('p',{class:'muted',text:fmtDate(t.starts_at)}),node('p',{class:'event-desc',text:t.description||'Подробности внутри турнира'}));
    let bottom=node('div',{class:'event-bottom'});bottom.append(node('span',{text:youtubeVideoId(t.youtube_url)?'🎬 Есть запись турнира':t.status==='completed'?'🏆 Результаты и победители':t.status==='registration'&&t.registration_open?'✍️ Запись участников':'📋 Информация'}));let b=node('button',{class:'btn btn-gold',type:'button',text:'Открыть →'});b.addEventListener('click',()=>openDetail(t.id));bottom.append(b);card.append(bottom);list.append(card);
  }
}
function fetchPlayers(id,signal){
  const query=st.sb.from('memkola_tournament_players').select(PLAYER_FIELDS).eq('tournament_id',id).order('created_at',{ascending:true});
  return signal?query.abortSignal(signal):query;
}
function setResultsSync(text,state='live'){
  const el=$('results-sync');
  if(!el)return;
  el.hidden=st.admin||!st.selected;
  if(el.textContent!==text)el.textContent=text;
  el.dataset.state=state;
}
function stopResultsRefresh(){
  clearTimeout(liveResults.timer);liveResults.timer=0;
  liveResults.epoch++;
  liveResults.controller?.abort();liveResults.controller=null;
}
function canRefreshResults(){return !!(st.sb&&st.selected&&!st.admin&&!st.loading&&!document.hidden&&navigator.onLine!==false);}
function queueResultsRefresh(delay=RESULTS_REFRESH_MS){
  clearTimeout(liveResults.timer);liveResults.timer=0;
  if(canRefreshResults())liveResults.timer=setTimeout(refreshPublicResults,delay);
}
function updateResultsRefresh(immediate=false){
  stopResultsRefresh();
  if(!st.selected||st.admin){setResultsSync('');return;}
  if(st.loading){setResultsSync('Загружаем результаты…','paused');return;}
  liveResults.signature=JSON.stringify(st.players);
  if(navigator.onLine===false){setResultsSync('Нет сети · ждём подключения','offline');return;}
  if(document.hidden){setResultsSync('Автообновление на паузе','paused');return;}
  setResultsSync('● Автообновление включено');
  queueResultsRefresh(immediate?0:RESULTS_REFRESH_MS);
}
async function refreshPublicResults(){
  liveResults.timer=0;
  if(!canRefreshResults()||liveResults.controller)return;
  const id=st.selected.id,epoch=liveResults.epoch;
  const controller=new AbortController();liveResults.controller=controller;
  const timeout=setTimeout(()=>controller.abort(),12000);
  const isCurrent=()=>epoch===liveResults.epoch&&st.selected?.id===id&&!st.admin;
  try{
    const {data,error}=await fetchPlayers(id,controller.signal);
    if(!isCurrent())return;
    if(error)throw error;
    const players=data||[],signature=JSON.stringify(players);
    // Refresh only saved public rows. Keep the page, scroll position and editor intact.
    if(signature!==liveResults.signature||$('players-count').textContent==='Ошибка загрузки'){
      st.players=players;drawResults(players);liveResults.signature=signature;
    }
    setResultsSync('● Автообновление включено');
    $('results-sync').title='Проверено: '+new Date().toLocaleTimeString('ru-RU');
  }catch(e){
    if(isCurrent())setResultsSync('Нет связи · пробуем снова','offline');
  }finally{
    clearTimeout(timeout);
    if(liveResults.controller===controller)liveResults.controller=null;
    if(isCurrent())queueResultsRefresh();
  }
}
function showList(){detailVersion++;st.loading=false;stopResultsRefresh();st.selected=null;st.players=[];$('tournament-detail').hidden=true;$('events').hidden=false;setResultsSync('');const url=new URL(location.href);url.searchParams.delete('t');history.replaceState(null,'',url);renderEvents();}
async function openDetail(id,{updateUrl=true}={}){
  const t=st.events.find(x=>x.id===id);if(!t)return;
  const requestVersion=++detailVersion;stopResultsRefresh();st.loading=true;
  st.selected=t;st.players=[];$('events').hidden=true;$('tournament-detail').hidden=false;
  if(updateUrl){let url=new URL(location.href);url.searchParams.set('t',id);history.replaceState(null,'',url);}
  $('detail-title').textContent=t.title;$('detail-status').textContent=statuses[t.status];$('detail-date').textContent=fmtDate(t.starts_at);
  $('detail-description').textContent=t.description||'Описание пока не добавлено.';$('detail-rules').textContent=t.rules||'Правила пока не указаны.';
  renderYoutubeRecording(t);
  $('banner-box').hidden=true;$('banner-img').removeAttribute('src');if(t.banner_path && st.sb){$('banner-img').src=st.sb.storage.from('memkola-tournament-posters').getPublicUrl(t.banner_path).data.publicUrl;$('banner-box').hidden=false;}
  $('detail-actions').hidden=!st.admin;$('participants-editor').hidden=!st.admin;
  const regOpen=t.published&&t.status==='registration'&&t.registration_open;
  $('registration-panel').hidden=!regOpen&&!st.admin;
  $('register-form').hidden=!regOpen;
  $('registration-info').textContent=regOpen?'Оставь игровой ник. Организатор подтвердит заявку перед участием.':'Приём заявок сейчас закрыт.';
  $('register-result').textContent='';
  $('poster-box').hidden=true;$('poster-hint').hidden=t.status!=='completed';
  if(t.poster_path && st.sb){$('poster-img').src=st.sb.storage.from('memkola-tournament-posters').getPublicUrl(t.poster_path).data.publicUrl;$('poster-box').hidden=false;$('poster-hint').hidden=true;}
  $('players-count').textContent='Загружаю...';$('public-players').replaceChildren();$('admin-players').replaceChildren();
  setResultsSync('Загружаем результаты…','paused');
  try{
    const {data,error}=await fetchPlayers(id);
    if(requestVersion!==detailVersion||st.selected?.id!==id)return;
    if(error)throw error;
    st.players=data||[];renderPlayers();
  }catch(e){if(requestVersion!==detailVersion||st.selected?.id!==id)return;$('players-count').textContent='Ошибка загрузки';flash('Ошибка таблицы: '+e.message);}
  finally{if(requestVersion===detailVersion&&st.selected?.id===id){st.loading=false;updateResultsRefresh();}}
  if(requestVersion!==detailVersion||st.selected?.id!==id)return;
  $('tournament-detail').scrollIntoView({block:'start',behavior:'smooth'});
}
function drawResults(players){
  const approved=sortPlayers(autoRankPlayers(players).filter(x=>x.registration_status==='approved'));
  $('players-count').textContent=`${approved.length} участников`;
  const body=$('public-players');body.replaceChildren();
  if(!approved.length){const tr=node('tr');tr.append(node('td',{colspan:'6',class:'empty-cell',text:'Пока нет подтверждённых участников'}));body.append(tr);}
  for(const p of approved){
    const tr=node('tr');if(podiumClass(p.place))tr.classList.add(podiumClass(p.place));
    [String(p.participant_number??'—'),p.nickname,p.tank_name||'—',Number(p.damage||0).toLocaleString('ru-RU'),p.map_name||'—',p.place==null?'—':podiumSymbol(p.place)+p.place].forEach((v,i)=>tr.append(node('td',i===1?{class:'nick-cell',text:v}:{text:v})));
    body.append(tr);
  }
  const podium=$('podium');podium.replaceChildren();
  const placed=approved.filter(p=>p.place>=1&&p.place<=3).sort((a,b)=>a.place-b.place);
  for(const p of placed){
    const el=node('div',{class:'podium-place place-'+p.place});
    el.append(node('div',{class:'podium-medal',text:podiumSymbol(p.place).trim()}),node('strong',{text:p.nickname}),node('small',{text:`${p.tank_name?p.tank_name+' · ':''}${Number(p.damage).toLocaleString('ru-RU')} урона`}));
    podium.append(el);
  }
  if(!placed.length)podium.append(node('p',{class:'muted',text:'Введи урон участников — здесь автоматически появится тройка лидеров.'}));
}
function renderPlayers(){
  drawResults(st.players);
  if(st.admin){renderAdminPlayers();refreshLiveRanks();}
}
function renderAdminPlayers(){
  const el=$('admin-players');el.replaceChildren();
  const head=node('div',{class:'edit-row edit-head'});
  ['№','Ник','Танк','Урон','Карта','Место','Заявка'].forEach(v=>head.append(node('span',{text:v})));el.append(head);
  for(const p of [...st.players].sort((a,b)=>placeNumber(a.participant_number)-placeNumber(b.participant_number))){
    const row=node('div',{class:'edit-row'});row.dataset.playerId=p.id;
    const num=node('input',{type:'number',min:'1',max:'1000000','aria-label':'Номер участника',value:p.participant_number??''});num.dataset.field='participant_number';
    const nick=node('span',{class:'edit-nick',title:p.nickname,text:p.nickname});
    const tank=node('input',{type:'text',maxlength:'90',placeholder:'Например, ИС-7','aria-label':'Танк участника',value:p.tank_name||''});tank.dataset.field='tank_name';
    const damage=node('input',{type:'number',min:'0',max:'1000000000',placeholder:'Урон','aria-label':'Урон',value:p.damage>0?p.damage:''});damage.dataset.field='damage';
    const map=node('input',{type:'text',maxlength:'80','aria-label':'Карта',value:p.map_name||''});map.dataset.field='map_name';
    const place=node('output',{class:'auto-place','aria-label':'Автоматическое место',text:'—'});place.dataset.field='place';
    const sel=node('select',{'aria-label':'Статус заявки'});sel.dataset.field='registration_status';for(const [val,title] of [['pending','Ожидает'],['approved','Принят'],['rejected','Отклонён']])sel.append(node('option',{value:val,text:title}));sel.value=p.registration_status;
    row.append(num,nick,tank,damage,map,place,sel);el.append(row);
  }
}
function rowsFromEditor(){
  return [...document.querySelectorAll('#admin-players .edit-row[data-player-id]')].map(row=>{
    const read=field=>row.querySelector(`[data-field="${field}"]`).value.trim();
    const number=read('participant_number'),damage=read('damage');
    const old=st.players.find(p=>String(p.id)===row.dataset.playerId);
    return {id:row.dataset.playerId,nickname:old?.nickname||'',participant_number:number===''?null:Number(number),tank_name:read('tank_name'),damage:damage===''?0:Number(damage),map_name:read('map_name'),registration_status:read('registration_status')};
  });
}
function refreshLiveRanks(){
  if(!st.admin || !st.selected)return;
  const draftRows=autoRankPlayers(rowsFromEditor());
  const byId=new Map(draftRows.map(p=>[String(p.id),p]));
  for(const row of document.querySelectorAll('#admin-players .edit-row[data-player-id]')){
    const p=byId.get(row.dataset.playerId),place=p?.place??null;
    const badge=row.querySelector('[data-field="place"]');
    badge.textContent=place===null?'—':podiumSymbol(place)+place;
    badge.title=place===null?'Место появится после ввода урона принятого игрока':'Место автоматически рассчитано по урону';
    row.classList.remove('rank-gold','rank-silver','rank-bronze');
    if(podiumClass(place))row.classList.add(podiumClass(place));
  }
  // Only the organizer sees the live draft; public viewers see saved results.
  drawResults(draftRows);
}
async function saveResults(){
  if(!st.admin||!st.selected)return;
  const button=$('save-results');button.disabled=true;button.textContent='Сохраняю…';
  try{
    const rows=rowsFromEditor(),used=new Set();
    for(const row of rows){
      const number=row.participant_number,damage=row.damage;
      if(number!==null&&(!Number.isInteger(number)||number<1||number>1e6||used.has(number)))throw Error('Номер участника должен быть уникальным положительным числом');
      if(number!==null)used.add(number);
      if(!Number.isInteger(damage)||damage<0||damage>1e9)throw Error('Урон должен быть целым неотрицательным числом');
      if(row.map_name.length>80)throw Error('Название карты слишком длинное');
      if(row.tank_name.length>90)throw Error('Название танка не должно превышать 90 символов');
    }
    const updates=autoRankPlayers(rows).map(({nickname,...p})=>p);
    // Existing v10 RPC atomically saves ranks with damage; no new SQL is required.
    const {error}=await st.sb.rpc('memkola_save_results',{p_tournament_id:st.selected.id,p_rows:updates});
    if(error)throw error;
    await openDetail(st.selected.id,{updateUrl:false});flash('Результаты сохранены! Места рассчитаны автоматически.');
  }catch(e){flash('Не удалось сохранить: '+e.message);}finally{button.disabled=false;button.textContent='Сохранить все результаты';}
}
async function addPlayer(ev){ev.preventDefault();if(!st.admin||!st.selected)return;const nick=$('add-player-nick').value.trim();if(nick.length<2||nick.length>40){flash('Ник должен содержать 2–40 символов');return;}const next=Math.max(0,...st.players.map(p=>p.participant_number||0))+1;const {error}=await st.sb.from('memkola_tournament_players').insert({tournament_id:st.selected.id,nickname:nick,participant_number:next,registration_status:'approved'});if(error)flash('Ошибка: '+error.message);else{$('add-player-nick').value='';await openDetail(st.selected.id,{updateUrl:false});flash('Участник добавлен');}}
async function register(ev){ev.preventDefault();if($('register-website').value)return;const nick=$('register-nick').value.trim();const response=$('register-result');const button=$('register-form').querySelector('button[type="submit"]');response.textContent='Отправляю заявку…';button.disabled=true;
  try{const {error}=await st.sb.rpc('memkola_register_player',{p_tournament_id:st.selected.id,p_nickname:nick});if(error)throw error;response.textContent='✅ Заявка отправлена организатору. После подтверждения ник появится в списке.';$('register-form').reset();}catch(e){response.textContent='Ошибка регистрации: '+e.message;}finally{button.disabled=false;}
}
function tournamentImageUrl(path){return path&&st.sb?st.sb.storage.from('memkola-tournament-posters').getPublicUrl(path).data.publicUrl:'';}
function openEditor(t=null){if(!st.admin)return;st.modalEditing=t?.id||null;st.posterPath=t?.poster_path||'';st.bannerPath=t?.banner_path||'';$('tournament-form').reset();$('tournament-form-heading').textContent=t?'Изменить турнир':'Создать турнир';$('t-name').value=t?.title||'';
  for(const [kind,path] of [['banner',st.bannerPath],['poster',st.posterPath]]){const preview=$('current-'+kind);preview.hidden=!path;if(path)$('current-'+kind+'-img').src=tournamentImageUrl(path);else $('current-'+kind+'-img').removeAttribute('src');}

  if(t?.starts_at){const date=new Date(t.starts_at);const local=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);$('t-date').value=local;}
  $('t-status').value=t?.status||'announced';$('t-description').value=t?.description||'';$('t-rules').value=t?.rules||'';$('t-youtube').value=t?.youtube_url||'';updateYoutubeEditorPreview();$('t-registration').checked=!!t?.registration_open;$('t-published').checked=!!t?.published;$('t-poster').value='';$('t-banner').value='';$('t-error').textContent='';$('tournament-dialog').showModal();}
async function saveEvent(ev){ev.preventDefault();if(!st.admin)return;const button=$('save-tournament');button.disabled=true;button.textContent='Сохраняю…';$('t-error').textContent='';
  try{
    const videoInput=$('t-youtube').value.trim();
    const videoId=videoInput?youtubeVideoId(videoInput):null;
    if(videoInput && !videoId)throw Error('Вставь корректную ссылку на YouTube (watch, live, shorts или youtu.be).');
    const youtubeUrl=videoId?youtubeWatchUrl(videoId):'';
    const uploadImage=async(kind,previousPath)=>{
      const file=$('t-'+kind).files[0];
      if(!file)return $('t-'+kind+'-clear').checked?'':previousPath;
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Каждая картинка должна быть PNG, JPEG или WEBP до 5 МБ');
      const ext=file.type==='image/jpeg'?'jpg':file.type.split('/')[1];
      const id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2));
      const path=`${kind==='banner'?'banners':'posters'}/${id}.${ext}`;
      const {error}=await st.sb.storage.from('memkola-tournament-posters').upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;
      return path;
    };
    const bannerPath=await uploadImage('banner',st.bannerPath);
    const posterPath=await uploadImage('poster',st.posterPath);
    const data={title:$('t-name').value.trim(),starts_at:$('t-date').value?new Date($('t-date').value).toISOString():null,status:$('t-status').value,description:$('t-description').value.trim(),rules:$('t-rules').value.trim(),registration_open:$('t-registration').checked,published:$('t-published').checked,banner_path:bannerPath,poster_path:posterPath,youtube_url:youtubeUrl};
    if(data.title.length<3)throw Error('Название должно содержать от 3 символов');
    const req=st.modalEditing?st.sb.from('memkola_tournaments').update({...data,updated_at:new Date().toISOString()}).eq('id',st.modalEditing).select('id').single():st.sb.from('memkola_tournaments').insert(data).select('id').single();
    const {data:result,error}=await req;if(error)throw error;
    $('tournament-dialog').close();await loadEvents();await openDetail(result.id);flash('Турнир сохранён!');
  }catch(e){$('t-error').textContent='Ошибка: '+e.message;}finally{button.disabled=false;button.textContent='Сохранить турнир';}
}
async function deleteEvent(){if(!st.admin||!st.selected)return;if(!confirm(`Удалить турнир «${st.selected.title}» вместе с заявками и результатами?`))return;const {error}=await st.sb.from('memkola_tournaments').delete().eq('id',st.selected.id);if(error){flash(error.message);return;}await loadEvents();showList();flash('Турнир удалён');}
async function loadEvents(){const {data,error}=await st.sb.from('memkola_tournaments').select('id,title,starts_at,status,description,rules,registration_open,published,banner_path,poster_path,youtube_url,created_at').order('created_at',{ascending:false});if(error)throw error;st.events=data||[];$('connection').textContent=st.events.length?`${st.events.length} турниров в календаре`:'Пока нет турниров';renderEvents();}
async function checkAdmin(){const {data:{user}}=await st.sb.auth.getUser();if(!user)return false;const {data,error}=await st.sb.from('tier_admins').select('user_id').eq('user_id',user.id).maybeSingle();return !error&&!!data;}
async function refreshAuth(){detailVersion++;st.loading=false;stopResultsRefresh();st.admin=await checkAdmin();setResultsSync('');$('auth-button').textContent=st.admin?'Выйти из редактора':'Вход для организатора';$('admin-bar').hidden=!st.admin;await loadEvents();const id=new URLSearchParams(location.search).get('t');if(isUuid(id)&&st.events.some(e=>e.id===id))await openDetail(id,{updateUrl:false});}
async function login(ev){ev.preventDefault();$('login-error').textContent='';const email=$('login-email').value.trim(),password=$('login-password').value;const {error}=await st.sb.auth.signInWithPassword({email,password});if(error){$('login-error').textContent=error.message;return;}if(!await checkAdmin()){await st.sb.auth.signOut();$('login-error').textContent='Этот аккаунт не назначен организатором.';return;}$('login-dialog').close();$('login-password').value='';await refreshAuth();flash('Режим организатора включён');}
async function shareLink(){const url=new URL(location.href);if(st.selected)url.searchParams.set('t',st.selected.id);try{await navigator.clipboard.writeText(url.toString());flash('Ссылка скопирована!');}catch{flash('Скопируй ссылку из адресной строки браузера');}}
function events(){
  document.addEventListener('visibilitychange',()=>updateResultsRefresh(true));
  window.addEventListener('online',()=>updateResultsRefresh(true));
  window.addEventListener('offline',()=>updateResultsRefresh());
  window.addEventListener('focus',()=>updateResultsRefresh(true));
  window.addEventListener('pagehide',stopResultsRefresh);
  window.addEventListener('pageshow',()=>updateResultsRefresh(true));
  $('auth-button').onclick=async()=>{if(!st.sb){flash('Сначала подключи Supabase');return;}if(st.admin){await st.sb.auth.signOut();st.admin=false;showList();await refreshAuth();}else $('login-dialog').showModal();};
  $('login-form').addEventListener('submit',login);$('new-tournament').onclick=()=>openEditor();$('tournament-form').addEventListener('submit',saveEvent);
  $('detail-back').onclick=showList;$('detail-copy').onclick=shareLink;$('edit-tournament').onclick=()=>openEditor(st.selected);$('delete-tournament').onclick=deleteEvent;
  $('register-form').addEventListener('submit',register);$('add-player-form').addEventListener('submit',addPlayer);$('save-results').onclick=saveResults;
  $('admin-players').addEventListener('input',refreshLiveRanks);$('admin-players').addEventListener('change',refreshLiveRanks);
  $('t-youtube').addEventListener('input',updateYoutubeEditorPreview);
  document.querySelectorAll('[data-filter]').forEach(btn=>btn.onclick=()=>{st.filter=btn.dataset.filter;document.querySelectorAll('[data-filter]').forEach(el=>el.classList.toggle('selected',el===btn));renderEvents();});
  document.querySelectorAll('.dialog-close').forEach(btn=>btn.onclick=()=>btn.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close();}));
}
async function init(){events();if(!cfg.supabaseUrl||!cfg.supabaseAnonKey){$('connection').textContent='Настрой Supabase в config.js';return;}try{const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');st.sb=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);await refreshAuth();}catch(e){console.error(e);$('connection').textContent='Не удалось загрузить турниры';flash(e.message);}}
init();
