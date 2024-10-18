import * as THREE from 'three';  
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// Variables for Skybox scene
let scene, camera, renderer, controls;
let raycaster = new THREE.Raycaster(); 
let mouse = new THREE.Vector2(); 
let isDragging = false;
let draggedTile = null;
let dragPlane;

let tiles = []; 

// Variables for puzzle scene
let puzzleRenderer;
let puzzleScene;
let puzzleCamera;

// Game Win/Lose Logic
const gridTiles = Array(9).fill(null); 
let originalGridIndex = -1;

// Variables for timer
let timer; 
let timeRemaining = 120; 

// Audio
const backgroundMusic = document.getElementById('backgroundMusic');
const tickingSound = document.getElementById('tickingSound');

function playBackgroundMusic() {
    backgroundMusic.play();
    backgroundMusic.loop = true;
}

function stopBackgroundMusic() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
}

function playTickingSound() {
    tickingSound.play();
    tickingSound.loop = true;
}

function stopTickingSound() {
    tickingSound.pause();
    tickingSound.currentTime = 0;
}

const skyboxPaths = {
    level1: ['/room1/Right.jpg', '/room1/Left.jpg', '/room1/Top.jpg', '/room1/Bottom.jpg', '/room1/Front.jpg', '/room1/Back.jpg'],
    level2: ['/room2/Right.jpg', '/room2/Left.jpg', '/room2/Top.jpg', '/room2/Bottom.jpg', '/room2/Front.jpg', '/room2/Back.jpg']
}; 

async function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.xr.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild( VRButton.createButton( renderer ) );
    document.getElementById('gameContainer').appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 2, 5);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    const light = new THREE.HemisphereLight(0xffffff, 0x444444);
    light.position.set(0, 1, 0);
    scene.add(light);

    

    window.addEventListener('resize', onWindowResize);

    document.getElementById("moveToPuzzleButton").addEventListener("click", () => {
        document.getElementById("gameContainer").style.display = "none";
        document.getElementById("puzzleScreen").style.display = "block";
        initPuzzle();
    });
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function createSkybox(imagePaths) {
    const size = 100;
    const skyboxGeometry = new THREE.BoxGeometry(size, size, size);
    const materials = [
        new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(imagePaths[1]), side: THREE.BackSide }), // Left
        new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(imagePaths[0]), side: THREE.BackSide }), // Right
        new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(imagePaths[3]), side: THREE.BackSide }), // Bottom
        new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(imagePaths[2]), side: THREE.BackSide }), // Top
        new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(imagePaths[4]), side: THREE.BackSide }), // Front
        new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(imagePaths[5]), side: THREE.BackSide })  // Back
    ];

    const skybox = new THREE.Mesh(skyboxGeometry, materials);
    scene.add(skybox);
}

document.getElementById('startButton').addEventListener('click', function() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('levelSelectScreen').style.display = 'flex';
    playBackgroundMusic();
});

