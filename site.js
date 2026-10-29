// Kranenburg Power Advisors: small behaviours shared by every page
(function(){
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};

  // Opened straight from disk, folder links need index.html to resolve
  if(location.protocol==='file:'){
    $$('a[href]').forEach(function(a){
      var h=a.getAttribute('href');
      if(/^(?!https?:|mailto:|#)([^#?]*\/)?(#.*)?$/.test(h)){
        var parts=h.split('#');a.setAttribute('href',(parts[0]||'./')+'index.html'+(parts[1]?'#'+parts[1]:''));
      }
    });
  }

  // Mobile menu
  var btn=$('.menu-btn'),menu=$('#menu');
  if(btn&&menu){
    btn.addEventListener('click',function(){
      var open=menu.classList.toggle('open');
      btn.setAttribute('aria-expanded',open?'true':'false');
      btn.textContent=open?'Close':'Menu';
    });
  }

  // Findings walls: a stone fills the reading slit beside it
  $$('.wall-zone').forEach(function(zone){
    var wall=$('.wall',zone),stones=$$('.stone',wall),slit=$('.slit',zone),pdf=zone.getAttribute('data-pdf');
    function pick(s,scroll){
      stones.forEach(function(o){o.setAttribute('aria-pressed',o===s?'true':'false')});
      if(slit){
        var m=$('.more',s),page=s.getAttribute('data-page');
        $('.slit-fig',slit).textContent=$('.fig',s).textContent;
        $('h3',slit).textContent=$('.h',m).textContent;
        $('.slit-p',slit).textContent=$('.p',m).textContent;
        $('.src',slit).textContent=$('.src',m).textContent;
        var a=$('.slit-page',slit);a.href=pdf+'#page='+page;a.textContent='Read it on page '+page;
        var cp=$('.slit-copy',slit);if(cp)cp.setAttribute('data-id',s.id);
      }
      if(scroll){
        var target=(slit&&getComputedStyle(slit).display!=='none')?slit:s;
        var r=target.getBoundingClientRect();
        if(r.top<80||r.bottom>innerHeight)target.scrollIntoView({behavior:'smooth',block:'center'});
      }
    }
    if(slit){
      var cp=document.createElement('button');cp.type='button';cp.className='slit-copy';cp.textContent='Copy link to this finding';
      cp.setAttribute('data-id',stones[0]&&stones[0].id);
      cp.addEventListener('click',function(){
        var u=location.origin+'/findings/#'+cp.getAttribute('data-id');
        var ok=function(){cp.textContent='Link copied';setTimeout(function(){cp.textContent='Copy link to this finding'},2000)};
        if(navigator.clipboard)navigator.clipboard.writeText(u).then(ok,function(){prompt('Copy this link:',u)});else prompt('Copy this link:',u);
      });
      $('.slit-links',slit).appendChild(cp);
    }
    stones.forEach(function(s){
      var tag=document.createElement('span');tag.className='pg';tag.textContent='Page '+s.getAttribute('data-page')+' of the brief';
      $('.more',s).appendChild(tag);
      s.addEventListener('click',function(){pick(s)});
    });

    // Theme filters
    var chips=$$('.chip',zone.parentNode);
    chips.forEach(function(c){
      c.addEventListener('click',function(){
        var t=c.getAttribute('data-theme');
        chips.forEach(function(o){o.setAttribute('aria-pressed',o===c?'true':'false')});
        wall.classList.toggle('filtered',t!=='all');
        var first=null;
        stones.forEach(function(s){
          var show=t==='all'||s.getAttribute('data-theme')===t;
          s.hidden=!show; if(show&&!first)first=s;
        });
        if(first)pick(first);
      });
    });

    // Random finding
    var sh=$('.shuffle',zone.parentNode);
    if(sh)sh.addEventListener('click',function(){
      var pool=stones.filter(function(s){return !s.hidden&&s.getAttribute('aria-pressed')!=='true'});
      if(pool.length)pick(pool[Math.floor(Math.random()*pool.length)],true);
    });

    // Deep link to one finding: findings/#turbine-2031
    if(location.hash){var hit=document.getElementById(location.hash.slice(1));if(hit&&stones.indexOf(hit)>-1)pick(hit);}
  });

  // Countdowns on the desk
  var today=new Date();today.setHours(0,0,0,0);
  $$('[data-date]').forEach(function(el){
    var d=new Date(el.getAttribute('data-date')+'T00:00:00'),days=Math.round((d-today)/864e5);
    el.textContent=days>1?'In '+days+' days':days===1?'Tomorrow':days===0?'Today':(-days)+(days===-1?' day ago':' days ago');
    el.classList.add(days<0?'past':days<=14?'soon':'later');
  });

  // Brief page tabs
  var tabs=$$('.tab[role="tab"]');
  if(tabs.length){
    function show(id,focus){
      tabs.forEach(function(t){
        var on=t.getAttribute('aria-controls')===id;
        t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;
        document.getElementById(t.getAttribute('aria-controls')).hidden=!on;
        if(on&&focus)t.focus();
      });
    }
    tabs.forEach(function(t,i){
      t.addEventListener('click',function(){
        var id=t.getAttribute('aria-controls');show(id);
        history.replaceState(null,'','#'+id.replace('panel-',''));
        var bar=$('.tabs');if(bar.getBoundingClientRect().top<0||scrollY>bar.offsetTop)scrollTo({top:bar.offsetTop-72,behavior:'smooth'});
      });
      t.addEventListener('keydown',function(e){
        var k=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;
        if(k){e.preventDefault();var n=tabs[(i+k+tabs.length)%tabs.length];show(n.getAttribute('aria-controls'),true);}
      });
    });
    $$('[data-open-tab]').forEach(function(a){
      a.addEventListener('click',function(e){e.preventDefault();var t=$('#tab-'+a.getAttribute('data-open-tab'));if(t)t.click();});
    });
    var start=location.hash&&document.getElementById('panel-'+location.hash.slice(1));
    show(start?start.id:tabs[0].getAttribute('aria-controls'));
  }

  // Story rail follows the chapter in view
  var railLinks=$$('.story-rail a');
  if(railLinks.length&&'IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){railLinks.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id)})}
      });
    },{rootMargin:'-30% 0px -60% 0px'});
    $$('.chapter').forEach(function(c){io.observe(c)});
  }
})();

