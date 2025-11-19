import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";

const canvas = document.getElementById("game-canvas");
const healthBar = document.querySelector("#health-bar span");
const hungerBar = document.querySelector("#hunger-bar span");
const moodBar = document.querySelector("#mood-bar span");
const scoreValue = document.getElementById("score-value");
const helpPanel = document.getElementById("help-panel");
const toggleHelpBtn = document.getElementById("toggle-help");
const toggleHudBtn = document.getElementById("toggle-hud");

const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.45));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;

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

function createGroundTexture() {
  const size = 128;
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = size;
  canvasTexture.height = size;
  const ctx = canvasTexture.getContext("2d");

  ctx.fillStyle = "#1e2332";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";

  for (let i = 0; i < 40; i += 1) {
    const length = 6 + Math.random() * 18;
    const thickness = 1 + Math.random() * 2;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const angle = Math.random() * Math.PI * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillRect(-length / 2, -thickness / 2, length, thickness);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  texture.anisotropy = 4;
  return texture;
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(180, 180),
  new THREE.MeshStandardMaterial({
    color: "#242f47",
    roughness: 0.95,
    metalness: 0.05,
    map: createGroundTexture(),
  })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const player = new THREE.Group();
player.position.set(0, 0, 0);
scene.add(player);

const bodyGroup = new THREE.Group();
player.add(bodyGroup);

const legs = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.28, 0.7, 6, 12),
  new THREE.MeshStandardMaterial({ color: "#1d2230", roughness: 0.6 })
);
legs.position.y = 0.6;
bodyGroup.add(legs);

const torso = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.32, 0.85, 8, 16),
  new THREE.MeshStandardMaterial({ color: "#6b778d", roughness: 0.7 })
);
torso.position.y = 1.45;
bodyGroup.add(torso);

const scarf = new THREE.Mesh(
  new THREE.TorusGeometry(0.36, 0.06, 10, 32),
  new THREE.MeshStandardMaterial({
    color: "#ff9f1c",
    emissive: "#ffb347",
    emissiveIntensity: 0.35,
    roughness: 0.45,
  })
);
scarf.rotation.x = Math.PI / 2;
torso.add(scarf);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.28, 20, 16),
  new THREE.MeshStandardMaterial({ color: "#f1d5bd", roughness: 0.45 })
);
head.position.y = 0.95;
torso.add(head);

const cap = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.3, 0.12, 8, 16),
  new THREE.MeshStandardMaterial({ color: "#1a2537", roughness: 0.5 })
);
cap.position.y = 0.46;
head.add(cap);

const capBrim = new THREE.Mesh(
  new THREE.CylinderGeometry(0.36, 0.36, 0.04, 24),
  new THREE.MeshStandardMaterial({ color: "#111724", roughness: 0.85 })
);
capBrim.position.y = 0.32;
head.add(capBrim);

const armGeometry = new THREE.CapsuleGeometry(0.12, 0.55, 6, 12);
const armMaterial = new THREE.MeshStandardMaterial({ color: "#7d8ba1", roughness: 0.65 });
const leftArm = new THREE.Mesh(armGeometry, armMaterial);
leftArm.position.set(-0.42, 0.4, 0);
leftArm.rotation.z = 0.3;
torso.add(leftArm);

const rightArm = new THREE.Mesh(armGeometry, armMaterial);
rightArm.position.set(0.42, 0.4, 0);
rightArm.rotation.z = -0.3;
torso.add(rightArm);

const bagStrap = new THREE.Mesh(
  new THREE.TorusGeometry(0.48, 0.035, 10, 28, Math.PI * 1.1),
  new THREE.MeshStandardMaterial({ color: "#3e2c1f", roughness: 0.8 })
);
bagStrap.rotation.x = Math.PI / 2;
bagStrap.rotation.y = Math.PI / 2;
bagStrap.position.y = 0.25;
torso.add(bagStrap);

