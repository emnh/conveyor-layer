const $ = require('jquery');
const { GPU } = require('gpu.js');
const THREE = require('three');

const width = 512;
const height = 512;

const generateMatrices = () => {
	const matrices = [[], []];
	for (let y = 0; y < height; y++){
		matrices[0].push([]);
		matrices[1].push([]);
		for (let x = 0; x < width; x++){
			const r = Math.random();
			const g = Math.random();
			const b = Math.random();
			const a = 1.0;
			matrices[0][y].push([r, g, b, a]);
			const r2 = Math.random();
			const g2 = Math.random();
			const b2 = Math.random();
			const a2 = 1.0;
			matrices[1][y].push([r2, g2, b2, a2]);
		}
	}
	return matrices;
};

const display = function(matrix) {
	// Render a top-down plane in ortographic view using three

	const scene = new THREE.Scene();

	// Setup ortographic camera
	const camera = new THREE.OrthographicCamera(
		width / -2,
		width / 2,
		height / 2,
		height / -2,
		1,
		1000
	);
	camera.position.set(0, 0, 500);
	camera.lookAt(new THREE.Vector3(0, 0, 0));
	
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(width, height);
	document.body.appendChild(renderer.domElement);

	// Convert 3d texture matrix to Float32Array data texture
	const array = new Float32Array(matrix.length * matrix[0].length * 4);
	for (let y = 0; y < matrix.length; y++) {
		for (let x = 0; x < matrix[0].length; x++) {
			array[(y * matrix[0].length + x) * 4 + 0] = matrix[y][x][0];
			array[(y * matrix[0].length + x) * 4 + 1] = matrix[y][x][1];
			array[(y * matrix[0].length + x) * 4 + 2] = matrix[y][x][2];
			array[(y * matrix[0].length + x) * 4 + 3] = matrix[y][x][3];
		}
	}

	// Create a three data texture from the matrix
	const texture = new THREE.DataTexture(array, width, height, THREE.RGBAFormat, THREE.FloatType);
	texture.needsUpdate = true;

	// Add a plane to the scene showing the data texture
	const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
	const material = new THREE.MeshBasicMaterial({ map: texture });
	// const geometry = new THREE.PlaneGeometry(width, height);
	// const material = new THREE.MeshBasicMaterial({ color: 0xFF0000, side: THREE.DoubleSide });
	const mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);

	let scale = 1;
	const zoom = function(event) {
		event.preventDefault();

		scale += event.deltaY * -0.01;
	  
		// Restrict scale
		scale = Math.min(Math.max(1.0, scale), 16);

		console.log(scale);

		renderer.setSize(width * scale, height * scale);
		//mesh.scale = new THREE.Vector3(scale, scale, scale);
	};

	renderer.domElement.addEventListener('wheel', zoom);
	document.body.addEventListener('wheel', zoom);

	// Add a light to the scene
	const light = new THREE.PointLight(0xffffff, 1, 0);
	light.position.set(0, 0, 100);
	scene.add(light);

	// camera.position.z = 5;

	const animate = function() {
		requestAnimationFrame(animate);

		renderer.render(scene, camera);
	};

	animate();
};

const calculate = function() {
	const gpu = new GPU();

	const multiplyMatrix = gpu.createKernel(function(a, b) {
		let sum = 0;
		for (let i = 0; i < 512; i++) {
			sum += a[this.thread.y][i] * b[i][this.thread.x];
		}
		return sum;
	}).setOutput([512, 512])

	const matrices = generateMatrices();
	const out = multiplyMatrix(matrices[0], matrices[1]);

	// console.log(out);
	return out;
};

const main = function() {
	const matrices = generateMatrices();
	// const matrix = calculate();
	const matrix = matrices[0];
	display(matrix);
}

$(main);
