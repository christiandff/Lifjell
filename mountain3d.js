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
  camera.position.set(0, 1.4, 5.5);
  camera.lookAt(0, 0.8, 0);

  // ===== FJELLGEOMETRI — høy detaljgrad =====
  const geo = new THREE.ConeGeometry(2.4, 4.2, 10, 20, false);
  geo.rotateY(Math.PI / 10);

  const pos = geo.attributes.position;
  const baseY = -4.2 / 2;

  // Pseudo-random seed basert på posisjon (deterministisk)
  function noise(x, y, z) {
    const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.3) * 43758.5453;
    return n - Math.floor(n);
  }

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const relY = (y - baseY) / 4.2;

    if (relY < 0.97) {
      // Kombinasjon av grov og fin deformasjon
      const grovt = Math.pow(1 - relY, 1.1) * 0.55;
      const fint  = Math.pow(1 - relY, 0.7) * 0.18;

      pos.setX(i, x + (noise(x, y, z)       - 0.5) * grovt + (noise(x*3, y*3, z*3) - 0.5) * fint);
      pos.setZ(i, z + (noise(x+1, y+2, z+3) - 0.5) * grovt + (noise(x*3+1, y*3, z*3) - 0.5) * fint);

      if (relY < 0.75) {
        pos.setY(i, y + (noise(x*2, y*2, z*2) - 0.5) * 0.20);
      }
      // Ekstra ruglete midtparti
      if (relY > 0.25 && relY < 0.65) {
        pos.setX(i, pos.getX(i) + (noise(x*5, y*5, z*5) - 0.5) * 0.12);
        pos.setZ(i, pos.getZ(i) + (noise(x*5+2, y*5, z*5) - 0.5) * 0.12);
      }
    }
  }

  geo.computeVertexNormals();

  // Fargelegg etter høyde: snø → steinete grå → stein → gress/skog
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const relY = (y - baseY) / 4.2;
    const n = noise(pos.getX(i) * 4, y * 4, pos.getZ(i) * 4) * 0.08;

    let r, g, b;
    if (relY > 0.80) {
      // Lys grå toppstein — nakent fjell
      r = 0.62 + n * 0.5; g = 0.57 + n * 0.4; b = 0.53 + n * 0.3;
    } else if (relY > 0.58) {
      // Grå fjellstein
      r = 0.40 + n * 1.0; g = 0.38 + n * 0.9; b = 0.42 + n * 0.8;
    } else if (relY > 0.35) {
      // Mørkere stein med lyngbrunt
      r = 0.26 + n * 0.9; g = 0.25 + n * 1.0; b = 0.22 + n * 0.6;
    } else {
      // Skogsgrønn base
      r = 0.14 + n * 0.6;
      g = 0.22 + n * 0.8;
      b = 0.12 + n * 0.4;
    }
    colors[i * 3]     = Math.min(1, r);
    colors[i * 3 + 1] = Math.min(1, g);
    colors[i * 3 + 2] = Math.min(1, b);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    flatShading: true,
    shininess: 60,
    specular: new THREE.Color(0x88aacc)
  });

  const mountain = new THREE.Mesh(geo, mat);
  mountain.position.y = -0.4;
  scene.add(mountain);

  // ===== LYS =====
  scene.add(new THREE.AmbientLight(0xd0e8d8, 0.9));

  // Sol fra høyre
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.8);
  sun.position.set(5, 7, 4);
  scene.add(sun);

  // Kald himmelblå fylling fra venstre
  const fill = new THREE.DirectionalLight(0xa0c8e0, 0.7);
  fill.position.set(-5, 3, -2);
  scene.add(fill);

  // Kant-lys bakfra
  const rim = new THREE.DirectionalLight(0xc0e0c0, 0.4);
  rim.position.set(0, -1, -5);
  scene.add(rim);


  // ===== ANIMASJON =====
  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.004;
    mountain.rotation.y = t;

    // Svak vuggebevegelse
    mountain.rotation.x = Math.sin(t * 0.3) * 0.03;

    renderer.render(scene, camera);
  }
  animate();

  // Resize
  window.addEventListener('resize', () => {
    const W = container.clientWidth;
    const H = container.clientHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  });
}