const backpack = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.24, 0.45, 10, 16),
  new THREE.MeshStandardMaterial({ color: "#3c475b", roughness: 0.7 })
);
backpack.position.set(-0.05, -0.05, -0.32);
torso.add(backpack);

bodyGroup.userData = {
  torso,
  arms: [leftArm, rightArm],
  head,
  bobOffset: 0,
};
player.userData.bodyGroup = bodyGroup;
player.userData.stepTime = 0;

const cameraPivot = new THREE.Object3D();
player.add(cameraPivot);
cameraPivot.position.set(0, 1.55, 0);
camera.position.set(0, 0.45, 2.6);
cameraPivot.add(camera);

const collectibles = [];
const tempBox = new THREE.Box3();
const playerCollider = new THREE.Sphere(new THREE.Vector3(), 0.7);

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

  const buildingCount = window.innerWidth < 640 ? 42 : 60;

  for (let i = 0; i < buildingCount; i += 1) {
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

    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.45, width * 0.65, 0.4, 10),
      new THREE.MeshStandardMaterial({
        color: "#181d29",
        roughness: 0.8,
      })
    );
    roof.position.y = height / 2 + 0.25;
    mesh.add(roof);

    if (Math.random() > 0.5) {
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.35, height * 0.2, 0.06),
        new THREE.MeshStandardMaterial({
          color: "#282f44",
          emissive: "#182032",
          emissiveIntensity: 0.3,
        })
      );
      door.position.set((Math.random() - 0.5) * width * 0.4, -height / 2 + height * 0.1, depth / 2 + 0.03);
      mesh.add(door);
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

function createStreetDetails() {
  const details = new THREE.Group();
  const densityScale = window.innerWidth < 560 ? 0.7 : 1;

  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(6.5, 6.5, 0.15, 36),
    new THREE.MeshStandardMaterial({ color: "#303a52", roughness: 0.85 })
  );
  plaza.position.y = 0.075;
  details.add(plaza);

  const poleMaterial = new THREE.MeshStandardMaterial({ color: "#202838", roughness: 0.6 });
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: "#ffe7a6",
    emissive: "#ffcc70",
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const lampCount = Math.round(6 * densityScale) + 2;
  for (let i = 0; i < lampCount; i += 1) {
    const angle = (i / lampCount) * Math.PI * 2;
    const radius = 8 + Math.sin(i * 0.7) * 1.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 12), poleMaterial);
    pole.position.set(x, 1.6, z);
    details.add(pole);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), lampMaterial);
    lamp.position.set(x, 3.1, z);
    details.add(lamp);

    const pointLight = new THREE.PointLight("#ffdc8a", 0.5, 8);
    pointLight.position.set(x, 3.1, z);
    details.add(pointLight);
  }

  const benchMaterial = new THREE.MeshStandardMaterial({ color: "#754c24", roughness: 0.65 });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: "#2e3a4f", roughness: 0.4 });

  const benchCount = Math.round(8 * densityScale) + 2;
  for (let i = 0; i < benchCount; i += 1) {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.36), benchMaterial);
    seat.position.y = 0.45;
    bench.add(seat);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), benchMaterial);
    backrest.position.set(0, 0.72, -0.15);
    bench.add(backrest);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.32), metalMaterial);
    legs.position.y = 0.25;
    bench.add(legs);

    const radius = 4 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    bench.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    bench.rotation.y = angle + Math.PI / 2;
    details.add(bench);
  }

  const planterMaterial = new THREE.MeshStandardMaterial({ color: "#2f3d52", roughness: 0.7 });
  const foliageMaterial = new THREE.MeshStandardMaterial({ color: "#3d936a", roughness: 0.4 });

  const planterCount = Math.round(12 * densityScale) + 2;
  for (let i = 0; i < planterCount; i += 1) {
    const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.5, 12), planterMaterial);
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.4, 16), foliageMaterial);
    planter.position.y = 0.25;
    foliage.position.y = 1.2;
    const group = new THREE.Group();
    group.add(planter);
    group.add(foliage);
    const radius = 10 + Math.random() * 26;
    const angle = Math.random() * Math.PI * 2;
    group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    details.add(group);
  }

  scene.add(details);
}

