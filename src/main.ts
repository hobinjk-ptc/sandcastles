import './style.css'
import * as THREE from 'three';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {Sandcastle} from './sandcastle.ts';
import {loadSkybox} from './skybox.ts';

const width = window.innerWidth, height = window.innerHeight;

async function main() {
  const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000000);
  camera.position.y = 2;
  camera.position.z = 1;
  camera.lookAt(0, 1, -2);

  const scene = new THREE.Scene();

  // const fog = new THREE.Fog(0xcce0ec, 1000, 80000);
  const fog = new THREE.Fog(0xcce0ec, 1000, 200000);
  scene.fog = fog;

  const sandcastle = new Sandcastle(scene);
  await sandcastle.loadBuildingMaterial();

  sandcastle.makeBuildings(8);

  const renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setAnimationLoop(animation);
  document.body.appendChild(renderer.domElement);

  renderer.xr.enabled = true;
  document.body.appendChild(VRButton.createButton(renderer));
  // animation

  await loadSkybox(scene);

  function resizeRendererToDisplaySize(renderer: THREE.Renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function animation(time: number) {
    if (!renderer.xr.isPresenting && resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    sandcastle.update(time);

    renderer.render(scene, camera);
  }
}

main();
