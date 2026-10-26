/* The user's original public spreadsheet is embedded, not mirrored or relabelled as WG's API. */
(() => {
  'use strict';
  const root = document.documentElement;
  const frame = document.getElementById('ratings-frame');
  const board = document.getElementById('ratings-board');
  const frameWrap = document.getElementById('ratings-frame-wrap');
  const status = document.getElementById('ratings-status');
  const help = document.getElementById('ratings-loading-help');
  const auto = document.getElementById('ratings-auto');
  const expand = document.getElementById('ratings-expand');
  const sheet = 'https://docs.google.com/spreadsheets/d/1bYkST9fHBRUKom64F1V4aEK03wF0gLH-QpDu-9WOkh4/';
  const regions = {
    eu: { gid: '1310687274', name: 'Европа' },
    na: { gid: '0', name: 'Северная Америка' },
    asia: { gid: '501977520', name: 'Азия' }
  };
  const period = 5 * 60 * 1000;
  let selected = 'eu', nextRefresh = Date.now() + period, timer, requestedAt = new Date();
  const regionButtons = [...document.querySelectorAll('[data-region]')];
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
  };
  function refresh(region = selected, updateUrl = false) {
    selected = Object.hasOwn(regions, region) ? region : 'eu';
    const item = regions[selected];
    requestedAt = new Date(); nextRefresh = Date.now() + period;
    regionButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.region === selected)));
    document.getElementById('ratings-region-label').textContent = item.name;
    document.getElementById('ratings-source').href = `${sheet}htmlview#gid=${item.gid}`;
    frame.title = `Рейтинг WoT Blitz — ${item.name}, Live Ratings`;
    frameWrap.setAttribute('aria-busy', 'true');
    status.textContent = `Открываем таблицу: ${item.name}…`;
    help.hidden = true;
    clearTimeout(timer);
    timer = setTimeout(() => { frameWrap.setAttribute('aria-busy', 'false'); help.hidden = false; status.textContent = 'Ожидаем ответ Google-таблицы'; }, 15000);
    frame.src = `${sheet}htmlview/sheet?headers=false&gid=${item.gid}&mk_refresh=${Date.now()}`;
    storage.set('memkola-ratings-region-v1', selected);
    if (updateUrl) {
      const url = new URL(location.href); url.searchParams.set('region', selected);
      history.replaceState(null, '', url);
    }
  }
  frame.addEventListener('load', () => {
    clearTimeout(timer); help.hidden = true; frameWrap.setAttribute('aria-busy', 'false');
    // A cross-origin iframe cannot expose the author's data timestamp.
    status.textContent = `Просмотр открыт в ${requestedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  });
  frame.addEventListener('error', () => {
    clearTimeout(timer); help.hidden = false; frameWrap.setAttribute('aria-busy', 'false');
    status.textContent = 'Не удалось открыть таблицу';
  });
  regionButtons.forEach(button => button.addEventListener('click', () => refresh(button.dataset.region, true)));
  document.getElementById('ratings-refresh').addEventListener('click', () => refresh());
  auto.checked = storage.get('memkola-ratings-auto-v1') !== 'off';
  auto.addEventListener('change', () => { storage.set('memkola-ratings-auto-v1', auto.checked ? 'on' : 'off'); nextRefresh = Date.now() + period; });
  const maybeRefresh = () => {
    if (auto.checked && !document.hidden && !document.getElementById('mk-site-menu')?.open && Date.now() >= nextRefresh) refresh();
  };
  setInterval(maybeRefresh, 1000);
  document.addEventListener('visibilitychange', maybeRefresh);
  let scrollBeforeExpand = 0;
  function setExpanded(value) {
    if (value) scrollBeforeExpand = window.scrollY;
    root.classList.toggle('ratings-expanded', value);
    expand.setAttribute('aria-pressed', String(value));
    expand.querySelector('span').textContent = value ? 'Свернуть' : 'Развернуть';
    // Hide the surrounding page from keyboard/assistive navigation in the expanded view.
    [...document.body.children, ...board.parentElement.children].forEach(node => {
      if (node === board || node.contains(board) || node.id === 'mk-site-menu' || /^(SCRIPT|STYLE|LINK)$/.test(node.tagName)) return;
      if (value && !node.inert) { node.inert = true; node.dataset.ratingsInert = 'true'; }
      else if (!value && node.dataset.ratingsInert) { node.inert = false; delete node.dataset.ratingsInert; }
    });
    if (!value) { window.scrollTo(0, scrollBeforeExpand); expand.focus(); }
  }
  expand.addEventListener('click', () => setExpanded(!root.classList.contains('ratings-expanded')));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && root.classList.contains('ratings-expanded')) setExpanded(false);
  });
  const initial = new URLSearchParams(location.search).get('region') || storage.get('memkola-ratings-region-v1') || 'eu';
  refresh(initial);
})();
