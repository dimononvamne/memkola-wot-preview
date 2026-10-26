/* MEMKOLA universal site background v1: public read, admin-only publishing via Supabase. */
(function () {
  'use strict';
  const CFG = window.TANK_TIER_CONFIG || {};
  const apiBase = String(CFG.supabaseUrl || '').trim().replace(/\/+$/, '');
  const anon = String(CFG.supabaseAnonKey || '').trim();
  const BUCKET = 'memkola-backgrounds';
  const TABLE = 'memkola_site_appearance';
  const DEFAULT = { image_path: null, overlay_opacity: 0.64, image_position: 'center' };
  const POSITIONS = new Set(['center', 'top', 'bottom']);
  const $ = id => document.getElementById(id);
  let published = {...DEFAULT};
  let draft = {...DEFAULT};
  let adminClient = null;
  let admin = false;
  let candidate = null;
  let blobUrl = null;
  let previewEnabled = false;
  let visible = false;
  let root, photo, shade;

  const numOpacity = n => Math.max(0, Math.min(.9, Number.isFinite(Number(n)) ? Number(n) : .64));
  const pos = p => POSITIONS.has(p) ? p : 'center';
  const validPath = p => typeof p === 'string' && p.length > 0 && p.length < 260 && /^[-\w./]+$/.test(p) && !p.includes('..') && !p.startsWith('/');
  const safeRow = row => ({
    image_path: validPath(row?.image_path) ? row.image_path : null,
    overlay_opacity: numOpacity(row?.overlay_opacity),
    image_position: pos(row?.image_position)
  });
  function publicUrl(path, stamp = '') {
    if (!apiBase || !validPath(path)) return '';
    const route = path.split('/').map(encodeURIComponent).join('/');
    const suffix = stamp ? '?rev=' + encodeURIComponent(stamp) : '';
    return `${apiBase}/storage/v1/object/public/${BUCKET}/${route}${suffix}`;
  }
  function ensureLayer() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'memkola-site-wallpaper'; root.setAttribute('aria-hidden', 'true');
    photo = document.createElement('div'); photo.className = 'memkola-wallpaper-image';
    shade = document.createElement('div'); shade.className = 'memkola-wallpaper-shade';
    root.append(photo, shade);
    document.body.prepend(root);
  }
  function apply(row, urlOverride = null) {
    ensureLayer();
    const src = urlOverride || (row.image_path ? publicUrl(row.image_path, row.updated_at || '') : '');
    visible = Boolean(src);
    root.classList.toggle('is-visible', visible);
    document.body.classList.toggle('memkola-has-wallpaper', visible);
    photo.style.backgroundImage = src ? `url(${JSON.stringify(src)})` : '';
    photo.style.backgroundPosition = pos(row.image_position);
    shade.style.opacity = String(numOpacity(row.overlay_opacity));
  }
  function showMessage(msg, error = false) {
    const el = $('memkola-bg-message');
    if (el) { el.textContent = msg; el.classList.toggle('is-error', error); }
  }
  async function loadPublic() {
    if (!apiBase || !anon) return;
    try {
      const url = `${apiBase}/rest/v1/${TABLE}?id=eq.1&select=image_path,overlay_opacity,image_position,updated_at`;
      const resp = await fetch(url, {headers:{'apikey': anon, 'Authorization': `Bearer ${anon}`}, cache:'no-store'});
      if (!resp.ok) throw Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!Array.isArray(json) || !json[0]) throw Error('row missing');
      published = {...safeRow(json[0]), updated_at: json[0].updated_at};
      if (!previewEnabled) apply(published);
    } catch (e) { console.info('MEMKOLA background: run the supplied SQL if setup is not complete.', e.message); }
  }
  function syncPreview() {
    const preview = $('memkola-bg-preview');
    const previewImg = $('memkola-bg-preview-image');
    const previewShade = $('memkola-bg-preview-shade');
    if (!preview || !previewImg || !previewShade) return;
    const src = blobUrl || (draft.image_path ? publicUrl(draft.image_path) : '');
    previewImg.style.backgroundImage = src ? `url(${JSON.stringify(src)})` : '';
    previewImg.style.backgroundPosition = pos(draft.image_position);
    previewShade.style.opacity = String(numOpacity(draft.overlay_opacity));
    preview.style.backgroundColor = '#0b131d';
    $('memkola-bg-opacity-value').textContent = Math.round(draft.overlay_opacity * 100) + '%';
    apply(draft, blobUrl);
  }
  function disposeBlob() { if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = null; }
  function cancelPreview() {
    previewEnabled = false;
    disposeBlob(); candidate = null;
    apply(published);
    if ($('memkola-bg-upload')) $('memkola-bg-upload').value = '';
  }
  function open() {
    if (!admin || !adminClient) return;
    const dialog = $('memkola-bg-dialog');
    if (!dialog) return;
    draft = {...published};
    previewEnabled = true;
    candidate = null; disposeBlob();
    $('memkola-bg-upload').value = '';
    $('memkola-bg-opacity').value = String(Math.round(draft.overlay_opacity * 100));
    $('memkola-bg-position').value = draft.image_position;
    showMessage('Изменения видны только тебе, пока не нажмёшь «Опубликовать».');
    syncPreview(); dialog.showModal();
  }
  function validateFile(file) {
    if (!file) return '';
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return 'Нужен JPG, PNG или WebP.';
    if (file.size > 6 * 1024 * 1024) return 'Файл должен быть не больше 6 МБ.';
    if (file.size < 32) return 'Изображение слишком маленькое.';
    return '';
  }
  async function save(e) {
    e.preventDefault();
    if (!admin || !adminClient) { showMessage('Нет прав администратора.', true); return; }
    const btn = $('memkola-bg-save'); btn.disabled = true; btn.textContent = 'Публикую…';
    try {
      const issue = validateFile(candidate);
      if (issue) throw Error(issue);
      let imagePath = draft.image_path;
      if (candidate) {
        const ext = candidate.type === 'image/png' ? 'png' : candidate.type === 'image/webp' ? 'webp' : 'jpg';
        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random()*1e9)}`;
        imagePath = `wallpapers/${id}.${ext}`;
        const {error} = await adminClient.storage.from(BUCKET).upload(imagePath, candidate, {cacheControl:'31536000', upsert:false, contentType:candidate.type});
        if (error) throw Error('Не удалось загрузить фото: ' + error.message);
      }
      const changes = {image_path:imagePath, overlay_opacity:numOpacity(draft.overlay_opacity), image_position:pos(draft.image_position), updated_at:new Date().toISOString()};
      const {data, error} = await adminClient.from(TABLE).update(changes).eq('id', 1).select('image_path,overlay_opacity,image_position,updated_at').single();
      if (error) throw Error('Не удалось сохранить настройки: ' + error.message);
      published = {...safeRow(data), updated_at:data.updated_at};
      previewEnabled = false; disposeBlob(); candidate = null;
      apply(published);
      $('memkola-bg-dialog').close();
      // Other open tabs/sections on this device refresh immediately; other visitors see it at next load/focus/poll.
      try { localStorage.setItem('memkola_wallpaper_refresh', String(Date.now())); } catch (_) {}
    } catch (err) { showMessage(err.message || String(err), true); }
    finally { btn.disabled = false; btn.textContent = 'Опубликовать'; }
  }
  function bindUi() {
    const openButton = $('memkola-bg-open'); const dialog = $('memkola-bg-dialog');
    if (!openButton || !dialog) return;
    openButton.addEventListener('click', open);
    const upload = $('memkola-bg-upload');
    upload.addEventListener('change', () => {
      disposeBlob(); candidate = upload.files?.[0] || null;
      const issue = validateFile(candidate);
      if (issue) { showMessage(issue, true); candidate = null; upload.value = ''; }
      else showMessage(candidate ? `Предпросмотр: ${candidate.name}` : 'Текущий опубликованный фон.');
      if (candidate) { blobUrl = URL.createObjectURL(candidate); draft.image_path = null; }
      syncPreview();
    });
    $('memkola-bg-opacity').addEventListener('input',e => {draft.overlay_opacity = numOpacity(Number(e.target.value)/100); syncPreview();});
    $('memkola-bg-position').addEventListener('change', e => {draft.image_position = pos(e.target.value); syncPreview();});
    $('memkola-bg-reset').addEventListener('click', () => {
      candidate = null; disposeBlob(); upload.value = ''; draft.image_path = null;
      showMessage('Стандартный фон будет восстановлен после публикации.'); syncPreview();
    });
    $('memkola-bg-form').addEventListener('submit', save);
    dialog.addEventListener('close', cancelPreview);
    dialog.addEventListener('click', e => {if (e.target === dialog) dialog.close();});
    $('memkola-bg-cancel').addEventListener('click', () => dialog.close());
    $('memkola-bg-close').addEventListener('click', () => dialog.close());
  }
  window.MEMKOLA_BG = {
    setAdmin(allowed, sb) {
      admin = Boolean(allowed && sb); adminClient = admin ? sb : null;
      const btn = $('memkola-bg-open'); if (btn) btn.hidden = !admin;
      if (!admin && $('memkola-bg-dialog')?.open) $('memkola-bg-dialog').close();
    },
    refresh: loadPublic
  };
  const ready = () => {ensureLayer(); bindUi(); loadPublic();};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once:true}); else ready();
  window.addEventListener('focus', () => {if(!previewEnabled) loadPublic();});
  window.addEventListener('storage', e => {if(e.key === 'memkola_wallpaper_refresh' && !previewEnabled) loadPublic();});
  // Poll for published changes for users who leave the page open.
  setInterval(() => {if(!previewEnabled && !document.hidden) loadPublic();}, 120000);
})();
