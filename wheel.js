/* MEMKOLA v15: top-up per lot, spin below wheel, explicit gallery-edit mode. */
'use strict';
const $=id=>document.getElementById(id);
const settings=window.TANK_TIER_CONFIG||{};
const store={sb:null,row:null,personal:null,mode:'public',admin:false,busy:false,spinning:false,editId:null,rotation:0,poll:null,images:[],imagesLoaded:false,galleryError:'',galleryBusy:false,galleryEdit:false,topupId:null};
const WHEEL_LOCAL_KEY='memkola-wheel-v14-personal';
const bucket='memkola-wheel-centers';
const MAX_LOT_AMOUNT=10000000;
const emptyPersonal=()=>({lots:[],duration_seconds:10,spin_count:0,winner_id:null,last_eliminated_id:null,hub_image_id:null,revision:0});
function loadPersonal(){try{const v=JSON.parse(localStorage.getItem(WHEEL_LOCAL_KEY)||'null');if(v && typeof v==='object' && Array.isArray(v.lots))return {...emptyPersonal(),...v,lots:normalizedLots(v).slice(0,50),duration_seconds:Math.max(5,Math.min(60,Number(v.duration_seconds)||10))};}catch{}return emptyPersonal();}
function keepPersonal(){try{localStorage.setItem(WHEEL_LOCAL_KEY,JSON.stringify(store.personal));return true;}catch{return false;}}
function personalMode(){return store.mode==='personal';}
function currentRow(){return personalMode()?store.personal:store.row;}
function canManage(){return personalMode()||store.admin;}
function pictureUrl(path){if(!store.sb||!path)return '';return store.sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;}

