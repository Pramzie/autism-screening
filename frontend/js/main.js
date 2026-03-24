// ── CURSOR ──────────────────────────────────────────────────────────────
const dot    = document.getElementById('cur-dot');
const ringEl = document.getElementById('cur-ring');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  dot.style.left = mx + 'px';
  dot.style.top  = my + 'px';
});
(function animRing() {
  rx += (mx - rx) * .13;
  ry += (my - ry) * .13;
  ringEl.style.left = rx + 'px';
  ringEl.style.top  = ry + 'px';
  requestAnimationFrame(animRing);
})();
document.querySelectorAll('a, button, input').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('hov'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('hov'));
});

// ── NAV SCROLL ───────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', scrollY > 60);
});

// ── SMOOTH SCROLL ────────────────────────────────────────────────────────
function smoothTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── SCROLL REVEAL ────────────────────────────────────────────────────────
const rvObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.08 });
document.querySelectorAll('.rv').forEach(el => rvObs.observe(el));

// stat cell underline animation
const cellObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
}, { threshold: 0.3 });
document.querySelectorAll('.stat-cell').forEach(el => cellObs.observe(el));

// metric bars
const barObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.m-fill').forEach(b => {
        b.style.transform = `scaleX(${b.dataset.w})`;
      });
    }
  });
}, { threshold: 0.3 });
const ss = document.getElementById('screen-sec');
if (ss) barObs.observe(ss);

// FIX: initialise first accordion item properly
(function initAccordion() {
  const firstItem = document.querySelector('.ac-item.open');
  if (firstItem) {
    const body = firstItem.querySelector('.ac-body');
    // After layout, set to scrollHeight
    requestAnimationFrame(() => {
      body.style.maxHeight = body.scrollHeight + 40 + 'px';
    });
  }
})();

// ── ACCORDION ────────────────────────────────────────────────────────────
function toggleAc(head) {
  const item = head.parentElement;
  const body = item.querySelector('.ac-body');
  const wasOpen = item.classList.contains('open');

  document.querySelectorAll('.ac-item').forEach(i => {
    i.classList.remove('open');
    i.querySelector('.ac-body').style.maxHeight = '0';
  });

  if (!wasOpen) {
    item.classList.add('open');
    body.style.maxHeight = body.scrollHeight + 40 + 'px';
  }
}

