import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";

const canvas = document.getElementById("game-canvas");
const healthBar = document.querySelector("#health-bar span");
const hungerBar = document.querySelector("#hunger-bar span");
const moodBar = document.querySelector("#mood-bar span");
const scoreValue = document.getElementById("score-value");
const helpPanel = document.getElementById("help-panel");
const toggleHelpBtn = document.getElementById("toggle-help");

const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2("#0b0d16", 0.035);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  400
);
camera.position.set(0, 1.65, 6);

const ambient = new THREE.HemisphereLight("#3a4a6b", "#0c0c10", 0.9);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight("#ffe4b5", 1.2);
dirLight.position.set(4, 12, 6);
dirLight.castShadow = false;
scene.add(dirLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(180, 180),
  new THREE.MeshStandardMaterial({
    color: "#242f47",
    roughness: 1,
    metalness: 0,
  })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const player = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.35, 0.9, 8, 16),
  new THREE.MeshStandardMaterial({ color: "#d6d0c4", roughness: 0.8 })
);
body.castShadow = false;
player.add(body);
player.position.set(0, 0.9, 0);
scene.add(player);

const cameraPivot = new THREE.Object3D();
player.add(cameraPivot);
cameraPivot.position.set(0, 0.6, 0);
camera.position.set(0, 0.5, 2.4);
cameraPivot.add(camera);

const collectibles = [];
const tempBox = new THREE.Box3();
const playerCollider = new THREE.Sphere(new THREE.Vector3(), 0.65);

function createCity() {
  const buildingMaterial = new THREE.MeshStandardMaterial({
    color: "#1e2435",
    roughness: 0.95,
    metalness: 0.05,
  });

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: "#ffb347",
    emissive: "#ff8f1f",
    emissiveIntensity: 0.7,
    roughness: 0.4,
  });

  const lambertMaterial = new THREE.MeshLambertMaterial({
    color: "#313d55",
  });

  const cityGroup = new THREE.Group();

  for (let i = 0; i < 60; i += 1) {
    const width = 1.4 + Math.random() * 2.6;
    const depth = 1.4 + Math.random() * 2.6;
    const height = 3 + Math.random() * 9;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, buildingMaterial.clone());
    mesh.position.set(
      (Math.random() - 0.5) * 80,
      height / 2,
      (Math.random() - 0.5) * 80
    );
    mesh.material.color.offsetHSL(0, 0, Math.random() * 0.08);
    mesh.receiveShadow = false;
    mesh.castShadow = false;

    const windowCount = THREE.MathUtils.randInt(1, 4);
    for (let w = 0; w < windowCount; w += 1) {
      const winGeom = new THREE.BoxGeometry(0.15, height * (0.3 + Math.random() * 0.3), 0.01);
      const winMesh = new THREE.Mesh(winGeom, windowMaterial);
      const offsetX = (Math.random() - 0.5) * width * 0.7;
      const offsetY = (Math.random() - 0.3) * height * 0.6;
      winMesh.position.set(offsetX, offsetY, depth / 2 + 0.01);
      mesh.add(winMesh);
    }

    if (Math.random() > 0.7) {
      const fence = new THREE.Mesh(
        new THREE.BoxGeometry(width * 1.4, 0.8, depth * 1.4),
        lambertMaterial
      );
      fence.position.set(mesh.position.x, 0.4, mesh.position.z);
      cityGroup.add(fence);
    }

    cityGroup.add(mesh);
  }

  scene.add(cityGroup);
}

function createCollectibles() {
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: "#ffb347",
    emissive: "#ffdd55",
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });

  for (let i = 0; i < 18; i += 1) {
    const bag = new THREE.Group();

    const sackBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 24, 18),
      new THREE.MeshStandardMaterial({
        color: "#8f6b3d",
        roughness: 0.8,
        metalness: 0.05,
      })
    );
    sackBody.position.y = 0.4;
    bag.add(sackBody);

    const glow = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.08, 12, 36), glowMaterial);
    glow.rotation.x = Math.PI / 2;
    bag.add(glow);

    bag.position.set(
      (Math.random() - 0.5) * 60,
      0,
      (Math.random() - 0.5) * 60
    );

    bag.userData = {
      rotationSpeed: 0.35 + Math.random() * 0.4,
      baseY: 0.45 + Math.random() * 0.2,
      hungerGain: 0.18 + Math.random() * 0.1,
      moodGain: 0.15 + Math.random() * 0.08,
      healthGain: 0.06 + Math.random() * 0.05,
    };

    collectibles.push(bag);
    scene.add(bag);
  }
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

