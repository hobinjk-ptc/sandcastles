import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

type Animation = {
  startTime: number,
  duration: number,
  start: THREE.Vector3,
  end: THREE.Vector3,
};

type Building = {
  mesh: THREE.Mesh,
  bigMesh: THREE.Mesh,
  animation: Animation|null,
};

export class Sandcastle {
  scene: THREE.Scene;

  ground: THREE.Mesh;
  groundWidth = 1.2;
  groundDepth = 1.2;
  groundWidthSegments = 64;
  groundDepthSegments = 64;
  bigScale = 20000;

  buildingMaterial: THREE.MeshStandardMaterial|undefined;

  buildings: Array<Building> = [];
  lastUpdate = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const groundGeo = new THREE.PlaneGeometry(
      this.groundWidth, this.groundDepth, this.groundWidthSegments, this.groundDepthSegments,
    );
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      wireframe: true,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMaterial);
    this.ground.rotateX(-Math.PI / 2);
    this.ground.position.y = 0.8;
    this.ground.position.z = -1;

    this.scene.add(this.ground);
  }

  xToSx(x: number): number {
    return (x - this.ground.position.x) / this.groundWidth * this.groundWidthSegments + this.groundWidthSegments / 2;
  }

  sxToX(sx: number): number {
    return (sx - this.groundWidthSegments / 2) / this.groundWidthSegments * this.groundWidth + this.ground.position.x;
  }

  zToSz(z: number): number {
    return (z - this.ground.position.z) / this.groundDepth * this.groundDepthSegments + this.groundDepthSegments / 2;
  }

  szToZ(sz: number): number {
    return (sz - this.groundDepthSegments / 2) / this.groundDepthSegments * this.groundDepth + this.ground.position.z;
  }

  async loadBuildingMaterial() {
    const exrLoader = new EXRLoader();
    const aoMap = await exrLoader.loadAsync('/assets/asphalt_04_1k/textures/asphalt_04_ao_1k.exr');
    // const map = await exrLoader.loadAsync('/assets/asphalt_04_1k/textures/asphalt_04_diff_1k.exr');
    const roughnessMap = await exrLoader.loadAsync('/assets/asphalt_04_1k/textures/asphalt_04_rough_1k.exr');
    const normalMap = await exrLoader.loadAsync('/assets/asphalt_04_1k/textures/asphalt_04_nor_gl_1k.exr');
    let material = new THREE.MeshStandardMaterial({
      aoMap,
      // map,
      roughnessMap,
      normalMap,
      color: 0x9999ab,
    });
    this.buildingMaterial = material;
  }

  makeBuildings(count: number) {
    for (let i = 0; i < count; i++) {
      let sx = Math.floor(Math.random() * this.groundWidthSegments);
      let sz = Math.floor(Math.random() * this.groundDepthSegments);

      let mesh = this.makeBuildingMesh(sx, sz);

      this.scene.add(mesh);
      const bigMesh = mesh.clone();
      this.scene.add(bigMesh);
      bigMesh.scale.set(this.bigScale, this.bigScale, this.bigScale);
      this.buildings.push({
        mesh,
        bigMesh,
        animation: null,
      });
    }

    this.updateBuildingBigMeshes();
  }

  makeBuildingMesh(sx: number, sz: number): THREE.Mesh {
    let x = this.sxToX(sx);
    let z = this.szToZ(sz);
    let oneWidth = this.groundWidth / this.groundWidthSegments;
    let oneDepth = this.groundDepth / this.groundDepthSegments;
    let cube = new THREE.BoxGeometry(oneWidth, oneDepth, oneWidth);
    let mesh = new THREE.Mesh(cube, this.buildingMaterial!);
    mesh.position.x = x + oneWidth / 2;
    mesh.position.z = z + oneDepth / 2;
    mesh.position.y = this.ground.position.y + oneWidth / 2;
    return mesh;
  }

  easeInOut(t: number): number {
    if (t < 0.5) {
      return 2 * t * t;
    } else {
      return -1 + (4 - 2 * t) * t;
    }
  }

  update(time: number) {
    for (let building of this.buildings) {
      if (!building.animation) {
        this.queueMove(building, time);
        continue;
      }
      if (time < building.animation.startTime) {
        continue;
      }
      let progress = (time - building.animation.startTime) / building.animation.duration;

      if (progress > 1) {
        building.mesh.position.copy(building.animation.end);
        building.animation = null;
        continue;
      }

      let easedProgress = this.easeInOut(progress);

      building.mesh.position.lerpVectors(
        building.animation.start,
        building.animation.end,
        easedProgress);
    }

    this.updateBuildingBigMeshes();
  }

  queueMove(building: Building, time: number) {
    let sxDest = Math.floor(Math.random() * this.groundWidthSegments);
    let szDest = Math.floor(Math.random() * this.groundDepthSegments);

    let sx = Math.floor(this.xToSx(building.mesh.position.x));
    let sz = Math.floor(this.zToSz(building.mesh.position.z));

    if (Math.random() < 0.5) {
      sxDest = sx;
    } else {
      szDest = sz;
    }

    let end = new THREE.Vector3(
      this.sxToX(sxDest + 0.5),
      building.mesh.position.y,
      this.szToZ(szDest + 0.5),
    );

    let diff = end.clone().sub(building.mesh.position);

    let delay = Math.random() * 5000;
    let animation = {
      startTime: time + delay,
      duration: diff.length() * 20000,
      start: building.mesh.position.clone(),
      end: end,
    };
    building.animation = animation;
  }

  updateBuildingBigMeshes() {
    for (const building of this.buildings) {
      let smallDiff = building.mesh.position.clone().sub(this.ground.position);
      smallDiff.multiplyScalar(this.bigScale);
      building.bigMesh.position.copy(smallDiff);
      building.bigMesh.position.y = -10;
    }
  }
}
