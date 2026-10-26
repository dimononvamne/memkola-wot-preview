/* MEMKOLA wot — Tier List v6 + drag auto-scroll / fast rank choice. Public client; RLS enforces admin writes. */
const UNRANKED = 'POOL'; // Not assigned to a tier; stored in the existing entries JSON.
const TIERS = [
  { key: 'S', name: 'ИМБЫ', hint: 'Лучшие из лучших' },
  { key: 'A', name: 'СИЛЬНЫЕ', hint: 'Очень хороши' },
  { key: 'B', name: 'СРЕДНИЕ', hint: 'Крепкие середняки' },
  { key: 'C', name: 'СЛАБЫЕ', hint: 'Есть вопросы' },
  { key: 'D', name: 'ХУДШИЕ', hint: 'Нуждаются в апе' }
];
let BOARDS = [
  { id: 1, slug: 'all', icon: 'general', short: 'Общий', name: 'Общий рейтинг', subtitle: 'Все танки в одном тир-листе', description: 'Главный рейтинг техники без разделения по классам.' },
  { id: 2, slug: 'beginners', icon: 'beginners', short: 'Новичкам', name: 'Для новичков', subtitle: 'С чего лучше начать', description: 'Танки, с которых удобно учиться и развиваться. От самых дружелюбных до сложных.' },
  { id: 3, slug: 'pt', icon: 'pt', short: 'ПТ-САУ', name: 'ПТ-САУ', subtitle: 'Противотанковые самоходки', description: 'Лучшие и худшие ПТ-САУ: урон, маскировка, броня и комфорт стрельбы.' },
  { id: 4, slug: 'st', icon: 'st', short: 'СТ', name: 'Средние танки', subtitle: 'Средние танки', description: 'Мобильные и универсальные машины для активного боя.' },
  { id: 5, slug: 'tt', icon: 'tt', short: 'ТТ', name: 'Тяжёлые танки', subtitle: 'Тяжёлые танки', description: 'Броня, размены и лучшие тяжи для передовой.' },
  { id: 6, slug: 'lt', icon: 'lt', short: 'ЛТ', name: 'Лёгкие танки', subtitle: 'Лёгкие танки', description: 'Разведка, скорость и возможность влиять на бой.' },
  { id: 7, slug: 'research', icon: 'research', short: 'Прокачка', name: 'Прокачиваемые танки', subtitle: 'Рейтинг исследуемой техники', description: 'Какие прокачиваемые танки стоит исследовать и какие лучше пропустить.', requiredType: 'regular' },
  { id: 8, slug: 'premium', icon: 'premium', short: 'Премы', name: 'Премиум танки', subtitle: 'Рейтинг премиум техники', description: 'Самые сильные и слабые премиумные танки.', requiredType: 'premium' },
  { id: 9, slug: 'collector', icon: 'collector', short: 'Коллекционки', name: 'Коллекционные танки', subtitle: 'Рейтинг коллекционной техники', description: 'Лучшие и худшие коллекционные танки.', requiredType: 'collector' }
];
// Classes are catalog metadata only; ratings can still place the same tank anywhere.
const TANK_CLASSES = [
  { id: 'all', label: 'Все' },
  { id: 'lt', label: 'ЛТ' },
  { id: 'tt', label: 'ТТ' },
  { id: 'st', label: 'СТ' },
  { id: 'pt', label: 'ПТ' },
  { id: 'other', label: 'Без класса' }
];
const normalizeClass = value => ['lt', 'tt', 'st', 'pt'].includes(value) ? value : 'other';
// Independent from tank class (LT/TT/ST/PT). Unknown preserves old unclassified tanks.
const TANK_TYPES = [
  { id: 'all', label: 'Все типы' },
  { id: 'regular', label: 'Прокачиваемые' },
  { id: 'premium', label: 'Премиум' },
  { id: 'collector', label: 'Коллекционные' },
  { id: 'unknown', label: 'Не указан' }
];
const normalizeType = value => ['regular', 'premium', 'collector'].includes(value) ? value : 'unknown';
const typeLabel = value => ({regular:'Прокачка',premium:'Премиум',collector:'Коллекционный',unknown:'Тип не указан'})[normalizeType(value)];
const TANK_NATIONS = [
  {id:'all', label:'Все нации'},
  {id:'us', label:'США'},
  {id:'de', label:'Германия'},
  {id:'ussr', label:'СССР'},
  {id:'uk', label:'Британия'},
  {id:'jp', label:'Япония'},
  {id:'cn', label:'Китай'},
  {id:'fr', label:'Франция'},
  {id:'eu', label:'Европа'},
  {id:'hybrid', label:'Сборная'},
  {id:'unknown', label:'Не указана'}
];
const TANK_LEVELS = [{id:'all',label:'Все уровни'}, ...Array.from({length:11},(_,i)=>({id:String(11-i),label:String(11-i)})), {id:'0',label:'Не указан'}];
const nationCodes = new Set(TANK_NATIONS.map(v=>v.id));
const normalizeNation = value => nationCodes.has(value) && value!=='all' ? value : 'unknown';
const nationLabel = value => TANK_NATIONS.find(n=>n.id===normalizeNation(value))?.label || 'Не указана';
const normalizeLevel = value => Number.isInteger(Number(value)) && Number(value)>=1 && Number(value)<=11 ? Number(value) : 0;
const catalogMatches = (item, skip='') =>
  (skip==='class' || state.catalogFilter==='all' || normalizeClass(item.tank_class)===state.catalogFilter) &&
  (skip==='type' || state.typeFilter==='all' || normalizeType(item.vehicle_type)===state.typeFilter) &&
  (skip==='nation' || state.nationFilter==='all' || normalizeNation(item.nation)===state.nationFilter) &&
  (skip==='level' || state.levelFilter==='all' || normalizeLevel(item.tank_level)===Number(state.levelFilter));
function boardMismatch(tank){
  const board=activeBoard();
  if(board.requiredClass && normalizeClass(tank.tank_class)!==board.requiredClass)return `Для «${board.name}» нужен выбранный класс техники.`;
  if(board.requiredType && normalizeType(tank.vehicle_type)!==board.requiredType)return `Для «${board.name}» нужен выбранный тип техники.`;
  if(board.requiredNation && normalizeNation(tank.nation)!==board.requiredNation)return `Для «${board.name}» нужна нация: ${nationLabel(board.requiredNation)}.`;
  if(board.requiredLevel && normalizeLevel(tank.tank_level)!==board.requiredLevel)return `Для «${board.name}» нужен ${board.requiredLevel} уровень.`;
  return '';
}

const SAMPLE_NAMES = {
  1: [['ИС-7','S'],['Type 71','S'],['T110E5','A'],['Maus','A'],['Progetto 65','B'],['E 100','B'],['Leopard 1','C'],['FV215b 183','C'],['Grille 15','D']],
  2: [['ИС-7','S'],['E 100','A'],['Maus','B'],['Leopard 1','C']],
  3: [['FV215b 183','S'],['Grille 15','A'],['Jagdpanzer E 100','B'],['Ho-Ri 3','C']],
  4: [['Leopard 1','S'],['Progetto 65','A'],['STB-1','B'],['T-62A','C']],
  5: [['ИС-7','S'],['Type 71','A'],['Maus','B'],['E 100','C']],
  6: [['T-100 LT','S'],['Sheridan','A'],['WZ-132-1','B'],['Vickers Light','C']],
  7: [['ИС-7','S'],['E 100','B']],
  8: [['Löwe','A'],['T54E2','B']],
  9: [['T-22 med.','S'],['FV215b 183','C']]
};
const SAMPLE_BOARDS = Object.fromEntries(BOARDS.map(board => [board.id, {
  id: board.id, revision: 1, patch_name: 'Демо-версия',
  notes: 'Пример работы раздела, а не игровой рейтинг. После подключения базы владелец составит свой список.',
  updated_at: '2026-10-11T00:00:00Z',
  entries: SAMPLE_NAMES[board.id].map(([name,tier],i) => ({ id: `demo-${board.id}-${i}`, name, tier, image_path: '', vehicle_type: board.requiredType || 'unknown' }))
}]));
const EMPTY_BOARD = id => ({ id, revision: 1, patch_name: 'Первый рейтинг', notes: '', updated_at: null, entries: [] });

