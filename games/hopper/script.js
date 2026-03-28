import * as THREE from "three";

// --- CONFIG ---
const CONFIG = {
	laneWidth: 2.5,
	cameraOffset: { x: 0, y: 7, z: 10 },
	gravity: 0.015,
	jumpPower: 0.35,
	baseSpeed: 0.2,
	speedInc: 0.0001,
	floorLength: 400,
	fogDensity: 0.02
};

// --- STATE ---
let state = {
	isPlaying: false,
	score: 0,
	speed: CONFIG.baseSpeed,
	lane: 0, // -1, 0, 1
	currentLaneX: 0,
	isJumping: false,
	jumpVel: 0,
	playerY: 0,
	theme: null
};

// --- DOM ELEMENTS ---
const elScore = document.getElementById("score");
const elScoreFinal = document.getElementById("final-score");
const uiScore = document.getElementById("score-display");
const uiStart = document.getElementById("start-screen");
const uiGameOver = document.getElementById("game-over-screen");

// --- THREE.JS GLOBALS ---
let scene,
	camera,
	renderer,
	player,
	floorGroups = [];
let decorationMeshType, obstacleMeshType;

// --- THEMES ---
const THEMES = [
	{
		name: "Candy",
		sky: 0xffd1dc,
		ground: 0xfff0f5,
		obstacle: 0xff6b6b,
		decor: 0x98fb98
	},
	{
		name: "Neon",
		sky: 0x1a1a2e,
		ground: 0x16213e,
		obstacle: 0xe94560,
		decor: 0x0f3460
	},
	{
		name: "Sunset",
		sky: 0xff9a8b,
		ground: 0xff6a88,
		obstacle: 0x2c3e50,
		decor: 0xf9ca24
	},
	{
		name: "Mint",
		sky: 0xe0f7fa,
		ground: 0xffffff,
		obstacle: 0x009688,
		decor: 0x80cbc4
	},
	{
		name: "Midnight",
		sky: 0x000000,
		ground: 0x222222,
		obstacle: 0xffff00,
		decor: 0x444444
	}
];

// --- INIT ---
function init() {
	// Scene
	scene = new THREE.Scene();

	// Camera
	camera = new THREE.PerspectiveCamera(
		60,
		window.innerWidth / window.innerHeight,
		0.1,
		100
	);
	camera.position.set(
		CONFIG.cameraOffset.x,
		CONFIG.cameraOffset.y,
		CONFIG.cameraOffset.z
	);
	camera.lookAt(0, 0, -5);

	// Renderer
	renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	document.getElementById("game-container").appendChild(renderer.domElement);

	// Lights
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambientLight);

	const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(10, 20, 10);
	dirLight.castShadow = true;
	dirLight.shadow.mapSize.width = 1024;
	dirLight.shadow.mapSize.height = 1024;
	scene.add(dirLight);

	// Initial Render
	renderer.render(scene, camera);

	// Resize Handler
	window.addEventListener("resize", onWindowResize, false);

	// Input Handler
	document.addEventListener("keydown", handleInput);

	// UI Handlers
	document.getElementById("start-btn").addEventListener("click", startGame);
	document.getElementById("restart-btn").addEventListener("click", startGame);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- GAME LOGIC ---

function randomTheme() {
	return THEMES[Math.floor(Math.random() * THEMES.length)];
}

function createPlayer() {
	if (player) scene.remove(player);

	const group = new THREE.Group();

	// Random Animal Features
	const animalColors = [0xffffff, 0xaaaaaa, 0xffcc99, 0x333333];
	const color = animalColors[Math.floor(Math.random() * animalColors.length)];

	// Material
	const mat = new THREE.MeshStandardMaterial({
		color: color,
		flatShading: true
	});

	// Body
	const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
	const body = new THREE.Mesh(bodyGeo, mat);
	body.position.y = 0.5;
	body.castShadow = true;
	group.add(body);

	// Eyes
	const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
	const eyeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.05);

	const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
	leftEye.position.set(-0.25, 0.6, 0.5);
	group.add(leftEye);

	const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
	rightEye.position.set(0.25, 0.6, 0.5);
	group.add(rightEye);

	// Ears (Random Shape)
	const earType = Math.floor(Math.random() * 3);
	const earGeo =
		earType === 0
			? new THREE.BoxGeometry(0.2, 0.5, 0.2) // Long (Bunny)
			: earType === 1
				? new THREE.BoxGeometry(0.3, 0.3, 0.1) // Roundish (Bear)
				: new THREE.ConeGeometry(0.2, 0.4, 4); // Pointy (Cat)

	const leftEar = new THREE.Mesh(earGeo, mat);
	leftEar.position.set(-0.3, 1.1, 0);
	if (earType !== 2) leftEar.castShadow = true;
	group.add(leftEar);

	const rightEar = new THREE.Mesh(earGeo, mat);
	rightEar.position.set(0.3, 1.1, 0);
	if (earType !== 2) rightEar.castShadow = true;
	group.add(rightEar);

	scene.add(group);
	return group;
}

