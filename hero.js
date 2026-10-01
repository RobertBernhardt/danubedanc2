/* Danube Dancers – lebendiges Hero-Bild
   Die Illustration liegt als Vektordaten in hero-art.js (window.HERO_ART):
   Hintergrund + die vier Tänzer. Die Tänzer bleiben exakt wie gezeichnet
   (nichts wird zerschnitten oder verzogen). Leben entsteht um sie herum und
   darüber: das Wasser fließt (WebGL), an den Stiefeln kräuseln sich Wellenringe
   und es spritzt im Takt, gelegentlich wandert ein Bühnenlicht über die
   Tänzer, Schnallen und Stiefel blitzen auf, Noten steigen auf.
   Alles zufällig pro Besuch – keine feste Schleife. */
(function () {
  'use strict';

  var scene = document.getElementById('heroScene');
  if (!scene) return;

  var still = scene.querySelector('.hero-still');
  var glc = scene.querySelector('.hero-gl');
  var fxc = scene.querySelector('.hero-fx');
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  var ART, AW, AH;
  var FOCUS = [505, 110, 871, 520];              // Tänzer: x y w h in Bild-Einheiten
  var DANCER_LAYERS = ['d4', 'd1', 'd3', 'd2'];  // hinten -> vorne
  var DBOX = [500, 104, 876, 532];               // gemeinsamer Rahmen der Tänzer-Ebene

  // Stellen, an denen die Stiefel ins Wasser tauchen (x, y, Breite)
  var FEET = [[646, 601, 26], [806, 596, 22], [884, 611, 34], [1106, 610, 26], [1234, 589, 20], [1270, 556, 30]];
  // glänzende Stellen für kurzes Aufblitzen
  var GLINTS = [[878, 343], [1128, 325], [1107, 197], [652, 588], [1112, 596], [896, 603], [1229, 574], [1343, 392], [700, 190], [915, 152]];
  // Bereiche für das Bühnenlicht (x0, x1)
  var SPANS = [[515, 800], [760, 1010], [930, 1300], [1190, 1376], [515, 1376]];

  // ---------- Zufall ----------
  var rnd = Math.random;
  function R(a, b) { return a + rnd() * (b - a); }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- Bildausschnitt ----------
  var view = { x: 0, y: 0, w: 1376, h: 768 }, cssW = 0, cssH = 0, dpr = 1;
  function frame() {
    var r = scene.getBoundingClientRect();
    cssW = r.width; cssH = r.height;
    if (!cssW || !cssH) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var align = getComputedStyle(scene).getPropertyValue('--frame').trim() || 'right';
    var a = cssW / cssH, fcx = FOCUS[0] + FOCUS[2] / 2, fcy = FOCUS[1] + FOCUS[3] / 2;
    if (a >= AW / AH) {
      view.w = AW; view.h = AW / a; view.x = 0;
      view.y = clamp(fcy - view.h / 2, 0, AH - view.h);
    } else {
      view.h = AH; view.w = AH * a; view.y = 0;
      view.x = align === 'center' ? clamp(fcx - view.w / 2, 0, AW - view.w) : AW - view.w;
    }
    return true;
  }

  // ---------- Vektoren backen ----------
  function drawLayer(ctx, name, k, ox, oy) {
    ART.L[name].g.forEach(function (grp) {
      var s = k / grp[0];
      ctx.setTransform(s, 0, 0, s, -ox * k, -oy * k);
      grp[1].forEach(function (p) { ctx.fillStyle = p[0]; ctx.fill(new Path2D(p[1]), 'evenodd'); });
    });
  }
  function canvasFor(b, k) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(b[2] * k)); c.height = Math.max(1, Math.ceil(b[3] * k));
    return c;
  }
  function wantK() { return clamp((cssW / view.w) * dpr * 1.1, 0.5, Math.min(2.4, 4096 / AW)); }

  var baked = {}, bakedK = 0;
  function bakeAll(k, done) {                      // in zwei Schritten, damit der erste Frame nicht hängt
    var next = {};
    requestAnimationFrame(function () {
      var bg = canvasFor([0, 0, AW, AH], k);
      drawLayer(bg.getContext('2d'), 'bg', k, 0, 0);
      next.bg = bg;
      requestAnimationFrame(function () {
        var d = canvasFor(DBOX, k), ctx = d.getContext('2d');
        DANCER_LAYERS.forEach(function (n) { drawLayer(ctx, n, k, DBOX[0], DBOX[1]); });
        next.dancers = d;
        baked = next; bakedK = k; done();
      });
    });
  }

  // ---------- Standbild ----------
  function drawStill() {
    still.width = Math.round(cssW * dpr); still.height = Math.round(cssH * dpr);
    var ctx = still.getContext('2d'), s = still.width / view.w;
    ctx.setTransform(s, 0, 0, s, -view.x * s, -view.y * s);
    ctx.clearRect(view.x, view.y, view.w, view.h);
    if (baked.bg) ctx.drawImage(baked.bg, 0, 0, AW, AH);
    if (baked.dancers) ctx.drawImage(baked.dancers, DBOX[0], DBOX[1], DBOX[2], DBOX[3]);
    scene.classList.add('is-ready');
  }

  // ---------- Strömungskarte (wo das Wasser wie stark fließt) ----------
  function flowMap() {
    var w = 172, h = 96, sx = w / AW, sy = h / AH;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    function poly(pts, col) {
      ctx.fillStyle = col; ctx.beginPath();
      pts.forEach(function (p, i) { ctx[i ? 'lineTo' : 'moveTo'](p[0] * sx, p[1] * sy); });
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgb(0,0,150)'; ctx.fillRect(0, 0, w, h);
    poly([[0, 0], [760, 0], [620, 40], [500, 105], [410, 170], [330, 240], [240, 305], [150, 365], [60, 420], [0, 455]], 'rgb(0,255,40)');
    poly([[330, 768], [362, 735], [410, 700], [462, 672], [505, 640], [530, 592], [556, 546], [598, 512], [700, 516], [760, 502],
          [830, 530], [900, 505], [1000, 500], [1060, 512], [1130, 496], [1200, 486], [1300, 466], [1376, 456], [1376, 768]], 'rgb(255,0,0)');
    var img = ctx.getImageData(0, 0, w, h), d = img.data, tmp = new Float32Array(w * h * 3);
    for (var pass = 0; pass < 3; pass++) {
      for (var ch = 0; ch < 3; ch++) {
        var r = 4, x, y, acc, n;
        for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
          acc = 0; n = 0;
          for (var dx = -r; dx <= r; dx++) { acc += d[(y * w + clamp(x + dx, 0, w - 1)) * 4 + ch]; n++; }
          tmp[(y * w + x) * 3 + ch] = acc / n;
        }
        for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
          acc = 0; n = 0;
          for (var dy = -r; dy <= r; dy++) { acc += tmp[(clamp(y + dy, 0, h - 1) * w + x) * 3 + ch]; n++; }
          d[(y * w + x) * 4 + ch] = acc / n;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  // ---------- WebGL ----------
  var NOISE = [
    'vec2 hash2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.0+2.0*fract(sin(p)*43758.5453);}',
    'float gnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
    'return mix(mix(dot(hash2(i),f),dot(hash2(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),',
    'mix(dot(hash2(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(hash2(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);}'
  ].join('\n');
  var VS = [
    'attribute vec2 aP; uniform vec4 uView; varying vec2 vP;',
    'void main(){ vP=aP; vec2 c=(aP-uView.xy)/uView.zw; gl_Position=vec4(c.x*2.0-1.0,1.0-c.y*2.0,0.0,1.0); }'
  ].join('\n');
  var FS_BG = [
    'precision highp float;', NOISE,
    'varying vec2 vP; uniform sampler2D uTex, uFlow; uniform vec2 uArt; uniform float uT; uniform vec2 uSeed; uniform float uAmp;',
    'void main(){',
    '  vec2 p=vP; vec3 m=texture2D(uFlow,p/uArt).rgb; float t=uT;',
    '  vec2 q=p*0.0105+uSeed;',
    '  vec2 w1=vec2(gnoise(q+vec2(t*0.070,t*0.021)),gnoise(q+vec2(5.2,1.3)-vec2(t*0.052,t*0.061)));',
    '  vec2 w2=vec2(gnoise(q*2.3+w1*1.6+vec2(t*0.11,0.0)),gnoise(q*2.3+w1*1.6+vec2(8.1,3.7)-vec2(0.0,t*0.09)));',
    '  vec2 d=m.r*(w1*7.5+w2*3.2);',
    '  d.y+=m.r*2.4*sin(p.x*0.034-t*1.55+w1.x*3.0);',
    '  d.x+=m.r*1.6*cos(p.y*0.05-t*1.1+w2.y*2.0);',
    '  vec2 s1=vec2(gnoise(p*0.0062+uSeed.yx+vec2(t*0.048,-t*0.036)),gnoise(p*0.0062+uSeed+9.0+vec2(-t*0.041,t*0.05)));',
    '  d+=m.g*s1*10.0+m.b*s1*3.2;',
    '  vec2 uv=clamp((p-d*uAmp)/uArt,vec2(0.0005),vec2(0.9995));',
    '  gl_FragColor=texture2D(uTex,uv);',
    '}'
  ].join('\n');
  // Tänzer: unverändert, nur ein wanderndes Bühnenlicht wird auf die Figuren gelegt
  var FS_D = [
    'precision mediump float;',
    'varying vec2 vP; uniform sampler2D uTex; uniform vec4 uBox; uniform vec4 uSheen; uniform vec2 uDir;',
    'void main(){',
    '  vec4 c=texture2D(uTex,(vP-uBox.xy)/uBox.zw);',
    '  float d=dot(vP,uDir)-uSheen.x;',
    '  float band=exp(-d*d/(uSheen.y*uSheen.y))*uSheen.z+exp(-(d+uSheen.y*2.2)*(d+uSheen.y*2.2)/(uSheen.y*uSheen.y*0.2))*uSheen.z*0.45;',
    '  float lum=dot(c.rgb,vec3(0.3,0.59,0.11))/max(c.a,0.001);',
    '  c.rgb+=c.a*band*vec3(1.0,0.96,0.86)*(0.35+0.65*smoothstep(0.08,0.35,lum));',
    '  gl_FragColor=c;',
    '}'
  ].join('\n');

  var gl, progBG, progD, buf, tex = {}, flowTex, glOK = false;
  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(fs) {
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u, a: gl.getAttribLocation(p, 'aP') };
  }
  function upload(canvas, t) {
    t = t || gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function initGL() {
    try {
      gl = glc.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
      if (!gl) return false;
      progBG = program(FS_BG); progD = program(FS_D);
      buf = gl.createBuffer();
      flowTex = upload(flowMap());
      glc.addEventListener('webglcontextlost', function (e) { e.preventDefault(); glOK = false; scene.classList.remove('is-live'); });
      return true;
    } catch (err) { console.warn('Hero: WebGL nicht verfügbar', err); return false; }
  }
  function uploadAll() { tex.bg = upload(baked.bg, tex.bg); tex.dancers = upload(baked.dancers, tex.dancers); }
  function drawRect(pr, x, y, w, h) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x, y, x + w, y, x, y + h, x, y + h, x + w, y, x + w, y + h]), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(pr.a);
    gl.vertexAttribPointer(pr.a, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // ---------- Bühnenlicht ----------
  var sheen = { on: false, t0: 0, dur: 1, x0: 0, x1: 0, w: 60, k: 0, dir: [0.87, 0.5] }, nextSheen = 2.5;
  function updateSheen(t) {
    if (!sheen.on && t > nextSheen) {
      var s = pick(SPANS), ang = R(-0.9, -0.35), dir = [Math.cos(ang), Math.sin(ang)];
      var ya = FOCUS[1], yb = FOCUS[1] + FOCUS[3];
      var proj = function (x, y) { return x * dir[0] + y * dir[1]; };
      var lo = Math.min(proj(s[0], ya), proj(s[0], yb)), hi = Math.max(proj(s[1], ya), proj(s[1], yb));
      var fwd = rnd() < 0.7;
      sheen = { on: true, t0: t, dur: R(1.6, 2.6) * (s[1] - s[0]) / 500, x0: fwd ? lo - 60 : hi + 60, x1: fwd ? hi + 60 : lo - 60,
                w: R(38, 70), k: R(0.16, 0.26), dir: dir };
      nextSheen = t + sheen.dur + R(3, 8);
    }
    if (sheen.on && t - sheen.t0 > sheen.dur) sheen.on = false;
  }
  function sheenUniform() {
    if (!sheen.on) return [0, 1, 0, 0];
    var u = (lastT - sheen.t0) / sheen.dur, e = Math.sin(Math.PI * clamp(u, 0, 1));
    return [sheen.x0 + (sheen.x1 - sheen.x0) * u, sheen.w, sheen.k * e * amp, 0];
  }

  // ---------- Partikel & Überlagerungen (2D) ----------
  var fx = fxc.getContext('2d'), drops = [], ripples = [], bubbles = [], motes = [], notes = [], glints = [];
  function splash(x, y, n, spread) {
    for (var i = 0; i < n; i++) {
      var a = R(-Math.PI * 0.9, -Math.PI * 0.1), v = R(45, 125);
      drops.push({ x: x + R(-spread, spread), y: y - R(2, 8), vx: Math.cos(a) * v * 0.85, vy: Math.sin(a) * v, r: R(1.4, 3.4), life: 0, max: R(0.55, 1.05), light: rnd() < 0.6 });
    }
  }
  function ripple(f, big) {
    ripples.push({ x: f[0] + R(-3, 3), y: f[1] + R(-1, 2), w: f[2], life: 0, max: R(1.4, 2.2) * (big ? 1.2 : 1), grow: R(1.9, 2.7) * (big ? 1.25 : 1) });
  }
  function note() {
    var src = pick([[780, 250], [990, 225], [1255, 235], [700, 170], [915, 110], [1120, 130]]);
    notes.push({ x: src[0] + R(-20, 20), y: src[1] + R(-10, 10), vx: R(-10, 10), vy: R(-22, -14), life: 0, max: R(3, 4.5),
                 rot: R(-0.3, 0.3), vr: R(-0.25, 0.25), kind: rnd() < 0.55 ? 1 : 2, s: R(0.8, 1.15),
                 col: pick(['#1b8a99', '#e8744a', '#c7317a', '#15213f']), ph: R(0, 6.28) });
  }
  function spawnBubble(init) {
    bubbles.push({ x: R(390, 620), y: init ? R(170, 520) : R(420, 540), r: R(2.4, 7), vy: R(-9, -18), ph: R(0, 6.28), wob: R(3, 9), life: init ? R(0, 5) : 0, max: R(5, 10) });
  }
  function spawnMote(init) {
    var u = init ? rnd() : 0, x0 = R(-40, 420), y0 = R(330, 560);
    motes.push({ x: x0 + u * 300, y: y0 - u * 240, vx: R(14, 30), vy: R(-12, -24), r: R(1, 2.4), life: init ? R(0, 4) : 0, max: R(4, 8), ph: R(0, 6.28) });
  }

  var bpm = R(116, 126), beat = 0, lastBeat = 0, nextSpray = 0, nextNote = R(1.5, 3), nextGlint = R(0.8, 2);
  var footNext = FEET.map(function () { return R(0, 1.5); });
  function updateFx(t, dt) {
    beat += dt * bpm / 60;
    var b = Math.floor(beat);
    if (b !== lastBeat) {                          // im Takt: an einem Stiefel spritzt es
      lastBeat = b;
      if (rnd() < 0.6) { var f = pick(FEET); splash(f[0], f[1], 2 + Math.floor(rnd() * 3), f[2] * 0.5); if (rnd() < 0.5) ripple(f, true); }
    }
    FEET.forEach(function (f, i) { if (t > footNext[i]) { ripple(f); footNext[i] = t + R(0.9, 2.4); } });
    if (t > nextSpray) {
      var c = pick([[560, 548], [720, 522], [960, 512], [1050, 520], [1190, 500], [1330, 476], [470, 668], [800, 640], [1000, 600]]);
      splash(c[0] + R(-30, 30), c[1] + R(-6, 6), 2 + Math.floor(rnd() * 3), 12);
      nextSpray = t + R(0.35, 1.6);
    }
    if (t > nextNote) { if (notes.length < 4) note(); nextNote = t + R(1.8, 4.2); }
    if (t > nextGlint) { var g = pick(GLINTS); glints.push({ x: g[0], y: g[1], life: 0, max: R(0.5, 0.8), r: R(5, 8), rot: R(0, 0.8) }); nextGlint = t + R(0.9, 2.6); }
    if (bubbles.length < 9 && rnd() < dt * 1.2) spawnBubble(false);
    if (motes.length < 22 && rnd() < dt * 4) spawnMote(false);
    [drops, ripples, bubbles, motes, notes, glints].forEach(function (arr) {
      for (var i = arr.length - 1; i >= 0; i--) {
        var o = arr[i]; o.life += dt;
        if (o.life > o.max) { arr.splice(i, 1); continue; }
        if (arr === drops) { o.vy += 260 * dt; o.x += o.vx * dt; o.y += o.vy * dt; }
        else if (arr === bubbles) { o.y += o.vy * dt; o.x += Math.sin(t * 1.3 + o.ph) * o.wob * dt; }
        else if (arr === motes) { o.x += o.vx * dt; o.y += o.vy * dt + Math.sin(t + o.ph) * 4 * dt; }
        else if (arr === notes) { o.x += (o.vx + Math.sin(t * 2 + o.ph) * 12) * dt; o.y += o.vy * dt; o.rot += o.vr * dt; }
      }
    });
  }

  var INK = '#1b1733';
  function foam(x, y, rx, ry, w, col, tilt) {      // dicker, zu den Enden auslaufender Bogen
    var n = 14, a0 = 0.18, a1 = Math.PI - 0.18;
    for (var i = 0; i < n; i++) {
      var s0 = a0 + (a1 - a0) * i / n, s1 = a0 + (a1 - a0) * (i + 1) / n, m = Math.sin(Math.PI * (i + 0.5) / n);
      fx.beginPath(); fx.ellipse(x, y, rx, ry, tilt || 0, s0, s1 + 0.02);
      fx.lineCap = 'round'; fx.strokeStyle = '#17506c'; fx.lineWidth = w * m + 1.6; fx.stroke();
    }
    for (i = 0; i < n; i++) {
      var t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n, mm = Math.sin(Math.PI * (i + 0.5) / n);
      fx.beginPath(); fx.ellipse(x, y, rx, ry, tilt || 0, t0, t1 + 0.02);
      fx.strokeStyle = col; fx.lineWidth = w * mm; fx.stroke();
    }
  }
  function drawNote(n) {
    var a = Math.min(1, n.life / 0.5, (n.max - n.life) / 1.2);
    fx.save(); fx.translate(n.x, n.y); fx.rotate(n.rot); fx.scale(n.s, n.s);
    fx.globalAlpha = Math.max(0, a) * 0.9;
    fx.lineJoin = 'round'; fx.lineCap = 'round';
    function head(x, y) { fx.beginPath(); fx.ellipse(x, y, 5.2, 3.8, -0.4, 0, 6.283); fx.fillStyle = n.col; fx.fill(); fx.lineWidth = 1.6; fx.strokeStyle = INK; fx.stroke(); }
    if (n.kind === 1) {
      fx.beginPath(); fx.moveTo(4.4, -1); fx.lineTo(4.4, -20); fx.quadraticCurveTo(6, -14, 12, -12); fx.lineWidth = 2.2; fx.strokeStyle = INK; fx.stroke();
      head(0, 0);
    } else {
      fx.beginPath(); fx.moveTo(4.4, -1); fx.lineTo(4.4, -20); fx.lineTo(18.4, -23); fx.lineTo(18.4, -4); fx.lineWidth = 2.2; fx.strokeStyle = INK; fx.stroke();
      fx.beginPath(); fx.moveTo(4.4, -20); fx.lineTo(18.4, -23); fx.lineTo(18.4, -19.5); fx.lineTo(4.4, -16.5); fx.closePath(); fx.fillStyle = INK; fx.fill();
      head(0, 0); head(14, -3);
    }
    fx.restore();
  }
  function drawGlint(g) {
    var u = g.life / g.max, a = Math.sin(Math.PI * u), r = g.r * (0.5 + 0.7 * a);
    fx.save(); fx.translate(g.x, g.y); fx.rotate(g.rot + u * 0.6);
    fx.globalAlpha = a;
    fx.fillStyle = '#ffffff';
    fx.beginPath();
    for (var i = 0; i < 8; i++) { var an = i * Math.PI / 4, rr = i % 2 ? r * 0.18 : r; fx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
    fx.closePath(); fx.fill();
    fx.globalAlpha = a * 0.5; fx.beginPath(); fx.arc(0, 0, r * 0.45, 0, 6.283); fx.fillStyle = '#fff6d8'; fx.fill();
    fx.restore();
  }
  function drawFx() {
    var w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (fxc.width !== w || fxc.height !== h) { fxc.width = w; fxc.height = h; }
    var s = w / view.w;
    fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, w, h);
    fx.setTransform(s, 0, 0, s, -view.x * s, -view.y * s);
    motes.forEach(function (m) {
      fx.globalAlpha = 0.75 * Math.sin(Math.PI * m.life / m.max); fx.fillStyle = '#e9fbff';
      fx.beginPath(); fx.arc(m.x, m.y, m.r, 0, 6.283); fx.fill();
    });
    bubbles.forEach(function (b) {
      fx.globalAlpha = 0.8 * Math.max(0, Math.min(1, b.life / 0.8, (b.max - b.life) / 1.2));
      fx.lineWidth = 1.6; fx.strokeStyle = '#86b9c6'; fx.fillStyle = 'rgba(232,248,250,.7)';
      fx.beginPath(); fx.ellipse(b.x, b.y, b.r * 0.8, b.r, 0.3, 0, 6.283); fx.fill(); fx.stroke();
    });
    ripples.forEach(function (r) {                  // Wellenring: Schaumbogen vor dem Stiefel
      var u = r.life / r.max, rx = r.w * (0.7 + r.grow * u), ry = rx * 0.26;
      var a = Math.sin(Math.PI * Math.min(1, u * 1.5)) * (1 - u * 0.7);
      fx.globalAlpha = Math.max(0, a) * 0.95;
      foam(r.x, r.y, rx, ry, 4.2 * (1 - u * 0.6), '#eafcfc');
    });
    FEET.forEach(function (f, i) {                  // ständiger Schaumkragen, der leicht schaukelt
      var ph = lastT * 2.2 + i * 1.9, wob = Math.sin(ph) * 0.12;
      fx.globalAlpha = 0.9;
      foam(f[0] + Math.sin(ph * 0.7) * 1.5, f[1] + 1 + Math.sin(ph) * 1.2, f[2] * (0.75 + wob), f[2] * 0.2, 3.4, '#f2feff', 0.25 + wob);
    });
    drops.forEach(function (d) {
      var sp = Math.hypot(d.vx, d.vy);
      fx.globalAlpha = Math.max(0, 1 - d.life / d.max);
      fx.fillStyle = d.light ? '#dff8f8' : '#6fd0d6'; fx.strokeStyle = '#123a5a'; fx.lineWidth = 0.9;
      fx.beginPath(); fx.ellipse(d.x, d.y, d.r * (1 + sp / 220), d.r * 0.8, Math.atan2(d.vy, d.vx), 0, 6.283); fx.fill();
      if (!d.light) fx.stroke();
    });
    notes.forEach(drawNote);
    glints.forEach(drawGlint);
    fx.globalAlpha = 1;
  }

  // ---------- Hauptschleife ----------
  var seedBG = [R(0, 50), R(0, 50)], amp = 0, lastT = 0;
  function render(t) {
    gl.viewport(0, 0, glc.width, glc.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    var vv = [view.x, view.y, view.w, view.h];
    gl.useProgram(progBG.p);
    gl.uniform4fv(progBG.u.uView, vv);
    gl.uniform2f(progBG.u.uArt, AW, AH);
    gl.uniform1f(progBG.u.uT, t);
    gl.uniform2fv(progBG.u.uSeed, seedBG);
    gl.uniform1f(progBG.u.uAmp, amp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex.bg); gl.uniform1i(progBG.u.uTex, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, flowTex); gl.uniform1i(progBG.u.uFlow, 1);
    drawRect(progBG, view.x - 2, view.y - 2, view.w + 4, view.h + 4);

    gl.useProgram(progD.p);
    gl.uniform4fv(progD.u.uView, vv);
    gl.uniform4f(progD.u.uBox, DBOX[0], DBOX[1], DBOX[2], DBOX[3]);
    gl.uniform4fv(progD.u.uSheen, sheenUniform());
    gl.uniform2fv(progD.u.uDir, sheen.dir);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex.dancers); gl.uniform1i(progD.u.uTex, 0);
    drawRect(progD, DBOX[0], DBOX[1], DBOX[2], DBOX[3]);
  }

  var running = false, visible = true, last = 0, clock = 0, raf = 0;
  function loop(now) {
    raf = 0;
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now; clock += dt; lastT = clock;
    amp = Math.min(1, amp + dt / 1.6);
    updateSheen(clock); updateFx(clock, dt);
    if (glOK) render(clock);
    drawFx();
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running || reduceMQ.matches || !visible || document.hidden || !baked.bg) return;
    running = true; last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function sizeGL() {
    var w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (glc.width !== w || glc.height !== h) { glc.width = w; glc.height = h; }
  }

  // ---------- Start ----------
  var resizing = 0;
  function onResize() {
    if (!ART || !frame()) return;
    clearTimeout(resizing);
    if (glOK) sizeGL();
    if (!running && baked.bg) { drawStill(); if (glOK && !reduceMQ.matches) render(clock); }
    resizing = setTimeout(function () {
      var k = wantK();
      if (k > bakedK * 1.15) bakeAll(k, function () { if (glOK) uploadAll(); drawStill(); });
    }, 250);
  }
  function boot() {
    ART = window.HERO_ART; AW = ART.W; AH = ART.H;
    if (!frame()) { requestAnimationFrame(boot); return; }
    bakeAll(wantK(), function () {
      drawStill();
      if (reduceMQ.matches) return;
      glOK = initGL();
      if (glOK) { sizeGL(); uploadAll(); scene.classList.add('is-live'); }
      for (var i = 0; i < 6; i++) spawnBubble(true);
      for (var j = 0; j < 14; j++) spawnMote(true);
      start();
    });
    new ResizeObserver(onResize).observe(scene);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(scene);
    }
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', function () {
      if (reduceMQ.matches) { stop(); scene.classList.remove('is-live'); drawStill(); }
      else { if (!glOK) { glOK = initGL(); if (glOK) { sizeGL(); uploadAll(); } } if (glOK) scene.classList.add('is-live'); start(); }
    });
  }

  if (window.HERO_ART) boot();
  else window.addEventListener('load', function () { if (window.HERO_ART) boot(); });
})();