function createCollectibles() {
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: "#ffb347",
    emissive: "#ffdd55",
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });

  const bagCount = window.innerWidth < 560 ? 14 : 18;
  for (let i = 0; i < bagCount; i += 1) {
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
    const recalc = () => {
      this.maxDistance = this.root.clientWidth * 0.32;
      if (this.pointerId === null) {
        this.stick.style.transform = "translate3d(0,0,0)";
      }
    };
    window.addEventListener("resize", recalc);
    window.addEventListener("orientationchange", recalc);
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

  const isMoving = move.lengthSq() >= 0.0001;
  if (!isMoving) return false;

  const direction = new THREE.Vector3(move.x, 0, move.y * -1);
  direction.normalize();
  direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);

  const movement = direction.multiplyScalar(state.speed * delta);
  player.position.add(movement);

  player.position.x = Math.max(-80, Math.min(80, player.position.x));
  player.position.z = Math.max(-80, Math.min(80, player.position.z));

  return isMoving;
}

function updateCollectibles(delta) {
  for (const item of collectibles) {
    item.rotation.y += item.userData.rotationSpeed * delta;
    item.position.y = item.userData.baseY + Math.sin(performance.now() / 450) * 0.08;

    playerCollider.center.copy(player.position).y += 1.1;
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

function updatePlayerAnimation(isMoving, delta) {
  const body = player.userData.bodyGroup;
  if (!body) return;

  const rate = isMoving ? 7.5 : 2.2;
  player.userData.stepTime += delta * rate;
  const amplitude = isMoving ? 0.08 : 0.015;
  body.position.y = Math.sin(player.userData.stepTime) * amplitude;

  const arms = body.userData?.arms ?? [];
  if (arms.length === 2) {
    const swing = Math.sin(player.userData.stepTime) * (isMoving ? 0.55 : 0.12);
    arms[0].rotation.x = swing;
    arms[1].rotation.x = -swing;
  }

  const head = body.userData?.head;
  if (head) {
    head.rotation.z = Math.sin(player.userData.stepTime * 0.5) * 0.05;
    head.rotation.x = Math.cos(player.userData.stepTime * 0.8) * 0.04;
  }
}

function animate() {
  const delta = clock.getDelta();
  updateStats(delta);
  const moving = updateMovement(delta);
  updateCollectibles(delta);
  updatePlayerAnimation(Boolean(moving), delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function onResize() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.45));
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  updateUILayout();
}

function updateUILayout() {
  const compact = window.innerWidth < 560 || window.innerHeight < 620;
  document.body.classList.toggle("compact-ui", compact);
}

function setupUI() {
  if (toggleHelpBtn && helpPanel) {
    toggleHelpBtn.addEventListener("click", () => {
      const expanded = toggleHelpBtn.getAttribute("aria-expanded") === "true";
      toggleHelpBtn.setAttribute("aria-expanded", (!expanded).toString());
      helpPanel.hidden = expanded;
    });

    helpPanel.hidden = true;
    toggleHelpBtn.setAttribute("aria-expanded", "false");
  }

  if (toggleHudBtn) {
    toggleHudBtn.addEventListener("click", () => {
      const pressed = toggleHudBtn.getAttribute("aria-pressed") === "true";
      const next = !pressed;
      toggleHudBtn.setAttribute("aria-pressed", next.toString());
      document.body.classList.toggle("hud-collapsed", next);
    });
    toggleHudBtn.setAttribute("aria-pressed", "false");
    document.body.classList.remove("hud-collapsed");
  }

  updateUILayout();
}

createCity();
createStreetDetails();
createCollectibles();
setupUI();

window.addEventListener("resize", onResize, { passive: true });

renderer.setAnimationLoop(animate);