// ── INFINITE MARQUEE ─────────────────────────────────────────────────────
// FIX: wait for DOM paint so scrollWidth is correct before animating
window.addEventListener('load', function() {
  const track = document.getElementById('marquee-track');
  if (!track) return;

  let x = 0;
  const speed = 0.55;
  let paused = false;

  track.parentElement.addEventListener('mouseenter', () => paused = true);
  track.parentElement.addEventListener('mouseleave', () => paused = false);

  // FIX: get half-width AFTER layout
  let halfWidth = 0;
  function measureHalf() {
    halfWidth = track.scrollWidth / 2;
  }
  measureHalf();
  window.addEventListener('resize', measureHalf);

  function tick() {
    if (!paused) {
      x -= speed;
      if (halfWidth > 0 && Math.abs(x) >= halfWidth) x = 0;
      track.style.transform = 'translateX(' + x + 'px)';
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});

// ── THREE.JS: BRAIN (HERO) ────────────────────────────────────────────────
(function buildBrain() {
  const canvas = document.getElementById('brain-canvas');
  if (!canvas) return;

  const W = canvas.offsetWidth || 480;
  const H = 520;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(0, 0.3, 4.8);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key  = new THREE.DirectionalLight(0x88ddff, 2.2); key.position.set(4, 6, 5);  key.castShadow = true; scene.add(key);
  const fill = new THREE.DirectionalLight(0x0fa3b1, 1.4); fill.position.set(-5, -2, 3); scene.add(fill);
  const back = new THREE.DirectionalLight(0xe8a838, 0.8); back.position.set(0, -4, -4); scene.add(back);
  const pt1  = new THREE.PointLight(0x0fa3b1, 3, 12);    pt1.position.set(2, 2, 3);    scene.add(pt1);

  const brainGroup = new THREE.Group();
  scene.add(brainGroup);

  function makeLobe(rx, ry, rz, pos, color, emissiveColor, emissiveIntensity) {
    const geo    = new THREE.SphereGeometry(1, 48, 32);
    const posArr = geo.attributes.position;
    for (let i = 0; i < posArr.count; i++) {
      const x = posArr.getX(i), y = posArr.getY(i), z = posArr.getZ(i);
      const len = Math.sqrt(x*x+y*y+z*z);
      const nx = x/len, ny = y/len, nz = z/len;
      const disp = 0.06*(Math.sin(nx*5.3+ny*3.7)*Math.cos(nz*4.1+nx*2.9));
      posArr.setXYZ(i, x*rx+nx*disp*rx, y*ry+ny*disp*ry, z*rz+nz*disp*rz);
    }
    posArr.needsUpdate = true;
    geo.computeVertexNormals();
    const mat  = new THREE.MeshStandardMaterial({ color, emissive: emissiveColor, emissiveIntensity, metalness: .05, roughness: .72 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    return mesh;
  }

  const cerebrum   = makeLobe(1.15, 0.88, 1.0, [ 0.00,  0.15,  0.00], 0x2a3d52, 0x0a2030, 0.06); brainGroup.add(cerebrum);
  const frontal    = makeLobe(0.78, 0.70, 0.72, [-0.30,  0.50,  0.72], 0x7a4a10, 0xe8a838, 0.35); brainGroup.add(frontal);
  const frontalR   = makeLobe(0.72, 0.66, 0.68, [ 0.35,  0.48,  0.68], 0x6a3c08, 0xe8a838, 0.28); brainGroup.add(frontalR);
  const temporal   = makeLobe(0.82, 0.55, 0.70, [-1.00, -0.30,  0.30], 0x5a1a1a, 0xe85858, 0.40); brainGroup.add(temporal);
  const temporalR  = makeLobe(0.78, 0.52, 0.65, [ 1.00, -0.28,  0.28], 0x4a1515, 0xe85858, 0.30); brainGroup.add(temporalR);
  const parietal   = makeLobe(0.90, 0.65, 0.80, [ 0.10,  0.72, -0.30], 0x0d2a4a, 0x5888e8, 0.38); brainGroup.add(parietal);
  const occipital  = makeLobe(0.70, 0.60, 0.65, [ 0.00, -0.10, -0.95], 0x1a2a3a, 0x1a4a6a, 0.15); brainGroup.add(occipital);
  const cerebellum = makeLobe(0.82, 0.52, 0.68, [ 0.05, -0.85, -0.55], 0x0a2a1a, 0x38c878, 0.42); brainGroup.add(cerebellum);

  const stemMat = new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: .8 });
  const stem    = new THREE.Mesh(new THREE.CylinderGeometry(.16, .12, .8, 12), stemMat);
  stem.position.set(0, -1.25, -.15); stem.rotation.x = .25;
  brainGroup.add(stem);

  const ccMat = new THREE.MeshStandardMaterial({ color: 0x1e3050, emissive: 0x0fa3b1, emissiveIntensity: .1, roughness: .6 });
  const cc    = new THREE.Mesh(new THREE.TorusGeometry(.42, .07, 8, 40, Math.PI), ccMat);
  cc.position.set(0, .18, 0); cc.rotation.z = Math.PI;
  brainGroup.add(cc);

  const lineMat       = new THREE.LineBasicMaterial({ color: 0x0fa3b1, transparent: true, opacity: .22 });
  const connectionPts = [
    [[-0.3, 0.5, 0.72],  [0.1, 0.72, -0.3]],
    [[-1.0,-0.3, 0.3 ],  [0.1, 0.72, -0.3]],
    [[ 0.05,-0.85,-0.55],[0.0,-0.1, -0.95]],
    [[-0.3, 0.5, 0.72],  [-1.0,-0.3, 0.3]],
    [[ 0.35,0.48, 0.68], [1.0,-0.28, 0.28]],
  ];
  connectionPts.forEach(([a,b]) => {
    const mid   = [(a[0]+b[0])/2+(Math.random()-.5)*.5,(a[1]+b[1])/2+(Math.random()-.5)*.5,(a[2]+b[2])/2];
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), new THREE.Vector3(...mid), new THREE.Vector3(...b));
    const lg    = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    brainGroup.add(new THREE.Line(lg, lineMat));
  });

  const sparkCount = 120;
  const sparkGeo   = new THREE.BufferGeometry();
  const sparkPos   = new Float32Array(sparkCount * 3);
  const sparkData  = [];
  for (let i = 0; i < sparkCount; i++) {
    const theta = Math.random()*Math.PI*2, phi = Math.random()*Math.PI, r = .9+Math.random()*.7;
    sparkPos[i*3  ] = r*Math.sin(phi)*Math.cos(theta);
    sparkPos[i*3+1] = r*Math.sin(phi)*Math.sin(theta)*.8;
    sparkPos[i*3+2] = r*Math.cos(phi)*.9;
    sparkData.push({ theta, phi, r, speed:.002+Math.random()*.004, offset:Math.random()*Math.PI*2 });
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ color: 0x0fa3b1, size: .028, transparent: true, opacity: .7 });
  const sparks   = new THREE.Points(sparkGeo, sparkMat);
  brainGroup.add(sparks);

  let targetRotY = 0, targetRotX = 0, currRotY = 0, currRotX = 0;
  document.addEventListener('mousemove', e => {
    targetRotY = (e.clientX/window.innerWidth -.5)*.9;
    targetRotX = (e.clientY/window.innerHeight-.5)*.4;
  });

  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += .012;
    currRotY += (targetRotY - currRotY) * .06;
    currRotX += (targetRotX - currRotX) * .06;
    brainGroup.rotation.y = currRotY + t * .08;
    brainGroup.rotation.x = currRotX * .5;

    const sp = sparkGeo.attributes.position;
    for (let i = 0; i < sparkCount; i++) {
      const d = sparkData[i]; d.theta += d.speed;
      const pulse = .04*Math.sin(t*2.5+d.offset);
      sp.setXYZ(i, (d.r+pulse)*Math.sin(d.phi)*Math.cos(d.theta), (d.r+pulse)*Math.sin(d.phi)*Math.sin(d.theta)*.8, (d.r+pulse)*Math.cos(d.phi)*.9);
    }
    sp.needsUpdate = true;
    sparkMat.opacity = .5+.25*Math.sin(t*1.8);

    const p = .015*Math.sin(t*1.5);
    frontal.scale.setScalar(1+p); temporal.scale.setScalar(1+p*.8); parietal.scale.setScalar(1+p*1.2); cerebellum.scale.setScalar(1+p*.9);
    frontal.material.emissiveIntensity    = .28+.12*Math.sin(t*1.5);
    temporal.material.emissiveIntensity   = .32+.12*Math.sin(t*1.5+1);
    parietal.material.emissiveIntensity   = .30+.12*Math.sin(t*1.5+2);
    cerebellum.material.emissiveIntensity = .34+.12*Math.sin(t*1.5+3);
    pt1.position.set(2*Math.cos(t*.5), 2, 3*Math.sin(t*.3));
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const W2 = canvas.offsetWidth || 480;
    renderer.setSize(W2, H);
    camera.aspect = W2/H;
    camera.updateProjectionMatrix();
  });
})();