// True-transparent, individually cut metallic category icons and nation flags (v4.6).
const BOARD_ICONS = {
  general: './assets/tier-icons/general.png',
  beginners: './assets/tier-icons/beginners.png',
  pt: './assets/tier-icons/pt-v2.png',
  lt: './assets/tier-icons/lt.png',
  st: './assets/tier-icons/st.png',
  tt: './assets/tier-icons/tt.png',
  research: './assets/tier-icons/research.png',
  premium: './assets/tier-icons/premium.png',
  collector: './assets/tier-icons/collector.png'
};
const NATION_FLAG_ICONS = {
  us: './assets/nation-flags/us.png',
  de: './assets/nation-flags/de.png',
  ussr: './assets/nation-flags/ussr.png',
  uk: './assets/nation-flags/uk.png',
  jp: './assets/nation-flags/jp.png',
  cn: './assets/nation-flags/cn.png',
  fr: './assets/nation-flags/fr.png',
  eu: './assets/nation-flags/eu.png',
  hybrid: './assets/nation-flags/hybrid.png'
};
const isNationIconKey = key => Object.prototype.hasOwnProperty.call(NATION_FLAG_ICONS, key);
function imgMarkup(src, className, alt=''){
  return src ? `<img class="${className}" src="${src}" alt="${alt}" loading="lazy" decoding="async">` : '';
}
function boardIconMarkup(name){
  if (isNationIconKey(name)) return imgMarkup(NATION_FLAG_ICONS[name], 'board-icon-image board-icon-image--flag', name);
  return imgMarkup(BOARD_ICONS[name] || BOARD_ICONS.general, 'board-icon-image', name);
}
function nationFlagMarkup(name, alt=''){
  return imgMarkup(NATION_FLAG_ICONS[name] || '', 'nation-flag-image', alt);
}
const ICON = `<svg viewBox="0 0 160 100" fill="none" aria-hidden="true"><path d="M16 67l12-18 25-4 13-20 51-1 18 22 9 8-5 17H25z" fill="#83948b" stroke="#b5c0ac" stroke-width="2"/><path d="M53 47l16-26 41-5 15 10-7 21z" fill="#536c63" stroke="#adc2b5" stroke-width="2"/><path d="M110 25L155 15l2 7-43 17z" fill="#9aa89e" stroke="#c1d1be" stroke-width="1.5"/><rect x="20" y="65" width="121" height="26" rx="13" fill="#263d40" stroke="#a2b7a6" stroke-width="3"/><g fill="#698078" stroke="#a9bcac"><circle cx="38" cy="78" r="9"/><circle cx="67" cy="78" r="9"/><circle cx="97" cy="78" r="9"/><circle cx="125" cy="78" r="9"/></g></svg>`;
const $ = id => document.getElementById(id);
const copy = obj => JSON.parse(JSON.stringify(obj));
const makeId = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const x = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20)}`;
};
const config = window.TANK_TIER_CONFIG || {};
const configured = Boolean(config.supabaseUrl?.trim() && config.supabaseAnonKey?.trim());
const selectedSlug = new URLSearchParams(window.location.search).get('list');
const startingBoard = BOARDS.find(b => b.slug === selectedSlug)?.id || 1;
const state = {
  sb: null, admin: false, demo: !configured, activeBoard: startingBoard, catalog: [], catalogFilter: 'all', typeFilter: (BOARDS.find(b => b.id === startingBoard)?.requiredType || 'all'), nationFilter: 'all', levelFilter: 'all',
  publishedBoards: copy(SAMPLE_BOARDS), draftBoards: {}, dirtyBoards: new Set(),
  dragging: null, editingId: null, editingSource: null, removeExistingImage: false,
  toastTimer: null, refreshTimer: null
};
const activeBoard = () => BOARDS.find(b => b.id === state.activeBoard);
const published = () => state.publishedBoards[state.activeBoard] || EMPTY_BOARD(state.activeBoard);
const draft = () => state.draftBoards[state.activeBoard];
const isDirty = () => state.dirtyBoards.has(state.activeBoard);
const current = () => state.admin ? (draft() || published()) : published();
const entries = () => Array.isArray(current().entries) ? current().entries : [];
function selectBoard(id, {updateUrl=true}={}) {
  if(!BOARDS.some(b => b.id === id) || id === state.activeBoard) return;
  state.activeBoard=id;
  state.catalogFilter=activeBoard().requiredClass || 'all';
  state.typeFilter=activeBoard().requiredType || 'all';
  state.nationFilter=activeBoard().requiredNation || 'all';
  state.levelFilter=activeBoard().requiredLevel ? String(activeBoard().requiredLevel) : 'all';
  $('search').value='';
  if(updateUrl){const url=new URL(location.href);url.searchParams.set('list',activeBoard().slug);url.hash='';history.replaceState(null,'',url);}
  syncDraftControls();render();
}
function renderTabs(){
  const holder=$('board-tabs');holder.replaceChildren();
  for(const b of BOARDS){
    const button=document.createElement('button');button.type='button';
    button.className='board-tab'+(state.activeBoard===b.id?' active':'');
    button.setAttribute('role','tab');button.setAttribute('aria-selected',String(state.activeBoard===b.id));
    button.setAttribute('aria-controls','tier-board');
    button.title=b.subtitle;
    const symbol=document.createElement('span');symbol.className='board-icon';symbol.innerHTML=boardIconMarkup(b.icon);
    const label=document.createElement('span');label.textContent=b.short;
    button.append(symbol,label);
    if(state.admin && state.dirtyBoards.has(b.id)){
      const dot=document.createElement('span');dot.className='board-unsaved';dot.title='Неопубликованные изменения';button.append(dot);
    }
    button.addEventListener('click',()=>selectBoard(b.id));holder.append(button);
  }
}
function showToast(message){ const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>el.classList.remove('show'),3500); }
function showError(target, message){ const el=$(target); el.textContent=message; el.hidden=!message; }
function formatDate(value){ if(!value)return '—'; try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value));}catch{return '—';} }
function safeName(value){return String(value || '').trim().slice(0,70);}
function publicImage(path){if(!state.sb || !path) return '';return state.sb.storage.from('tank-images').getPublicUrl(path).data.publicUrl;}
function showDemo(message){
  state.demo=true;state.admin=false;state.draftBoards={};state.dirtyBoards.clear();
  state.publishedBoards=copy(SAMPLE_BOARDS);$('demo-banner').hidden=false;
  if(message){$('demo-banner').querySelector('div').textContent=message;}
  render();
}
// Load public list definitions from Supabase. Only verified tier_admins can modify them.
const CATEGORY_ICON_CHOICES = [
  ['general','Общий'], ['beginners','Новичкам'], ['pt','ПТ-САУ'], ['lt','ЛТ'], ['st','СТ'], ['tt','ТТ'],
  ['research','Прокачка'], ['premium','Премы'], ['collector','Коллекционки'],
  ['us','США'], ['de','Германия'], ['ussr','СССР'], ['uk','Британия'], ['jp','Япония'],
  ['cn','Китай'], ['fr','Франция'], ['eu','Европа'], ['hybrid','Сборная']
];
let categoryAction = 'create';
let categoryTableReady = false;
function categoryFromDb(row){
  return {
    id:Number(row.id), slug:row.slug, icon:row.icon_key, short:row.short_name,
    name:row.name, subtitle:row.name, description:row.description || '',
    requiredClass:row.class_filter==='all' ? undefined : row.class_filter,
    requiredType:row.type_filter==='all' ? undefined : row.type_filter,
    requiredNation:row.nation_filter==='all' ? undefined : normalizeNation(row.nation_filter),
    requiredLevel:Number(row.level_filter)||undefined
  };
}
async function loadCategories(){
  if(!state.sb)return false;
  const {data,error}=await state.sb.from('tier_categories')
    .select('id,slug,short_name,name,description,icon_key,class_filter,type_filter,nation_filter,level_filter,sort_order')
    .order('sort_order',{ascending:true}).order('id',{ascending:true});
  if(error){
    categoryTableReady=false;
    console.warn('Tier category SQL not yet installed:',error.message);
    return false;
  }
  if(!data?.length)return false;
  categoryTableReady=true;
  const oldId=state.activeBoard,oldSlug=BOARDS.find(b=>b.id===oldId)?.slug;
  BOARDS=data.map(categoryFromDb);
  if(!BOARDS.some(b=>b.id===oldId)){
    state.activeBoard=BOARDS.find(b=>b.slug===oldSlug)?.id || BOARDS[0].id;
  }
  const b=activeBoard();
  state.catalogFilter=b.requiredClass||'all';
  state.typeFilter=b.requiredType||'all';
  state.nationFilter=b.requiredNation||'all';
  state.levelFilter=b.requiredLevel?String(b.requiredLevel):'all';
  return true;
}
function syncCategoryManager(){
  const panel=$('tier-category-admin');
  if(panel)panel.hidden=!state.admin;
}
function openCategoryModal(mode='create'){
  if(!state.admin)return;
  if(!categoryTableReady){showToast('Сначала выполни SQL обновления для конструктора в Supabase.');return;}
  categoryAction=mode;
  const b=mode==='edit'?activeBoard():null;
  $('tier-cat-title').textContent=b?'Редактировать тир-лист':'Создать тир-лист';
  $('tier-cat-name').value=b?.name||'';
  $('tier-cat-short').value=b?.short||'';
  $('tier-cat-description').value=b?.description||'';
  $('tier-cat-class').value=b?.requiredClass||'all';
  $('tier-cat-type').value=b?.requiredType||'all';
  $('tier-cat-nation').value=b?.requiredNation||'all';
  $('tier-cat-level').value=b?.requiredLevel?String(b.requiredLevel):'all';
  $('tier-cat-error').hidden=true;
  $('tier-cat-error').textContent='';
  renderCategoryIcons(b?.icon||'general');
  $('tier-cat-dialog').showModal();
}
function renderCategoryIcons(chosen){
  const grid=$('tier-cat-icons'); grid.replaceChildren();
  for(const [icon,label] of CATEGORY_ICON_CHOICES){
    const option=document.createElement('label');
    option.className='tier-cat-icon-option'+(chosen===icon?' selected':'');
    const input=document.createElement('input'); input.type='radio';input.name='tier-category-icon';input.value=icon;input.checked=chosen===icon;
    const art=document.createElement('span');art.className='tier-cat-icon-art';art.innerHTML=boardIconMarkup(icon);
    const caption=document.createElement('span');caption.textContent=label;
    option.append(input,art,caption);
    input.addEventListener('change',()=>grid.querySelectorAll('.tier-cat-icon-option').forEach(x=>x.classList.toggle('selected',x.querySelector('input').checked)));
    grid.append(option);
  }
}
function categoryError(message){$('tier-cat-error').textContent=message;$('tier-cat-error').hidden=false;}
async function submitCategory(ev){
  ev.preventDefault();
  if(!state.admin || !state.sb)return;
  if(!categoryTableReady){categoryError('Сначала выполни UPGRADE-TIER-NATION-LEVEL-v4.sql в Supabase.');return;}
  const name=$('tier-cat-name').value.trim(), short=$('tier-cat-short').value.trim()||name;
  // IMPORTANT: $() is getElementById, NOT querySelector. Select within the icon group.
  const selected=$('tier-cat-icons').querySelector('input[name="tier-category-icon"]:checked');
  if(!name){categoryError('Укажи название тир-листа.');return;}
  if(!selected){categoryError('Выбери иконку тир-листа.');return;}
  const payload={name:name.slice(0,80),short_name:short.slice(0,40),description:$('tier-cat-description').value.trim().slice(0,260),
    icon_key:selected.value,class_filter:$('tier-cat-class').value,type_filter:$('tier-cat-type').value,
    nation_filter:$('tier-cat-nation').value,level_filter:$('tier-cat-level').value==='all'?0:Number($('tier-cat-level').value)};
  const button=$('tier-cat-save');button.disabled=true;button.textContent='Сохраняю…';
  try{
    let savedId=null;
    const wasCreate=categoryAction==='create';
    if(wasCreate){
      const slug=`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
      const {data,error}=await state.sb.rpc('create_custom_tier_list_v4',{
        p_slug:slug,p_short:payload.short_name,p_name:payload.name,p_description:payload.description,
        p_icon:payload.icon_key,p_class:payload.class_filter,p_type:payload.type_filter,
        p_nation:payload.nation_filter,p_level:payload.level_filter});
      if(error)throw error;
      savedId=Number(data);
      if(!Number.isFinite(savedId)||savedId<=0)throw Error('Сервер не вернул ID созданного тир-листа.');
    }else{
      const {data,error}=await state.sb.from('tier_categories')
        .update(payload).eq('id',state.activeBoard)
        .select('id,icon_key').maybeSingle();
      if(error)throw error;
      if(!data)throw Error('База не подтвердила изменение. Возможно, недостаточно прав на UPDATE (RLS).');
      savedId=Number(data.id);
      if(data.icon_key!==payload.icon_key)throw Error(`Иконка не сохранилась. База вернула «${data.icon_key}» вместо «${payload.icon_key}».`);
    }
    // Read the actual persisted row: a request with no error is NOT proof that UPDATE changed it.
    const {data:persisted,error:verifyError}=await state.sb.from('tier_categories')
      .select('id,icon_key,name,short_name').eq('id',savedId).maybeSingle();
    if(verifyError)throw verifyError;
    if(!persisted)throw Error('Не удалось прочитать сохранённую категорию. Проверь права доступа к базе.');
    if(persisted.icon_key!==payload.icon_key){
      throw Error(`Выбран значок «${payload.icon_key}», но в базе остался «${persisted.icon_key}».`);
    }
    if(!await loadCategories())throw Error('Не удалось перечитать список разделов из базы.');
    const updated=BOARDS.find(b=>b.id===savedId);
    if(!updated||updated.icon!==payload.icon_key)throw Error('После обновления категорий иконка не совпадает с выбранной.');
    if(wasCreate)state.activeBoard=savedId;
    await loadSnapshot({silent:true});
    $('tier-cat-dialog').close();
    render();
    showToast(wasCreate?'Тир-лист создан и доступен всем гостям!':'Изменения тир-листа сохранены и опубликованы!');
  }catch(err){categoryError(`Не удалось сохранить: ${err.message||String(err)}`);}
  finally{button.disabled=false;button.textContent='Сохранить';}
}
async function deleteCategory(){
  if(!state.admin||!state.sb)return;
  if(!categoryTableReady){showToast('Нужно установить SQL обновления конструктора.');return;}
  if(BOARDS.length<=1){showToast('Нельзя удалить последний тир-лист.');return;}
  const b=activeBoard();
  if(!confirm(`Удалить тир-лист «${b.name}» со всеми опубликованными позициями? Это нельзя отменить.`))return;
  try{
    const {error}=await state.sb.rpc('delete_custom_tier_list',{p_id:b.id});if(error)throw error;
    state.dirtyBoards.delete(b.id);delete state.draftBoards[b.id];delete state.publishedBoards[b.id];
    await loadCategories();await loadSnapshot({silent:true});
    render();showToast('Тир-лист удалён. Другие разделы сохранены.');
  }catch(err){showToast(`Ошибка удаления: ${err.message||String(err)}`);}
}
async function moveCategory(direction){
  if(!state.admin||!state.sb||!categoryTableReady)return;
  const pos=BOARDS.findIndex(b=>b.id===state.activeBoard);
  const next=pos+direction;
  if(next<0||next>=BOARDS.length)return;
  try{
    const {error}=await state.sb.rpc('swap_tier_category_order',{p_a:BOARDS[pos].id,p_b:BOARDS[next].id});
    if(error)throw error;
    await loadCategories();render();
  }catch(err){showToast('Не удалось изменить порядок: '+(err.message||String(err)));}
}
function render(){
  const list=entries(), model=current(), board=activeBoard();
  $('total-tanks').textContent=list.filter(item => TIERS.some(t => t.key === item.tier)).length;
  $('patch-top').textContent=model.patch_name||'Не указан';
  $('updated-top').textContent=state.demo?'Пример':formatDate(model.updated_at);
  $('update-notes').textContent=model.notes||'';
  $('update-notes').hidden=!model.notes;
  $('editor-panel').hidden=!state.admin;
  syncCategoryManager();
  $('login-btn').hidden=state.admin;
  $('logout-btn').hidden=!state.admin;
  $('copyright-year').textContent=new Date().getFullYear();
  $('publish-btn').disabled=!isDirty();
  $('discard-btn').disabled=!isDirty();
  $('unsaved-indicator').hidden=!isDirty();
  $('editor-active-name').textContent=board.name;
  $('pending-count').textContent=state.admin && state.dirtyBoards.size ? `Черновики: ${state.dirtyBoards.size}` : '';
  $('ranking-title').textContent=board.name;
  $('ranking-description').textContent=board.description;
  renderTabs();renderBoard();
}
// This private catalog is shown only to signed-in administrators.
// Filters affect the catalog, never the separately published S–D tiers.
function renderCatalogFilters(){
  // Four independent filters; chip counters account for the other three.
  const classHolder=$('catalog-filters');
  const typeHolder=$('catalog-type-filters');
  const nationHolder=$('catalog-nation-filters');
  const levelHolder=$('catalog-level-filters');
  classHolder.replaceChildren();typeHolder.replaceChildren();nationHolder.replaceChildren();levelHolder.replaceChildren();
  for(const kind of TANK_CLASSES){
    const number=state.catalog.filter(item =>
      catalogMatches(item,'class') && (kind.id==='all'||normalizeClass(item.tank_class)===kind.id)).length;
    const button=document.createElement('button');button.type='button';
    button.className='catalog-filter'+(state.catalogFilter===kind.id?' active':'');
    button.dataset.class=kind.id;
    button.setAttribute('aria-pressed',String(state.catalogFilter===kind.id));
    const caption=document.createElement('span');caption.textContent=kind.label;
    const count=document.createElement('span');count.className='catalog-filter-count';count.textContent=String(number);
    button.append(caption,count);
    button.addEventListener('click',()=>{state.catalogFilter=kind.id;renderBoard();});
    classHolder.append(button);
  }
  for(const kind of TANK_TYPES){
    const number=state.catalog.filter(item =>
      catalogMatches(item,'type') && (kind.id==='all'||normalizeType(item.vehicle_type)===kind.id)).length;
    const button=document.createElement('button');button.type='button';
    button.className='catalog-filter catalog-type-filter'+(state.typeFilter===kind.id?' active':'');
    button.dataset.vehicleType=kind.id;
    button.setAttribute('aria-pressed',String(state.typeFilter===kind.id));
    const caption=document.createElement('span');caption.textContent=kind.label;
    const count=document.createElement('span');count.className='catalog-filter-count';count.textContent=String(number);
    button.append(caption,count);
    button.addEventListener('click',()=>{state.typeFilter=kind.id;renderBoard();});
    typeHolder.append(button);
  }
  // Same button chips, counters and selection highlight as class/type filters.
  for(const kind of TANK_NATIONS){
    const number=state.catalog.filter(item =>
      catalogMatches(item,'nation') && (kind.id==='all'||normalizeNation(item.nation)===kind.id)).length;
    const button=document.createElement('button');button.type='button';
    button.className='catalog-filter catalog-nation-filter'+(state.nationFilter===kind.id?' active':'');
    button.dataset.nation=kind.id;
    button.setAttribute('aria-pressed',String(state.nationFilter===kind.id));
    if(NATION_FLAG_ICONS[kind.id]){
      const art=document.createElement('span');
      art.className='nation-filter-art';
      art.innerHTML=nationFlagMarkup(kind.id, kind.label);
      button.append(art);
    }
    const caption=document.createElement('span');caption.className='nation-filter-label';caption.textContent=kind.label;
    const count=document.createElement('span');count.className='catalog-filter-count';count.textContent=String(number);
    button.append(caption,count);
    button.addEventListener('click',()=>{state.nationFilter=kind.id;renderBoard();});
    nationHolder.append(button);
  }
  for(const kind of TANK_LEVELS){
    const number=state.catalog.filter(item =>
      catalogMatches(item,'level') && (kind.id==='all'||normalizeLevel(item.tank_level)===Number(kind.id))).length;
    const button=document.createElement('button');button.type='button';
    button.className='catalog-filter'+(state.levelFilter===kind.id?' active':'');
    button.dataset.level=kind.id;
    button.setAttribute('aria-pressed',String(state.levelFilter===kind.id));
    const caption=document.createElement('span');caption.textContent=kind.label;
    const count=document.createElement('span');count.className='catalog-filter-count';count.textContent=String(number);
    button.append(caption,count);
    button.addEventListener('click',()=>{state.levelFilter=kind.id;renderBoard();});
    levelHolder.append(button);
  }
}
function renderPool(search){
  const pool=$('tank-pool'),holder=$('tank-pool-items');
  // Preserve the internal scroll position after editing/moving tanks, but
  // start at the top when the rating, search or filter selection changes.
  const scrollKey=[state.activeBoard,state.catalogFilter,state.typeFilter,state.nationFilter,state.levelFilter,search].join('|');
  const savedScroll=holder.dataset.scrollKey===scrollKey ? holder.scrollTop : 0;
  pool.hidden=!state.admin;
  holder.replaceChildren();
  if(!state.admin)return 0;
  const tanks=state.catalog;
  renderCatalogFilters();
  const filtered=tanks.filter(item=>catalogMatches(item));
  const visible=filtered.filter(item=>String(item.name).toLocaleLowerCase('ru').includes(search));
  $('pool-count').textContent=`${filtered.length} ${plural(filtered.length)}`;
  if(!visible.length){
    const empty=document.createElement('p');empty.className='pool-empty';
    empty.textContent=search?'По этому запросу танков нет':'Нет танков с выбранными фильтрами. Измени класс, тип, нацию или уровень либо добавь новую карточку.';
    holder.append(empty);
  }
  for(const item of visible)holder.append(createCard(item,'catalog'));
  holder.dataset.scrollKey=scrollKey;
  holder.scrollTop=savedScroll;
  makeDropZone(pool,UNRANKED);
  return visible.length;
}
// Auto-scroll either the fixed-height catalog or the page while dragging a tank.
// Inner scroller has priority when the cursor is inside it; near the viewport
// edges the existing page auto-scroll remains available for reaching S–D rows.
const dragScroll={pointerX:null,pointerY:null,animation:0};
function dragScrollFrame(){
  if(!state.dragging){dragScroll.animation=0;dragScroll.pointerX=null;dragScroll.pointerY=null;return;}
  const y=dragScroll.pointerY, x=dragScroll.pointerX;
  if(y!==null){
    let innerMoved=false;
    const list=$('tank-pool-items');
    if(list && !list.closest('[hidden]') && x!==null){
      const r=list.getBoundingClientRect();
      if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom){
        const edge=Math.min(100,Math.max(40,r.height*0.22));
        let innerSpeed=0;
        if(y>r.bottom-edge)innerSpeed=4+19*Math.pow((y-(r.bottom-edge))/edge,1.4);
        else if(y<r.top+edge)innerSpeed=-(4+19*Math.pow((r.top+edge-y)/edge,1.4));
        if(innerSpeed){
          const before=list.scrollTop;
          list.scrollTop+=innerSpeed;
          innerMoved=Math.abs(list.scrollTop-before)>0.25;
        }
      }
    }
    if(!innerMoved){
      const height=window.innerHeight;
      const edge=Math.min(160,Math.max(65,height*0.24));
      let speed=0;
      if(y>height-edge)speed=5+31*Math.pow((y-(height-edge))/edge,1.5);
      else if(y<edge)speed=-(5+31*Math.pow((edge-y)/edge,1.5));
      if(speed)window.scrollBy(0,speed);
    }
  }
  dragScroll.animation=requestAnimationFrame(dragScrollFrame);
}
function trackDragScroll(event){
  if(!state.dragging)return;
  if(Number.isFinite(event.clientY) && event.clientY>=0 && event.clientY<=window.innerHeight){
    dragScroll.pointerY=event.clientY;
    dragScroll.pointerX=Number.isFinite(event.clientX) ? event.clientX : null;
  }
  if(!dragScroll.animation)dragScroll.animation=requestAnimationFrame(dragScrollFrame);
}
function stopDragScroll(){
  dragScroll.pointerX=null;
  dragScroll.pointerY=null;
  if(dragScroll.animation)cancelAnimationFrame(dragScroll.animation);
  dragScroll.animation=0;
}