// Copy buttons: citation text or the page link
(function(){
  [].slice.call(document.querySelectorAll('.copy')).forEach(function(b){
    var label=b.textContent;
    b.addEventListener('click',function(){
      var sel=b.getAttribute('data-copy'),text=sel?document.querySelector(sel).textContent:location.href.split('#')[0];
      var done=function(){b.textContent=b.getAttribute('data-done');b.classList.add('done');setTimeout(function(){b.textContent=label;b.classList.remove('done')},2200)};
      if(navigator.clipboard)navigator.clipboard.writeText(text).then(done,function(){prompt('Copy this:',text)});
      else prompt('Copy this:',text);
    });
  });
})();

// Site search: press / or Cmd/Ctrl+K, or the Search button
(function(){
  var btn=document.querySelector('.search-btn');if(!btn||location.protocol==='file:')return;
  var dlg=document.createElement('div');dlg.className='search-dlg';dlg.setAttribute('role','dialog');dlg.setAttribute('aria-modal','true');dlg.setAttribute('aria-label','Search kpa.energy');
  dlg.innerHTML='<div class="search-box"><input type="search" placeholder="Search briefs, findings, calls, terms" aria-label="Search" autocomplete="off"><ul class="search-res" role="listbox"></ul><div class="search-foot"><span>Enter to open, arrows to move</span><span>Esc to close</span></div></div>';
  document.body.appendChild(dlg);
  var input=dlg.querySelector('input'),list=dlg.querySelector('.search-res'),idx=null,sel=0,hits=[],last=null;
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function load(cb){if(idx)return cb();fetch('/search-index.json').then(function(r){return r.json()}).then(function(j){idx=j;cb()}).catch(function(){idx=[];cb()})}
  function render(){
    var q=input.value.toLowerCase().trim(),words=q.split(/\s+/).filter(Boolean);
    hits=!words.length?idx.filter(function(i){return i.k==='Page'||i.k.indexOf('Brief')===0}).slice(0,10):
      idx.map(function(i){var t=(i.t+' '+i.k+' '+i.d).toLowerCase(),sc=0;
        for(var w=0;w<words.length;w++){var p=t.indexOf(words[w]);if(p<0)return null;sc+=(i.t.toLowerCase().indexOf(words[w])>=0?2:1)}
        return{i:i,s:sc}}).filter(Boolean).sort(function(a,b){return b.s-a.s}).slice(0,12).map(function(x){return x.i});
    sel=0;
    list.innerHTML=hits.length?hits.map(function(h,n){return '<li><a href="'+esc(h.u)+'" role="option" aria-selected="'+(n===0)+'"><span class="k">'+esc(h.k)+'</span><span class="t">'+esc(h.t)+'</span><span class="d">'+esc(h.d)+'</span></a></li>'}).join(''):'<li><p class="search-empty">No matches. Try a number, a company or a term, such as PJM, turbine or 2031.</p></li>';
  }
  function move(d){var a=list.querySelectorAll('a');if(!a.length)return;a[sel].setAttribute('aria-selected','false');sel=(sel+d+a.length)%a.length;a[sel].setAttribute('aria-selected','true');a[sel].scrollIntoView({block:'nearest'})}
  function open(){last=document.activeElement;dlg.classList.add('open');load(function(){render();input.focus()})}
  function close(){dlg.classList.remove('open');input.value='';if(last)last.focus()}
  btn.addEventListener('click',open);
  dlg.addEventListener('click',function(e){if(e.target===dlg)close()});
  input.addEventListener('input',render);
  input.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){e.preventDefault();move(1)}else if(e.key==='ArrowUp'){e.preventDefault();move(-1)}
    else if(e.key==='Enter'){var a=list.querySelectorAll('a')[sel];if(a){e.preventDefault();location.href=a.href;close()}}
    else if(e.key==='Escape'){close()}
  });
  document.addEventListener('keydown',function(e){
    var t=e.target.tagName;if(dlg.classList.contains('open'))return;
    if((e.key==='/'&&t!=='INPUT'&&t!=='TEXTAREA')||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k')){e.preventDefault();open()}
  });
  // Opening a finding from search on the same page: select its stone
  window.addEventListener('hashchange',function(){var h=document.getElementById(location.hash.slice(1));if(h&&h.classList.contains('stone'))h.click()});
})();