// ── THREE.JS: DNA (SCREEN SECTION) ──────────────────────────────────────
(function buildDNA() {
  const canvas = document.getElementById('screen-canvas');
  if (!canvas) return;
  // FIX: read width after layout
  const W = canvas.offsetWidth || 480;
  const H = 420;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, W/H, 0.1, 100);
  camera.position.set(0, 0, 4.2);

  scene.add(new THREE.AmbientLight(0xffffff, .45));
  const d1 = new THREE.DirectionalLight(0x0fa3b1, 2.4); d1.position.set(3,5,4);   scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xe8a838, 1.2); d2.position.set(-4,-2,2); scene.add(d2);

  const c1pts = [], c2pts = [];
  for (let i = 0; i <= 120; i++) {
    const tt = i/120*Math.PI*5;
    c1pts.push(new THREE.Vector3(Math.cos(tt)*.85, i/120*3.6-1.8,  Math.sin(tt)*.85));
    c2pts.push(new THREE.Vector3(Math.cos(tt+Math.PI)*.85, i/120*3.6-1.8, Math.sin(tt+Math.PI)*.85));
  }
  const c1  = new THREE.CatmullRomCurve3(c1pts);
  const c2  = new THREE.CatmullRomCurve3(c2pts);
  const tMat = new THREE.MeshStandardMaterial({ color: 0x0c5a65, metalness: .4, roughness: .4, emissive: 0x0fa3b1, emissiveIntensity: .08 });
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(c1, 240, .032, 8, false), tMat));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(c2, 240, .032, 8, false), tMat));

  const rMat = new THREE.MeshStandardMaterial({ color: 0xb07820, emissive: 0xe8a838, emissiveIntensity: .15, roughness: .5 });
  for (let i = 0; i < 24; i++) {
    const tt = i/24;
    const p1 = c1.getPoint(tt), p2 = c2.getPoint(tt);
    const mid = new THREE.Vector3().lerpVectors(p1,p2,.5);
    const rg  = new THREE.CylinderGeometry(.016,.016,p1.distanceTo(p2),6);
    const rm  = new THREE.Mesh(rg, rMat);
    rm.position.copy(mid); rm.lookAt(p1); rm.rotateX(Math.PI/2);
    scene.add(rm);
    [p1,p2].forEach(p => {
      const sm = new THREE.Mesh(new THREE.SphereGeometry(.048,8,8), i%2===0 ? tMat : rMat);
      sm.position.copy(p); scene.add(sm);
    });
  }

  let t2 = 0;
  function a() { requestAnimationFrame(a); t2+=.006; scene.rotation.y=t2*.35; renderer.render(scene,camera); }
  a();

  window.addEventListener('resize', () => {
    const W2 = canvas.offsetWidth || 480;
    renderer.setSize(W2, H);
    camera.aspect = W2/H;
    camera.updateProjectionMatrix();
  });
})();

