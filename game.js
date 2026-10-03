// Game client logic
let currentUser = null;
let token = null;
let ws = null;
let scene, camera, renderer;
let playerMesh = null;

// API helper
async function apiCall(endpoint, options = {}) {
    const url = `${window.location.origin}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { ...options, headers });
    return response.json();
}

// Auth functions
function showSignup() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
}

function showLogin() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const data = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.ok) {
            token = data.token;
            currentUser = data.user;
            showGame();
        } else {
            errorDiv.textContent = data.error || 'Login failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Login failed. Please try again.';
    }
}

async function signup() {
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const errorDiv = document.getElementById('signup-error');

    try {
        const data = await apiCall('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });

        if (data.ok) {
            token = data.token;
            currentUser = data.user;
            showGame();
        } else {
            errorDiv.textContent = data.error || 'Signup failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Signup failed. Please try again.';
    }
}

function showGame() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('player-name').textContent = currentUser.username;
    initGame();
    connectWebSocket();
    loadPlayerData();
}

async function loadPlayerData() {
    try {
        const data = await apiCall('/api/player/me');
        if (data.profile) {
            document.getElementById('player-money').textContent = `Money: $${data.profile.money}`;
        }
    } catch (error) {
        console.error('Failed to load player data:', error);
    }
}

function showServers() {
    const serverName = prompt('Enter server name:');
    if (serverName) {
        createServer(serverName);
    }
}

async function createServer(name) {
    try {
        const data = await apiCall('/api/servers/create', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        if (data.ok) {
            alert(`Server "${name}" created!`);
        }
    } catch (error) {
        alert('Failed to create server');
    }
}

// WebSocket connection
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws?playerId=${currentUser.id}`);

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Received:', message);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Three.js game initialization
function initGame() {
    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-container');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4ade80 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Player
    const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x667eea });
    playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.position.y = 1;
    playerMesh.castShadow = true;
    scene.add(playerMesh);

    // Lucky blocks
    for (let i = 0; i < 10; i++) {
        const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
        const blockMaterial = new THREE.MeshStandardMaterial({ 
            color: Math.random() * 0xffffff 
        });
        const block = new THREE.Mesh(blockGeometry, blockMaterial);
        block.position.set(
            (Math.random() - 0.5) * 20,
            0.5,
            (Math.random() - 0.5) * 20
        );
        block.castShadow = true;
        scene.add(block);
    }

    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Start animation loop
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    // Simple player movement
    if (playerMesh) {
        playerMesh.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
}

// Check if user is already logged in
window.onload = () => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
        token = savedToken;
        // Verify token and load user data
        apiCall('/api/player/me')
            .then(data => {
                if (data.user) {
                    currentUser = data.user;
                    showGame();
                }
            })
            .catch(() => {
                localStorage.removeItem('token');
            });
    }
};
