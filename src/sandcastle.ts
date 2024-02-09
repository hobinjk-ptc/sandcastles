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
  groundWidthSegments = 16;
  groundDepthSegments = 16;
  // bigScale = 80000;
  bigScale = 900 / 1.2;
  durationScale = 120000;

  buildingMaterial: THREE.MeshStandardMaterial|undefined;
  buildingMaterialBig: THREE.MeshStandardMaterial|undefined;

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
    this.ground.position.y = 1.2;

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
    const aoMap = await exrLoader.loadAsync('asphalt_04_ao_1k.exr');
    const roughnessMap = await exrLoader.loadAsync('asphalt_04_rough_1k.exr');
    const normalMap = await exrLoader.loadAsync('asphalt_04_nor_gl_1k.exr');
    const biggify = (texture: THREE.Texture) => {
      let texBig = texture.clone();
      texBig.wrapS = THREE.MirroredRepeatWrapping;
      texBig.wrapT = THREE.MirroredRepeatWrapping;
      let texScale = Math.min(Math.floor(this.bigScale / 2), 100000);
      texBig.repeat.set(texScale, texScale);
      return texBig;
    };
    const aoMapBig = biggify(aoMap);
    const roughnessMapBig = biggify(roughnessMap);
    const normalMapBig = biggify(normalMap);

    let material = new THREE.MeshStandardMaterial({
      aoMap,
      // map,
      roughnessMap,
      normalMap,
      color: 0x9999ab,
    });

    let materialBig = new THREE.MeshStandardMaterial({
      aoMap: aoMapBig,
      // map,
      roughnessMap: roughnessMapBig,
      normalMap: normalMapBig,
      color: 0x9999ab,
    });

    this.buildingMaterial = material;
    this.buildingMaterialBig = materialBig;

    let platformGeo = new THREE.CircleGeometry(3, 64);
    let platform = new THREE.Mesh(platformGeo, this.buildingMaterial);
    platform.rotateX(-Math.PI / 2);
    this.scene.add(platform);
  }

  makeBuildings(count: number) {
    for (let i = 0; i < count; i++) {
      let sx = Math.floor(Math.random() * this.groundWidthSegments);
      let sz = Math.floor(Math.random() * this.groundDepthSegments);

      let mesh = this.makeBuildingMesh(sx, sz);

      this.scene.add(mesh);
      const bigMesh = mesh.clone();
      bigMesh.material = this.buildingMaterialBig!;
      this.scene.add(bigMesh);
      let oneWidth = this.groundWidth / this.groundWidthSegments;
      let bigWidth = this.bigScale * oneWidth - 6;
      // Scale adjusted down so that cubes don't intersect with home platform
      bigMesh.scale.set(
        bigWidth / oneWidth,
        bigWidth / oneWidth,
        bigWidth / oneWidth
      );
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
      duration: diff.length() * this.durationScale,
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
      building.bigMesh.position.y = -1;
    }
  }
}