// ── MAP ───────────────────────────────────────────────────────────────────
// FIX: initialize map AFTER the section is visible to avoid 0-height tile rendering issue
let leafMap = null;
let mapReady = false;

function initMap() {
  if (mapReady) return;
  mapReady = true;
  leafMap = L.map('the-map', { zoomControl: true }).setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(leafMap);
  // FIX: invalidate size after map container is visible
  setTimeout(() => leafMap.invalidateSize(), 300);
}

// Initialize map when map section enters viewport
const mapObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { initMap(); mapObs.disconnect(); } });
}, { threshold: 0.1 });
mapObs.observe(document.getElementById('map-sec'));

function mkIcon(color) {
  return L.divIcon({
    html: `<div style="width:12px;height:12px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,.75);box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>`,
    iconSize: [12,12], iconAnchor: [6,6], className: ''
  });
}

async function locateUser() {
  initMap(); // ensure map is ready
  if (!navigator.geolocation) { alert('Geolocation not supported by this browser.'); return; }

  const btn = document.querySelector('.map-btn');
  btn.textContent = '⟳  Locating…';
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(async pos => {
    btn.textContent = '📍  Use My Location';
    btn.disabled = false;

    const { latitude: lat, longitude: lng } = pos.coords;
    leafMap.setView([lat, lng], 14);
    // FIX: invalidate after setView so tiles render
    setTimeout(() => leafMap.invalidateSize(), 100);

    L.marker([lat, lng], {
      icon: L.divIcon({
        html: `<div style="width:16px;height:16px;background:#e8a838;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,.6)"></div>`,
        iconSize: [16,16], iconAnchor: [8,8], className: ''
      })
    }).addTo(leafMap).bindPopup('<b style="color:#e8a838">Your Location</b>').openPopup();

    const r = 5000;
    const q = `[out:json][timeout:20];(node["amenity"="hospital"](around:${r},${lat},${lng});node["amenity"="pharmacy"](around:${r},${lat},${lng}););out;`;

    try {
      document.getElementById('hosp-list').innerHTML  = '<li class="pl-item" style="color:var(--muted2)">Searching…</li>';
      document.getElementById('pharm-list').innerHTML = '<li class="pl-item" style="color:var(--muted2)">Searching…</li>';

      const res  = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
      const data = await res.json();

      const hosps  = data.elements.filter(e => e.tags.amenity === 'hospital');
      const pharms = data.elements.filter(e => e.tags.amenity === 'pharmacy');

      hosps.slice(0,10).forEach(h => {
        L.marker([h.lat, h.lon], { icon: mkIcon('#0fa3b1') })
          .addTo(leafMap)
          .bindPopup(`<b>${h.tags.name||'Hospital'}</b>${h.tags['addr:street'] ? '<br/>'+h.tags['addr:street'] : ''}`);
      });
      pharms.slice(0,10).forEach(p => {
        L.marker([p.lat, p.lon], { icon: mkIcon('#e8a838') })
          .addTo(leafMap)
          .bindPopup(`<b>${p.tags.name||'Pharmacy'}</b>${p.tags['addr:street'] ? '<br/>'+p.tags['addr:street'] : ''}`);
      });

      document.getElementById('hosp-list').innerHTML =
        hosps.length
          ? hosps.slice(0,6).map(h => `<li class="pl-item"><strong>${h.tags.name||'Unnamed Hospital'}</strong>${h.tags['addr:street']||'See on map'}</li>`).join('')
          : '<li class="pl-item" style="color:var(--muted2)">No hospitals found within 5km</li>';

      document.getElementById('pharm-list').innerHTML =
        pharms.length
          ? pharms.slice(0,6).map(p => `<li class="pl-item"><strong>${p.tags.name||'Unnamed Pharmacy'}</strong>${p.tags['addr:street']||'See on map'}</li>`).join('')
          : '<li class="pl-item" style="color:var(--muted2)">No pharmacies found within 5km</li>';

    } catch (err) {
      console.error('Overpass error:', err);
      document.getElementById('hosp-list').innerHTML  = '<li class="pl-item" style="color:var(--red-hl)">Could not fetch data. Check your connection.</li>';
      document.getElementById('pharm-list').innerHTML = '<li class="pl-item" style="color:var(--red-hl)">Could not fetch data. Check your connection.</li>';
    }

  }, err => {
    btn.textContent = '📍  Use My Location';
    btn.disabled = false;
    console.error('Geolocation error:', err);
    alert('Could not get your location. Please allow location access in your browser settings.');
  }, { timeout: 10000, enableHighAccuracy: false });
}

