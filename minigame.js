(function(){
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl  = document.getElementById('best');
  const startBtn = document.getElementById('startBtn');

  const W = 700, H = 200;
  const GROUND = H - 30;

  let state = 'idle'; // idle | running | dead
  let score = 0, best = 0, frame = 0;
  let obstacles = [], speed = 4, nextObstacle = 80;
  let coralToggle = 0; // alternates pink / yellow coral

  // ── Fish (replace clouds) ──────────────────────────────────────
  // Each fish has a position, scale, swim speed, direction, and color.
  let fish = [
    { x: 150, y: 38, scale: 1,   speed: 0.5, flip: false, color: '#f9a94b' },
    { x: 380, y: 22, scale: 0.7, speed: 0.7, flip: true,  color: '#f06090' },
    { x: 580, y: 50, scale: 0.9, speed: 0.4, flip: false,  color: '#7ec8e3' },
    { x: 60,  y: 62, scale: 0.6, speed: 0.6, flip: true,  color: '#f9a94b' },
    { x: 500, y: 15, scale: 0.8, speed: 0.55,flip: false, color: '#b39ddb' },
  ];

  // ── Shark (Blåhaj) ─────────────────────────────────────────────
  const dino = {
    x: 55, y: GROUND, w: 48, h: 28,
    vy: 0, onGround: true,

    jump() {
      if (this.onGround) { this.vy = -12; this.onGround = false; }
    },

    update() {
      this.vy += 0.6; // gravity
      this.y  += this.vy;
      if (this.y >= GROUND) { this.y = GROUND; this.vy = 0; this.onGround = true; }
    },

    draw() {
      const cx  = this.x + this.w / 2;
      const cy  = this.y - this.h / 2;
      const bob = this.onGround ? Math.sin(frame * 0.25) * 1.5 : 0;

      ctx.save();
      ctx.translate(cx, cy + bob);

      const blue  = '#4a8fc1';
      const belly = '#d8ecf7';

      // tail fin
      ctx.fillStyle = blue;
      ctx.beginPath();
      ctx.moveTo(-this.w/2 + 2,  0);
      ctx.lineTo(-this.w/2 - 12, -15);
      ctx.lineTo(-this.w/2 - 4,   2);
      ctx.lineTo(-this.w/2 - 12,  22);
      ctx.closePath();
      ctx.fill();

      // body
      ctx.fillStyle = blue;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.w/2, this.h/2, 0, 0, Math.PI * 2);
      ctx.fill();

      // belly patch
      ctx.fillStyle = belly;
      ctx.beginPath();
      ctx.ellipse(6, 3, this.w/2 - 10, this.h/2 - 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // dorsal fin — centered on body
      ctx.fillStyle = blue;
      ctx.beginPath();
      ctx.moveTo(-9, -this.h/2 + 1);
      ctx.lineTo( 1, -this.h/2 - 14 + 1);
      ctx.lineTo( 9, -this.h/2 + 1);
      ctx.closePath();
      ctx.fill();

      // snout
      ctx.fillStyle = blue;
      ctx.beginPath();
      ctx.ellipse(this.w/2 + 2, -1, 10, 8, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // eye
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(this.w/2 - 2, -5, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // eye highlight
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.w/2 - 1, -6, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  };

  // ── Reset ──────────────────────────────────────────────────────
  function reset() {
    dino.y = GROUND; dino.vy = 0; dino.onGround = true;
    obstacles = []; speed = 4; score = 0; frame = 0; nextObstacle = 80;
  }

  // ── Draw fish (pixel-art style using filled rectangles) ────────
  function drawFish(f) {
    const s  = f.scale * 4; // size of each "pixel"
    const x  = Math.round(f.x);
    const y  = Math.round(f.y);

    // 7×5 pixel body grid
    const body = [
      [0,0,1,1,1,0,0],
      [0,1,1,1,1,1,0],
      [1,1,1,1,1,1,1],
      [0,1,1,1,1,1,0],
      [0,0,1,1,1,0,0],
    ];

    // 3×5 pixel tail grid (sits to the left of body)
    const tail = [
      [1,0,0],
      [1,1,0],
      [1,1,1],
      [1,1,0],
      [1,0,0],
    ];

    const ox = x - Math.round(5 * s);
    const oy = y - Math.round(2.5 * s);

    ctx.save();
    // flip direction by mirroring around the fish's x center
    if (f.flip) { ctx.translate(x, y); ctx.scale(-1, 1); ctx.translate(-x, -y); }

    ctx.fillStyle = f.color;
    tail.forEach((row, ry) => row.forEach((v, rx) => {
      if (v) ctx.fillRect(ox - 3*s + rx*s, oy + ry*s, s, s);
    }));
    body.forEach((row, ry) => row.forEach((v, rx) => {
      if (v) ctx.fillRect(ox + rx*s, oy + ry*s, s, s);
    }));

    // eye pixel
    ctx.fillStyle = '#111';
    ctx.fillRect(ox + 5*s, oy + s, s, s);

    ctx.restore();
  }

  // ── Draw sandy ocean floor ─────────────────────────────────────
  function drawGround() {
    // sand fill
    ctx.fillStyle = '#d4b483';
    ctx.fillRect(0, GROUND + 2, W, H - (GROUND + 2));

    // scrolling sand grain texture
    ctx.fillStyle = '#c9a870';
    for (let i = 0; i < W; i += 18) {
      ctx.fillRect(i + ((frame * 0.3 | 0) % 18), GROUND + 5, 3, 2);
    }
    ctx.fillStyle = '#b8966a';
    for (let i = 0; i < W; i += 28) {
      ctx.fillRect(i + ((frame * 0.2 | 0) % 28) + 6, GROUND + 9, 2, 1);
    }

    // ground edge line
    ctx.fillStyle = '#c4a070';
    ctx.fillRect(0, GROUND + 2, W, 2);
  }

  // ── Draw coral (alternates pink / yellow) ──────────────────────
  function drawCoral(o) {
    const { x, y: bot, h, w, seed, coralType } = o;
    const isPink = coralType === 'pink';

    const col1 = isPink ? '#f472b6' : '#fbbf24'; // main color
    const col2 = isPink ? '#db2777' : '#d97706'; // darker stem/base
    const tip  = isPink ? '#fce7f3' : '#fef9c3'; // pale tip highlight

    const branches = Math.round(w / 7);
    const spacing  = branches > 1 ? w / (branches - 1) : 0;

    for (let i = 0; i < branches; i++) {
      const bx = x + i * spacing;
      const bh = h * (0.55 + Math.sin(i * 1.7 + seed) * 0.28);
      const by = bot - bh;

      // stem
      ctx.fillStyle = col2;
      ctx.fillRect(bx - 3, by + bh * 0.35, 6, bh * 0.65);

      // top bulb
      ctx.fillStyle = col1;
      ctx.beginPath();
      ctx.ellipse(bx, by + 6, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // side nubs
      ctx.fillStyle = col1;
      ctx.beginPath(); ctx.ellipse(bx - 7, by + bh * 0.35, 4, 5, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx + 7, by + bh * 0.45, 4, 5,  0.4, 0, Math.PI * 2); ctx.fill();

      // pale nub tips
      ctx.fillStyle = tip;
      ctx.beginPath(); ctx.ellipse(bx - 7, by + bh * 0.35 - 4, 2, 3, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx + 7, by + bh * 0.45 - 4, 2, 3,  0.4, 0, Math.PI * 2); ctx.fill();
    }

    // base mound
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.ellipse(x + w/2, bot, w/2 + 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Collision detection ────────────────────────────────────────
  function collides(a, o) {
    const pad = 6; // shrink hitbox slightly for fairness
    return (
      a.x + pad       < o.x + o.w &&
      a.x + a.w - pad > o.x       &&
      a.y             > o.y - o.h + pad &&
      a.y - a.h + pad < o.y
    );
  }

  function drawScore() {
    ctx.fillStyle = 'rgba(80,50,20,0.45)';
    ctx.font = '13px monospace';
    ctx.fillText(String(score).padStart(5, '0'), W - 60, 24);
  }

  // ── Main loop ──────────────────────────────────────────────────
  function loop() {
    // ocean background
    ctx.fillStyle = '#cce8f4';
    ctx.fillRect(0, 0, W, H);

    // animate and draw fish
    fish.forEach(f => {
      f.x += f.flip ? f.speed : -f.speed;
      if ( f.flip && f.x >  W + 60) f.x = -60;
      if (!f.flip && f.x < -60)     f.x = W + 60;
      f.y += Math.sin(frame * 0.04 + f.x * 0.01) * 0.3; // gentle vertical bob
      drawFish(f);
    });

    drawGround();

    if (state === 'running') {
      frame++;
      score = Math.floor(frame / 6);
      scoreEl.textContent = score;

      speed = 4 + Math.floor(score / 150) * 0.5;

      dino.update();

      nextObstacle--;
      if (nextObstacle <= 0) {
        const h = 25 + Math.random() * 28;
        const w = 18 + Math.random() * 18;
        coralToggle++;
        obstacles.push({
          x: W + 10, w, h, y: GROUND,
          seed: Math.random() * 10,
          coralType: coralToggle % 2 === 0 ? 'pink' : 'yellow'
        });
        nextObstacle = Math.max(35, 55 + Math.floor(Math.random() * 60) - Math.floor(score / 200) * 5);
      }

      obstacles = obstacles.filter(o => o.x + o.w > -10);
      obstacles.forEach(o => {
        o.x -= speed;
        drawCoral(o);
        if (collides(dino, o)) {
          state = 'dead';
          if (score > best) { best = score; bestEl.textContent = best; }
        }
      });

    } else {
      obstacles.forEach(o => drawCoral(o));
    }

    dino.draw();
    drawScore();

    if (state === 'idle') {
      ctx.fillStyle = 'rgba(30,60,100,0.55)';
      ctx.font = '15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('press space or tap to start', W / 2, H / 2 - 10);
      ctx.textAlign = 'left';
    }

    if (state === 'dead') {
      ctx.fillStyle = 'rgba(120,20,40,0.8)';
      ctx.font = '15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('game over — press space or tap to restart', W / 2, H / 2 - 10);
      ctx.textAlign = 'left';
    }

    requestAnimationFrame(loop);
  }

  // ── Input ──────────────────────────────────────────────────────
  function handleJump() {
    if      (state === 'idle')    { state = 'running'; dino.jump(); }
    else if (state === 'running') { dino.jump(); }
    else if (state === 'dead')    { reset(); state = 'running'; }
  }

  document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); handleJump(); }
  });
  canvas.addEventListener('click', handleJump);
  startBtn.addEventListener('click', () => { handleJump(); startBtn.blur(); });

  loop();
})();
