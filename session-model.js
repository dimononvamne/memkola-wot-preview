/* MEMKOLA Session v19: calculations shared by the page and regression checks. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.MemkolaSession = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const fields = ['battles','wins','losses','damage_dealt','damage_received','shots','hits','frags','spotted','survived_battles','win_and_survived','xp','capture_points','dropped_capture_points'];
  const number = v => v === null || v === undefined || v === '' || typeof v === 'boolean' || !Number.isFinite(Number(v)) ? null : Number(v);
  const ratio = (n,d,scale=1) => n !== null && d !== null && d > 0 ? n/d*scale : null;
  function wrClass(wins,battles) {
    const wr = ratio(number(wins),number(battles),100);
    return wr === null || wr < 50 ? 'wr-white' : wr < 60 ? 'wr-green' : wr < 70 ? 'wr-blue' : 'wr-purple';
  }
  function delta(now={},before={}) {
    const out={}; let reset=false;
    for (const key of fields) {
      const a=number(now?.[key]),b=number(before?.[key]);
      out[key]=a===null||b===null||a<b?null:a-b;
      if (a!==null&&b!==null&&a<b) reset=true;
    }
    const inconsistent = out.battles!==null && [out.wins,out.losses,out.survived_battles].some(n=>n!==null&&n>out.battles)
      || (out.battles!==null&&out.wins!==null&&out.losses!==null&&out.wins+out.losses>out.battles);
    if(reset||inconsistent) for(const key of fields) out[key]=null;
    out.damage=out.damage_dealt;
    out.draws=out.battles!==null&&out.wins!==null&&out.losses!==null?out.battles-out.wins-out.losses:null;
    out.winrate=ratio(out.wins,out.battles,100);
    out.accuracy=ratio(out.hits,out.shots,100);
    out.avgDamage=ratio(out.damage_dealt,out.battles);
    out.avgReceived=ratio(out.damage_received,out.battles);
    out.avgFrags=ratio(out.frags,out.battles);
    out.avgSpotted=ratio(out.spotted,out.battles);
    out.avgXp=ratio(out.xp,out.battles);
    out.survival=ratio(out.survived_battles,out.battles,100);
    out.damageRatio=ratio(out.damage_dealt,out.damage_received);
    out.killRatio=ratio(out.frags,out.battles===null||out.survived_battles===null?null:out.battles-out.survived_battles);
    out.reset=reset; out.inconsistent=!!inconsistent;
    return out;
  }
  function sessionDelta(s,mode) {
    const before=s?.baseline?.statistics?.[mode],now=s?.latest?.statistics?.[mode];
    const out=delta(now,before);
    if(mode==='rating'&&before?.current_season!=null&&now?.current_season!=null&&String(before.current_season)!==String(now.current_season)) {
      for(const k of Object.keys(out)) if(typeof out[k]==='number') out[k]=null;
      out.reset=true;
    }
    return out;
  }
  function rating(s) {
    const before=s?.baseline?.rating_display,now=s?.latest?.rating_display;
    const score=number(now?.score),start=number(before?.score);
    const calibrated=now?.status==='ok' && number(now?.calibration_battles_left)===0;
    const sameSeason=before?.season!=null&&now?.season!=null&&String(before.season)===String(now.season);
    const comparable=calibrated&&before?.status==='ok'&&number(before?.calibration_battles_left)===0&&sameSeason&&score!==null&&start!==null;
    return {current:calibrated?score:null,start:comparable?start:null,change:comparable?score-start:null,
      calibration:number(now?.calibration_battles_left),status:now?.status||'unavailable',sameSeason,
      partial:!!before?.partial,trackingSince:before?.tracking_since||s?.started_at,updatedAt:now?.updated_at||null};
  }
  function tanks(s,mode='all') {
    const base=s?.baseline?.tanks,latest=s?.latest?.tanks;
    if(!Array.isArray(base)||!Array.isArray(latest)) return {rows:[],unavailable:true,ratingAvailable:false};
    const start=new Map(base.map(t=>[String(t.tank_id),t]));
    const ratingAvailable=mode!=='rating'||(base.some(t=>t.rating)&&latest.some(t=>t.rating));
    if(!ratingAvailable) return {rows:[],unavailable:false,ratingAvailable:false};
    const rows=[];
    for(const t of latest) {
      const id=String(t.tank_id),old=start.get(id);
      // A vehicle absent from a complete baseline was first played during this session.
      const zero=Object.fromEntries(fields.map(k=>[k,0]));
      const complete=s.baseline.tanks_complete===true||(s.baseline.tanks_complete!==false&&base.length<1200);
      const before=old?.[mode]||(!old&&complete?zero:{});
      const d=delta(t[mode],before);
      if(d.battles>0) rows.push({id,name:t.name||old?.name||null,...d});
    }
    return {rows:rows.sort((a,b)=>b.damage-a.damage||b.battles-a.battles||a.id.localeCompare(b.id)),unavailable:false,ratingAvailable:true};
  }
  function activeTanks(s) {
    if(!Array.isArray(s?.latest?.tanks)) return [];
    const start=new Map((s.baseline?.tanks||[]).map(t=>[String(t.tank_id),t]));
    const began=new Date(s.started_at).getTime()/1000;
    return s.latest.tanks.filter(t=>{
      const time=number(t.last_battle_time),previous=number(start.get(String(t.tank_id))?.last_battle_time);
      return time!==null&&time>=began&&(previous===null||time>previous);
    }).map(t=>({id:String(t.tank_id),name:t.name||null,lastBattle:t.last_battle_time}));
  }
  return Object.freeze({number,ratio,wrClass,delta,sessionDelta,rating,tanks,activeTanks,fields});
});
