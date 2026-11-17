/* Public, static speaker content. No authentication, network writes, or tracking. */
(() => {
  'use strict';
  const directory=document.querySelector('.speaker-directory');
  if(!directory)return;
  const selector='.speaker-profile,.speaker-panel,.speaker-report-axis';
  function closePeers(panel){
    for(const sibling of panel.parentElement.children){
      if(sibling!==panel && sibling.matches?.(selector))sibling.open=false;
    }
  }
  // Also works on browsers that do not support the details `name` attribute.
  directory.addEventListener('toggle',event=>{
    const panel=event.target;
    if(panel.matches(selector)&&panel.open)closePeers(panel);
  },true);
  directory.addEventListener('click',event=>{
    const summary=event.target.closest('summary');
    const panel=summary?.parentElement;
    if(!panel?.matches(selector)||panel.open)return;
    requestAnimationFrame(()=>{
      if(!panel.open)return;
      const url=new URL(location.href);url.hash=panel.id;
      history.replaceState(null,'',url);
      summary.scrollIntoView({block:'nearest'});
    });
  });
  function openSpeakerProfile(){
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
    const target=document.getElementById(id);
    if(!target?.closest('.speaker-profile') && target?.id!=='forum-evaluation')return;
    const chain=[];
    for(let panel=target.closest('details');panel;panel=panel.parentElement?.closest('details'))chain.unshift(panel);
    for(const panel of chain){if(panel.matches(selector))closePeers(panel);panel.open=true;}
    requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
  }
  window.addEventListener('hashchange',openSpeakerProfile);
  openSpeakerProfile();
})();