const columns=['#d89952','#4a8294','#806ca7','#5b9e80','#b67369','#5989ad','#b1a66a','#8d72ab','#608a83','#bf8353','#6694b0','#a07683'];
const formatRUB=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Number(n)||0)+' ₽';
const displayAmount=n=>personalMode()?new Intl.NumberFormat('ru-RU').format(Number(n)||0):formatRUB(n);
const formatPct=n=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:2}).format(n)+'%';
function toast(msg){const x=$('toast');x.textContent=msg;x.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove('show'),3800);}
function notice(text,kind=''){const x=$('notice');x.textContent=text;x.className='notice '+kind;}
function normalizedLots(row){return Array.isArray(row?.lots)?row.lots.filter(x=>x&&typeof x.id==='string'&&typeof x.tank==='string'&&Number.isFinite(Number(x.amount))&&Number(x.amount)>0).map(x=>({...x,amount:Number(x.amount),eliminated:!!x.eliminated})):[];}
function alive(lots){return lots.filter(x=>!x.eliminated).sort((a,b)=>b.amount-a.amount||a.tank.localeCompare(b.tank,'ru'));}
function percentChances(lots){const still=alive(lots),sum=still.reduce((s,x)=>s+x.amount,0);return new Map(still.map(l=>[l.id,sum?100*l.amount/sum:0]));}
// Mathematical elimination probabilities: q_i = (W - w_i) / ((n-1)*W).
// Induction gives P(last survivor = i) = w_i/W, for every positive wager set.
function eliminationShares(remaining){const n=remaining.length,W=remaining.reduce((s,x)=>s+x.amount,0);if(n===1)return [1];if(n<=0)return [];return remaining.map(x=>(W-x.amount)/((n-1)*W));}
function cryptoUnit(){if(!globalThis.crypto?.getRandomValues)throw Error('Защищённый генератор случайных чисел недоступен. Открой сайт через HTTPS.');const a=new Uint32Array(2);crypto.getRandomValues(a);return ((a[0]>>>5)*67108864+(a[1]>>>6))/9007199254740992;}
function chooseLoser(items){const probs=eliminationShares(items);let needle=cryptoUnit();for(let i=0;i<items.length;i++){needle-=probs[i];if(needle<0||i===items.length-1)return items[i];}return items.at(-1);}
function el(tag,attrs={},content){const x=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='class')x.className=v;else if(k==='text')x.textContent=v;else if(k==='value')x.value=v;else x.setAttribute(k,v);}if(content!==undefined)x.textContent=content;return x;}
function isLocked(){return Number(currentRow()?.spin_count||0)>0;}
function canEdit(){return canManage()&&!store.busy&&!store.spinning&&!isLocked();}
function buildWheel(items){const svg=$('wheel');svg.replaceChildren();$('wheel-empty').hidden=items.length>0;svg.parentElement.classList.toggle('has-lots',items.length>0);const ns='http://www.w3.org/2000/svg';if(!items.length)return [];
 const defs=document.createElementNS(ns,'defs');const stroke=document.createElementNS(ns,'filter');stroke.setAttribute('id','shadow');defs.appendChild(stroke);svg.appendChild(defs);
 if(items.length===1){const c=document.createElementNS(ns,'circle');c.setAttribute('cx','250');c.setAttribute('cy','250');c.setAttribute('r','225');c.setAttribute('fill','#ab8950');c.setAttribute('stroke','#ead19b');c.setAttribute('stroke-width','4');svg.appendChild(c);return[{id:items[0].id,mid:180}];}
 const shares=eliminationShares(items);let start=0;const seg=[];
 for(let i=0;i<items.length;i++){
   const a=items[i],angle=360*shares[i],end=start+angle;
   const xy=d=>({x:250+225*Math.sin(d*Math.PI/180),y:250-225*Math.cos(d*Math.PI/180)});
   const p1=xy(start),p2=xy(end);
   const path=document.createElementNS(ns,'path');path.setAttribute('d',`M 250 250 L ${p1.x.toFixed(5)} ${p1.y.toFixed(5)} A 225 225 0 ${angle>180?1:0} 1 ${p2.x.toFixed(5)} ${p2.y.toFixed(5)} Z`);path.setAttribute('fill',columns[i%columns.length]);path.setAttribute('stroke','#0f1e28');path.setAttribute('stroke-width','2');svg.appendChild(path);
   const mid=start+angle/2;
   if(angle>15){const xyLabel={x:250+170*Math.sin(mid*Math.PI/180),y:250-170*Math.cos(mid*Math.PI/180)};const text=document.createElementNS(ns,'text');text.setAttribute('x',String(xyLabel.x));text.setAttribute('y',String(xyLabel.y));text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','middle');text.setAttribute('font-size',items.length>16?'10':'13');const label=items.length>12?'№'+String(i+1):items[i].tank.length>11?items[i].tank.slice(0,10)+'…':items[i].tank;text.textContent=label;svg.appendChild(text);}
   seg.push({id:a.id,mid});start=end;
 }
 return seg;
}
function renderWheel(){const items=alive(normalizedLots(currentRow()));store.segments=buildWheel(items);$('wheel').style.transition='none';$('wheel').style.transform='rotate(0deg)';store.rotation=0;}
function drawList(){
 const list=$('lot-list');list.replaceChildren();let lots=normalizedLots(currentRow()),still=alive(lots),chances=percentChances(lots);
 $('count-badge').textContent=`${lots.length} / 50`;
 if(!lots.length){list.append(el('p',{class:'empty-list',text:personalMode()?'Танков пока нет. Добавь свои варианты выше.':'Танков пока нет. Ведущий ещё не добавил лоты.'}));return;}
 lots.sort((a,b)=>b.amount-a.amount||a.tank.localeCompare(b.tank,'ru'));
 for(let i=0;i<lots.length;i++){
  const l=lots[i],winner=currentRow()?.winner_id===l.id && still.length===1;
  const row=el('div',{class:'lot-row'+(l.eliminated?' eliminated':'')+(winner?' winner':'')});
  const main=el('div',{class:'lot-main'}),id=el('span',{class:'lot-index',text:'#'+(i+1)}),words=el('div');words.append(el('span',{class:'lot-title',text:(winner?'🏆 ':'')+l.tank}),el('span',{class:'lot-donor',text:l.donor?l.donor:'Заказчик не указан'}));main.append(id,words);
  const amount=el('span',{class:'lot-amount',text:displayAmount(l.amount)}),odds=el('span',{class:'lot-odds',text:l.eliminated?'0%':formatPct(chances.get(l.id)||0)}),actions=el('div',{class:'row-action'});
  if(canManage()&&!isLocked()){
   const plus=el('button',{type:'button',class:'topup-trigger',title:personalMode()?'Добавить вес к '+l.tank:'Докинуть донат на '+l.tank,'aria-label':'Добавить сумму к '+l.tank,text:'+'});plus.onclick=()=>toggleTopup(l);plus.disabled=store.busy||store.spinning;
   const edit=el('button',{type:'button',title:'Изменить лот','aria-label':'Изменить '+l.tank,text:'✎'});edit.onclick=()=>prepareEdit(l);edit.disabled=store.busy||store.spinning;
   const del=el('button',{type:'button',title:'Удалить лот','aria-label':'Удалить '+l.tank,text:'×'});del.onclick=()=>removeLot(l);del.disabled=store.busy||store.spinning;actions.append(plus,edit,del);
  }
  const bar=el('i',{class:'prob-bar'});bar.style.width=(chances.get(l.id)||0)+'%';row.append(main,amount,odds,actions,bar);
  if(store.topupId===l.id&&canEdit()){
   const editor=el('div',{class:'topup-editor'}),label=el('label',{class:'topup-label',text:personalMode()?'Добавить вес к «'+l.tank+'»':'Докинуть донат на «'+l.tank+'»'}),input=el('input',{type:'number',min:'1',max:String(Math.max(0,MAX_LOT_AMOUNT-l.amount)),step:'1',placeholder:'Сколько добавить?','aria-label':'Дополнительная сумма для '+l.tank}),total=el('span',{class:'topup-result'}),apply=el('button',{type:'button',class:'btn btn-gold topup-apply',text:'＋ Зачислить'}),cancel=el('button',{type:'button',class:'btn btn-line topup-cancel',text:'Отмена'});
   const update=()=>{const extra=Number(input.value),valid=input.value.trim()!==''&&Number.isSafeInteger(extra)&&extra>0&&l.amount+extra<=MAX_LOT_AMOUNT;total.textContent=valid?displayAmount(l.amount)+' + '+displayAmount(extra)+' = '+displayAmount(l.amount+extra):'Текущая сумма: '+displayAmount(l.amount);apply.disabled=!valid;};
   input.addEventListener('input',update);update();label.append(input);apply.onclick=()=>addToLot(l,input);cancel.onclick=()=>{store.topupId=null;drawList();};input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!apply.disabled)addToLot(l,input);}else if(e.key==='Escape'){store.topupId=null;drawList();}});
   editor.append(label,total,apply,cancel);row.append(editor);
  }
  list.append(row);
 }
}
function toggleTopup(l){
 if(!canEdit())return;
 store.topupId=store.topupId===l.id?null:l.id;drawList();
 if(store.topupId){const selected=[...$('lot-list').querySelectorAll('.topup-editor input')][0];if(selected)selected.focus();}
}
async function addToLot(l,input){
 if(!canEdit())return;
 const extra=Number(input.value),lots=normalizedLots(currentRow()),actual=lots.find(x=>x.id===l.id);
 if(!actual){toast('Этот лот больше не существует. Обнови список.');return;}
 if(input.value.trim()===''||!Number.isSafeInteger(extra)||extra<1||actual.amount+extra>MAX_LOT_AMOUNT){toast('Введи целое число больше 0. Общая сумма лота — до 10 000 000.');return;}
 const total=actual.amount+extra,updated=lots.map(x=>x.id===l.id?{...x,amount:total}:x);
 try{await save({lots:updated});store.topupId=null;drawList();toast((personalMode()?'Вес добавлен: ':'Донат зачислен: ')+actual.tank+' · +'+displayAmount(extra)+' · Итого '+displayAmount(total));}
 catch(err){toast('Не удалось добавить сумму: '+err.message);}
}

