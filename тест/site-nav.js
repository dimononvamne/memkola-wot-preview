/* MEMKOLA shared navigation v1.0. Original page actions keep their nodes and handlers. */
(() => {
  'use strict';
  const header = document.querySelector('body > header');
  if (!header || document.getElementById('mk-site-menu')) return;
  const row = header.querySelector('.nav, .topbar-inner, .top-inner, .topbar-content, .navigation, .calc-navigation, .cal-topbar-inner, .ratings-topbar-inner') || header;
  const page = location.pathname.split('/').pop() || 'index.html';
  const groups = [
    ['Игрокам', [
      ['index.html', 'Тир-листы', 'tiers'],
      ['ratings.html', 'Рейтинг игроков', 'rating'],
      ['session.html', 'Сессионка', 'chart'],
      ['calculator.html', 'Калькулятор', 'calculator']
    ]],
    ['Сообщество', [
      ['challenges.html', 'Челленджи', 'target'],
      ['tournaments.html', 'Турниры', 'cup'],
      ['calendar.html', 'Календарь Blitz', 'calendar']
    ]],
    ['Ещё на сайте', [
      ['widgets.html', 'Виджеты для стрима', 'screen'],
      ['wheel.html', 'Колесо фортуны', 'wheel'],
      ['containers.html', 'Контейнеры', 'box']
    ]]
  ];
  const paths = {
    tiers: '<path d="M4 5h16M4 12h12M4 19h8"/>',
    rating: '<path d="M4 20v-8h5v8m1 0V4h5v16m1 0V9h4v11M2 20h20"/>',
    chart: '<path d="M4 3v17h17M7 15l4-5 4 3 5-7"/>',
    calculator: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    cup: '<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 13v6m-5 2h10m-8-2h6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h3m4 0h3M7 17h3"/>',
    screen: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4m-2-15 5 4-5 4Z"/>',
    wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7m0 4v7M3 12h7m4 0h7M6 6l5 5m2 2 5 5m0-12-5 5m-2 2-5 5"/>',
    box: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10v10M3 7l9 5 9-5M7 5l9 5"/>'
  };
  const icon = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key] || ''}</svg>`;
  const current = groups.flatMap(group => group[1]).find(item => item[0] === page);
  const drawer = document.createElement('dialog');
  drawer.id = 'mk-site-menu';
  drawer.setAttribute('aria-labelledby', 'mk-menu-title');
  drawer.innerHTML = `
    <div class="mk-menu-heading"><div><span class="mk-menu-kicker">MEMKOLA WOT</span><h2 id="mk-menu-title">Разделы сайта</h2></div><button class="mk-menu-close" type="button" aria-label="Закрыть меню"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>
    <div class="mk-menu-scroll"><nav class="mk-menu-links" aria-label="Основное меню">${groups.map(([label, links]) => `<div class="mk-menu-group"><p class="mk-menu-group-title">${label}</p>${links.map(([href, title, key]) => `<a class="mk-menu-link${href === 'challenges.html' ? ' challenge-nav-link' : ''}" href="./${href}"${href === page ? ' aria-current="page"' : ''}><span class="mk-menu-icon">${icon(key)}</span><span>${title}</span><span class="mk-menu-arrow" aria-hidden="true">${href === page ? '●' : '↗'}</span></a>`).join('')}</div>`).join('')}</nav><div class="mk-menu-actions" hidden aria-label="Действия на странице"></div></div>`;
  const actions = drawer.querySelector('.mk-menu-actions');
  header.querySelectorAll('button').forEach(button => {
    button.classList.add('mk-menu-action');
    actions.append(button);
  });
  if (actions.children.length) actions.hidden = false;
  // Keep the original navigation as a no-JavaScript fallback in the source HTML.
  header.querySelectorAll('nav, .mobile-nav-hint, .header-actions').forEach(node => node.classList.add('mk-old-navigation'));
  const controls = document.createElement('div');
  controls.className = 'mk-nav-controls';
  const label = document.createElement('span');
  label.className = 'mk-current-section';
  label.textContent = current?.[1] || 'MEMKOLA';
  const trigger = document.createElement('button');
  trigger.id = 'mk-menu-toggle';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', 'Открыть меню');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', drawer.id);
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span>Меню</span>';
  controls.append(label, trigger);
  row.append(controls);
  document.body.append(drawer);
  header.classList.add('mk-header');
  row.classList.add('mk-header-row');
  const close = () => { if (drawer.open) drawer.close(); };
  trigger.addEventListener('click', () => {
    drawer.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('mk-menu-open');
    drawer.querySelector('.mk-menu-close').focus();
  });
  drawer.querySelector('.mk-menu-close').addEventListener('click', close);
  drawer.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('mk-menu-open');
  });
  drawer.addEventListener('click', event => {
    if (event.target !== drawer) return;
    const bounds = drawer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  });
  drawer.querySelector('.mk-menu-links').addEventListener('click', event => {
    if (event.target.closest('a')) close();
  });
  // Close before the original handler opens its own login dialog or share sheet.
  actions.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button && !button.disabled) close();
  }, true);
})();
