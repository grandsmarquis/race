import {
  Box3,
  Color,
  Group,
  Material,
  Matrix4,
  Mesh,
  Object3D,
  Vector3,
} from "three";

import { PlayerCarPreset } from "@/game/playerCars";

const TEMP_BOX = new Box3();
const TEMP_CENTER = new Vector3();
const TEMP_SIZE = new Vector3();
const TEMP_MATRIX = new Matrix4();
const TEMP_RELATIVE = new Matrix4();
const MODEL_FORWARD_YAW_CORRECTION = Math.PI / 2;
const MODEL_ROLL_CORRECTION = Math.PI / 2;

interface BuildCarModelOptions {
  tintHex?: string;
  targetLength?: number;
  name?: string;
}

function tintMaterial(material: Material, tintHex: string): Material {
  const cloned = material.clone();
  const textured = cloned as Material & {
    map?: { image?: unknown } | null;
    alphaMap?: { image?: unknown } | null;
    emissiveMap?: { image?: unknown } | null;
    normalMap?: { image?: unknown } | null;
    roughnessMap?: { image?: unknown } | null;
    metalnessMap?: { image?: unknown } | null;
    color?: Color;
    needsUpdate?: boolean;
  };
  const textureSlots = [
    "map",
    "alphaMap",
    "emissiveMap",
    "normalMap",
    "roughnessMap",
    "metalnessMap",
  ] as const;

  for (const slot of textureSlots) {
    const texture = textured[slot] as { image?: unknown } | null | undefined;
    if (texture && !texture.image) {
      textured[slot] = null;
    }
  }

  if (textured.color instanceof Color) {
    textured.color.copy(new Color(tintHex));
  }

  textured.needsUpdate = true;
  return cloned;
}

export function disposeObjectMaterials(object: Object3D) {
  object.traverse((node) => {
    if (!(node instanceof Mesh)) {
      return;
    }

    const material = node.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
      return;
    }
    material.dispose();
  });
}

export function buildModelFromFbx(
  fbxScene: Group,
  preset: PlayerCarPreset,
  options: BuildCarModelOptions = {},
): Group | null {
  const modelRoot = fbxScene.getObjectByName(preset.modelRootName);
  if (!modelRoot) {
    return null;
  }

  modelRoot.updateWorldMatrix(true, true);
  TEMP_MATRIX.copy(modelRoot.matrixWorld).invert();

  const tintHex = options.tintHex ?? preset.bodyColor;
  const targetLength = options.targetLength ?? preset.bodySize[2];

  const modelGroup = new Group();
  modelGroup.name = options.name ?? `${preset.id}-car-model`;

  modelRoot.traverse((node) => {
    if (!(node instanceof Mesh)) {
      return;
    }

    node.updateWorldMatrix(true, false);

    const mesh = node.clone();
    mesh.material = Array.isArray(node.material)
      ? node.material.map((material) => tintMaterial(material, tintHex))
      : tintMaterial(node.material, tintHex);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    TEMP_RELATIVE.multiplyMatrices(TEMP_MATRIX, node.matrixWorld);
    TEMP_RELATIVE.decompose(mesh.position, mesh.quaternion, mesh.scale);

    modelGroup.add(mesh);
  });

  if (modelGroup.children.length === 0) {
    return null;
  }

  // Axis correction order matters: roll first (wheels to ground), then yaw to game-forward.
  modelGroup.rotation.set(0, 0, 0);
  modelGroup.rotateZ(MODEL_ROLL_CORRECTION);
  modelGroup.rotateY(MODEL_FORWARD_YAW_CORRECTION);

  TEMP_BOX.setFromObject(modelGroup);
  TEMP_BOX.getSize(TEMP_SIZE);

  if (TEMP_SIZE.z > 0.001) {
    const scale = targetLength / TEMP_SIZE.z;
    modelGroup.scale.setScalar(scale);
  }

  // Scale first, then recenter; otherwise scaling amplifies pre-center offsets from the source FBX.
  TEMP_BOX.setFromObject(modelGroup);
  TEMP_BOX.getCenter(TEMP_CENTER);
  modelGroup.position.set(-TEMP_CENTER.x, -TEMP_BOX.min.y, -TEMP_CENTER.z);

  return modelGroup;
}