function render(){
 if(!currentRow()||store.spinning)return;
 const row=currentRow(),lots=normalizedLots(row),remain=alive(lots),won=remain.length===1&&Number(row.spin_count)>0;
 $('public-mode-btn').classList.toggle('is-selected',!personalMode());$('personal-mode-btn').classList.toggle('is-selected',personalMode());
 $('public-mode-btn').setAttribute('aria-pressed',String(!personalMode()));$('personal-mode-btn').setAttribute('aria-pressed',String(personalMode()));
 $('admin-panel').hidden=!canManage();$('auth-btn').textContent=store.admin?'Выйти':'Вход для организатора';
 $('editor-eyebrow').textContent=personalMode()?'ЛИЧНОЕ КОЛЕСО':'РЕЖИМ ОРГАНИЗАТОРА';
 $('editor-title').textContent=personalMode()?'Создай собственное колесо':'Управление лотами';
 $('editor-description').textContent=personalMode()?'Добавляй танки и указывай их вес. Список и результаты хранятся только в твоём браузере и не влияют на розыгрыш MEMKOLA.':'Введи танк, ник заказчика и сумму доната. Лоты сохраняются для всех зрителей.';
 $('editor-badge').textContent=personalMode()?'ЛИЧНО · БЕЗ РЕГИСТРАЦИИ':'ДОСТУП ВЛАДЕЛЬЦА ✓';
 $('amount-caption').textContent=personalMode()?'Вес шанса':'Донат, ₽';$('column-amount-caption').textContent=personalMode()?'ВЕС':'ДОНАТ';
 const galleryAdmin=store.admin&&!personalMode();
 $('gallery-editor-toggle').hidden=!galleryAdmin;
 $('gallery-editor-toggle').textContent=store.galleryEdit?'✓ Завершить редактирование':'✎ Редактировать картинки';
 $('gallery-editor-toggle').setAttribute('aria-pressed',String(store.galleryEdit));
 $('gallery-editor-toggle').disabled=store.galleryBusy||store.spinning;
 $('admin-gallery-upload').hidden=!(galleryAdmin&&store.galleryEdit);
 const lock=isLocked(),form=$('lot-form');if(lock)store.topupId=null;form.querySelectorAll('input,button').forEach(x=>x.disabled=lock||store.busy);$('reset-btn').disabled=store.busy||store.spinning;$('clear-btn').disabled=store.busy||store.spinning;
 $('duration-input').value=row.duration_seconds||10;$('duration-value').textContent=(row.duration_seconds||10)+' сек';$('duration-input').disabled=store.busy||store.spinning;
 $('spin-btn').hidden=!canManage()||won||remain.length<2;$('spin-btn').disabled=store.busy;
 let label='Ожидаем заказы';if(won)label='ФИНИШ · ПОБЕДИТЕЛЬ';else if(Number(row.spin_count)>0)label='РАУНД '+(Number(row.spin_count)+1);else if(remain.length)label=remain.length+' УЧАСТНИКОВ';$('round-status').textContent=label;$('round-status').className='round-badge'+(won?' finished':remain.length>0?' active':'');
 if(won){$('spin-announcement').textContent='🏆 ПОБЕДИТЕЛЬ — '+remain[0].tank+' · '+displayAmount(remain[0].amount);$('spin-announcement').className='spin-announcement win';}
 else if(row.last_eliminated_id){const out=lots.find(x=>x.id===row.last_eliminated_id);$('spin-announcement').textContent=out?'❌ Выбыл: '+out.tank+' · Осталось '+remain.length:'Следующее вращение';$('spin-announcement').className='spin-announcement eliminated';}
 else {$('spin-announcement').textContent=remain.length<2?'Добавь минимум два танка для запуска.':'Нажми «Крутить колесо», чтобы исключить один танк.';$('spin-announcement').className='spin-announcement';}
 $('hub-gallery').hidden=!canManage();
 $('gallery-hint').textContent=personalMode()?'Выбирай из готовых картинок MEMKOLA. Загружать свои нельзя.':store.galleryEdit?'Режим редактирования: можно загрузить новую картинку или удалить старую.':'Нажми на картинку, чтобы поставить её в центр колеса.';
 $('spin-caption').textContent=personalMode()?'Личное колесо остаётся на этом устройстве. Итоговые шансы пропорциональны весам лотов.':'Итоговые шансы пропорциональны донатам. Ведущий управляет общим колесом.';
 drawList();renderWheel();renderPicture();renderGallery();
}
function renderPicture(){
 const id=currentRow()?.hub_image_id,found=store.images.find(x=>x.id===id),hub=$('wheel-hub'),pic=$('hub-picture');
 if(found){pic.src=pictureUrl(found.path);pic.hidden=false;hub.classList.add('with-picture');}
 else{pic.removeAttribute('src');pic.hidden=true;hub.classList.remove('with-picture');}
 $('hub-default-word').hidden=!!found;$('hub-default-title').hidden=!!found;
}
function renderGallery(){
 const choices=$('image-choices');choices.replaceChildren();if(!canManage())return;
 const selected=currentRow()?.hub_image_id||null;
 const addChoice=(id,name,url)=>{
  const box=el('div',{class:'image-choice'+(selected===id?' selected':'')});
  const button=el('button',{type:'button',class:'image-choice-btn',title:'Выбрать: '+name});
  if(url){const img=el('img',{src:url,alt:name,loading:'lazy'});button.append(img);}else button.append(el('span',{class:'image-default',text:'MEM KOLA'}));
  button.append(el('span',{class:'choice-label',text:name}));button.disabled=store.spinning||store.galleryBusy;button.onclick=()=>selectPicture(id);
  box.append(button);
  if(store.admin && !personalMode() && store.galleryEdit && id){const del=el('button',{type:'button',class:'image-delete',title:'Удалить картинку из общего набора',text:'×'});del.onclick=()=>deletePicture(id);del.disabled=store.galleryBusy;box.append(del);}
  choices.append(box);
 };
 addChoice(null,'Стандартная',null);
 for(const img of store.images)addChoice(img.id,img.title,pictureUrl(img.path));
 $('gallery-error').textContent=store.galleryError||(!store.images.length?'Картинок пока нет. Ведущий сможет загрузить PNG, JPG или WebP в режиме организатора.':'');
}
async function refreshGallery(){if(!store.sb)return;try{
 const {data,error}=await store.sb.from('memkola_wheel_images').select('id,path,title').order('created_at',{ascending:false}).limit(100);
 if(error)throw error;store.images=data||[];store.imagesLoaded=true;store.galleryError='';if(!store.spinning){renderPicture();renderGallery();}
}catch(err){store.galleryError='Галерея пока не настроена: '+err.message;if(!store.spinning)renderGallery();}}
async function selectPicture(id){if(!canManage()||store.spinning||store.busy)return;
 if(id&&!store.images.some(x=>x.id===id))return toast('Картинка отсутствует в галерее');
 try{await save({hub_image_id:id});toast('Картинка центра обновлена');}catch(err){toast('Не удалось выбрать: '+err.message);}
}
async function uploadPicture(e){e.preventDefault();if(!store.admin||store.galleryBusy)return;
 const file=$('image-file').files?.[0];if(!file)return;
 const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
 if(!types[file.type]||file.size>3*1024*1024||file.size<1)return toast('Нужен PNG, JPG или WebP до 3 МБ');
 let name=$('image-name').value.trim()||file.name.replace(/\.[^.]*$/,'');name=name.slice(0,45);
 const path=crypto.randomUUID()+'.'+types[file.type];store.galleryBusy=true;$('upload-image-btn').disabled=true;
 try{
  const {error:uploadError}=await store.sb.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
  if(uploadError)throw uploadError;
  const {error:metaError}=await store.sb.from('memkola_wheel_images').insert({path,title:name});
  if(metaError){await store.sb.storage.from(bucket).remove([path]);throw metaError;}
  $('image-upload-form').reset();store.galleryEdit=false;await refreshGallery();render();toast('Картинка загружена! Выбери её из галереи.');
 }catch(err){toast('Ошибка загрузки: '+err.message);}finally{store.galleryBusy=false;$('upload-image-btn').disabled=false;render();}
}
async function deletePicture(id){if(!store.admin||personalMode()||!store.galleryEdit||store.galleryBusy)return;
 const picture=store.images.find(x=>x.id===id);if(!picture||!confirm('Удалить «'+picture.title+'» из доступных картинок у всех?'))return;
 store.galleryBusy=true;try{
  const {error}=await store.sb.from('memkola_wheel_images').delete().eq('id',id);if(error)throw error;
  const {error:storageError}=await store.sb.storage.from(bucket).remove([picture.path]);if(storageError)console.warn('Остался объект в Storage',storageError);
  await refreshGallery();if(currentRow()?.hub_image_id===id){store.row=await fetchRow();render();}
  toast('Картинка удалена');
 }catch(err){toast('Ошибка удаления: '+err.message);}finally{store.galleryBusy=false;render();}
}

