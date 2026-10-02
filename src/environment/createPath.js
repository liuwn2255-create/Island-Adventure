import * as THREE from 'three';

const PATH_POINTS = [
  [0, 0],
  [-0.8, 2.0],
  [-2.6, 4.2],
  [-5.1, 4.5],
  [-6.8, 2.5],
  [-6.1, -0.2],
  [-3.5, -2.4],
  [-0.5, -4.7],
  [2.8, -5.3],
  [4.3, -3.1],
  [3.3, 0.3],
  [1.1, 3.5],
  [0.4, 7.8],
];

export function createPath(scene, heightAt) {
  const curve = new THREE.CatmullRomCurve3(
    PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, heightAt(x, z) + 0.035, z)),
    false,
    'centripetal',
    0.35,
  );
  const divisions = 180;
  const halfWidth = 0.78;
  const positions = [];
  const uv = [];
  const indices = [];

  for (let i = 0; i <= divisions; i += 1) {
    const t = i / divisions;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const sideX = -tangent.z;
    const sideZ = tangent.x;
    const taper = Math.min(1, 0.38 + Math.min(t, 1 - t) * 7);
    const width = halfWidth * taper;
    for (const sign of [-1, 1]) {
      const x = point.x + sideX * width * sign;
      const z = point.z + sideZ * width * sign;
      positions.push(x, heightAt(x, z) + 0.045, z);
      uv.push(i / divisions * 8, sign === -1 ? 0 : 1);
    }
  }
  for (let i = 0; i < divisions; i += 1) {
    const left = i * 2;
    const right = left + 1;
    const nextLeft = left + 2;
    const nextRight = left + 3;
    indices.push(left, nextLeft, right, right, nextLeft, nextRight);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const path = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: '#bd8d5c', roughness: 1, side: THREE.DoubleSide }),
  );
  path.name = 'CurvingExplorerPath';
  path.receiveShadow = true;
  scene.add(path);
  return curve;
}
