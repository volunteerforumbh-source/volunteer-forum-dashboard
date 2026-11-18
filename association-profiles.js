/* Public directory presentation only: no Firebase, membership changes or writes. */
export function normalizeAssociationSearch(value){
  return String(value??'').normalize('NFKC').toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا')
    .replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').trim();
}

export function associationNewsMatches(status,ids,associationId){
  return status==='approved' && /^[a-z]+(?:-[a-z]+)*$/.test(associationId)
    && String(ids??'').split(/\s+/).includes(associationId);
}

if(typeof document!=='undefined'){
  function openLinkedAssociationNews(){
    if(document.documentElement.dataset.section!=='news')return;
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
    const target=document.getElementById(id);
    if(!target?.matches('#archive-news > li > details[id],#forum-report,#news-associations'))return;
    for(let panel=target.closest('details');panel;panel=panel.parentElement?.closest('details'))panel.open=true;
    requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
  }
  window.addEventListener('hashchange',openLinkedAssociationNews);openLinkedAssociationNews();
  function initializeDirectory(directory,inputId,countId,sectionName){
    const profiles=[...directory.querySelectorAll(':scope > .association-profile')];
    const selector='.association-profile,.association-panel';
    const input=document.getElementById(inputId);
    const count=document.getElementById(countId);
    function closePeers(panel){
      for(const sibling of panel.parentElement.children){
        if(sibling!==panel && sibling.matches(selector))sibling.open=false;
      }
    }
    function filter(){
      const query=normalizeAssociationSearch(input.value);
      let visible=0;
      for(const profile of profiles){
        profile.hidden=!normalizeAssociationSearch(profile.querySelector('summary strong').textContent).includes(query);
        if(profile.hidden)profile.open=false;else visible++;
      }
      count.textContent=visible?'الجمعيات · '+visible:'لا توجد نتائج مطابقة.';
    }
    input.addEventListener('input',filter);
    directory.addEventListener('toggle',event=>{
      if(event.target.matches(selector)&&event.target.open)closePeers(event.target);
    },true);
    directory.addEventListener('click',event=>{
      const summary=event.target.closest('summary');
      const panel=summary?.parentElement;
      if(!panel?.matches(selector))return;
      requestAnimationFrame(()=>{
        if(!panel.open)return;
        const url=new URL(location.href);url.hash=panel.id;history.replaceState(null,'',url);
      });
    });
    function openLinkedProfile(){
      // A hash from another portal page must not change this directory's state.
      if(document.documentElement.dataset.section!==sectionName)return;
      let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
      const target=document.getElementById(id);
      if(!target||!directory.contains(target))return;
      const profile=target.closest('.association-profile');
      if(!profile)return;
      input.value='';filter();closePeers(profile);profile.open=true;
      for(let parent=profile.parentElement?.closest('details');parent;parent=parent.parentElement?.closest('details'))parent.open=true;
      const panel=target.closest('.association-panel');
      if(panel){closePeers(panel);panel.open=true;}
      requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
    }
    // Reuse the already-published archive DOM. No second news store, fuzzy names,
    // unmoderated records, embedded rating forms or other associations' news.
    const archive=[...document.querySelectorAll('#archive-news > li')];
    for(const container of directory.querySelectorAll('[data-association-news]')){
      const matches=archive.filter(row=>associationNewsMatches(row.dataset.publicationStatus,row.dataset.associationIds,container.dataset.associationNews));
      const list=document.createElement('ul');list.className='association-related-news';
      for(const row of matches){
        const original=row.querySelector(':scope > details');
        const title=original?.querySelector(':scope > summary strong');
        const date=original?.querySelector(':scope > summary time');
        if(!original?.id||!title||!date)continue;
        const item=document.createElement('li'),link=document.createElement('a');
        link.href='?section=news#'+encodeURIComponent(original.id);link.textContent=title.textContent;
        item.append(link,date.cloneNode(true));list.append(item);
      }
      container.replaceChildren();
      if(list.children.length)container.append(list);
      else{const p=document.createElement('p');p.className='association-note';p.textContent='لم تُربط أخبار منشورة ومعتمدة بهذه الجمعية بعد.';container.append(p);}
    }
    filter();window.addEventListener('hashchange',openLinkedProfile);openLinkedProfile();
  }
  const canonical=document.getElementById('association-directory');
  if(canonical){
    initializeDirectory(canonical,'association-search','association-count','associations');
    if(document.documentElement.dataset.section==='news'){
      // A second view of the SAME HTML records, not another directory data source.
      const news=document.getElementById('news-association-directory');
      const copies=[...canonical.children].map(profile=>{
        const copy=profile.cloneNode(true);copy.open=false;copy.hidden=false;
        for(const element of [copy,...copy.querySelectorAll('[id],[name]')]){
          if(element.id)element.id='news-'+element.id;
          if(element.hasAttribute('name'))element.setAttribute('name','news-'+element.getAttribute('name'));
          if(element.matches('details'))element.open=false;
        }
        for(const link of copy.querySelectorAll('a[href^="?section=associations#association-"]'))link.href=link.getAttribute('href').replace('?section=associations#association-','?section=news#news-association-');
        return copy;
      });
      news.replaceChildren(...copies);
      document.querySelector('#news-associations .association-news-links').hidden=true;
      document.getElementById('news-association-browser').hidden=false;
      initializeDirectory(news,'news-association-search','news-association-count','news');
    }
  }
}