async function fetchRow(){const {data,error}=await store.sb.from('memkola_wheel_state').select('*').eq('id',1).single();if(error)throw error;return data;}
async function save(patch){
 if(personalMode()){
  if(store.busy||store.spinning)throw Error('Дождись окончания вращения');
  store.personal={...store.personal,...patch,revision:Number(store.personal.revision||0)+1};
  if(!keepPersonal())toast('Внимание: браузер не разрешил сохранить личное колесо. После закрытия страницы оно может исчезнуть.');
  render();return store.personal;
 }
 if(!store.admin||store.busy||store.spinning)throw Error('Недостаточно прав или уже идёт действие.');store.busy=true;try{
 const before=store.row;const payload={...patch,revision:before.revision+1,updated_at:new Date().toISOString()};
 const {data,error}=await store.sb.from('memkola_wheel_state').update(payload).eq('id',1).eq('revision',before.revision).select('*').maybeSingle();
 if(error)throw error;if(!data){store.row=await fetchRow();render();throw Error('Кто-то обновил список. Данные перезагружены, повтори действие.');}
 store.row=data;return data;
}finally{store.busy=false;render();}}
function prepareEdit(l){if(!canEdit())return;store.topupId=null;store.editId=l.id;$('tank-input').value=l.tank;$('donor-input').value=l.donor||'';$('amount-input').value=l.amount;$('add-btn').textContent='✓ Сохранить изменения';$('tank-input').focus();window.scrollTo({top:0,behavior:'smooth'});}
function resetEdit(){store.topupId=null;$('lot-form').reset();if(personalMode())$('amount-input').value='1';store.editId=null;$('add-btn').textContent='＋ Добавить лот';}
async function submitLot(e){e.preventDefault();if(!canEdit())return;const tank=$('tank-input').value.trim(),donor=$('donor-input').value.trim(),amount=Number($('amount-input').value);if(tank.length<2||tank.length>70||!Number.isInteger(amount)||amount<=0||amount>10000000){toast(personalMode()?'Укажи танк и целый вес от 1 до 10 000 000':'Укажи танк и целый донат от 1 до 10 000 000 ₽');return;}
 let lots=normalizedLots(currentRow());
 if(store.editId){lots=lots.map(x=>x.id===store.editId?{...x,tank,donor,amount}:x);}else{if(lots.length>=50){toast('Максимум 50 лотов');return;}lots.push({id:crypto.randomUUID(),tank,donor,amount,eliminated:false});}
 try{await save({lots});resetEdit();toast('Лот сохранён. Шансы пересчитаны.');}catch(err){toast('Ошибка: '+err.message);}
}
async function removeLot(l){if(!canEdit()||!confirm('Удалить лот «'+l.tank+'»?'))return;try{await save({lots:normalizedLots(currentRow()).filter(x=>x.id!==l.id)});if(store.editId===l.id)resetEdit();toast('Лот удалён');}catch(err){toast(err.message);}}
async function resetRound(){if(!canManage()||store.busy||store.spinning)return;if(!confirm('Начать новый розыгрыш с теми же лотами? Все отметки выбывания исчезнут.'))return;
 try{const lots=normalizedLots(currentRow()).map(x=>({...x,eliminated:false}));await save({lots,spin_count:0,last_eliminated_id:null,winner_id:null});resetEdit();toast('Новый розыгрыш готов!');}catch(err){toast(err.message);}}