// The alternative to dragging: click a catalog card and choose S–D.
// It uses the same placeTank function and never changes tank metadata or the catalog.
function openTierPicker(tankId){
  if(!state.admin)return;
  const tank=state.catalog.find(item=>item.id===tankId);
  if(!tank)return;
  const mismatch=boardMismatch(tank);
  if(mismatch){showToast(mismatch);return;}
  let modal=document.getElementById('fast-tier-picker');
  if(!modal){
    modal=document.createElement('dialog');modal.id='fast-tier-picker';modal.className='modal fast-tier-picker';
    const content=document.createElement('div');content.className='modal-content';
    const top=document.createElement('div');top.className='modal-top';
    const left=document.createElement('div');
    const above=document.createElement('span');above.className='modal-overline';above.textContent='БЫСТРОЕ РАЗМЕЩЕНИЕ';
    const title=document.createElement('h2');title.id='fast-tier-tank-name';
    left.append(above,title);
    const close=document.createElement('button');close.type='button';close.className='icon-btn';close.setAttribute('aria-label','Закрыть');close.textContent='×';close.addEventListener('click',()=>modal.close());
    top.append(left,close);
    const description=document.createElement('p');description.className='modal-description';
    description.id='fast-tier-description';
    const options=document.createElement('div');options.className='fast-tier-options';options.id='fast-tier-options';
    const help=document.createElement('p');help.className='modal-description';help.textContent='Танк останется в общем каталоге. В конце нажми «Опубликовать».';
    content.append(top,description,options,help);modal.append(content);
    modal.addEventListener('click',event=>{if(event.target===modal)modal.close();});
    document.body.append(modal);
    const style=document.createElement('style');style.id='fast-tier-styles';style.textContent=`
      .fast-tier-picker{width:min(505px,calc(100% - 24px))}
      .fast-tier-picker .fast-tier-options{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
      .fast-tier-picker .fast-tier-choice{min-width:0;min-height:80px;border:1px solid #475665;border-radius:9px;background:#1b2630;color:#e8e4dd;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;font-family:inherit;cursor:pointer;padding:9px 3px}
      .fast-tier-picker .fast-tier-choice:hover,.fast-tier-picker .fast-tier-choice:focus-visible{border-color:#e6b567;background:#3a3027;outline-offset:2px}
      .fast-tier-picker .fast-tier-letter{font-family:Oxanium,Manrope,Arial,sans-serif;font-size:30px;font-weight:800;line-height:1;color:var(--fast-color,#e6b567)}
      .fast-tier-picker .fast-tier-caption{font-size:9px;font-weight:800;letter-spacing:.2px}
      .fast-tier-picker .fast-tier-choice.is-current{border-color:var(--fast-color,#e6b567);box-shadow:inset 0 0 0 1px var(--fast-color,#e6b567)}
      .fast-tier-picker .fast-tier-choice.is-current:after{content:'✓';position:absolute;margin-left:54px;margin-top:-53px;font-size:11px;color:#c5e9cb}
      @media(max-width:420px){.fast-tier-picker .modal-content{padding:15px}.fast-tier-picker .fast-tier-options{gap:5px}.fast-tier-picker .fast-tier-choice{min-height:69px;padding:6px 2px}.fast-tier-picker .fast-tier-letter{font-size:25px}.fast-tier-picker .fast-tier-caption{font-size:8px}}
    `;document.head.append(style);
  }
  document.getElementById('fast-tier-tank-name').textContent=tank.name;
  document.getElementById('fast-tier-description').textContent=`Добавить в «${activeBoard().name}». Выбери тир:`;
  const choices=document.getElementById('fast-tier-options');choices.replaceChildren();
  const placed=draft()?.entries.find(item=>item.catalog_id===tank.id);
  const colors={S:'#ffbd7f',A:'#f1d079',B:'#8dcd9c',C:'#8fb5ed',D:'#e891a3'};
  for(const tier of TIERS){
    const button=document.createElement('button');button.type='button';
    button.className='fast-tier-choice'+(placed?.tier===tier.key?' is-current':'');
    button.style.setProperty('--fast-color',colors[tier.key]);
    const letter=document.createElement('span');letter.className='fast-tier-letter';letter.textContent=tier.key;
    const caption=document.createElement('span');caption.className='fast-tier-caption';caption.textContent=tier.name;
    button.append(letter,caption);
    button.addEventListener('click',()=>{
      const fromCatalog={source:'catalog',id:tank.id};
      placeTank(fromCatalog,tier.key);
      modal.close();
      showToast(`${tank.name} → ${tier.key} («${activeBoard().name}»). Не забудь опубликовать.`);
    });
    choices.append(button);
  }
  modal.showModal();
}

