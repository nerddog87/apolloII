(function(){
  function qs(name){ return new URLSearchParams(window.location.search).get(name); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]; }); }

  const slug = qs('thread') || 'announcements';
  const THREADS = {
    'announcements':'Announcements',
    'updates':'Updates',
    'download-client':'Download Client',
    'general-talk':'General Talk',
    'questions-faq':'Questions / FAQ'
  };
  const title = THREADS[slug] || slug.replace(/[-_]/g,' ');

  function loadPosts(){
    try{
      const raw = localStorage.getItem('thread_' + slug) || '[]';
      return JSON.parse(raw);
    }catch(e){ return []; }
  }
  function savePosts(posts){
    try{ localStorage.setItem('thread_' + slug, JSON.stringify(posts)); }catch(e){}
  }

  function render(){
    const container = document.getElementById('thread-container');
    const posts = loadPosts();
    document.getElementById('thread-title').textContent = title;
    const list = document.getElementById('posts');
    list.innerHTML = '';
    if(posts.length===0){ list.innerHTML = '<div class="no-posts">No posts yet. Be the first to post!</div>'; return; }
    for(const p of posts){
      const item = document.createElement('article');
      item.className = 'post';
      const meta = document.createElement('div'); meta.className='post-meta';
      meta.innerHTML = '<strong>'+escapeHtml(p.author||'Guest')+'</strong> • <span class="time">'+new Date(p.time).toLocaleString()+'</span>';
      const body = document.createElement('div'); body.className='post-body';
      body.innerHTML = '<p>'+escapeHtml(p.text).replace(/\n/g,'<br/>')+'</p>';
      item.appendChild(meta); item.appendChild(body);
      list.appendChild(item);
    }
  }

  function initForm(){
    const form = document.getElementById('post-form');
    const author = document.getElementById('post-author');
    const textarea = document.getElementById('post-text');
    // default author from storage if available
    try{ const storedUser = localStorage.getItem('meow_user'); if(storedUser) author.value = storedUser; }catch(e){}
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const a = author.value.trim()||'Guest';
      const t = textarea.value.trim();
      if(!t) return alert('Please write a message.');
      const posts = loadPosts();
      posts.unshift({author:a,text:t,time:Date.now()});
      savePosts(posts);
      textarea.value = '';
      render();
    });
  }

  // protect page - require login like index
  (function protect(){
    try{
      var params = new URLSearchParams(window.location.search);
      if(params.get('autologin') === '1'){
        try{ localStorage.setItem('meow_logged_in','1'); }catch(e){}
        params.delete('autologin');
        var newUrl = window.location.pathname + (params.toString()? '?' + params.toString(): '') + window.location.hash;
        history.replaceState(null, '', newUrl);
      }
      var logged = localStorage.getItem('meow_logged_in');
      if(logged !== '1'){
        var next = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
        window.location.replace('login.html?required=1&next=' + next);
      }
    }catch(e){}
  })();

  document.addEventListener('DOMContentLoaded', function(){
    var ttitle = document.getElementById('thread-title'); if(ttitle) ttitle.textContent = title;
    initForm(); render();
  });
})();