async function clearAll(){if(!canManage()||store.busy||store.spinning)return;if(!confirm('Удалить ВСЕ лоты из колеса? Это действие нельзя отменить.'))return;
 try{await save({lots:[],spin_count:0,last_eliminated_id:null,winner_id:null});resetEdit();toast('Список очищен');}catch(err){toast(err.message);}}
async function spin(){if(!canManage()||store.busy||store.spinning)return;try{
 // Get latest revision so two open admin tabs cannot spin on stale data.
 const isPersonal=personalMode();const fresh=isPersonal?structuredClone(store.personal):await fetchRow();if(isPersonal)store.personal=fresh;else store.row=fresh;render();const items=alive(normalizedLots(fresh));if(items.length<2)return;
 const target=chooseLoser(items),sector=store.segments?.find(x=>x.id===target.id);if(!sector)throw Error('Не удалось найти сектор колеса');
 const duration=Math.max(5,Math.min(60,Number(fresh.duration_seconds)||10));store.spinning=true;
 $('spin-btn').disabled=true;$('spin-btn').textContent='⏳ ВРАЩЕНИЕ...';$('round-status').textContent='КРУТИМ...';$('spin-announcement').textContent='🎲 Колесо выбирает выбывающий танк...';
 const turns=5+Math.floor(duration/6);const desired=360-sector.mid;const correction=((desired-(store.rotation%360))%360+360)%360;
 store.rotation+=360*turns+correction;
 const wheel=$('wheel');wheel.style.transition='none';wheel.getBoundingClientRect();wheel.style.transition=`transform ${duration}s cubic-bezier(.13,.76,.14,1)`;wheel.style.transform=`rotate(${store.rotation}deg)`;
 await new Promise(resolve=>setTimeout(resolve,duration*1000+80));
 // Save exactly one eliminated lot, with optimistic locking.
 const updated=normalizedLots(fresh).map(x=>x.id===target.id?{...x,eliminated:true}:x);
 const remains=alive(updated);const patch={lots:updated,spin_count:Number(fresh.spin_count)+1,last_eliminated_id:target.id,winner_id:remains.length===1?remains[0].id:null,revision:fresh.revision+1,updated_at:new Date().toISOString()};
 if(isPersonal){store.personal={...store.personal,...patch};if(!keepPersonal())toast('Не удалось сохранить личный результат на устройстве');toast(remains.length===1?'🏆 Победитель: '+remains[0].tank:'Выбыл: '+target.tank);}
 else{const {data,error}=await store.sb.from('memkola_wheel_state').update(patch).eq('id',1).eq('revision',fresh.revision).select('*').maybeSingle();if(error)throw error;if(!data){store.row=await fetchRow();toast('Колесо было изменено в другой вкладке. Показан текущий результат.');}else{store.row=data;toast(remains.length===1?'🏆 Победитель: '+remains[0].tank:'Выбыл: '+target.tank);}}
 }catch(err){toast('Ошибка вращения: '+err.message);if(!personalMode())try{store.row=await fetchRow();}catch{}}
 finally{store.spinning=false;$('spin-btn').textContent='▶ КРУТИТЬ КОЛЕСО';render();}
}
async function checkAdmin(){const {data:{user},error}=await store.sb.auth.getUser();if(error||!user)return false;const res=await store.sb.from('tier_admins').select('user_id').eq('user_id',user.id).maybeSingle();return !res.error&&!!res.data;}
async function authenticate(e){e.preventDefault();$('login-error').textContent='';const email=$('login-email').value.trim(),password=$('login-password').value;
 const {error}=await store.sb.auth.signInWithPassword({email,password});if(error){$('login-error').textContent=error.message;return;}
 if(!await checkAdmin()){await store.sb.auth.signOut();$('login-error').textContent='Этот аккаунт не назначен администратором.';return;}
 store.admin=true;$('login-dialog').close();$('login-password').value='';render();toast('Режим организатора активен');}