// ── BACKEND SCREENING ─────────────────────────────────────────────────────
// ⚠️  Replace this with your actual Render deployment URL before going live.
const BACKEND_URL = 'https://your-app.onrender.com';

let stream          = null;
let capturing       = false;
let frames          = [];
let captureInterval = null;

async function startCapture() {
  if (capturing) return;

  // Get camera
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
  } catch (e) {
    alert('Camera access denied or unavailable: ' + e.message);
    return;
  }

  capturing = true;
  frames    = [];

  // Show webcam UI
  document.getElementById('webcam-overlay').classList.add('hidden');
  const activeDiv = document.getElementById('webcam-active');
  activeDiv.classList.add('visible');
  const video = document.getElementById('webcam-video');
  video.srcObject = stream;
  video.style.display = 'block';
  video.play();

  document.getElementById('blink-dot').classList.add('live');
  document.getElementById('scan-line').classList.add('scanning');
  document.getElementById('start-btn').style.display = 'none';
  document.getElementById('stop-btn').style.display  = 'block';
  document.getElementById('live-metrics').classList.add('visible');
  document.getElementById('capture-progress').classList.add('visible');

  const captureCanvas = document.createElement('canvas');
  captureCanvas.width  = 224;
  captureCanvas.height = 224;
  const ctx = captureCanvas.getContext('2d');

  const TARGET_FRAMES = 50;
  const DURATION_MS   = 5000;
  const INTERVAL_MS   = DURATION_MS / TARGET_FRAMES;
  const startTime     = Date.now();

  document.getElementById('lm-status').textContent = 'Capturing';

  captureInterval = setInterval(() => {
    if (!capturing) return;
    ctx.drawImage(video, 0, 0, 224, 224);
    frames.push(captureCanvas.toDataURL('image/jpeg', 0.85).split(',')[1]);

    const elapsed = (Date.now() - startTime) / 1000;
    const pct     = Math.min(frames.length / TARGET_FRAMES * 100, 100);
    document.getElementById('lm-frames').textContent    = frames.length;
    document.getElementById('lm-time').textContent      = elapsed.toFixed(1);
    document.getElementById('capture-bar').style.width  = pct + '%';

    if (frames.length >= TARGET_FRAMES) {
      clearInterval(captureInterval);
      sendToBackend();
    }
  }, INTERVAL_MS);
}

