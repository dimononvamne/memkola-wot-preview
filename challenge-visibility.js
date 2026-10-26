/* MEMKOLA v1.45: hide challenge links while no public event is live. */
(()=>{
  const root=document.documentElement;
  const endpoint='./api/challenges/visibility';
  async function check(){
    let show=false;
    try{
      const result=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!result.ok)throw Error('Visibility offline');
      const state=await result.json();
      show=state.visible===true;
      // Keep the link accessible for an existing verified admin when the board is hidden.
      if(!show){
        const base=window.TANK_TIER_CONFIG?.supabaseUrl||'https://gpnniabhigncnaeeuztn.supabase.co';
        if(base){
          const key='sb-'+new URL(base).hostname.split('.')[0]+'-auth-token';
          let session=null;
          try{session=JSON.parse(localStorage.getItem(key)||'null');}catch{}
          const token=session?.access_token;
          if(typeof token==='string'&&token.length>20){
            const auth=await fetch('./api/challenges/access',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(8000)});
            if(auth.ok)show=(await auth.json()).admin===true;
          }
        }
      }
    }catch{show=false;}
    root.classList.toggle('challenge-nav-shown',show);
  }
  check();
  setInterval(()=>{if(!document.hidden)check()},10000);
  window.addEventListener('focus',check);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
})();