function createObstacleMesh() {
	// Randomize obstacle shape per game
	const type = Math.floor(Math.random() * 3);
	const geo =
		type === 0
			? new THREE.ConeGeometry(0.5, 1, 6) // Spike
			: type === 1
				? new THREE.BoxGeometry(1, 1, 1) // Cube
				: new THREE.CylinderGeometry(0.5, 0.5, 1, 6); // Barrel

	const mat = new THREE.MeshStandardMaterial({
		color: state.theme.obstacle,
		flatShading: true
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

function createDecorationMesh() {
	// Trees or Pillars
	const group = new THREE.Group();
	const trunkMat = new THREE.MeshStandardMaterial({
		color: 0x5d4037,
		flatShading: true
	});
	const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 5);
	const trunk = new THREE.Mesh(trunkGeo, trunkMat);
	trunk.position.y = 0.75;
	trunk.castShadow = true;
	group.add(trunk);

	const leavesMat = new THREE.MeshStandardMaterial({
		color: state.theme.decor,
		flatShading: true
	});
	const leavesGeo = new THREE.DodecahedronGeometry(0.8);
	const leaves = new THREE.Mesh(leavesGeo, leavesMat);
	leaves.position.y = 1.8;
	leaves.castShadow = true;
	group.add(leaves);

	return group;
}

function generateWorldChunk(zPos) {
	// Create a row (chunk)
	// We recycle logic here: simpler to just managing list of objects
	// But for performance in JS, let's keep it simple: List of objects with Z > -50
}

// SIMPLIFIED APPROACH:
// We will have a loop that spawns rows at regular Z intervals ahead of the player?
// No, player is static at Z=0. Objects move towards player (+Z).
// Spawner is at Z = -80.
// Removal at Z = 10.

let worldObjects = [];
let spawnTimer = 0;
let lastObstacleLane = -99;

function spawnRow() {
	// Spawn row at far Z (-60)
	const zStart = -60;

	// Ground segment (Visual only, to give speed feeling if striped, or just endless plane)
	// To make it feel fast, we can use a grid helper or moving stripes.
	// Let's spawn "Décor" on sides always.

	// Left Decor
	if (Math.random() > 0.3) {
		const dL = createDecorationMesh(); // Clone?
		// Optimization: clone geometry
		// For this simple game, recreating is fine or simple helpers.
		dL.position.set(-5 - Math.random() * 5, 0, zStart);
		scene.add(dL);
		worldObjects.push({ mesh: dL, type: "decor" });
	}

	// Right Decor
	if (Math.random() > 0.3) {
		const dR = createDecorationMesh();
		dR.position.set(5 + Math.random() * 5, 0, zStart);
		scene.add(dR);
		worldObjects.push({ mesh: dR, type: "decor" });
	}

	// Obstacle Logic
	// Chance to spawn obstacle
	if (Math.random() > 0.3) {
		// 70% chance of empty or obstacle
		// Pick lane
		let lane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1

		// Don't block impossible (3 obstacles in a row is unfair if too fast, but simple logic for now)
		// Avoid placing obstacle in same lane immediately?

		const obs = createObstacleMesh();
		obs.position.set(lane * CONFIG.laneWidth, 0.5, zStart);
		scene.add(obs);
		worldObjects.push({ mesh: obs, type: "obstacle", lane: lane, passed: false });
	}
}

function startGame() {
	if (state.isPlaying) return;

	// Reset State
	state = {
		isPlaying: true,
		score: 0,
		speed: CONFIG.baseSpeed,
		lane: 0,
		currentLaneX: 0,
		isJumping: false,
		jumpVel: 0,
		playerY: 0,
		theme: randomTheme()
	};

	// UI
	uiStart.classList.add("hidden");
	uiGameOver.classList.add("hidden");
	uiScore.classList.remove("hidden");
	elScore.innerText = "0";

	// Environment Setup
	scene.background = new THREE.Color(state.theme.sky);
	scene.fog = new THREE.Fog(state.theme.sky, 10, 50);

	// Floor
	// Remove old floor if any
	floorGroups.forEach((f) => scene.remove(f));
	floorGroups = [];

	// Add Infinite Floor Plane
	const planeGeo = new THREE.PlaneGeometry(100, 200);
	const planeMat = new THREE.MeshStandardMaterial({
		color: state.theme.ground,
		roughness: 1,
		shading: THREE.FlatShading
	});
	const floor = new THREE.Mesh(planeGeo, planeMat);
	floor.rotation.x = -Math.PI / 2;
	floor.position.z = -50;
	floor.receiveShadow = true;
	scene.add(floor);
	floorGroups.push(floor);

	// Grid Helper for speed sensation
	const grid = new THREE.GridHelper(200, 100, 0xffffff, 0xffffff);
	grid.position.y = 0.01;
	grid.position.z = -50;
	grid.material.opacity = 0.1;
	grid.material.transparent = true;
	scene.add(grid);
	floorGroups.push(grid);

	// Player
	player = createPlayer();
	player.position.set(0, 0, 0);

	// Clear Objects
	worldObjects.forEach((obj) => scene.remove(obj.mesh));
	worldObjects = [];

	// Loop
	lastTime = Date.now();
	animate();
}

function gameOver() {
	state.isPlaying = false;
	uiGameOver.classList.remove("hidden");
	uiScore.classList.add("hidden");
	elScoreFinal.innerText = Math.floor(state.score);
}

function handleInput(e) {
	if (!state.isPlaying) {
		if (e.code === "Space" || e.code === "Enter") startGame(); // Optional helper
		return;
	}

	if (e.code === "ArrowLeft") {
		if (state.lane > -1) state.lane--;
	} else if (e.code === "ArrowRight") {
		if (state.lane < 1) state.lane++;
	} else if (e.code === "ArrowUp") {
		if (!state.isJumping) {
			state.isJumping = true;
			state.jumpVel = CONFIG.jumpPower;
		}
	}
}

let lastTime = 0;

function animate() {
	if (!state.isPlaying) return;

	requestAnimationFrame(animate);

	// Delta Time? simplified fixed step kinda
	// const now = Date.now();
	// const dt = (now - lastTime) / 1000;
	// lastTime = now;

	// Update Score and Speed
	state.score += state.speed;
	state.speed += CONFIG.speedInc;
	elScore.innerText = Math.floor(state.score);

	// Player Movement (Lane Lerp)
	const targetX = state.lane * CONFIG.laneWidth;
	state.currentLaneX += (targetX - state.currentLaneX) * 0.15; // Smooth slide
	player.position.x = state.currentLaneX;

	// Player Jump Physics
	if (state.isJumping) {
		state.playerY += state.jumpVel;
		state.jumpVel -= CONFIG.gravity;
		if (state.playerY <= 0) {
			state.playerY = 0;
			state.isJumping = false;
		}
	} else {
		// Run Bounce
		state.playerY = Math.abs(Math.sin(Date.now() * 0.015)) * 0.1;
	}
	player.position.y = state.playerY + 0.5; // +0.5 is visual center offset

	// Player Rotation (Tilt into turn)
	player.rotation.z = (state.currentLaneX - player.position.x) * -0.1;
	player.rotation.x = state.isJumping ? -0.2 : 0; // Lean forward jump

	// Spawn World
	spawnTimer += state.speed;
	if (spawnTimer > 3) {
		// Distance between rows
		spawnRow();
		spawnTimer = 0;
	}

	// Move World Objects
	for (let i = worldObjects.length - 1; i >= 0; i--) {
		const obj = worldObjects[i];
		obj.mesh.position.z += state.speed * 2; // Move towards camera

		// Screen shake or effect? nah keep simple

		// Collision Detection
		if (obj.type === "obstacle") {
			// Check bounding box overlaps
			// Player is at Z=0 (approx radius 0.5)
			// Obstacle is at obj.mesh.position

			// Z Check
			if (obj.mesh.position.z > -0.8 && obj.mesh.position.z < 0.8) {
				// X Check
				// If simple lane check:
				// if (obj.lane === state.lane) ...
				// But we are lerping X, so let's do distance check for precision
				const dx = Math.abs(player.position.x - obj.mesh.position.x);
				const dy = Math.abs(player.position.y - obj.mesh.position.y);

				// Hitbox size approx 0.8 width
				if (dx < 0.8 && dy < 0.8) {
					gameOver();
				}
			}
		}

		// Cleanup
		if (obj.mesh.position.z > 10) {
			scene.remove(obj.mesh);
			worldObjects.splice(i, 1);
		}
	}

	renderer.render(scene, camera);
}

// Start
init();