function makeDropZone(row,tier){
  if(!state.admin || row.dataset.dropBound===tier)return;
  row.dataset.dropBound=tier;
  row.addEventListener('dragover',ev=>{
    if(!state.dragging)return;
    ev.preventDefault();ev.dataTransfer.dropEffect=state.dragging.source==='catalog'&&tier!==UNRANKED?'copy':'move';
    row.classList.add('drag-over');
  });
  row.addEventListener('dragleave',ev=>{if(!row.contains(ev.relatedTarget))row.classList.remove('drag-over');});
  row.addEventListener('drop',ev=>{
    ev.preventDefault();ev.stopPropagation();row.classList.remove('drag-over');
    if(!state.dragging)return;
    const card=ev.target.closest('.tank-card');
    placeTank(state.dragging,tier,card?.dataset.source==='board'?card.dataset.tankId:null);
    state.dragging=null;
  });
}
function renderBoard(){
  const board=$('tier-board');board.replaceChildren();
  const search=$('search').value.trim().toLocaleLowerCase('ru');
  let found=renderPool(search);
  for(const tier of TIERS){
    const tierEntries=entries().filter(item=>item.tier===tier.key);
    const visible=tierEntries.filter(item=>String(item.name).toLocaleLowerCase('ru').includes(search));
    found+=visible.length;
    const row=document.createElement('section');row.className='tier-row';row.dataset.tier=tier.key;
    const label=document.createElement('div');label.className='tier-label';
    const letter=document.createElement('span');letter.className='tier-letter';letter.textContent=tier.key;
    const textWrap=document.createElement('div');textWrap.className='tier-label-copy';
    const name=document.createElement('strong');name.textContent=tier.name;
    const hint=document.createElement('span');hint.textContent=tier.hint;
    const count=document.createElement('span');count.className='tier-count';count.textContent=`${tierEntries.length} ${plural(tierEntries.length)}`;
    textWrap.append(name,hint);label.append(letter,textWrap,count);
    const content=document.createElement('div');content.className='tier-content';
    if(!visible.length){const empty=document.createElement('span');empty.className='empty-tier';empty.textContent=search?'Нет совпадений':(state.admin?'Перетащи сюда танк из общей кучи':'Пока пусто');content.append(empty);}
    for(const item of visible)content.append(createCard(item,'board'));
    row.append(label,content);makeDropZone(row,tier.key);board.append(row);
  }
  $('search-count').textContent=search?`${found}/${state.admin?state.catalog.length+entries().length:entries().filter(item=>TIERS.some(t=>t.key===item.tier)).length}`:'';
}
function plural(n){const m=n%10,d=n%100;return d>=11&&d<=14?'танков':m===1?'танк':m>=2&&m<=4?'танка':'танков';}
function createCard(item,source='board'){
  const card=document.createElement('article');card.className='tank-card';card.dataset.tankId=item.id;card.dataset.source=source;
  const catalogItem=source==='catalog'?item:state.catalog.find(x=>x.id===item.catalog_id);
  const vehicleType=normalizeType(catalogItem?.vehicle_type ?? item.vehicle_type);
  card.dataset.vehicleType=vehicleType;
  card.title=state.admin?(source==='catalog'?`${item.name} — нажми, чтобы быстро выбрать тир; карандаш — редактировать`:`${item.name} — нажми, чтобы сменить тир`):item.name;
  const art=document.createElement('div');art.className='tank-art';
  const url=publicImage(item.image_path);
  if(url){const img=document.createElement('img');img.src=url;img.alt='';img.loading='lazy';img.onerror=()=>{art.replaceChildren();art.innerHTML=ICON;};art.append(img);} else art.innerHTML=ICON;
  const caption=document.createElement('div');caption.className='tank-name';caption.textContent=item.name;
  card.append(art,caption);
  if(source==='catalog'){
    const kind=normalizeClass(item.tank_class);
    const badge=document.createElement('span');badge.className='catalog-class-badge';
    badge.textContent=kind==='other'?'?':kind.toUpperCase();
    badge.title=kind==='other'?'Класс ещё не указан':'Класс техники: '+kind.toUpperCase();
    card.append(badge);
    const meta=document.createElement('span');meta.className='tank-origin-badge';
    meta.textContent=`${normalizeLevel(item.tank_level)||'—'} ур. · ${nationLabel(item.nation)}`;card.append(meta);
  }
  const typeBadge=document.createElement('span');
  typeBadge.className='tank-type-badge';
  typeBadge.textContent=({regular:'Прок',premium:'Прем',collector:'Колл',unknown:'?'})[vehicleType];
  typeBadge.title=typeLabel(vehicleType);
  card.append(typeBadge);
  if(state.admin){
    if(source==='catalog' && draft()?.entries.some(x=>x.catalog_id===item.id)){
      card.classList.add('is-in-board');
      const status=document.createElement('small');status.className='tank-in-board';status.textContent='✓ Уже в этом тир-листе';card.append(status);
    }
    card.classList.add('is-draggable');card.draggable=true;
    const edit=document.createElement('button');edit.className='card-edit';edit.type='button';edit.textContent='✎';edit.setAttribute('aria-label',`Изменить ${item.name}`);edit.addEventListener('click',e=>{e.stopPropagation();openTank(item.id,source);});card.append(edit);
    card.addEventListener('click',()=>source==='catalog'?openTierPicker(item.id):openTank(item.id,source));
    card.addEventListener('dragstart',ev=>{
      state.dragging={source,id:item.id};ev.dataTransfer.effectAllowed=source==='catalog'?'copyMove':'move';ev.dataTransfer.setData('text/plain',item.id);card.classList.add('is-dragging');
    });
    card.addEventListener('dragend',()=>{stopDragScroll();state.dragging=null;document.querySelectorAll('.drag-over,.is-drag-target,.is-dragging').forEach(el=>el.classList.remove('drag-over','is-drag-target','is-dragging'));});
    card.addEventListener('dragover',ev=>{if(!state.dragging)return;ev.preventDefault();ev.stopPropagation();card.classList.add('is-drag-target');});
    card.addEventListener('dragleave',()=>card.classList.remove('is-drag-target'));
    card.addEventListener('drop',ev=>{
      ev.preventDefault();ev.stopPropagation();
      if(state.dragging)placeTank(state.dragging,source==='catalog'?UNRANKED:item.tier,source==='board'?item.id:null);
      state.dragging=null;
    });
  }
  return card;
}
function markDirty(){state.dirtyBoards.add(state.activeBoard);render();}
// Catalog drag COPIES into a particular board; board drag MOVES only within that board.
function placeTank(drag,tier,beforeId=null){
  const d=draft();if(!state.admin||!d || !drag)return;
  if(tier!==UNRANKED&&!TIERS.some(t=>t.key===tier))return;
  if(drag.source==='catalog'){
    if(tier===UNRANKED)return;
    const tank=state.catalog.find(x=>x.id===drag.id);if(!tank)return;
    const mismatch=boardMismatch(tank);
    if(mismatch){showToast(mismatch);return;}
    let entry=d.entries.find(x=>x.catalog_id===tank.id);
    if(!entry){
      entry=d.entries.find(x=>x.name.toLocaleLowerCase('ru')===tank.name.toLocaleLowerCase('ru'));
      if(entry)entry.catalog_id=tank.id;
    }
    if(entry){
      entry.name=tank.name;entry.image_path=tank.image_path;entry.vehicle_type=normalizeType(tank.vehicle_type);entry.nation=normalizeNation(tank.nation);entry.tank_level=normalizeLevel(tank.tank_level);
      relocateEntry(entry.id,tier,beforeId);
    }else{
      entry={id:makeId(),catalog_id:tank.id,name:tank.name,image_path:tank.image_path,vehicle_type:normalizeType(tank.vehicle_type),nation:normalizeNation(tank.nation),tank_level:normalizeLevel(tank.tank_level),tier};
      d.entries.push(entry);relocateEntry(entry.id,tier,beforeId);
    }
    return;
  }
  if(drag.source==='board'){
    if(tier===UNRANKED){
      d.entries=d.entries.filter(x=>x.id!==drag.id);markDirty();showToast('Убрано из этого рейтинга. Танк остался в общем каталоге.');
    }else relocateEntry(drag.id,tier,beforeId);
  }
}
function relocateEntry(id,tier,beforeId=null){
  const d=draft();if(!d || id===beforeId)return;
  const oldIndex=d.entries.findIndex(x=>x.id===id);if(oldIndex<0)return;
  const [item]=d.entries.splice(oldIndex,1);item.tier=tier;
  let insertAt=d.entries.length;
  if(beforeId && d.entries.some(x=>x.id===beforeId && x.tier===tier))insertAt=d.entries.findIndex(x=>x.id===beforeId);
  else for(let i=d.entries.length-1;i>=0;i--){if(d.entries[i].tier===tier){insertAt=i+1;break;}}
  d.entries.splice(insertAt,0,item);markDirty();
}
function shiftTank(id,delta){
  if(!state.admin)return;const arr=draft().entries, item=arr.find(x=>x.id===id);if(!item)return;
  const peers=arr.filter(x=>x.tier===item.tier),idx=peers.findIndex(x=>x.id===id),target=peers[idx+delta];if(!target)return;
  const a=arr.findIndex(x=>x.id===item.id),b=arr.findIndex(x=>x.id===target.id);[arr[a],arr[b]]=[arr[b],arr[a]];markDirty();
}
function syncDraftControls(){if(!state.admin)return;const d=draft();$('patch-input').value=d?.patch_name||'';$('notes-input').value=d?.notes||'';}
function enterAdmin(){
  state.admin=true;state.draftBoards=copy(state.publishedBoards);state.dirtyBoards.clear();
  syncDraftControls();render();window.MEMKOLA_BG?.setAdmin(true,state.sb);showToast('Режим владельца включён');
}
async function loadCatalog(){
  const {data,error}=await state.sb.from('tank_catalog').select('id,name,image_path,tank_class,vehicle_type,nation,tank_level').order('created_at',{ascending:true});
  if(error)throw new Error('Общий каталог ещё не настроен. Запусти SQL из файла UPGRADE-v4.sql в Supabase. Детали: '+error.message);
  state.catalog=data||[];
}
async function checkAdmin(user){if(!user || !state.sb)return false;const {data,error}=await state.sb.from('tier_admins').select('user_id').eq('user_id',user.id).maybeSingle();if(error)throw error;return !!data;}
async function login(ev){
  ev.preventDefault();if(!state.sb){showError('login-error','Сначала подключи Supabase в config.js.');return;}
  const button=$('login-submit');button.disabled=true;button.textContent='Проверяю доступ…';showError('login-error','');
  try{
    const {data,error}=await state.sb.auth.signInWithPassword({email:$('email-input').value.trim(),password:$('password-input').value});
    if(error)throw error;
    if(!await checkAdmin(data.user)){await state.sb.auth.signOut();throw new Error('У этого аккаунта нет прав редактора. Добавь его UUID в tier_admins.');}
    await loadCatalog();$('login-dialog').close();$('password-input').value='';enterAdmin();
  }catch(err){showError('login-error',`Не удалось войти: ${err.message||'проверь почту и пароль'}`);}finally{button.disabled=false;button.textContent='Войти';}
}
async function logout(){
  if(state.dirtyBoards.size && !confirm('Есть неопубликованные изменения. Выйти без сохранения?'))return;
  const {error}=await state.sb.auth.signOut();if(error){showToast('Не удалось выйти. Повтори попытку.');return;}
  state.admin=false;state.draftBoards={};state.dirtyBoards.clear();render();window.MEMKOLA_BG?.setAdmin(false,null);showToast('Ты вышел из редактора');
}
async function loadSnapshot({silent=false}={}){
  if(!state.sb)return;
  const {data,error}=await state.sb.from('tier_lists').select('id,entries,patch_name,notes,updated_at,revision').in('id',BOARDS.map(b=>b.id));
  if(error)throw error;
  const fromServer=Object.fromEntries(data.map(item=>[item.id,{...item, entries:Array.isArray(item.entries)?item.entries:[]}]));
  if(BOARDS.some(b=>!fromServer[b.id]))throw new Error('В базе отсутствует один или несколько тир-листов. Проверь SQL обновления и миграцию.');
  state.demo=false;$('demo-banner').hidden=true;
  for(const b of BOARDS){
    const result=fromServer[b.id], previous=state.publishedBoards[b.id];
    state.publishedBoards[b.id]=result;
    if(state.admin){
      if(!state.dirtyBoards.has(b.id))state.draftBoards[b.id]=copy(result);
      else if(previous && !state.demo && previous.revision!==result.revision){
        showToast(`«${b.name}» изменён в другом окне. Сохранён твой черновик — проверь перед публикацией.`);
      }
    }
  }
  if(state.admin)syncDraftControls();render();
  if(!silent)showToast('Рейтинги обновлены');
}
async function publish(){
  if(!state.admin || !isDirty() || !state.sb)return;
  const button=$('publish-btn'), boardId=state.activeBoard, d=draft(), original=published();
  button.disabled=true;button.firstChild.textContent='Публикую… ';
  try{
    const payload={entries:d.entries,patch_name:d.patch_name?.trim().slice(0,60)||'Без номера',notes:d.notes?.trim().slice(0,240)||'',updated_at:new Date().toISOString(),revision:original.revision+1};
    const {data,error}=await state.sb.from('tier_lists').update(payload).eq('id',boardId).eq('revision',original.revision).select('id,entries,patch_name,notes,updated_at,revision').maybeSingle();
    if(error)throw error;
    if(!data)throw new Error('Этот раздел изменён в другом окне. Обнови страницу и проверь изменения.');
    state.publishedBoards[boardId]=data;state.draftBoards[boardId]=copy(data);state.dirtyBoards.delete(boardId);
    syncDraftControls();render();showToast(`«${activeBoard().name}» опубликован! Подписчики видят изменения 🎉`);
  }catch(err){showToast(`Ошибка публикации: ${err.message}`);}finally{button.firstChild.textContent='Опубликовать ';button.disabled=!isDirty();}
}
function syncLocalCatalogChange(item,remove=false){
  for(const b of BOARDS){
    const d=state.draftBoards[b.id];if(!d)continue;
    if(remove)d.entries=d.entries.filter(x=>x.catalog_id!==item.id);
    else d.entries.forEach(x=>{if(x.catalog_id===item.id){x.name=item.name;x.image_path=item.image_path;x.vehicle_type=normalizeType(item.vehicle_type);x.nation=normalizeNation(item.nation);x.tank_level=normalizeLevel(item.tank_level);}});
  }
}
function discard(){
  if(!isDirty())return;
  if(!confirm(`Отменить неопубликованные изменения в разделе «${activeBoard().name}»?`))return;
  state.draftBoards[state.activeBoard]=copy(published());state.dirtyBoards.delete(state.activeBoard);
  syncDraftControls();render();showToast('Изменения в этом разделе отменены');
}
function openTank(id=null,source='catalog'){
  if(!state.admin)return;
  state.editingId=id;state.editingSource=source;state.removeExistingImage=false;
  const item=id?(source==='catalog'?state.catalog.find(x=>x.id===id):draft()?.entries.find(x=>x.id===id)):null;
  const onBoard=source==='board';
  $('tank-dialog-title').textContent=onBoard?'Расположение в тир-листе':item?'Изменить в общем каталоге':'Добавить в общий каталог';
  $('tank-name').value=item?.name||'';
  $('tank-name').readOnly=onBoard;
  $('tank-class-field').hidden=onBoard;
  $('tank-type-field').hidden=onBoard;
  $('tank-nation-field').hidden=onBoard;
  $('tank-level-field').hidden=onBoard;
  $('tank-type').value=onBoard?'unknown':item?normalizeType(item.vehicle_type):(['regular','premium','collector'].includes(state.typeFilter)?state.typeFilter:'unknown');
  $('tank-class').value=onBoard?'other':item?normalizeClass(item.tank_class):['lt','tt','st','pt'].includes(state.catalogFilter)?state.catalogFilter:'';
  $('tank-nation').value=onBoard?'unknown':item?normalizeNation(item.nation):(['all','unknown'].includes(state.nationFilter)?'':state.nationFilter);
  $('tank-level').value=onBoard?'0':item?String(normalizeLevel(item.tank_level)):(state.levelFilter==='all'||state.levelFilter==='0'?'':state.levelFilter);
  $('tank-tier').value=onBoard&&item&&TIERS.some(t=>t.key===item.tier)?item.tier:UNRANKED;
  $('tank-tier-field').hidden=!onBoard;
  $('tank-image-field').hidden=onBoard;
  $('tank-image').value='';
  $('delete-tank').hidden=!item;
  $('delete-tank').textContent=onBoard?'Убрать из этого рейтинга':'Удалить из каталога и всех рейтингов';
  $('move-controls').hidden=!onBoard;
  $('image-state').hidden=onBoard||!item?.image_path;
  $('image-state').firstChild.textContent='Загруженная картинка сохранится, пока ты не выберешь новую. ';
  $('tank-form').querySelector('.form-help').textContent=onBoard?'Меняй тир в этом разделе. Название и изображение редактируются в общем каталоге.': 'Сохрани один раз — танк будет доступен во всех тир-листах. Его размещение в каждом рейтинге независимое.';
  $('save-tank').textContent=onBoard?'Сохранить тир':'Сохранить в каталог';
  showError('tank-form-error','');$('tank-dialog').showModal();
  if(!onBoard)$('tank-name').focus();
}
function removeImage(){state.removeExistingImage=true;$('image-state').firstChild.textContent='Текущая картинка будет удалена после сохранения. ';}
async function saveTank(ev){
  ev.preventDefault();if(!state.admin)return;
  if(state.editingSource==='board'){
    const item=draft()?.entries.find(x=>x.id===state.editingId);if(!item)return;
    const tier=$('tank-tier').value;
    if(tier!==UNRANKED){
      const source=state.catalog.find(x=>x.id===item.catalog_id);
      if(source){const mismatch=boardMismatch(source);if(mismatch){showError('tank-form-error',mismatch);return;}}
    }
    if(tier===UNRANKED)placeTank({source:'board',id:item.id},UNRANKED);
    else relocateEntry(item.id,tier);
    $('tank-dialog').close();return;
  }
  const name=safeName($('tank-name').value),file=$('tank-image').files[0];
  const tankClass=$('tank-class').value;
  const vehicleType=$('tank-type').value;
  const nation=$('tank-nation').value;
  const levelText=$('tank-level').value;
  const tankLevel=Number(levelText);
  if(!['regular','premium','collector','unknown'].includes(vehicleType)){showError('tank-form-error','Выбери тип техники.');return;}
  if(!['lt','tt','st','pt','other'].includes(tankClass)){showError('tank-form-error','Выбери класс техники.');return;}
  if(!name){showError('tank-form-error','Введи название танка.');return;}
  if(!nationCodes.has(nation)||nation==='all'||(!state.editingId&&nation==='unknown')){showError('tank-form-error','Выбери нацию танка.');return;}
  if(levelText===''||!Number.isInteger(tankLevel)||tankLevel<0||tankLevel>11||(!state.editingId&&tankLevel===0)){showError('tank-form-error','Выбери уровень танка от 1 до 11.');return;}
  if(file && (!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)){showError('tank-form-error','Выбери JPG, PNG или WEBP до 5 МБ.');return;}
  const button=$('save-tank');button.disabled=true;button.textContent=file?'Загружаю картинку…':'Сохраняю…';showError('tank-form-error','');
  try{
    const previous=state.catalog.find(x=>x.id===state.editingId);
    let imagePath=previous?.image_path||'';
    if(state.removeExistingImage)imagePath='';
    if(file){
      const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
      const path=`tanks/${makeId()}.${ext}`;
      const {error}=await state.sb.storage.from('tank-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
      if(error)throw error;imagePath=path;
    }
    let data,error;
    if(previous){({data,error}=await state.sb.from('tank_catalog').update({name,image_path:imagePath,tank_class:tankClass,vehicle_type:vehicleType,nation,tank_level:tankLevel}).eq('id',previous.id).select('id,name,image_path,tank_class,vehicle_type,nation,tank_level').single());}
    else {({data,error}=await state.sb.from('tank_catalog').insert({name,image_path:imagePath,tank_class:tankClass,vehicle_type:vehicleType,nation,tank_level:tankLevel}).select('id,name,image_path,tank_class,vehicle_type,nation,tank_level').single());}
    if(error)throw error;
    await loadCatalog();
    if(previous){
      syncLocalCatalogChange(data);
      await loadSnapshot({silent:true});
    }
    render();$('tank-dialog').close();
    showToast(previous?'Обновлено во всём каталоге и опубликованных рейтингах.':'Танк сохранён в общем каталоге! Размещай в любых рейтингах.');
  }catch(err){showError('tank-form-error',`Не удалось сохранить: ${err.message}`);}finally{button.disabled=false;button.textContent='Сохранить в каталог';}
}
async function deleteTank(){
  if(!state.admin||!state.editingId)return;
  if(state.editingSource==='board'){
    const item=draft()?.entries.find(x=>x.id===state.editingId);if(!item)return;
    if(!confirm(`Убрать «${item.name}» из этого тир-листа? В общем каталоге танк останется.`))return;
    placeTank({source:'board',id:item.id},UNRANKED);$('tank-dialog').close();return;
  }
  const item=state.catalog.find(x=>x.id===state.editingId);if(!item)return;
  if(!confirm(`Удалить «${item.name}» ИЗ ОБЩЕГО КАТАЛОГА И ВСЕХ опубликованных рейтингов? Это действие нельзя отменить.`))return;
  const button=$('delete-tank');button.disabled=true;
  try{
    const {error}=await state.sb.from('tank_catalog').delete().eq('id',item.id);
    if(error)throw error;
    syncLocalCatalogChange(item,true);
    await loadCatalog();await loadSnapshot({silent:true});
    $('tank-dialog').close();render();showToast('Танк удалён из каталога и опубликованных рейтингов.');
  }catch(err){showError('tank-form-error',`Ошибка удаления: ${err.message}`);}finally{button.disabled=false;}
}
async function share(){
  const url=new URL(location.href);url.searchParams.set('list',activeBoard().slug);url.hash='';
  const data={title:`MEMKOLA wot — ${activeBoard().name}`,text:`Смотри тир-лист: ${activeBoard().name}!`,url:url.toString()};
  try{if(navigator.share){await navigator.share(data);return;}if(navigator.clipboard){await navigator.clipboard.writeText(data.url);showToast('Ссылка на выбранный тир-лист скопирована!');return;}throw Error('Clipboard is unavailable');}
  catch(err){if(err?.name!=='AbortError')showToast('Скопируй ссылку из адресной строки браузера.');}
}
function wireEvents(){
  window.addEventListener('dragover',trackDragScroll,true);
  window.addEventListener('drop',stopDragScroll,true);
  window.addEventListener('dragend',stopDragScroll,true);
  $('login-btn').addEventListener('click',()=>{if(state.demo){showToast('Демо-режим. Для входа администратора подключи Supabase.');return;}$('login-dialog').showModal();});
  $('logout-btn').addEventListener('click',logout);
  $('login-form').addEventListener('submit',login);
  $('tier-cat-create').addEventListener('click',()=>openCategoryModal('create'));
  $('tier-cat-edit').addEventListener('click',()=>openCategoryModal('edit'));
  $('tier-cat-delete').addEventListener('click',deleteCategory);
  $('tier-cat-left').addEventListener('click',()=>moveCategory(-1));
  $('tier-cat-right').addEventListener('click',()=>moveCategory(1));
  $('tier-cat-form').addEventListener('submit',submitCategory);
  $('add-tank').addEventListener('click',()=>openTank());
  $('tank-form').addEventListener('submit',saveTank);
  $('remove-image-btn').addEventListener('click',removeImage);
  $('delete-tank').addEventListener('click',deleteTank);
  $('move-prev').addEventListener('click',()=>shiftTank(state.editingId,-1));
  $('move-next').addEventListener('click',()=>shiftTank(state.editingId,1));
  $('search').addEventListener('input',renderBoard);
  $('patch-input').addEventListener('input',e=>{if(draft()){draft().patch_name=e.target.value;markDirty();}});
  $('notes-input').addEventListener('input',e=>{if(draft()){draft().notes=e.target.value;markDirty();}});
  $('publish-btn').addEventListener('click',publish);$('discard-btn').addEventListener('click',discard);
  $('share-top').addEventListener('click',share);$('share-bottom').addEventListener('click',share);
  document.querySelectorAll('.close-dialog').forEach(btn=>btn.addEventListener('click',()=>btn.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();}));
  window.addEventListener('beforeunload',e=>{if(state.dirtyBoards.size){e.preventDefault();e.returnValue='';}});
}
async function init(){
  wireEvents();render();
  if(!configured){$('demo-banner').hidden=false;return;}
  try{
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
    state.sb=createClient(config.supabaseUrl.trim(),config.supabaseAnonKey.trim());
    await loadCategories();
    await loadSnapshot({silent:true});
    const {data:{session}}=await state.sb.auth.getSession();
    if(session?.user && await checkAdmin(session.user)){await loadCatalog();enterAdmin();}
    state.sb.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT' && state.admin){state.admin=false;state.draftBoards={};state.dirtyBoards.clear();render();window.MEMKOLA_BG?.setAdmin(false,null);}});
    state.refreshTimer=setInterval(async()=>{try{if(!state.admin){await loadCategories();await loadSnapshot({silent:true});}}catch{/* keep last known data */}},90_000);
  }catch(err){console.error('Tier list loading error:',err);showDemo('Не удалось подключиться к базе Supabase. Пока показывается демонстрационный пример. Проверь config.js, SQL-схему и настройки проекта.');}
}
init();
