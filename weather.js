(function(){
  const canvas = document.getElementById('weather-canvas');
  const ctx = canvas.getContext('2d');
  let w=0,h=0,dpr=1;
  let particles = [];
  let mode = null; // 'rain' | 'snow' | null
  let speedMultiplier = 1.0;
  let rafId = null;

  function resize(){
    dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function rand(min,max){ return Math.random()*(max-min)+min }

  function createRain(count){
    particles = [];
    for(let i=0;i<count;i++){
      particles.push({
        x: Math.random()*w,
        y: Math.random()*h,
        len: rand(10,24),
        speed: rand(300,900)/1000,
        thickness: rand(0.8,1.6),
        sway: rand(-0.5,0.5)
      });
    }
  }

  function createSnow(count){
    particles = [];
    for(let i=0;i<count;i++){
      particles.push({
        x: Math.random()*w,
        y: Math.random()*h,
        r: rand(0.8,3.4),
        // slower base speeds for gentler snowfall
        speed: rand(5,10)/5000,
        drift: rand(-0.4,0.4),
        angle: Math.random()*Math.PI*2
      });
    }
  }

  let last = performance.now();
  // pointer state for interaction
  let pointer = { x: -9999, y: -9999, active: false };
  const POINTER_RADIUS = 100; // pixels
  const POINTER_STRENGTH = 0.9; // effect multiplier
  // trail particles for RGB pointer trail
  let trailParticles = [];
  const TRAIL_MAX = 80;
  const TRAIL_DECAY = 0.035;
  function loop(now){
    const dt = Math.min(50, now - last);
    last = now;
    ctx.clearRect(0,0,w,h);

    if(mode==='rain'){
      ctx.strokeStyle = 'rgba(160,200,230,0.75)';
      ctx.lineCap = 'round';
      for(const p of particles){
        p.y += p.speed * dt * 1.5 * 60 * speedMultiplier; // scale to pixels/frame
        p.x += p.sway * (p.speed*dt*0.06) * 60 * speedMultiplier;
        if(p.y>h+20){ p.y = -20; p.x = Math.random()*w }
        ctx.lineWidth = p.thickness;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.sway*6, p.y + p.len);
        ctx.stroke();
      }
    } else if(mode==='snow'){
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for(const p of particles){
        p.y += p.speed * dt * 1.7 * 60 * speedMultiplier;
        p.x += Math.sin(p.angle) * p.drift * (dt*0.06) * 60 * speedMultiplier;
        p.angle += 0.01 * (dt/16);
        // pointer interaction: repel particles within radius
        if(pointer.active){
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist2 = dx*dx + dy*dy;
          const rad = POINTER_RADIUS;
          if(dist2 < rad*rad){
            const dist = Math.sqrt(dist2) || 0.0001;
            const force = (1 - (dist / rad)) * POINTER_STRENGTH;
            // apply stronger lateral push and a smaller vertical nudge
            const pushX = (dx / dist) * force * 60 * speedMultiplier * (dt/16);
            const pushY = (dy / dist) * force * 16 * speedMultiplier * (dt/16);
            p.x += pushX;
            p.y += pushY;
          }
        }
        if(p.y>h+10){ p.y = -10; p.x = Math.random()*w }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
      }
    }

    // draw pointer RGB trail on top (only if enabled)
    try{
      var trailEnabled = (localStorage.getItem('meow_trail_enabled') === '1');
    }catch(e){ var trailEnabled = false }
    if(!trailEnabled){ if(trailParticles.length) trailParticles.length = 0; }
    if(trailEnabled && trailParticles.length){
      for(let i = trailParticles.length-1; i>=0; i--){
        const t = trailParticles[i];
        // fade and grow slightly
        t.life -= (TRAIL_DECAY * (dt/16));
        if(t.life <= 0){ trailParticles.splice(i,1); continue; }
        t.hue = (t.hue + 1.2) % 360;
        ctx.beginPath();
        ctx.fillStyle = 'hsla(' + Math.round(t.hue) + ',100%,60%,' + (t.life * 0.9) + ')';
        ctx.arc(t.x, t.y, t.r * (1 + (1 - t.life) * 0.6), 0, Math.PI*2);
        ctx.fill();
      }
    }

    rafId = requestAnimationFrame(loop);
  }

  function startWeather(t){
    if(t===mode) return;
    mode = t;
    cancelAnimationFrame(rafId);
    if(mode==='rain'){
      createRain(Math.round((w/1000)*300));
      last = performance.now();
      rafId = requestAnimationFrame(loop);
    } else if(mode==='snow'){
      createSnow(Math.round((w/1000)*160));
      last = performance.now();
      rafId = requestAnimationFrame(loop);
    } else {
      // clear
      particles = [];
      ctx.clearRect(0,0,w,h);
    }
  }

  function setSpeed(mult){
    speedMultiplier = Math.max(0.1, Number(mult) || 1);
  }

  function hookupControls(){
    const toggle = document.querySelector('.weather-toggle');
    const panel = document.querySelector('.weather-panel');
    const select = document.getElementById('weather-select');
    const range = document.getElementById('weather-speed');
    const speedDisplay = document.getElementById('speed-display');

    if(toggle && panel){
      toggle.addEventListener('click', ()=>{
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        panel.setAttribute('aria-hidden', String(open));
        if(!open) toggle.closest('.weather-widget')?.classList.add('open'); else toggle.closest('.weather-widget')?.classList.remove('open');
      });
    }

    if(select){
      select.addEventListener('change', (e)=>{
        const val = e.target.value;
        if(val === 'clear') startWeather(null); else startWeather(val);
      });
    }

    if(range){
      range.addEventListener('input', (e)=>{
        const v = parseFloat(e.target.value);
        setSpeed(v);
        if(speedDisplay) speedDisplay.textContent = v.toFixed(1) + 'x';
      });
    }

    // pointer handlers for interaction
    function updatePointer(e){
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX !== undefined) ? e.clientX - rect.left : (e.touches && e.touches[0] ? e.touches[0].clientX - rect.left : -9999);
      const y = (e.clientY !== undefined) ? e.clientY - rect.top : (e.touches && e.touches[0] ? e.touches[0].clientY - rect.top : -9999);
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      // add a trail particle at the pointer (only if enabled)
      try{
        if(localStorage.getItem('meow_trail_enabled') === '1'){
          trailParticles.push({ x: pointer.x, y: pointer.y, r: rand(2,6), life: 1.0, hue: (Date.now() / 8) % 360 });
          if(trailParticles.length > TRAIL_MAX) trailParticles.splice(0, trailParticles.length - TRAIL_MAX);
        }
      }catch(e){}
    }
    function clearPointer(){ pointer.active = false; pointer.x = -9999; pointer.y = -9999 }
    // listen on document so pointer detection works even when the canvas has pointer-events:none
    document.addEventListener('mousemove', updatePointer);
    document.addEventListener('mouseleave', clearPointer);
    document.addEventListener('touchstart', updatePointer, {passive:true});
    document.addEventListener('touchmove', updatePointer, {passive:true});
    document.addEventListener('touchend', clearPointer);
  }

  // react to trail toggle events (custom event or storage changes) to clear trail when disabled
  try{
    window.addEventListener('meow:trail-toggled', function(ev){ if(!ev.detail) trailParticles.length = 0; });
    window.addEventListener('storage', function(ev){ if(ev.key === 'meow_trail_enabled' && ev.newValue !== '1'){ trailParticles.length = 0; } });
  }catch(e){}

  window.addEventListener('resize', ()=>{
    resize();
  });

  // init
  function init(){
    if(!canvas) return;
    resize();
    hookupControls();
  }

  // expose simple API
  window.WeatherEffects = {
    start: startWeather,
    stop: ()=>startWeather(null),
    setSpeed
  };

  document.addEventListener('DOMContentLoaded', init);
})();
