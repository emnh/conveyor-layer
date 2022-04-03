const $ = require('jquery');
const { GPU } = require('gpu.js');
const THREE = require('three');

const width = 100;
const height = 100;
const atlasWidth = 100;
const atlasHeight = 100;

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

const display = function(matrix, texture2) {
	// Render a top-down plane in ortographic view using three

	const scene = new THREE.Scene();

	const cellWidth = 16;
	const cellHeight = 16;
	// const renderWidth = cellWidth * width;
	// const renderHeight = cellHeight * height;
	const size = Math.min(window.innerWidth, window.innerHeight) - 100;
	const renderWidth = size;
	const renderHeight = size;

	// Setup ortographic camera
	const camera = new THREE.OrthographicCamera(
		renderWidth / -2,
		renderWidth / 2,
		renderHeight / 2,
		renderHeight / -2,
		1,
		1000
	);
	camera.position.set(0, 0, 500);
	camera.lookAt(new THREE.Vector3(0, 0, 0));
	
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(renderWidth, renderHeight);
	document.body.appendChild(renderer.domElement);
	const canvas = renderer.domElement;

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
	texture.magFilter = THREE.NearestFilter;
	texture.minFilter = THREE.NearestFilter;

	// Add a plane to the scene showing the data texture
	const geometry = new THREE.PlaneGeometry(renderWidth, renderHeight, 1, 1);

	// Create a three custom shader material
	const material = new THREE.ShaderMaterial({
		uniforms: {
			scale: { type: 'f', value: 1.0 },
			offset: { value: new THREE.Vector2(0.0, 0.0) },
			map: { value: texture, needsUpdate: true },
			map2: { value: texture2, needsUpdate: true },
			mapres: { value: new THREE.Vector2(width, height), needsUpdate: true },
			res: { value: new THREE.Vector2(renderWidth, renderHeight), needsUpdate: true },
			iconsize: { value: new THREE.Vector2(48.0 / atlasWidth, 48.0 / atlasHeight), needsUpdate: true },
			cellsize: { value: new THREE.Vector2(cellWidth, cellHeight), needsUpdate: true },
			iconcount: { value: 4, needsUpdate: true },
		},
		vertexShader: `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform sampler2D map;
			uniform sampler2D map2;
			uniform float scale;
			uniform vec2 offset;
			uniform vec2 mapres;
			uniform vec2 res;
			uniform vec2 iconsize;
			uniform vec2 cellsize;
			uniform float iconcount;
			varying vec2 vUv;

			void main() {
				vec2 mr = mapres / scale;
				vec2 mapped = vUv * mr;
				vec2 pixindex = floor(mapped) + vec2(0.5) + offset;
				vec2 pixoffset = fract(mapped);
				vec4 pix = texture2D(map, pixindex / mr);
				int iconindex = int(floor(pix.x)) % int(iconcount);
				vec2 xy = vec2(iconindex, 0.0) * iconsize + pixoffset * iconsize;
				xy.y = 1.0 - xy.y;
				vec4 rgba = texture2D(map2, xy);
				gl_FragColor = rgba;
			}
		`
	});

	// const material = new THREE.MeshBasicMaterial({ map: texture });
	// const geometry = new THREE.PlaneGeometry(width, height);
	// const material = new THREE.MeshBasicMaterial({ color: 0xFF0000, side: THREE.DoubleSide });
	const mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);

	let currentMouseX = 0;
	let currentMouseY = 0;

	const onMouseMove = function(event) {
		currentMouseX = event.clientX;
		currentMouseY = event.clientY;
	};
	document.body.addEventListener('mousemove', onMouseMove, false);

	let scale = 1;
	let offsetX = 0;
	let offsetY = 0;
	const zoom = function(event) {
		// event.preventDefault();

		const delta = event.deltaY * -0.01 * 0.1;
		const oldScale = scale;
		scale += delta;
		const factor = scale / oldScale;
	  
		// Restrict scale
		scale = Math.min(Math.max(1.0, scale), 6);

		// Zoom offset around mouse position
		const mouseX = (currentMouseX / canvas.width * 2 - 1) * width * 0.5;
		const mouseY = (1 - currentMouseY / canvas.height * 2) * height * 0.5;

		// Keep the point at the mouse position of the canvas at the same position after scaling
		offsetX += mouseX * factor - mouseX;
		offsetY += mouseY * factor - mouseY;

		offsetX = Math.min(Math.max(0.0, offsetX), width);
		offsetY = Math.min(Math.max(0.0, offsetY), height);
		// offsetX = (currentMouseX - canvas.left - offsetX) * (factor - 1);
    	// offsetY = (currentMouseY - canvas.top - offsetY) * (factor - 1);

		console.log(scale, mouseX, mouseY, offsetX, offsetY);

		material.uniforms.offset.value.set(offsetX, offsetY);
		material.uniforms.offset.needsUpdate = true;
		material.uniforms.scale.value = scale;
		//renderer.setSize(renderWidth * scale, renderHeight * scale);
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

const loadImages = function() {
	function draw() {
		var canvas = document.createElement('canvas');
		canvas.width = atlasWidth;
		canvas.height = atlasHeight;
		canvas.style = "display: none;";
		document.body.appendChild(canvas);
		var ctx = canvas.getContext('2d');
		ctx.font = '48px serif';
		// Right arrow
		ctx.fillText('\u25B6', 0, 40);
		// Left arrow
		ctx.fillText('\u25C0', 48, 40);
		// Up arrow
		ctx.fillText('\u25B2', 16, 0);
		// Down arrow
		ctx.fillText('\u25BC', 16, 48);
		return canvas;
	}
	return new THREE.Texture(draw());
};

const main = function() {
	const matrices = generateMatrices();
	// const matrix = calculate();
	const matrix = matrices[0];
	const texture2 = loadImages();
	texture2.needsUpdate = true;
	display(matrix, texture2);
	document.body.style = "padding: 0; margin: 0;";
}

$(main);
