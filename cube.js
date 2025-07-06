document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('cubeContainer');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Define your folders (adjust as needed)
  const imagePaths = [
    "/image_files/flickr-reflections/flickr-reflections-tpg-nikos4.jpg",
    "/image_files/flickr-reflections/flickr-reflections-tpg-nikos1.jpg",
    "/image_files/flickr-reflections/flickr-reflections-TPG.jpg",
    "/image_files/flickr-reflections/flickr-reflections-tpg-nikos2.jpg",
    "/image_files/flickr-reflections/flickr-reflections-tpg-nikos3.jpg",
    "/image_files/then_we_sat/Image 41 (1).jpg",
    "/image_files/then_we_sat/[vertical] THEN WE SAT FOR SOME TIME AND OBSERVED 2025.jpg",
    "/image_files/then_we_sat/Image 17.jpg",
    "/image_files/then_we_sat/[light vertical behind] THEN WE SAT FOR SOME TIME AND OBSERVED-1.jpg",
    "/image_files/then_we_sat/Image 22.jpg",
    "/image_files/then_we_sat/[people hugging horizontal] THEN WE SAT FOR SOME TIME AND OBSERVED 2025.jpg",
    "/image_files/then_we_sat/foto 52.jpg",
    "/image_files/then_we_sat/foto 8.jpg",
    "/image_files/then_we_sat/[people looking] THEN WE SAT FOR SOME TIME AND OBSERVED.jpg",
    "/image_files/peckham_digital_construction/prerender.jpg",
    "/image_files/peckham_digital_construction/k-n-a-top-534x2048.jpg",
    "/image_files/peckham_digital_construction/cafe-spice-top.jpg",
    "/image_files/peckham_digital_construction/screenshot2-1024x509.jpg",
    "/image_files/peckham_digital_construction/main-front-1.jpg",
    "/image_files/peckham_digital_construction/streetview1.jpg",
    "/image_files/peckham_digital_construction/streetview2.jpg",
    "/image_files/peckham_digital_construction/khans-top.jpg",
    "/image_files/peckham_digital_construction/bg-top.jpg",
    "/image_files/peckham_digital_construction/process-people-1024x557.jpg",
    "/image_files/peckham_digital_construction/ash-official-cover-image-1-706x1024.jpg",
    "/image_files/peckham_digital_construction/main-front-2.jpg",
    "/image_files/peckham_digital_construction/fish-ka-top.jpg",
    "/image_files/peckham_digital_construction/screenshot3-1024x537.jpg",
    "/image_files/peckham_digital_construction/kfc-top-1024x786.jpg",
    "/image_files/flickr-collages/overview.jpg",
    "/image_files/flickr-collages/image2.jpg",
    "/image_files/flickr-collages/image1.jpg",
    "/image_files/me.jpg",
    "/image_files/yt_plant/essay snippet.PNG.jpg",
    "/image_files/workshop-tate/workshop7.jpg",
    "/image_files/workshop-tate/workshop6.jpg",
    "/image_files/workshop-tate/workshop4.jpg",
    "/image_files/workshop-tate/workshop5.jpg",
    "/image_files/workshop-tate/workshop2.jpg",
    "/image_files/workshop-tate/workshop1.jpg",
    "/image_files/workshop-tate/old/workshop7.jpg",
    "/image_files/workshop-tate/old/workshop6.jpg",
    "/image_files/workshop-tate/old/workshop4.jpg",
    "/image_files/workshop-tate/old/workshop5.jpg",
    "/image_files/workshop-tate/old/workshop2.jpg",
    "/image_files/workshop-tate/old/workshop1.jpg",
    "/image_files/workshop-tate/old/workshop3.jpg",
    "/image_files/workshop-tate/workshop3.jpg",
    "/image_files/and-i-image/IMG_1320.jpg",
    "/image_files/and-i-image/gallery watch.jpg",
    "/image_files/and-i-image/vert 3_.jpg",
    "/image_files/and-i-image/old/IMG_1320.jpg",
    "/image_files/and-i-image/old/gallery watch.jpg",
    "/image_files/and-i-image/old/vert 3_.jpg",
    "/image_files/and-i-image/old/closeup 4.jpg",
    "/image_files/and-i-image/closeup 4.jpg",
    "/image_files/reginald/installpic.jpg",
    "/image_files/simulacrum-orbita/simufolder.JPG",
    "/image_files/simulacrum-orbita/slide one (3).jpg",
    "/image_files/simulacrum-orbita/slide two (3).jpg",
    "/image_files/simulacrum-orbita/diagram orbitis2.jpg",
    "/image_files/simulacrum-orbita/const3.jpg",
    "/image_files/simulacrum-orbita/slide one (2).jpg",
    "/image_files/simulacrum-orbita/slide two (1).jpg",
    "/image_files/simulacrum-orbita/nikos_simulacrum_closeup.jpg",
    "/image_files/simulacrum-orbita/assembly 1.jpg",
    "/image_files/simulacrum-orbita/const4.jpg",
    "/image_files/simulacrum-orbita/slide three (1).jpg",
    "/image_files/simulacrum-orbita/slide one (1).jpg",
    "/image_files/simulacrum-orbita/code 5.jpg",
    "/image_files/simulacrum-orbita/slide three (2).jpg",
    "/image_files/simulacrum-orbita/slide three (4).jpg",
    "/image_files/simulacrum-orbita/const5.jpg",
    "/image_files/simulacrum-orbita/slide two (4).jpg",
    "/image_files/simulacrum-orbita/slide one (4).jpg",
    "/image_files/simulacrum-orbita/slide two (2).jpg",
    "/image_files/simulacrum-orbita/orbitis diagram final.jpg",
    "/image_files/simulacrum-orbita/slide three (3).jpg",
    "/image_files/simulacrum-orbita/orbitis logo 2.jpg",
    "/image_files/simulacrum-orbita/diagram orbitis.jpg",
    "/image_files/simulacrum-orbita/diagram orbitis1.jpg",
    "/image_files/simulacrum-orbita/assembly 2.jpg",
    "/image_files/simulacrum-orbita/code 6.jpg",
    "/image_files/simulacrum-orbita/const1.jpg",
    "/image_files/simulacrum-orbita/old/simufolder.JPG",
    "/image_files/simulacrum-orbita/old/const3.jpg",
    "/image_files/simulacrum-orbita/old/nikos_simulacrum_closeup.jpg",
    "/image_files/simulacrum-orbita/old/assembly 1.jpg",
    "/image_files/simulacrum-orbita/old/const4.jpg",
    "/image_files/simulacrum-orbita/old/code 5.jpg",
    "/image_files/simulacrum-orbita/old/const5.jpg",
    "/image_files/simulacrum-orbita/old/assembly 2.jpg",
    "/image_files/simulacrum-orbita/old/code 6.jpg",
    "/image_files/simulacrum-orbita/old/const1.jpg",
    "/image_files/simulacrum-orbita/old/code 2.jpg",
    "/image_files/simulacrum-orbita/old/simu77.jpg",
    "/image_files/simulacrum-orbita/old/code 7.jpg",
    "/image_files/simulacrum-orbita/old/code 1.jpg",
    "/image_files/simulacrum-orbita/code 2.jpg",
    "/image_files/simulacrum-orbita/simu77.jpg",
    "/image_files/simulacrum-orbita/orbitis logo.jpg",
    "/image_files/simulacrum-orbita/code 7.jpg",
    "/image_files/simulacrum-orbita/code 1.jpg",
    "/image_files/simu-earlyloop.jpg",
    "/image_files/maude/maude.jpg",
    "/image_files/generative-experiment/watergenerative.jpg",
    "/image_files/field,sky,body,mind/fieldimage3.jpg",
    "/image_files/field,sky,body,mind/fieldimage2.jpg",
    "/image_files/simu-writing/leets(197).jpg",
    "/image_files/simu-writing/leets(198).jpg",
    "/image_files/simu-writing/leets(196).jpg",
    "/image_files/simu-writing/leets(195).jpg"
  ];

  const loader = new THREE.TextureLoader();
  const materials = [];

  // Create 6 materials with random images
  for (let i = 0; i < 6; i++) {
    const randomPath = imagePaths[Math.floor(Math.random() * imagePaths.length)];
    const texture = loader.load(randomPath);
    materials.push(new THREE.MeshBasicMaterial({ map: texture }));
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const cube = new THREE.Mesh(geometry, materials);
  scene.add(cube);

  camera.position.z = 5;

  // Function to update a random face with a new random texture
  function updateRandomFace() {
    // Pick a random face (0-5)
    const randomFaceIndex = Math.floor(Math.random() * 6);
    
    // Pick a random image
    const randomPath = imagePaths[Math.floor(Math.random() * imagePaths.length)];
    
    // Dispose of the old texture to prevent memory leaks
    if (materials[randomFaceIndex].map) {
      materials[randomFaceIndex].map.dispose();
    }
    
    // Load new texture and assign it
    const newTexture = loader.load(randomPath);
    materials[randomFaceIndex].map = newTexture;
    materials[randomFaceIndex].needsUpdate = true;
    
    // Schedule the next update with a random interval between 2-10 seconds
    const nextInterval = Math.random() * 8000 + 2000; // 2000ms to 10000ms
    setTimeout(updateRandomFace, nextInterval);
  }

  // Start the texture updating cycle
  const initialDelay = Math.random() * 8000 + 2000; // 2-10 seconds
  setTimeout(updateRandomFace, initialDelay);

  function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.003;
    cube.rotation.y += 0.002;
    renderer.render(scene, camera);
  }
  animate();

  // Responsive resize
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
});