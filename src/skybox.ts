// import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EquirectangularReflectionMapping } from 'three';

export async function loadSkybox(scene: THREE.Scene) {
  const hdrLoader = new RGBELoader();
  const envMap = await hdrLoader.loadAsync('./assets/industrial_sunset_puresky_4k.hdr');
  envMap.mapping = EquirectangularReflectionMapping;

  // const height = 15;
  // const radius = 100;
  // const skybox = new GroundedSkybox(envMap, height, radius);
  // skybox.position.y = height - 0.01;
  // scene.add(skybox);

  scene.environment = envMap;
  scene.background = scene.environment;
}