class VirtualJoystick {
  constructor(root) {
    this.root = root;
    this.stick = root.querySelector(".stick");
    this.pointerId = null;
    this.value = new THREE.Vector2();
    this.maxDistance = root.clientWidth * 0.32;

    root.addEventListener("pointerdown", this.onPointerDown.bind(this));
    window.addEventListener("pointerup", this.onPointerUp.bind(this));
    window.addEventListener("pointercancel", this.onPointerUp.bind(this));
    window.addEventListener("pointermove", this.onPointerMove.bind(this));
    window.addEventListener("resize", () => {
      this.maxDistance = this.root.clientWidth * 0.32;
    });
  }

  onPointerDown(event) {
    if (this.pointerId !== null) return;
    this.pointerId = event.pointerId;
    this.root.setPointerCapture(this.pointerId);
    this.updateStick(event);
  }

  onPointerMove(event) {
    if (this.pointerId !== event.pointerId) return;
    this.updateStick(event);
  }

  onPointerUp(event) {
    if (this.pointerId !== event.pointerId) return;
    this.root.releasePointerCapture(this.pointerId);
    this.pointerId = null;
    this.value.set(0, 0);
    this.stick.style.transform = "translate3d(0,0,0)";
  }

  updateStick(event) {
    const rect = this.root.getBoundingClientRect();
    const center = new THREE.Vector2(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const pointer = new THREE.Vector2(event.clientX, event.clientY);
    const offset = pointer.sub(center);
    const distance = Math.min(offset.length(), this.maxDistance);
    const angle = Math.atan2(offset.y, offset.x);
    this.value.set(
      Math.cos(angle) * (distance / this.maxDistance),
      Math.sin(angle) * (distance / this.maxDistance)
    );
    this.stick.style.transform = `translate3d(${this.value.x * 40}%, ${this.value.y * 40}%, 0)`;
  }
}

const moveJoystick = new VirtualJoystick(document.getElementById("joystick-left"));
const lookJoystick = new VirtualJoystick(document.getElementById("joystick-right"));

const state = {
  health: 1,
  hunger: 1,
  mood: 0.8,
  score: 0,
  yaw: 0,
  pitch: -0.1,
  speed: 7.5,
};

function updateStats(delta) {
  state.hunger = clamp01(state.hunger - delta * 0.03);
  state.mood = clamp01(state.mood - delta * 0.015 + state.hunger * 0.008 * delta);

  if (state.hunger <= 0.02) {
    state.health = clamp01(state.health - delta * 0.05);
  } else {
    state.health = clamp01(state.health + delta * 0.01 * state.hunger);
  }

  healthBar.style.transform = `scaleX(${state.health.toFixed(3)})`;
  hungerBar.style.transform = `scaleX(${state.hunger.toFixed(3)})`;
  moodBar.style.transform = `scaleX(${state.mood.toFixed(3)})`;
}

function updateMovement(delta) {
  const move = moveJoystick.value.clone();
  const look = lookJoystick.value.clone();

  state.yaw -= look.x * delta * 1.8;
  state.pitch = clamp01((state.pitch - look.y * delta * 1.8 + 1.2) / 2.4) * 2.4 - 1.2;
  state.pitch = Math.max(-0.85, Math.min(0.45, state.pitch));

  cameraPivot.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;

  if (move.lengthSq() < 0.0001) return;

  const direction = new THREE.Vector3(move.x, 0, move.y * -1);
  direction.normalize();
  direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);

  const movement = direction.multiplyScalar(state.speed * delta);
  player.position.add(movement);

  player.position.x = Math.max(-80, Math.min(80, player.position.x));
  player.position.z = Math.max(-80, Math.min(80, player.position.z));
}

function updateCollectibles(delta) {
  for (const item of collectibles) {
    item.rotation.y += item.userData.rotationSpeed * delta;
    item.position.y = item.userData.baseY + Math.sin(performance.now() / 450) * 0.08;

    playerCollider.center.copy(player.position).y += 0.4;
    tempBox.setFromObject(item);
    if (tempBox.distanceToPoint(playerCollider.center) < 0.8) {
      state.score += 1;
      state.hunger = clamp01(state.hunger + item.userData.hungerGain);
      state.mood = clamp01(state.mood + item.userData.moodGain);
      state.health = clamp01(state.health + item.userData.healthGain);
      scoreValue.textContent = state.score.toString();

      item.position.set(
        (Math.random() - 0.5) * 60,
        0,
        (Math.random() - 0.5) * 60
      );
    }
  }
}

function animate() {
  const delta = clock.getDelta();
  updateStats(delta);
  updateMovement(delta);
  updateCollectibles(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function setupUI() {
  toggleHelpBtn.addEventListener("click", () => {
    const expanded = toggleHelpBtn.getAttribute("aria-expanded") === "true";
    toggleHelpBtn.setAttribute("aria-expanded", (!expanded).toString());
    helpPanel.hidden = expanded;
  });

  helpPanel.hidden = true;
  toggleHelpBtn.setAttribute("aria-expanded", "false");
}

createCity();
createCollectibles();
setupUI();

window.addEventListener("resize", onResize, { passive: true });

renderer.setAnimationLoop(animate);