function stopCapture() {
  capturing = false;
  clearInterval(captureInterval);
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  resetWebcamUI();
}

function resetWebcamUI() {
  document.getElementById('webcam-overlay').classList.remove('hidden');
  document.getElementById('webcam-active').classList.remove('visible');
  const video = document.getElementById('webcam-video');
  video.srcObject = null; video.style.display = 'none';
  document.getElementById('blink-dot').classList.remove('live');
  document.getElementById('scan-line').classList.remove('scanning');
  document.getElementById('start-btn').style.display = 'block';
  document.getElementById('stop-btn').style.display  = 'none';
  document.getElementById('live-metrics').classList.remove('visible');
  document.getElementById('capture-progress').classList.remove('visible');
  document.getElementById('capture-bar').style.width     = '0%';
  document.getElementById('lm-frames').textContent       = '0';
  document.getElementById('lm-time').textContent         = '0.0';
  document.getElementById('lm-status').textContent       = 'Initialising';
}

async function sendToBackend() {
  capturing = false;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  document.getElementById('lm-status').textContent = 'Sending to model…';
  document.getElementById('scan-line').classList.remove('scanning');

  try {
    const res = await fetch(BACKEND_URL + '/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frames }),
      signal: AbortSignal.timeout(60000)
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('Server returned ' + res.status + ': ' + txt.slice(0, 120));
    }
    const data = await res.json();
    showResults(data);
  } catch (e) {
    alert('Screening failed: ' + e.message + '\n\nPlease ensure the backend server is running.');
  }
  resetWebcamUI();
}

function showResults(data) {
  // Accepts: { avg_prob, severity, blink_rate, eye_ratio, symmetry, head_movement, expression_variability, frames_analysed }
  const card = document.getElementById('result-card');
  card.classList.add('visible');

  const prob     = data.avg_prob   ?? data.probability ?? data.prob ?? 0;
  const severity = data.severity   ?? data.band        ?? data.label ?? 'Unknown';
  const blinkR   = data.blink_rate ?? data.blink       ?? '—';
  const eyeR     = data.eye_ratio  ?? data.eye         ?? '—';
  const sym      = data.symmetry   ?? '—';
  const headM    = data.head_movement ?? data.head     ?? '—';
  const exprV    = data.expression_variability ?? data.expression ?? '—';
  const framesA  = data.frames_analysed ?? frames.length;

  const bandEl = document.getElementById('result-band-text');
  bandEl.textContent = severity;
  bandEl.className   = 'result-band';
  const sev = String(severity).toLowerCase();
  if      (sev.includes('non') || sev.includes('no')) bandEl.classList.add('band-non');
  else if (sev.includes('low'))                        bandEl.classList.add('band-low');
  else if (sev.includes('med'))                        bandEl.classList.add('band-med');
  else if (sev.includes('high'))                       bandEl.classList.add('band-high');

  document.getElementById('result-prob').textContent  = typeof prob   === 'number' ? (prob*100).toFixed(1)+'%' : prob;
  document.getElementById('rm-blink').textContent     = typeof blinkR === 'number' ? blinkR.toFixed(1)+'/min'  : blinkR;
  document.getElementById('rm-eye').textContent       = typeof eyeR   === 'number' ? (eyeR*100).toFixed(0)+'%' : eyeR;
  document.getElementById('rm-sym').textContent       = typeof sym    === 'number' ? sym.toFixed(2)+'%'        : sym;
  document.getElementById('rm-head').textContent      = typeof headM  === 'number' ? headM.toFixed(1)+'px'     : headM;
  document.getElementById('rm-expr').textContent      = typeof exprV  === 'number' ? exprV.toFixed(0)         : exprV;
  document.getElementById('rm-frames').textContent    = framesA;

  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}