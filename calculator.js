(function () {
  'use strict';
  const math = window.MemkolaCalculator;
  const $ = id => document.getElementById('calc-' + id);
  const STORAGE_KEY = 'memkola_statistics_calculator_v1';
  const defaults = {
    winrate: { battles: '10000', current: '55', wins: '', target: '60', future: '70', series: '1000', daily: '30', exact: false, kind: 'damage', custom: '', origin: 'example' },
    average: { battles: '1000', current: '2300', wins: '', target: '3000', future: '3500', series: '1000', daily: '30', exact: false, kind: 'damage', custom: '', origin: 'example' }
  };
  const kinds = { damage: 'Средний урон', experience: 'Средний опыт', frags: 'Танков уничтожено за бой', spots: 'Танков обнаружено за бой', custom: 'Средний показатель' };
  let state = { metric: 'winrate', mode: 'reach', winrate: { ...defaults.winrate }, average: { ...defaults.average } };
  let snapshot = null;
  let timer;
  const nf = digits => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits });
  const fmt = (value, digits = 0) => nf(digits).format(value);
  const plural = (value, forms) => { const n = Math.abs(Math.trunc(value)), last = n % 10, two = n % 100; return forms[two >= 11 && two <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2]; };
  const battleWord = n => plural(n, ['бой', 'боя', 'боёв']);
  const battleText = n => fmt(n) + ' ' + battleWord(n);
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const active = () => state[state.metric];
  const isWin = () => state.metric === 'winrate';
  const metricName = () => isWin() ? 'Процент побед' : (active().kind === 'custom' ? active().custom.trim() || kinds.custom : kinds[active().kind]);
  const valueText = (value, digits = 2) => fmt(value, digits) + (isWin() ? '%' : '');
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== 1) return;
      if (['winrate', 'average'].includes(saved.metric)) state.metric = saved.metric;
      if (['reach', 'required', 'forecast'].includes(saved.mode)) state.mode = saved.mode;
      for (const metric of ['winrate', 'average']) {
        const source = saved[metric];
        if (!source || typeof source !== 'object') continue;
        for (const key of ['battles', 'current', 'wins', 'target', 'future', 'series', 'daily', 'custom']) {
          if (typeof source[key] === 'string' && source[key].length <= 160) state[metric][key] = source[key];
        }
        state[metric].exact = source.exact === true;
        if (Object.hasOwn(kinds, source.kind)) state[metric].kind = source.kind;
        state[metric].origin = source.origin === 'example' ? 'example' : 'saved';
      }
    } catch (_) { /* The calculator also works with storage disabled. */ }
  }
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...state })); } catch (_) {} }
  function populate() {
    const data = active();
    for (const key of ['battles', 'target', 'future', 'series', 'daily']) $(key).value = data[key];
    $('current').value = isWin() && data.exact ? data.wins : data.current;
    $('exact').checked = data.exact;
    $('average-kind').value = data.kind;
    $('custom-name').value = data.custom;
    syncLayout();
  }
  function collect() {
    const data = active();
    for (const key of ['battles', 'target', 'future', 'series', 'daily']) data[key] = $(key).value;
    data[isWin() && data.exact ? 'wins' : 'current'] = $('current').value;
    data.custom = $('custom-name').value;
  }
  function syncLayout() {
    const win = isWin(), data = active(), mode = state.mode;
    document.querySelectorAll('[data-metric]').forEach(button => { const on = button.dataset.metric === state.metric; button.classList.toggle('active', on); button.setAttribute('aria-pressed', String(on)); });
    document.querySelectorAll('[data-mode]').forEach(button => { const on = button.dataset.mode === mode; button.classList.toggle('active', on); button.setAttribute('aria-pressed', String(on)); });
    $('metric-select-wrap').hidden = win;
    $('custom-wrap').hidden = win || data.kind !== 'custom';
    $('exact-wrap').hidden = !win;
    $('target-wrap').hidden = mode === 'forecast';
    $('future-wrap').hidden = mode === 'required';
    $('series-wrap').hidden = mode === 'reach';
    $('form-title').textContent = { reach: 'Задай свою цель', required: 'Запланируй серию', forecast: 'Загляни в результат' }[mode];
    $('input-state').textContent = { example: 'Пример расчёта · подставь свои данные', saved: 'Твой сохранённый расчёт', edited: 'Твои данные · сохраняются в этом браузере', empty: 'Введи данные аккаунта или выбранного танка' }[data.origin] || 'Твои данные';
    $('current-label').textContent = win ? (data.exact ? 'Точное количество побед' : 'Текущий процент побед') : 'Текущий показатель · ' + metricName().toLowerCase();
    $('target-label').textContent = win ? 'Желаемый процент побед' : 'Желаемый средний показатель';
    $('future-label').textContent = win ? 'Винрейт в будущих боях' : 'Средний результат в будущих боях';
    $('current-unit').textContent = win ? (data.exact ? 'побед' : '%') : 'за бой';
    $('target-unit').textContent = win ? '%' : 'за бой';
    $('future-unit').textContent = win ? '%' : 'за бой';
    $('current-hint').textContent = win ? (data.exact ? 'Введи реальное число побед из игровой статистики.' : 'Точное число побед даёт более точный расчёт.') : 'Бери среднее из той же статистики, что и количество боёв.';
    $('future-hint').textContent = win ? 'Средний винрейт, который планируешь держать.' : 'Среднее за один бой новой серии, а не суммарное значение.';
    $('current').inputMode = win && data.exact ? 'numeric' : 'decimal';
    $('current').placeholder = win ? (data.exact ? 'Например, 5 500' : '55') : (['frags', 'spots'].includes(data.kind) ? '1,2' : '2 300');
    $('target').placeholder = win ? '60' : '3 000';
    $('future').placeholder = win ? '70' : '3 500';
  }
  function readOptions(showErrors) {
    const data = active(), win = isWin(), mode = state.mode;
    const options = { metric: state.metric, mode, exactWins: null, daily: null };
    const errors = {};
    const read = (key, min, max, integer, optional = false) => {
      const raw = $(key).value;
      if (optional && !raw.trim()) return null;
      const value = math.parseNumber(raw);
      if (!Number.isFinite(value)) errors[key] = raw.trim() ? 'Введи число. Для дроби подойдут точка или запятая.' : 'Заполни это поле.';
      else if (integer && !Number.isInteger(value)) errors[key] = 'Нужно целое число.';
      else if (value < min || value > max) errors[key] = 'Допустимо от ' + fmt(min) + ' до ' + fmt(max) + '.';
      return value;
    };
    options.battles = read('battles', 1, math.MAX_INPUT, true);
    const current = read('current', 0, win && !data.exact ? 100 : math.MAX_INPUT, win && data.exact);
    if (win && data.exact) {
      options.exactWins = current;
      options.current = options.battles > 0 ? current * 100 / options.battles : 0;
      if (Number.isFinite(current) && current > options.battles) errors.current = 'Побед не может быть больше, чем сыгранных боёв.';
    } else options.current = current;
    if (mode !== 'forecast') options.target = read('target', 0, win ? 100 : math.MAX_INPUT, false);
    if (mode !== 'required') options.future = read('future', 0, win ? 100 : math.MAX_INPUT, false);
    if (mode !== 'reach') options.series = read('series', 1, math.MAX_INPUT, true);
    options.daily = read('daily', 1, 10000, true, true);
    for (const key of ['battles', 'current', 'target', 'future', 'series', 'daily']) {
      const visibleError = errors[key] && (showErrors || $(key).value.trim());
      $(key + '-error').textContent = visibleError ? errors[key] : '';
      $(key).setAttribute('aria-invalid', visibleError ? 'true' : 'false');
    }
    return { options, errors };
  }
  function summary(label, number, unit, description, message = false) {
    $('summary').innerHTML = '<p class="calc-result-label">' + label + '</p><h2 class="calc-result-number' + (message ? ' is-message' : '') + '">' + number + (unit ? '<small>' + unit + '</small>' : '') + '</h2><p class="calc-result-description">' + description + '</p>';
  }
  function setView(status) {
    const panel = document.querySelector('.calc-output-panel');
    panel.classList.toggle('is-warning', status === 'warning');
    panel.classList.toggle('is-empty', status === 'empty');
    $('result-details').hidden = status !== 'ok';
    $('result-help').hidden = true;
    $('copy-status').textContent = '';
    $('copy-fallback').hidden = true;
    $('result-status').textContent = { ok: 'Прогноз', warning: 'Проверь план', empty: 'Твои данные', achieved: 'Готово' }[status];
  }
  function renderBlocked(answer) {
    if (answer.status === 'achieved') {
      setView('achieved');
      summary('Дополнительные бои для этой цели', '0', 'боёв', 'Текущий показатель <strong>' + valueText(answer.current, 4) + '</strong> уже не ниже цели <strong>' + valueText(answer.target, 4) + '</strong>. Выбери следующую планку или посмотри прогноз новой серии.');
      $('result-status').textContent = 'Цель достигнута';
      return;
    }
    setView('warning');
    let description, help;
    if (answer.status === 'too-large') {
      description = 'Темп почти равен цели: расчёт выходит за пределы одного триллиона боёв.';
      help = 'Увеличь результат будущих боёв или выбери более близкую цель — так план станет практичнее.';
    } else if (state.mode === 'required') {
      description = 'Даже если выиграть все <strong>' + fmt(answer.battles) + '</strong> боёв, итоговый винрейт составит <strong>' + valueText(answer.bestValue, 4) + '</strong>.';
      const best = math.neededBattles(answer.baseBattles, answer.current, answer.target, 100);
      help = best.status === 'ok' ? 'Для этой цели нужно минимум <strong>' + fmt(best.battles) + ' боёв без поражений</strong>. Увеличь длину серии или снизь цель.' : 'Если в прошлых боях уже были поражения, ровно 100% общего винрейта нельзя получить за конечное число новых боёв. Выбери цель ниже 100%.';
    } else {
      description = 'С результатом <strong>' + valueText(answer.future, 4) + '</strong> в новых боях поднять общий показатель до <strong>' + valueText(answer.target, 4) + '</strong> не получится.';
      help = isWin() && answer.target === 100 ? 'После уже сыгранных поражений общий винрейт может приближаться к 100%, но не достигнет их ровно. Выбери цель ниже 100%.' : 'Для роста будущий результат должен быть <strong>выше ' + valueText(answer.target, 4) + '</strong>. При равенстве общий показатель лишь приближается к цели.';
    }
    summary('При выбранных условиях', 'Нужно изменить план', '', description, true);
    $('result-help').innerHTML = help;
    $('result-help').hidden = false;
  }
  function renderChart(answer) {
    const width = 540, height = 195, left = 57, right = 20, top = 20, bottom = 35;
    const xMax = answer.battles;
    const hasGoal = state.mode !== 'forecast';
    const values = [answer.current, answer.value];
    if (hasGoal) values.push(answer.target);
    let low = Math.min(...values), high = Math.max(...values);
    const pad = Math.max((high - low) * .17, isWin() ? .12 : Math.max(1, high * .005));
    low = Math.max(0, low - pad); high += pad;
    if (isWin()) high = Math.min(100, high);
    if (high <= low) { high = low + 1; }
    const sx = n => left + (width - left - right) * n / xMax;
    const sy = value => top + (height - top - bottom) * (1 - (value - low) / (high - low));
    const points = Array.from({ length: 51 }, (_, i) => { const n = xMax * i / 50; return [sx(n), sy(math.forecast(answer.baseBattles, answer.current, n, answer.future))]; });
    const path = points.map((p, i) => (i ? 'L' : 'M') + p.map(v => v.toFixed(2)).join(',')).join(' ');
    const end = points[points.length - 1], start = points[0], floor = height - bottom;
    const compact = n => n >= 1e9 ? fmt(n / 1e9, 1) + ' млрд' : n >= 1e6 ? fmt(n / 1e6, 1) + ' млн' : n >= 10000 ? fmt(n / 1000, 1) + ' тыс.' : fmt(n);
    const yLabel = value => (value >= 10000 ? compact(value) : fmt(value, isWin() || high < 10 ? 2 : 0)) + (isWin() ? '%' : '');
    let grid = '';
    for (let i = 0; i < 3; i++) {
      const val = low + (high - low) * i / 2, y = sy(val);
      grid += '<line x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '" stroke="#3b4e58" stroke-opacity=".55"/><text x="' + (left - 9) + '" y="' + (y + 4) + '" text-anchor="end">' + yLabel(val) + '</text>';
    }
    const targetLine = hasGoal ? '<line x1="' + left + '" y1="' + sy(answer.target) + '" x2="' + (width - right) + '" y2="' + sy(answer.target) + '" stroke="#e9b76b" stroke-opacity=".8" stroke-dasharray="4 5"/>' : '';
    $('chart').innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="calc-chart-title calc-chart-desc"><title id="calc-chart-title">Прогноз: ' + valueText(answer.current, 4) + ' → ' + valueText(answer.value, 4) + '</title><desc id="calc-chart-desc">Изменение показателя за ' + fmt(xMax) + ' дополнительных боёв при результате ' + valueText(answer.future, 4) + ' в новых боях.</desc><defs><linearGradient id="calc-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#8ed7c3" stop-opacity=".2"/><stop offset="1" stop-color="#8ed7c3" stop-opacity="0"/></linearGradient></defs>' + grid + targetLine + '<path d="' + path + ' L' + end[0] + ',' + floor + ' L' + left + ',' + floor + ' Z" fill="url(#calc-chart-fill)"/><path d="' + path + '" fill="none" stroke="#8ed7c3" stroke-width="2.5" stroke-linecap="round"/><circle cx="' + start[0] + '" cy="' + start[1] + '" r="3.5" fill="#8ed7c3"/><circle cx="' + end[0] + '" cy="' + end[1] + '" r="4.5" fill="#8ed7c3" stroke="#17322d" stroke-width="3"/><text x="' + left + '" y="' + (height - 10) + '">Сейчас</text><text x="' + sx(xMax / 2) + '" y="' + (height - 10) + '" text-anchor="middle">+' + compact(Math.round(xMax / 2)) + '</text><text x="' + (width - right) + '" y="' + (height - 10) + '" text-anchor="end">+' + compact(xMax) + ' боёв</text></svg>';
    $('chart-caption').textContent = 'Сейчас: ' + valueText(answer.current, 4) + ' → после серии: ' + valueText(answer.value, 4) + '. По горизонтали — дополнительные бои.';
    document.querySelector('.calc-chart-heading > span').innerHTML = '<i></i> Прогноз' + (hasGoal ? ' <b></b> Цель' : '');
  }
  function renderScenarios(answer) {
    $('scenarios').hidden = state.mode !== 'reach';
    if (state.mode !== 'reach') return;
    let rates;
    if (isWin()) {
      const base = answer.future;
      rates = [Math.max(0, base - 10), base, Math.min(100, base + 10), 100];
      if (new Set(rates).size < 4) rates = [Math.max(0, base - 20), Math.max(0, base - 10), base, 100];
    } else rates = [.9, 1, 1.1, 1.25].map(factor => Math.min(math.MAX_INPUT, Math.round(answer.future * factor * 100) / 100));
    rates = [...new Set(rates)].sort((a, b) => a - b);
    $('scenario-options').innerHTML = rates.map(rate => {
      const alt = math.neededBattles(answer.baseBattles, answer.current, answer.target, rate);
      const impossible = alt.status !== 'ok' && alt.status !== 'achieved';
      return '<button type="button" data-rate="' + rate + '" class="' + (Math.abs(rate - answer.future) < 1e-8 ? 'active ' : '') + (impossible ? 'is-unreachable' : '') + '" aria-label="Темп ' + valueText(rate, 2) + ': ' + (impossible ? 'цель недостижима' : battleText(alt.battles)) + '"><strong>' + valueText(rate, 2) + '</strong><small>' + (impossible ? 'Не достигнуть' : battleText(alt.battles)) + '</small></button>';
    }).join('');
  }
  function renderAnswer(answer) {
    snapshot = answer;
    if (answer.status !== 'ok') { renderBlocked(answer); return; }
    setView('ok');
    const win = isWin(), mode = state.mode;
    if (mode === 'reach') {
      summary('До желаемого показателя нужно ещё', (answer.approximate || answer.future !== 100 ? '≈ ' : '') + fmt(answer.battles), battleWord(answer.battles), 'Чтобы поднять <strong>' + (win ? 'винрейт' : escape(metricName().toLowerCase())) + '</strong> с <strong>' + valueText(answer.current, 4) + '</strong> до <strong>' + valueText(answer.target, 4) + '</strong>, держи <strong>' + valueText(answer.future, 4) + '</strong> в новых боях.');
    } else if (mode === 'required') {
      const requiredDisplay = math.safeCeil(answer.required * 100) / 100;
      summary(win ? 'Нужный винрейт в будущей серии' : 'Нужный средний результат за бой', valueText(requiredDisplay, 2), win ? '' : 'за бой', win ? 'Нужно выиграть минимум <strong>' + battleText(answer.futureWins) + ' из ' + fmt(answer.battles) + '</strong>, чтобы получить не меньше <strong>' + valueText(answer.target, 4) + '</strong> в общей статистике.' : 'План: <strong>' + battleText(answer.battles) + '</strong> с таким средним результатом. Итоговый общий показатель — не ниже <strong>' + valueText(answer.target, 4) + '</strong>.');
    } else {
      const direction = answer.delta > 1e-9 ? 'вырастет на' : answer.delta < -1e-9 ? 'снизится на' : 'не изменится';
      const deltaText = Math.abs(answer.delta) > 1e-9 ? ' <strong>' + fmt(Math.abs(answer.delta), Math.abs(answer.delta) < .01 ? 4 : 2) + (win ? ' п. п.' : '') + '</strong>' : '';
      summary(win ? 'Общий винрейт после серии' : 'Общий средний после серии', valueText(answer.value, 2), win ? '' : 'за бой', 'План: <strong>' + battleText(answer.battles) + '</strong> с результатом <strong>' + valueText(answer.future, 4) + '</strong>. Общий показатель ' + direction + deltaText + '.');
    }
    const cards = [
      { label: win ? (mode === 'required' ? 'Побед за серию' : 'Побед в серии · прогноз') : 'В конце серии · средний', value: win ? (mode === 'required' ? '' : '≈ ') + fmt(answer.futureWins, 0) : valueText(answer.value, 2), note: win ? (mode === 'required' ? 'из ' + fmt(answer.battles) + ' боёв' : 'при заданном винрейте') : 'по исходным данным' },
      { label: 'Всего боёв в итоге', value: fmt(answer.totalBattles), note: 'с учётом текущих' },
      { label: answer.days ? 'Темп: ' + battleText(math.parseNumber(active().daily)) + ' в день' : 'Срок до результата', value: answer.days ? fmt(answer.days) : '—', note: answer.days ? plural(answer.days, ['день игры', 'дня игры', 'дней игры']) : 'укажи бои в день' }
    ];
    $('stats').innerHTML = cards.map(card => '<div class="calc-stat"><small>' + card.label + '</small><strong>' + card.value + '</strong><span>' + card.note + '</span></div>').join('');
    renderChart(answer);
    renderScenarios(answer);
    let precision = win ? (active().exact ? 'Учтено точное число побед. ' : 'Исходный процент в игре округлён: расчёт приблизительный. Для большей точности введи число побед. ') : 'Расчёт для среднего за бой. Округлённый исходный показатель может давать небольшую погрешность. ';
    if (win && mode !== 'required') precision += 'Будущие победы оценены по выбранному темпу; в реальной серии они целые. ';
    if (win && mode === 'reach' && answer.bestCase != null) precision += 'Теоретический минимум: ' + battleText(answer.bestCase) + ' при 100% побед.';
    if (mode === 'required' && !win) precision += 'Показанный требуемый средний округлён вверх до сотых.';
    $('precision-note').textContent = precision;
  }
  function calculate(showErrors = false) {
    clearTimeout(timer);
    collect();
    const { options, errors } = readOptions(showErrors);
    if (Object.keys(errors).length) {
      snapshot = null;
      setView('empty');
      summary('Всё начинается с исходных данных', 'Твой следующий результат', '', 'Заполни поля слева — здесь появятся расчёт, график и срок. Можно использовать данные всего аккаунта или одного танка.', true);
      if (showErrors) $(Object.keys(errors)[0]).focus();
      return false;
    }
    try { renderAnswer(math.solve(options)); return true; }
    catch (_) { snapshot = null; setView('empty'); summary('Проверь исходные данные', 'Не удалось рассчитать', '', 'Укажи корректные числа и повтори расчёт.', true); return false; }
  }
  function copyText() {
    if (!snapshot || snapshot.status !== 'ok') return '';
    const s = snapshot;
    let text = 'MEMKOLA wot · ' + metricName() + '\nСейчас: ' + fmt(s.baseBattles) + ' боёв, ' + valueText(s.current, 4) + '.';
    if (state.mode === 'reach') text += '\nЦель: ' + valueText(s.target, 4) + '. Нужно ещё примерно ' + fmt(s.battles) + ' боёв при результате ' + valueText(s.future, 4) + ' в новых боях.';
    else if (state.mode === 'required') text += '\nЦель: ' + valueText(s.target, 4) + ' за ' + fmt(s.battles) + ' новых боёв. Требуется ' + valueText(math.safeCeil(s.future * 100) / 100, 2) + (isWin() ? ' — минимум ' + fmt(s.futureWins) + ' побед.' : ' в среднем за бой.');
    else text += '\nПосле ' + fmt(s.battles) + ' боёв с результатом ' + valueText(s.future, 4) + ': ' + valueText(s.value, 4) + '.';
    if (s.days) text += '\nСрок: ' + fmt(s.days) + ' дней при ' + active().daily + ' боях в день.';
    return text + '\nМатематический прогноз при заданном темпе. Округление исходной статистики может давать погрешность.';
  }
  document.querySelectorAll('[data-metric]').forEach(button => button.addEventListener('click', () => {
    collect(); state.metric = button.dataset.metric; populate(); persist(); calculate();
  }));
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    collect(); state.mode = button.dataset.mode; syncLayout(); persist(); calculate();
  }));
  $('exact').addEventListener('change', () => {
    collect(); active().exact = $('exact').checked; active().origin = 'edited'; populate(); persist(); calculate();
  });
  $('average-kind').addEventListener('change', () => {
    collect(); active().kind = $('average-kind').value; active().origin = 'edited';
    for (const key of ['current', 'target', 'future']) active()[key] = '';
    populate(); persist(); calculate();
  });
  $('form').addEventListener('input', event => {
    if (['calc-exact', 'calc-average-kind'].includes(event.target.id)) return;
    collect(); active().origin = 'edited'; syncLayout(); persist();
    clearTimeout(timer); timer = setTimeout(() => calculate(), 180);
  });
  $('form').addEventListener('submit', event => {
    event.preventDefault(); collect(); persist();
    if (calculate(true) && window.matchMedia('(max-width:800px)').matches) document.querySelector('.calc-output-panel').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });
  $('clear').addEventListener('click', () => {
    for (const key of ['battles', 'current', 'wins', 'target', 'future', 'series', 'daily']) active()[key] = '';
    active().origin = 'empty'; populate(); persist(); calculate(); $('battles').focus();
  });
  $('example').addEventListener('click', () => {
    state[state.metric] = { ...defaults[state.metric] }; populate(); persist(); calculate();
  });
  $('scenario-options').addEventListener('click', event => {
    const button = event.target.closest('button[data-rate]'); if (!button) return;
    $('future').value = button.dataset.rate; collect(); active().origin = 'edited'; syncLayout(); persist(); calculate();
  });
  $('copy').addEventListener('click', async () => {
    const text = copyText(); if (!text) return;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text); $('copy-status').textContent = 'Расчёт скопирован.';
    } catch (_) {
      $('copy-fallback').value = text; $('copy-fallback').hidden = false; $('copy-fallback').focus(); $('copy-fallback').select();
      $('copy-status').textContent = 'Выделила текст — скопируй его вручную.';
    }
  });
  load(); populate(); calculate();
})();
