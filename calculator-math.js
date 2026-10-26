/* MEMKOLA statistics calculator. Pure functions, no network or browser state. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MemkolaCalculator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_INPUT = 10000000;
  const safeCeil = value => {
    const nearest = Math.round(value);
    const tolerance = Math.min(1e-7, Math.max(1e-10, Math.abs(value) * Number.EPSILON * 4));
    return nearest > 0 && Math.abs(value - nearest) <= tolerance ? nearest : Math.ceil(value);
  };
  function parseNumber(raw) {
    const text = String(raw == null ? '' : raw).trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(text)) return NaN;
    const value = Number(text);
    return Number.isFinite(value) ? value : NaN;
  }
  function forecast(battles, current, extra, future) {
    return (battles * current + extra * future) / (battles + extra);
  }
  function neededBattles(battles, current, target, future) {
    if (target <= current) return { status: 'achieved', battles: 0, value: current };
    if (future <= target) return { status: 'unreachable' };
    const extra = safeCeil(battles * (target - current) / (future - target));
    if (!Number.isSafeInteger(extra) || extra > 1000000000000) return { status: 'too-large' };
    return { status: 'ok', battles: extra, value: forecast(battles, current, extra, future) };
  }
  function solve(options) {
    const { metric, mode, battles, current, target, future, series, daily, exactWins } = options;
    if (!['winrate', 'average'].includes(metric) || !['reach', 'required', 'forecast'].includes(mode)) throw new RangeError('Unknown calculator mode');
    if (!Number.isInteger(battles) || battles < 1 || battles > MAX_INPUT) throw new RangeError('Invalid battle count');
    const upper = metric === 'winrate' ? 100 : MAX_INPUT;
    const valid = value => Number.isFinite(value) && value >= 0 && value <= upper;
    if (!valid(current)) throw new RangeError('Invalid current value');
    if (mode !== 'forecast' && !valid(target)) throw new RangeError('Invalid target');
    if (mode !== 'required' && !valid(future)) throw new RangeError('Invalid future value');
    if (mode !== 'reach' && (!Number.isInteger(series) || series < 1 || series > MAX_INPUT)) throw new RangeError('Invalid series');
    if (daily != null && (!Number.isInteger(daily) || daily < 1 || daily > 10000)) throw new RangeError('Invalid daily count');
    if (exactWins != null && (!Number.isInteger(exactWins) || exactWins < 0 || exactWins > battles)) throw new RangeError('Invalid wins');
    const baseWins = metric === 'winrate' ? (exactWins == null ? battles * current / 100 : exactWins) : null;
    const actualCurrent = metric === 'winrate' ? baseWins * 100 / battles : current;
    const base = { metric, mode, current: actualCurrent, target, future, baseBattles: battles, approximate: metric === 'average' || exactWins == null };
    if (mode === 'reach') {
      const answer = neededBattles(battles, actualCurrent, target, future);
      if (answer.status !== 'ok') return { ...base, ...answer };
      const extra = answer.battles;
      return { ...base, ...answer, totalBattles: battles + extra, days: daily ? safeCeil(extra / daily) : null,
        futureWins: metric === 'winrate' ? extra * future / 100 : null,
        minWins: metric === 'winrate' ? Math.max(0, safeCeil(target * (battles + extra) / 100 - baseWins)) : null,
        bestCase: metric === 'winrate' ? neededBattles(battles, actualCurrent, target, 100).battles : null };
    }
    if (mode === 'required') {
      const required = Math.max(0, (target * (battles + series) - actualCurrent * battles) / series);
      const wins = metric === 'winrate' ? Math.max(0, safeCeil(target * (battles + series) / 100 - baseWins)) : null;
      if (metric === 'winrate' && wins > series) return { ...base, status: 'unreachable', bestValue: (baseWins + series) * 100 / (battles + series), battles: series };
      const rate = metric === 'winrate' ? wins * 100 / series : required;
      return { ...base, status: 'ok', battles: series, future: rate, futureWins: wins, required: rate,
        value: forecast(battles, actualCurrent, series, rate), totalBattles: battles + series, days: daily ? safeCeil(series / daily) : null };
    }
    const value = forecast(battles, actualCurrent, series, future);
    return { ...base, status: 'ok', battles: series, totalBattles: battles + series, value,
      futureWins: metric === 'winrate' ? series * future / 100 : null,
      days: daily ? safeCeil(series / daily) : null, delta: value - actualCurrent };
  }
  return { MAX_INPUT, parseNumber, safeCeil, forecast, neededBattles, solve };
});