async function poll(){if(!store.sb||store.spinning||store.busy||document.hidden)return;try{const row=await fetchRow();if(!store.row||row.revision!==store.row.revision){store.row=row;if(!personalMode())render();}if(!store.galleryBusy)await refreshGallery();}catch(e){console.warn('Wheel refresh:',e);}}
function events(){
 $('lot-form').addEventListener('submit',submitLot);$('reset-btn').onclick=resetRound;$('clear-btn').onclick=clearAll;$('spin-btn').onclick=spin;
 $('duration-input').oninput=e=>$('duration-value').textContent=e.target.value+' сек';$('duration-input').onchange=async e=>{if(!canManage())return;try{await save({duration_seconds:Number(e.target.value)});toast('Длительность сохранена');}catch(err){toast(err.message);}};
 $('auth-btn').onclick=async()=>{if(!store.sb){toast('Сначала проверь подключение к Supabase');return;}if(store.admin){if(store.spinning)return;await store.sb.auth.signOut();store.admin=false;store.galleryEdit=false;resetEdit();render();toast('Выход выполнен');}else $('login-dialog').showModal();};
 $('close-login').onclick=()=>$('login-dialog').close();$('login-form').addEventListener('submit',authenticate);
 $('image-upload-form').addEventListener('submit',uploadPicture);
 $('public-mode-btn').onclick=()=>setMode('public');$('personal-mode-btn').onclick=()=>setMode('personal');
 $('toggle-gallery-btn').onclick=()=>{const choices=$('image-choices');choices.hidden=!choices.hidden;$('toggle-gallery-btn').textContent=choices.hidden?'Показать варианты':'Скрыть варианты';};
 $('gallery-editor-toggle').onclick=()=>{if(!store.admin||personalMode()||store.galleryBusy||store.spinning)return;store.galleryEdit=!store.galleryEdit;render();};
}
function setMode(mode){if(store.spinning||store.busy||store.galleryBusy)return;
 if(mode!=='personal'&&mode!=='public')return;store.mode=mode;store.galleryEdit=false;resetEdit();render();
 notice(personalMode()?'Твоё личное колесо не меняет розыгрыш ведущего. Лоты сохраняются только на этом устройстве.':store.admin?'Публичный розыгрыш MEMKOLA. Ты вошёл как организатор.':'Публичный розыгрыш MEMKOLA. Смотреть можно без входа.','ok');
}
async function init(){
 store.personal=loadPersonal();events();render();
 if(!settings.supabaseUrl||!settings.supabaseAnonKey){notice('Не найден config.js. Личное колесо доступно; публичное подключится после настройки Supabase.','bad');return;}
 try{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');store.sb=createClient(settings.supabaseUrl,settings.supabaseAnonKey);
  store.admin=await checkAdmin();store.row=await fetchRow();await refreshGallery();render();
  notice(store.admin?'Режим организатора: управляй общим колесом или создай личное.':'Публичное колесо доступно для просмотра. Свои варианты крути во вкладке «Моё колесо».','ok');
  store.poll=setInterval(poll,12000);
 }catch(e){notice('Публичное колесо не подключилось: '+e.message+'. Личное колесо при этом работает.','bad');}
}
init();
