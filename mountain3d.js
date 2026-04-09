function initMountain3D() {
  const container = document.getElementById('mountain-container');
  if (!container || typeof THREE === 'undefined') return;

  const W = container.clientWidth;
  const H = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);
  camera.position.set(0, 3.5, 11.5);
  camera.lookAt(0, 2.0, 0);

  // ===== HJELPEFUNKSJONER =====
  function noise(x, y, z) {
    const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.3) * 43758.5453;
    return n - Math.floor(n);
  }
  function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
  function smoothstep(e0, e1, x) {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }
  function pseRand(i, salt) {
    const n = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  // ===== FJELLGEOMETRI =====
  const geo = new THREE.ConeGeometry(2.4, 4.2, 11, 16, false);
  geo.rotateY(Math.PI / 10);

  const pos = geo.attributes.position;
  const baseY = -4.2 / 2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const relY = (y - baseY) / 4.2;
    if (relY > 0.97) continue;

    const o1 = (noise(x,       y,       z      ) - 0.5);
    const o2 = (noise(x * 2.1, y * 2.1, z * 2.1) - 0.5) * 0.5;
    const o3 = (noise(x * 4.3, y * 4.3, z * 4.3) - 0.5) * 0.25;
    const o4 = (noise(x * 8.7, y * 8.7, z * 8.7) - 0.5) * 0.12;
    const k  = o1 + o2 + o3 + o4;

    const grovt = Math.pow(1 - relY, 1.0) * 0.65;
    const fint  = Math.pow(1 - relY, 0.6) * 0.20;
    const nx2   = (noise(x+1, y+2, z+3) - 0.5) + (noise((x+1)*2,(y+2)*2,(z+3)*2) - 0.5) * 0.5;

    pos.setX(i, x + k * grovt   + (noise(x*3, y*3, z*3) - 0.5) * fint);
    pos.setZ(i, z + nx2 * grovt + (noise(x*3+1, y*3, z*3) - 0.5) * fint);
    if (relY < 0.80) {
      pos.setY(i, y + (noise(x*2,y*2,z*2) - 0.5) * 0.28 + (noise(x*4,y*4,z*4) - 0.5) * 0.10);
    }
    if (relY > 0.20 && relY < 0.70) {
      pos.setX(i, pos.getX(i) + (noise(x*6,y*6,z*6) - 0.5) * 0.14);
      pos.setZ(i, pos.getZ(i) + (noise(x*6+2,y*6,z*6) - 0.5) * 0.14);
    }
  }

  geo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const relY = (y - baseY) / 4.2;
    const n  = noise(pos.getX(i) * 5, y * 5, pos.getZ(i) * 5) * 0.09;
    const n2 = noise(pos.getX(i) * 12, y * 12, pos.getZ(i) * 12) * 0.04;

    const skog   = [0.13+n, 0.21+n*1.2, 0.11+n*0.6];
    const lyng   = [0.28+n, 0.24+n,     0.20+n*0.5];
    const stein  = [0.42+n, 0.40+n*0.9, 0.44+n*0.8];
    const nakent = [0.62+n2, 0.58+n2, 0.54+n2];
    const sno    = [0.92+n2*0.3, 0.94+n2*0.2, 0.96+n2*0.15];

    let r, g, b;
    if (relY < 0.32) {
      const t = smoothstep(0.18, 0.32, relY);
      r = lerp(skog[0], lyng[0], t); g = lerp(skog[1], lyng[1], t); b = lerp(skog[2], lyng[2], t);
    } else if (relY < 0.58) {
      const t = smoothstep(0.32, 0.58, relY);
      r = lerp(lyng[0], stein[0], t); g = lerp(lyng[1], stein[1], t); b = lerp(lyng[2], stein[2], t);
    } else if (relY < 0.82) {
      const t = smoothstep(0.58, 0.82, relY);
      r = lerp(stein[0], nakent[0], t); g = lerp(stein[1], nakent[1], t); b = lerp(stein[2], nakent[2], t);
    } else {
      const snoPatch = noise(pos.getX(i)*3, y*3, pos.getZ(i)*3);
      const snoT = smoothstep(0.82, 0.92, relY) * (0.5 + snoPatch * 0.5);
      r = lerp(nakent[0], sno[0], snoT); g = lerp(nakent[1], sno[1], snoT); b = lerp(nakent[2], sno[2], snoT);
    }
    colors[i*3] = Math.min(1,r); colors[i*3+1] = Math.min(1,g); colors[i*3+2] = Math.min(1,b);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true, flatShading: true, shininess: 40,
    specular: new THREE.Color(0x99bbcc)
  });

  const mountain = new THREE.Mesh(geo, mat);
  mountain.position.y = -0.4;
  mountain.scale.set(3.5, 3.5, 3.5);
  scene.add(mountain);

  // ===== LYS =====
  scene.add(new THREE.AmbientLight(0xd0e8d8, 0.85));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.0);
  sun.position.set(6, 8, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xa0c8e8, 0.6);
  fill.position.set(-6, 4, -3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xd0eeff, 0.5);
  rim.position.set(0, -2, -6);
  scene.add(rim);

  // ===== VANDRERE =====
  const h = 0.30;

  const figurKonfig = [
    { kropp: 0x1a1a2e, bukse: 0x2a2a40, sekk: 0x4a5c30, lue: 0xcc3333, offset: 0.00 },
    { kropp: 0x8b1a1a, bukse: 0x2a2a2a, sekk: 0x2e3a5c, lue: 0x223355, offset: 0.22 },
    { kropp: 0x2a4a2a, bukse: 0x3a2a1a, sekk: 0x6b4c1a, lue: 0x4a9a44, offset: 0.44 },
    { kropp: 0x5a3010, bukse: 0x1a2a1a, sekk: 0x8b3a10, lue: 0x884422, offset: 0.66 },
  ];

  const hodeMat  = new THREE.MeshPhongMaterial({ color: 0xd4a574, flatShading: false });
  const støvlMat = new THREE.MeshPhongMaterial({ color: 0x1a1008, flatShading: false });
  const stavMat  = new THREE.MeshPhongMaterial({ color: 0x888888, flatShading: false });

  function lagVandrer(kfg) {
    const kroppMat = new THREE.MeshPhongMaterial({ color: kfg.kropp, flatShading: false });
    const buксeMat = new THREE.MeshPhongMaterial({ color: kfg.bukse, flatShading: false });
    const sekkMat  = new THREE.MeshPhongMaterial({ color: kfg.sekk,  flatShading: false });
    const lueMat   = new THREE.MeshPhongMaterial({ color: kfg.lue,   flatShading: false });

    const rot = new THREE.Group();

    const hode = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 12), hodeMat);
    hode.position.y = h * 0.89;
    rot.add(hode);

    const lue = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8, 0, Math.PI*2, 0, Math.PI*0.55), lueMat);
    lue.position.y = h * 0.915;
    rot.add(lue);

    const overkropp = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.030, h*0.35, 12), kroppMat);
    overkropp.position.y = h * 0.64;
    rot.add(overkropp);

    const sekk = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.075, 0.026), sekkMat);
    sekk.position.set(0, h*0.64, -0.034);
    rot.add(sekk);

    const hofter = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, h*0.12, 10), buксeMat);
    hofter.position.y = h * 0.45;
    rot.add(hofter);

    const armGeo = new THREE.CylinderGeometry(0.009, 0.008, h*0.32, 8);
    function lagArm(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.036, h*0.74, 0);
      const arm = new THREE.Mesh(armGeo, kroppMat);
      arm.position.y = -h * 0.16;
      pivot.add(arm);
      rot.add(pivot);
      return pivot;
    }
    const vArmPivot = lagArm( 1);
    const hArmPivot = lagArm(-1);

    const stav = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, h*0.55, 5), stavMat);
    stav.position.set(0, -h*0.27, 0.01);
    stav.rotation.x = 0.25;
    vArmPivot.add(stav);

    const overlårGeo   = new THREE.CylinderGeometry(0.013, 0.011, h*0.28, 8);
    const underleggGeo = new THREE.CylinderGeometry(0.010, 0.009, h*0.26, 8);

    function lagBein(side) {
      const hofterPivot = new THREE.Group();
      hofterPivot.position.set(side * 0.018, h*0.42, 0);
      const overlår = new THREE.Mesh(overlårGeo, buксeMat);
      overlår.position.y = -h * 0.14;
      hofterPivot.add(overlår);
      const knePivot = new THREE.Group();
      knePivot.position.y = -h * 0.28;
      hofterPivot.add(knePivot);
      const underlegg = new THREE.Mesh(underleggGeo, buксeMat);
      underlegg.position.y = -h * 0.13;
      knePivot.add(underlegg);
      const støvl = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.014, h*0.08, 8), støvlMat);
      støvl.position.y = -h * 0.27;
      knePivot.add(støvl);
      rot.add(hofterPivot);
      return { hofterPivot, knePivot };
    }

    const { hofterPivot: vBovPivot, knePivot: vKnePivot } = lagBein( 1);
    const { hofterPivot: hBovPivot, knePivot: hKnePivot } = lagBein(-1);

    mountain.add(rot);
    return { gruppe: rot, vBovPivot, vKnePivot, hBovPivot, hKnePivot, vArmPivot, hArmPivot, offset: kfg.offset };
  }

  const vandrere = figurKonfig.map(lagVandrer);

  // Spiralsti (t: 0→1)
  function vandrerPos(t) {
    const relY    = 0.06 + t * 0.80;
    const lokal_y = baseY + relY * 4.2;
    const radius  = 2.4 * (1 - relY) * 1.03;
    const vinkel  = t * Math.PI * 4.5;
    return new THREE.Vector3(
      Math.cos(vinkel) * radius,
      lokal_y + 0.03,
      Math.sin(vinkel) * radius
    );
  }

  // ===== TRÆR =====
  const TRE_LINJE  = 0.36;
  const ANTALL_TRÆ = 90;

  const stammeMat = new THREE.MeshPhongMaterial({ color: 0x3d2008, flatShading: true });
  const kroneMat1 = new THREE.MeshPhongMaterial({ color: 0x1a3a18, flatShading: true });
  const kroneMat2 = new THREE.MeshPhongMaterial({ color: 0x243f22, flatShading: true });

  for (let i = 0; i < ANTALL_TRÆ; i++) {
    const relY   = 0.03 + pseRand(i, 1) * (TRE_LINJE - 0.03);
    const vinkel = pseRand(i, 2) * Math.PI * 2;
    const coneR  = 2.4 * (1 - relY);
    const radius = coneR * (0.96 + pseRand(i, 3) * 0.06);
    const lokal_y = baseY + relY * 4.2;
    const x = Math.cos(vinkel) * radius;
    const z = Math.sin(vinkel) * radius;

    const stiVinkel = ((relY - 0.06) / 0.80) * Math.PI * 4.5;
    const normV = ((vinkel % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    const normS = ((stiVinkel % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    const diff  = Math.abs(normV - normS);
    if (diff < 0.28 || diff > Math.PI*2 - 0.28) continue;

    const treH = 0.13 + pseRand(i, 4) * 0.12;
    const treGruppe = new THREE.Group();
    treGruppe.position.set(x, lokal_y + treH * 0.05, z);

    const stamme = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.015, treH*0.30, 4), stammeMat);
    stamme.position.y = treH * 0.15;
    treGruppe.add(stamme);

    const krone1 = new THREE.Mesh(new THREE.ConeGeometry(treH*0.42, treH*0.65, 5), kroneMat1);
    krone1.position.y = treH * 0.60;
    treGruppe.add(krone1);

    const krone2 = new THREE.Mesh(new THREE.ConeGeometry(treH*0.26, treH*0.48, 5), kroneMat2);
    krone2.position.y = treH * 0.92;
    treGruppe.add(krone2);

    mountain.add(treGruppe);
  }

  // ===== INTERAKSJON =====
  let isDragging = false, prevMouseX = 0, prevMouseY = 0;
  let autoRotate = true, autoTimer = null;

  const canvas = renderer.domElement;
  canvas.style.cursor = 'grab';

  function startDrag(x, y) {
    isDragging = true; prevMouseX = x; prevMouseY = y;
    autoRotate = false; clearTimeout(autoTimer);
    canvas.style.cursor = 'grabbing';
  }
  function moveDrag(x, y) {
    if (!isDragging) return;
    mountain.rotation.y += (x - prevMouseX) * 0.009;
    mountain.rotation.x  = Math.max(-0.55, Math.min(0.55, mountain.rotation.x + (y - prevMouseY) * 0.005));
    prevMouseX = x; prevMouseY = y;
  }
  function endDrag() {
    if (!isDragging) return;
    isDragging = false; canvas.style.cursor = 'grab';
    autoTimer = setTimeout(() => { autoRotate = true; }, 3000);
  }

  canvas.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
  window.addEventListener('mouseup', endDrag);

  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  canvas.addEventListener('touchend', endDrag);

  // ===== ZOOM =====
  let targetZ = camera.position.z;
  const Z_MIN = 5.0, Z_MAX = 22.0;

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    targetZ = Math.max(Z_MIN, Math.min(Z_MAX, targetZ + e.deltaY * 0.02));
  }, { passive: false });

  let prevPinchDist = null;
  canvas.addEventListener('touchstart', e => { if (e.touches.length === 2) prevPinchDist = null; }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length !== 2) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (prevPinchDist !== null) targetZ = Math.max(Z_MIN, Math.min(Z_MAX, targetZ - (dist - prevPinchDist) * 0.05));
    prevPinchDist = dist;
  }, { passive: true });

  // ===== ANIMASJON =====
  let t = 0, vandrerT = 0;

  function animate() {
    requestAnimationFrame(animate);
    t += 0.004;

    camera.position.z += (targetZ - camera.position.z) * 0.1;

    if (autoRotate && !isDragging) {
      mountain.rotation.y += 0.004;
      mountain.rotation.x  = Math.sin(t * 0.3) * 0.03;
    }

    vandrerT = (vandrerT + 0.00018) % 1;

    vandrere.forEach((v, i) => {
      const vt = (vandrerT + v.offset) % 1;
      const p0 = vandrerPos(vt);
      const p1 = vandrerPos((vt + 0.003) % 1);

      v.gruppe.position.copy(p0);

      const dx = p1.x - p0.x, dz = p1.z - p0.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.0001) {
        v.gruppe.rotation.y = Math.atan2(dx, dz);
      }

      const fase  = i * Math.PI * 0.5;
      const sving = Math.sin(t * 9 + fase) * 0.45;

      v.vBovPivot.rotation.x =  sving;
      v.hBovPivot.rotation.x = -sving;
      v.vKnePivot.rotation.x = Math.max(0, -sving) * 0.80;
      v.hKnePivot.rotation.x = Math.max(0,  sving) * 0.80;
      v.vArmPivot.rotation.x = -sving * 0.55;
      v.hArmPivot.rotation.x =  sving * 0.55;
    });

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const W = container.clientWidth, H = container.clientHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  });
}
