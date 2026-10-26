/* MEMKOLA visits v1.40 — counts browsers, never page views; anonymous to the site owner. */
(() => {
  'use strict';
  const VISITOR_KEY='memkola_visit_id_v1';
  const CHECK_KEY='memkola_visit_last_record_v1';
  const dayMsk = () => new Date(Date.now()+3*60*60*1000).toISOString().slice(0,10);
  try {
    if (!window.crypto?.randomUUID || !navigator.onLine) return;
    // Internal embedded stream views should not count as visits; this file
    // is included only in normal pages, not in OBS overlays or admin tools.
    let visitorId=localStorage.getItem(VISITOR_KEY);
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(!visitorId || !uuid.test(visitorId)) {
      visitorId=crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY,visitorId);
    }
    const day=dayMsk();
    const last=JSON.parse(sessionStorage.getItem(CHECK_KEY)||'null');
    if(last && last.id===visitorId && last.day===day && Date.now()-last.ts<30*60*1000) return;
    fetch('/api/visits/record', {
      method:'POST',headers:{'Content-Type':'application/json'},
      credentials:'same-origin',keepalive:true,
      body:JSON.stringify({visitorId})
    }).then(r => {if(r.ok) sessionStorage.setItem(CHECK_KEY,JSON.stringify({id:visitorId,day,ts:Date.now()}));})
      .catch(() => {}); // Offline or unconfigured D1 must never break the site.
  } catch (_) { /* Private browsing and blocked storage remain supported. */ }
})();
