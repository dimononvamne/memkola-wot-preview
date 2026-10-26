import {CHALLENGE_TASKS,CHALLENGE_MAX_LIMIT,challengeLimit,challengeInitial,challengeVisible,challengeUnlocked,challengeStatus,challengeTier} from './challenges-model.js?v=1.45';

const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const streamView=new URLSearchParams(location.search).get('view')==='stream';
if(streamView) document.body.classList.add('stream-view');
const store={board:null,revision:-1,loaded:false,online:false,admin:false,busy:false,sb:null,polling:false,roleSequence:0};
const labels={easy:'Лёгкое',medium:'Среднее',hard:'Трудное',final:'Финал 3D'};
const battleWord=n=>n%10===1&&n%100!==11?'бой':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'боя':'боёв';
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
const LOCK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>';
const CROWN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 6 5 5 4-8 4 8 5-5-2 13H5L3 6ZM7 22h10"/></svg>';
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4300);}
function notice(message='',error=false){$('notice').hidden=!message;$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function canManage(){return store.admin&&!streamView;}
function readyToChange(){return canManage()&&store.loaded&&store.online&&!store.busy;}
function taskBody(task,disabled=false){
  const button=canManage();
  const tag=button?'button':'div';
  return `<${tag} class="card-body ${button&&!disabled?'can-select':''}" ${button?`type="button" data-select="${task.id}" aria-label="Выбрать задание ${task.id}: ${esc(task.title)}" aria-pressed="${store.board.selectedId===task.id}" ${disabled?'disabled':''}`:''}>
    <span class="card-top"><span class="card-number">${String(task.id).padStart(2,'0')}</span><span class="card-level">${labels[challengeTier(task.id)]}</span></span>
    <strong class="task-name">${esc(task.title)}</strong><span class="task-condition">${esc(task.text)}</span>
  </${tag}>`;
}
function renderCard(task){
  const done=store.board.completed.includes(task.id),active=store.board.selectedId===task.id;
  const ended=['won','exhausted'].includes(challengeStatus(store.board));
  const state=done?`${CHECK} Выполнено`:active?'<i class="activity-dot"></i> Выполняется':canManage()?'Выбрать задание':'Ожидает';
  return `<article class="mission ${challengeTier(task.id)} ${done?'is-done':''} ${active?'is-active':''}" data-task="${task.id}" aria-label="Задание ${task.id}${done?', выполнено':active?', выполняется':''}">
    ${taskBody(task,!readyToChange()||done||ended)}
    <div class="card-footer"><span class="card-state">${state}</span>${active&&canManage()?`<button class="complete-action" type="button" data-success="${task.id}" title="Задание выполнено · учесть один бой" aria-label="Засчитать задание ${task.id} и один бой" ${!readyToChange()?'disabled':''}>${CHECK}</button>`:''}</div>
  </article>`;
}
function renderBoss(){
  const board=store.board,task=board.tasks[9],unlocked=challengeUnlocked(board),done=board.completed.includes(10),active=board.selectedId===10;
  const n=board.completed.filter(id=>id<=9).length;
  const ended=['won','exhausted'].includes(challengeStatus(board));
  const text=done?'ФИНАЛ ПРОЙДЕН':active?'ВЫПОЛНЯЕТСЯ':unlocked?'ФИНАЛ ОТКРЫТ':`${n} / 9 ДЛЯ ОТКРЫТИЯ`;
  $('boss-slot').innerHTML=`<article class="boss-card ${!unlocked?'is-locked':''} ${done?'is-done':''} ${active?'is-active':''}" data-task="10" aria-label="Финальный босс${!unlocked?', закрыт до выполнения девяти заданий':done?', выполнен':''}">
    <div class="boss-icon">${done?CHECK:unlocked?CROWN:LOCK}</div>${taskBody(task,!readyToChange()||!unlocked||done||ended)}
    <div class="boss-side"><span class="boss-lock-label">${text}</span><div class="boss-progress" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i class="${board.completed.includes(i+1)?'done':''}"></i>`).join('')}</div>${active&&canManage()?`<button class="button success" type="button" data-success="10" ${!readyToChange()?'disabled':''}>✓ Босс побеждён</button>`:''}</div>
  </article>`;
}
function render(){
  const board=store.board;
  const isVisible=Boolean(store.loaded&&board&&(challengeVisible(board)||canManage()));
  document.body.classList.toggle('board-visible',isVisible);
  $('challenge-content').hidden=!isVisible;
  $('closed-message').hidden=!store.loaded||isVisible||streamView;
  $('loading-message').hidden=store.loaded||streamView;
  $('auth-button').disabled=!store.sb||store.busy;
  $('auth-button').textContent=canManage()?'Выйти':'Вход оператора';
  if(!isVisible) return;
  const status=challengeStatus(board),limit=challengeLimit(board),active=board.tasks.find(x=>x.id===board.selectedId);
  const ended=status==='won'||status==='exhausted';
  $('mission-grid').innerHTML=board.tasks.slice(0,9).map(renderCard).join('');renderBoss();
  $('battle-count').textContent=board.battles;
  $('battle-limit').textContent=`/ ${limit}`;
  $('subtitle-limit').textContent=`${limit} ${battleWord(limit)} на всё.`;
  $('remaining-count').textContent=`Осталось: ${Math.max(0,limit-board.battles)}`;
  $('reset-limit').textContent=`0 / ${limit}`;
  $('run-number').textContent=`ЗАХОД ${String(board.run).padStart(2,'0')}`;
  $('completed-count').innerHTML=`${board.completed.length} <small>/ 10</small>`;
  $('progress-fill').style.width=board.completed.length*10+'%';
  $('attempt-track').style.setProperty('--track-columns',Math.min(limit,25));
  $('attempt-track').innerHTML=Array.from({length:limit},(_,i)=>`<i class="${i<board.battles?'used':''} ${i<board.battles&&board.history[i]?.success?'success':''}"></i>`).join('');
  $('active-panel').className='active-panel panel'+(active?' has-active '+challengeTier(active.id):'');
  $('active-kicker').textContent=active?`СЕЙЧАС · ЗАДАНИЕ ${String(active.id).padStart(2,'0')}`:'ТЕКУЩЕЕ ЗАДАНИЕ';
  $('active-title').textContent=active?active.title:status==='won'?'Бинго! Все задания закрыты':status==='exhausted'?'Попытки закончились':canManage()?'Выбери задание':challengeUnlocked(board)?'Финальный босс открыт':'Ожидаем выбор оператора';
  $('active-description').textContent=active?active.text:ended?`Результат захода: ${board.completed.length} из 10 заданий за ${board.battles} боёв.`:canManage()?'Нажми на карточку перед следующим боем.':challengeUnlocked(board)?'Девять заданий позади. Впереди финальное испытание.':'Оператор выберет карточку перед следующим боем.';
  $('active-number').hidden=!active;$('active-number').textContent=`Предстоит бой ${board.battles+1} из ${limit}`;
  $('operator-actions').hidden=!canManage()||!active||ended;
  $('operator-panel').hidden=!canManage();
  $('publish-status').textContent=challengeVisible(board)?'● В ЭФИРЕ · видят все зрители':'○ ВЫКЛЮЧЕН · видит только оператор';
  $('publish-status').classList.toggle('is-live',challengeVisible(board));
  $('publish-toggle').textContent=challengeVisible(board)?'⏹ Скрыть челлендж от зрителей':'▶ Включить челлендж для зрителей';
  $('publish-toggle').classList.toggle('is-live',challengeVisible(board));
  $('publish-toggle').setAttribute('aria-pressed',String(challengeVisible(board)));
  $('publish-toggle').disabled=!readyToChange();
  for(const id of ['success-button','failure-button','clear-button','reset-button','confirm-reset']) $(id).disabled=!readyToChange();
  $('undo-button').disabled=!readyToChange()||!board.history.length;
  $('edit-button').disabled=!readyToChange();
  $('edit-limit-button').hidden=!canManage();
  $('edit-limit-button').disabled=!readyToChange();
  $('auth-button').disabled=!store.sb||store.busy;
  $('auth-button').textContent=canManage()?'Выйти':'Вход оператора';
  $('role-label').textContent=canManage()?'Пульт оператора':'Табло зрителя';$('role-label').classList.toggle('is-admin',canManage());
  $('history-panel').hidden=!board.history.length;
  $('battle-history').innerHTML=board.history.slice(-5).reverse().map(x=>`<li><b>Бой ${x.battle}</b><span>Задание ${String(x.taskId).padStart(2,'0')}</span><span class="${x.success?'passed':''}">${x.success?'✓ Выполнено':'Не выполнено'}</span></li>`).join('');
  $('result-banner').hidden=!ended;
  $('result-banner').classList.toggle('is-exhausted',status==='exhausted');
  $('result-banner').textContent=status==='won'?`БИНГО! Финальный босс побеждён. 10 / 10 за ${board.battles} боёв.`:`Лимит ${limit} ${battleWord(limit)} исчерпан. Результат: ${board.completed.length} / 10 заданий.`;
  $('sync-dot').className='sync-dot '+(store.online?'connected':store.loaded?'offline':'');
  $('sync-label').textContent=store.busy?'Сохраняем…':store.online?'Табло обновляется автоматически':store.loaded?'Нет связи · показан последний результат':'Ожидаем подключение';
}
function accept(snapshot){
  if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<store.revision)return;
  if(snapshot.visible===false&&!snapshot.board){
    store.board=null;store.revision=snapshot.revision;store.loaded=true;
    return;
  }
  const b=snapshot.board;
  if(!b||!Array.isArray(b.tasks)||b.tasks.length!==10||!Array.isArray(b.completed)||!Array.isArray(b.history)||!Number.isInteger(b.battles))throw Error('Не удалось прочитать табло.');
  store.board=b;store.revision=snapshot.revision;store.loaded=true;
}
async function jsonResponse(response){
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Сервис табло пока недоступен. Опубликуй обновление целиком вместе с _worker.js.');
  return await response.json();
}
async function refresh(force=false){
  if(store.polling||store.busy&&!force||document.hidden&&!force)return;
  const previousRevision=store.revision,wasOnline=store.online,hadBoard=Boolean(store.board);
  store.polling=true;
  try{
    const headers={};
    if(canManage())headers.Authorization='Bearer '+await accessToken();
    const response=await fetch('./api/challenges/state',{headers,cache:'no-store',signal:AbortSignal.timeout(10000)});
    const data=await jsonResponse(response);
    if(!response.ok)throw Error(data.error||'Не удалось загрузить табло.');
    accept(data);store.online=true;notice();
  }catch(error){store.online=false;notice(error.name==='TimeoutError'?'Нет ответа от табло. Повторяем подключение…':error.message||'Нет связи с табло. Повторяем подключение…',true);}
  finally{store.polling=false;if(store.revision!==previousRevision||store.online!==wasOnline||Boolean(store.board)!==hadBoard)render();}
}
async function accessToken(){
  if(!store.sb)throw Error('Сначала войди в аккаунт администратора.');
  const {data,error}=await store.sb.auth.getSession();
  if(error||!data.session?.access_token)throw Error('Сессия завершилась. Войди в аккаунт администратора.');
  return data.session.access_token;
}
async function syncRole(){
  const sequence=++store.roleSequence;
  if(streamView||!store.sb)return;
  let allowed=false;
  try{
    const {data}=await store.sb.auth.getSession();
    if(data.session?.access_token){
      const response=await fetch('./api/challenges/access',{headers:{Authorization:'Bearer '+data.session.access_token},cache:'no-store',signal:AbortSignal.timeout(10000)});
      const result=await jsonResponse(response);
      if(!response.ok)throw Error(result.error||'Не удалось проверить вход.');
      allowed=result.admin===true;
    }
  }catch(error){toast(error.message||'Не удалось проверить права оператора.');}
  if(sequence===store.roleSequence){const changed=store.admin!==allowed;store.admin=allowed;if(changed){render();await refresh(true);}}
  return allowed;
}
async function change(action){
  if(!readyToChange())return false;
  store.busy=true;render();
  try{
    const token=await accessToken();
    const response=await fetch('./api/challenges/state',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
      body:JSON.stringify({revision:store.revision,action}),signal:AbortSignal.timeout(15000)
    });
    const data=await jsonResponse(response);
    if(data.board)accept(data);
    if(!response.ok){if(response.status===403){store.admin=false;setTimeout(syncRole,0);}throw Error(data.error||'Изменение не сохранено.');}
    store.online=true;notice();
    return true;
  }catch(error){
    toast(error.message||'Не удалось подтвердить сохранение. Проверяем актуальное табло.');
    await refresh(true);
    return false;
  }finally{store.busy=false;render();}
}
async function finish(success){
  const id=store.board.selectedId;
  if(!id)return;
  if(await change({type:'finish',taskId:id,success}))toast(success?'Задание закрыто. Один бой учтён.':'Бой учтён. Задание осталось открытым.');
}
function editFields(tasks){
  $('edit-fields').innerHTML=tasks.map(task=>`<section class="edit-task ${challengeTier(task.id)}"><div class="edit-number">${String(task.id).padStart(2,'0')} · ${labels[challengeTier(task.id)]}</div><label>Название<input data-edit-title="${task.id}" maxlength="60" required value="${esc(task.title)}"></label><label>Условие<textarea data-edit-text="${task.id}" maxlength="250" required rows="3">${esc(task.text)}</textarea></label></section>`).join('');
}
function bind(){
  document.addEventListener('click',async event=>{
    const complete=event.target.closest('[data-success]');
    if(complete&&!complete.disabled){await finish(true);return;}
    const select=event.target.closest('[data-select]');
    if(select&&!select.disabled){const id=Number(select.dataset.select);if(store.board.selectedId!==id)await change({type:'select',taskId:id});return;}
    const close=event.target.closest('[data-close]');
    if(close)$(close.dataset.close).close();
  });
  $('publish-toggle').onclick=async()=>{
    const desired=!challengeVisible(store.board);
    if(await change({type:'set-visibility',visible:desired}))
      toast(desired?'Челлендж в эфире! Зрители видят табло.':'Челлендж скрыт. Зрители не видят табло.');
  };
  $('success-button').onclick=()=>finish(true);
  $('failure-button').onclick=()=>finish(false);
  $('clear-button').onclick=()=>change({type:'clear'});
  $('undo-button').onclick=async()=>{if(await change({type:'undo'}))toast('Последний результат отменён. Задание снова выбрано.');};
  $('reset-button').onclick=()=>$('reset-dialog').showModal();
  $('confirm-reset').onclick=async()=>{if(await change({type:'reset'})){$('reset-dialog').close();toast(`Новый заход начат. ${challengeLimit(store.board)} ${battleWord(challengeLimit(store.board))} впереди.`);}};
  $('edit-button').onclick=()=>{editFields(store.board.tasks);$('edit-battle-limit').min=Math.max(1,store.board.battles);$('edit-battle-limit').value=challengeLimit(store.board);$('edit-limit-hint').textContent=store.board.battles?`Уже проведено ${store.board.battles} боёв. Лимит не может быть меньше этого числа.`:'Можно указать от 1 до 200 боёв.';$('edit-error').textContent='';$('edit-dialog').showModal();};
  $('default-tasks').onclick=()=>editFields(CHALLENGE_TASKS);
  $('edit-form').onsubmit=async event=>{
    event.preventDefault();$('save-tasks').disabled=true;
    const tasks=CHALLENGE_TASKS.map(({id})=>({id,title:document.querySelector(`[data-edit-title="${id}"]`).value,text:document.querySelector(`[data-edit-text="${id}"]`).value}));
    const saved=await change({type:'edit',tasks,limit:Number($('edit-battle-limit').value)});
    if(saved){$('edit-dialog').close();toast('Условия сохранены для всех зрителей.');}else $('edit-error').textContent='Сохранение не подтверждено. Проверь подключение и повтори.';
    $('save-tasks').disabled=false;
  };
  $('edit-limit-button').onclick=()=>{
    $('limit-input').min=Math.max(1,store.board.battles);
    $('limit-input').value=challengeLimit(store.board);
    $('limit-hint').textContent=store.board.battles?`Уже проведено ${store.board.battles} боёв. Допустимый лимит: ${store.board.battles}–${CHALLENGE_MAX_LIMIT}.`:`Допустимый лимит: 1–${CHALLENGE_MAX_LIMIT}.`;
    $('limit-error').textContent='';$('limit-dialog').showModal();
  };
  $('limit-form').onsubmit=async event=>{
    event.preventDefault();$('save-limit').disabled=true;
    const saved=await change({type:'set-limit',limit:Number($('limit-input').value)});
    if(saved){$('limit-dialog').close();toast(`Лимит боёв изменён: ${challengeLimit(store.board)}.`);}else $('limit-error').textContent='Не удалось сохранить лимит. Проверь табло и попробуй ещё раз.';
    $('save-limit').disabled=false;
  };
  $('auth-button').onclick=async()=>{
    if(canManage()){await store.sb.auth.signOut();store.admin=false;render();toast('Выход выполнен.');}
    else{$('login-error').textContent='';$('login-dialog').showModal();}
  };
  $('login-form').onsubmit=async event=>{
    event.preventDefault();$('login-submit').disabled=true;$('login-error').textContent='';
    try{
      const {error}=await store.sb.auth.signInWithPassword({email:$('login-email').value.trim(),password:$('login-password').value});
      if(error)throw error;
      const allowed=await syncRole();
      if(!allowed)throw Error('Аккаунт не имеет прав администратора либо проверка прав недоступна.');
      $('login-password').value='';$('login-dialog').close();toast('Пульт оператора доступен.');
    }catch(error){$('login-error').textContent=error.message||'Не удалось войти.';}
    finally{$('login-submit').disabled=false;}
  };
  window.addEventListener('focus',()=>{refresh(true);if(!streamView)syncRole();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true);});
  window.addEventListener('online',()=>refresh(true));
}
async function initAuth(){
  if(streamView)return;
  const config=window.TANK_TIER_CONFIG||{};
  if(!config.supabaseUrl||!config.supabaseAnonKey)return;
  try{
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
    store.sb=createClient(config.supabaseUrl,config.supabaseAnonKey);
    store.sb.auth.onAuthStateChange(()=>setTimeout(syncRole,0));
    await syncRole();
  }catch(error){toast('Вход оператора пока недоступен. Обнови страницу, когда восстановится соединение.');}
  render();
}
bind();render();refresh(true);initAuth();
setInterval(()=>refresh(),2500);