document.querySelectorAll('.level').forEach(level => {
    level.addEventListener('click', function(e) {
        let selectedLevel = e.target.id; 
        document.getElementById('levelSelectScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';

        if (selectedLevel === 'level1') {
            loadSkybox(skyboxPaths.level1);
        } else if (selectedLevel === 'level2') {
            loadSkybox(skyboxPaths.level2);
        }
    });
});

function loadSkybox(imagePaths) {
    createSkybox(imagePaths);
    camera.position.set(0, 1.5, 0);  
    controls.update();  
    document.getElementById('moveToPuzzleButton').style.display = 'block'; 
}

document.getElementById("moveToPuzzleButton").addEventListener("click", () => {
    document.getElementById("gameContainer").style.display = "none"; 
    document.getElementById("puzzleScreen").style.display = "block"; 
    document.getElementById("puzzle-container").style.display = "block"; 

    stopBackgroundMusic();
    initPuzzle();
});

document.getElementById('playAgainButton').addEventListener('click', () => {
    document.getElementById('winScreen').style.display = 'none';
    document.getElementById('puzzleScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
    resetTimer();
    resetPuzzle();
    playBackgroundMusic();
});

function initPuzzle() {
    if (!puzzleRenderer) {
        puzzleScene = new THREE.Scene();
        puzzleCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        puzzleRenderer = new THREE.WebGLRenderer({ antialias: true });
        puzzleRenderer.xr.enabled = true;
        puzzleRenderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild( VRButton.createButton( puzzleRenderer ) );
        document.getElementById("puzzle-container").appendChild(puzzleRenderer.domElement);

        puzzleCamera.position.set(0, 7, 0);
        puzzleCamera.lookAt(0, 0, 0);

        createGrid(); 
        createPuzzle(); 

        startTimer();

        function puzzleAnimate() {
            requestAnimationFrame(puzzleAnimate);
            puzzleRenderer.render(puzzleScene, puzzleCamera);
        }
        puzzleAnimate();
    }
    document.getElementById('moveToPuzzleButton').style.display = 'none';
}
function resetPuzzle() {
    gridTiles.fill(null);
    tiles.forEach(tile => puzzleScene.remove(tile));
    tiles = [];
    createPuzzle();
    resetTimer();
    startTimer();
}

function startTimer() {
    const timerDisplay = document.getElementById('timer');
    if (!timerDisplay) {
        console.error('Timer display element not found');
        return;
    }

    playTickingSound();

    timer = setInterval(() => {
        timeRemaining--;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerDisplay.textContent = `Time Remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (timeRemaining <= 0) {
            clearInterval(timer);
            gameOver(false);
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
    stopTickingSound();
}

function resetTimer() {
    stopTimer();
    timeRemaining = 120;
    const timerDisplay = document.getElementById('timer');
    if (timerDisplay) {
        timerDisplay.textContent = 'Time Remaining: 2:00';
    }
}

function gameOver(isWin) {
    const message = isWin ? "Congratulations! You solved the puzzle!" : "Game Over! Time's up!";
    alert(message);
    disableGame();
}

const winText = document.getElementById('winText');
function checkWin() {
    let allCorrect = gridTiles.every((tile, index) => tile && tile.userData.index === index + 1);

    if (allCorrect) {
        stopTimer();
        gameOver(true);
        document.getElementById('winScreen').style.display = 'block';
        winText.innerHTML = 'Congratulations! You solved the puzzle in ' + (120 - timeRemaining) + ' seconds!';
    }
}


function disableGame() {
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

function createGrid() {
    const gridSize = 3;
    const spacing = 1.55;

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const gridIndex = i * gridSize + j;
            const position = new THREE.Vector3((j - 1) * spacing, 0, (i - 1) * spacing);

            const gridBoxGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.5); // Using box for the grid.
            const gridBoxMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 });
            const gridBox = new THREE.Mesh(gridBoxGeometry, gridBoxMaterial);
            gridBox.position.copy(position);
            gridBox.userData = { index: gridIndex + 1, isGridBox: true };
            puzzleScene.add(gridBox);
        }
    }
}

function createPuzzle() {
    const tileSize = 1.5;
    const geometry = new THREE.PlaneGeometry(tileSize, tileSize);
    const textureLoader = new THREE.TextureLoader();

    let loadedTiles = 0;

    for (let i = 1; i <= 9; i++) {
        textureLoader.load(`/tiles/${i}.jpg`, (texture) => {
            const material = new THREE.MeshBasicMaterial({ map: texture });
            const tile = new THREE.Mesh(geometry, material);

            const positionX = (i - 5) * (tileSize + 0.2);
            const positionY = 2; // To place the tiles in a line below the grid

            tile.position.set(positionX, positionY, 2.5);
            tile.rotation.x = -Math.PI / 2;
            tile.userData = { index: i }; 

            tiles.push(tile);
            puzzleScene.add(tile);

            loadedTiles++;
        });
    }

    initDragAndDrop();
}

function onMouseDown(event) {
    event.preventDefault();
    const rect = puzzleRenderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, puzzleCamera);
    const intersects = raycaster.intersectObjects([...tiles, ...gridTiles.filter(t => t !== null)]);

    if (intersects.length > 0) {
        isDragging = true;
        draggedTile = intersects[0].object;
        draggedTile.userData.originalPosition = draggedTile.position.clone();

        originalGridIndex = gridTiles.findIndex(tile => tile === draggedTile);
        if (originalGridIndex !== -1) {
            gridTiles[originalGridIndex] = null;
        }
    }
}

function onMouseMove(event) {
    event.preventDefault();
    if (isDragging) {
        const rect = puzzleRenderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, puzzleCamera);
        const intersects = raycaster.intersectObject(dragPlane);

        if (intersects.length > 0) {
            draggedTile.position.copy(intersects[0].point);
            draggedTile.position.y = 0.1; 
        }
    }
}

function onMouseUp(event) {
    event.preventDefault();
    if (isDragging) {
        const rect = puzzleRenderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, puzzleCamera);
        const gridBoxes = puzzleScene.children.filter(child => child.userData && child.userData.isGridBox);
        const intersects = raycaster.intersectObjects(gridBoxes);

        if (intersects.length > 0) {
            const gridBox = intersects[0].object;
            const gridIndex = gridBox.userData.index - 1;

            if (gridTiles[gridIndex] === null) {
                placeTile(draggedTile, gridIndex);
            } else if (gridTiles[gridIndex] !== draggedTile) {
                const existingTile = gridTiles[gridIndex];
                swapTiles(draggedTile, existingTile, gridIndex);
            }
        } else {
            returnTileToOriginalPosition(draggedTile);
        }

        isDragging = false;
        draggedTile = null;
        originalGridIndex = -1;
        
        checkWin(); 
    }
}

function placeTile(tile, gridIndex) {
    const gridBox = puzzleScene.children.find(child => child.userData && child.userData.isGridBox && child.userData.index === gridIndex + 1);
    tile.position.copy(gridBox.position);
    tile.position.y = 0.1; 
    gridTiles[gridIndex] = tile;
}

function swapTiles(tile1, tile2, newIndex) {

    placeTile(tile1, newIndex);

    if (originalGridIndex !== -1) {
        placeTile(tile2, originalGridIndex);
    } else {
        tile2.position.copy(tile1.userData.originalPosition);
    }
}

function returnTileToOriginalPosition(tile) {
    if (originalGridIndex !== -1) {
        placeTile(tile, originalGridIndex);
    } else {
        tile.position.copy(tile.userData.originalPosition);
    }
}

function initDragAndDrop() {
    dragPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    dragPlane.rotation.x = -Math.PI / 2; // To make the tiles flat
    dragPlane.position.y = 0.1;
    puzzleScene.add(dragPlane);

    puzzleRenderer.domElement.addEventListener('mousedown', onMouseDown);
    puzzleRenderer.domElement.addEventListener('mousemove', onMouseMove);
    puzzleRenderer.domElement.addEventListener('mouseup', onMouseUp);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (puzzleRenderer) {
        puzzleCamera.aspect = window.innerWidth / window.innerHeight;
        puzzleCamera.updateProjectionMatrix();
        puzzleRenderer.setSize(window.innerWidth, window.innerHeight);
    }
}

init();
animate();
