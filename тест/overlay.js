/* v17: public, read-only OBS source. No owner tokens; share link contains appearance only. */
(()=>{
 'use strict';
 const W=window.MemkolaWidget,root=document.getElementById('overlay-root'),s=W.fromSearch(location.search);
 let session=null,fetching=false,failures=0;
 function message(t){root.replaceChildren();const box=document.createElement('div');box.style.cssText='background:rgba(13,23,36,.9);color:#fff;border:1px solid #d99c54;border-radius:12px;padding:12px;font:700 14px Arial,sans-serif';box.textContent='MEMKOLA · '+t;root.append(box);}
 async function load(action='get'){
  if(fetching||!s.id)return;fetching=true;
  try{const result=await W.api(action,{session_id:s.id});if(!result.session)throw new Error('Сессия не найдена');session=result.session;failures=0;W.draw(root,s,session);}
  catch(e){failures++;if(session)W.draw(root,s,session,{error:failures>=3?'Нет связи с сервером. Показаны последние данные.':''});else message(e.message||'Ошибка загрузки');}
  finally{fetching=false;}
 }
 if(!s.id){message('Нет ID сессии. Получи ссылку в конструкторе /widgets.html.');return;}
 load();setInterval(()=>load('refresh'),95000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load('get')});
})();
