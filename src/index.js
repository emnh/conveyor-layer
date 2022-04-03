const $ = require('jquery');
const { GPU } = require('gpu.js');

const THREE = require('three');
	
const width = 100;
const height = 100;
const iconCount = 5;
const iconSize = 50;
const atlasWidth = iconSize * iconCount;
const atlasHeight = iconSize;

const C = {
	empty: 0,
	right: 1,
	left: 2,
	up: 3,
	down: 4,
};

const generateMatrices = () => {
	const matrices = [[], []];
	for (let y = 0; y < height; y++){
		matrices[0].push([]);
		for (let x = 0; x < width; x++){
			const r = Math.floor(Math.random() * iconCount);
			const g = Math.random();
			const b = Math.random();
			const a = 1.0;
			matrices[0][y].push([r, g, b, a]);
		}
	}
	return matrices;
};

const emptyMatrix = () => {
	const matrix = [];
	for (let y = 0; y < height; y++){
		matrix.push([]);
		for (let x = 0; x < width; x++){
			const r = 0;
			const g = 0;
			const b = 0;
			const a = 1.0;
			matrix[y].push([r, g, b, a]);
		}
	}
	return matrix;
};

const getCalculate = function(gpu) {
	// const multiplyMatrix = gpu.createKernel(function(a, b) {
	// 	let sum = 0;
	// 	for (let i = 0; i < 512; i++) {
	// 	  sum += a[this.thread.y][i] * b[i][this.thread.x];
	// 	}
	// 	return sum;
	//   }).setOutput([width, height])

	// a is previous generation, b is next generation
	const calculateRight =
		gpu.createKernel(function(a, b) {
			// let current = a[this.thread.y][this.thread.x];
			// let k = 1;
			let newicon = 0;
			// let it = current[0];
			// Empty space
			if (a[this.thread.y][this.thread.x][0] === 0 &&
				b[this.thread.y][this.thread.x][0] === 0) {
				// Right arrow
				if (this.thread.x + 1 < this.constants.width &&
					a[this.thread.y][this.thread.x + 1][0] == 1) {
					newicon = 1;
				}
			}
			if (a[this.thread.y][this.thread.x][0] === 1) {
				// Right arrow
				if (this.thread.x - 1 >= 0 &&
					a[this.thread.y][this.thread.x - 1][0] !== 0) {
					newicon = 1;
				}
				newicon = 1;
			}
			newicon = 2;
			
			let sum = [newicon, newicon, newicon, newicon];
			return sum;
		}, {
			constants: {
				width: width,
				height: height,
			},
			output: [height, width],
		});
	const calculateLeft =
		gpu.createKernel(function(a, b) {
			let current = a[this.thread.y][this.thread.x];
			let k = 1;
			let newicon = 0;
			let it = current[0];
			// Empty space
			if (it === 0 && b[this.thread.y][this.thread.x][0] === 0) {
				// Left arrow
				if (this.thread.x >= 1 &&
					a[this.thread.y][this.thread.x - 1] == 2) {
					newicon = 2;
				}
			}
			let sum = [newicon, current[1], current[2], current[3]];
			return sum;
		}, {
			constants: {
				width: width,
				height: height,
			},
			output: [height, width, 4],
		});
	
	const empty = emptyMatrix();
	const calculate = function(a) {
		console.log("Calculating...");
		const b = calculateRight(a, empty);
		// const c = calculateLeft(a, b);
		return b;
		// return multiplyMatrix(a, a);
	};

	// // Up arrow
	// if (this.thread.y < this.constants.height &&
	// 	a[this.thread.y + 1][this.thread.x] == 3) {
	// 	newicon = 3;
	// }
	// // Down arrow
	// if (this.thread.y >= 1 &&
	// 	a[this.thread.y - 1][this.thread.x] == 4) {
	// 	newicon = 4;
	// }
	return calculate;
};
// const calculate = getCalculate(gpu);

const getCalculate2 = function() {
	const idx = (x, y, i) => (y * width + x) * 4 + i;
	const token = (x, y) => idx(x, y, 0);

	const copy = function(a, b) {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				for (let i = 0; i < 4; i++) {
					b[idx(x, y, i)] = a[idx(x, y, i)];
				}
			}
		}
	};

	const right = function(a) {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				if (x - 1 >= 0 &&
					a[idx(x, y, 0)] === C.empty &&
					a[idx(x - 1, y, 0)] === C.right) {
					a[idx(x, y, 0)] = a[idx(x - 1, y, 0)];
					a[idx(x - 1, y, 0)] = 0;
				}
			}
		}
	};

	const left = function(a) {
		for (let y = 0; y < height; y++) {
			for (let x = width - 1; x >= 0; x--) {
				if (x + 1 < width &&
					a[idx(x, y, 0)] === C.empty &&
					a[idx(x + 1, y, 0)] === C.left) {
					a[idx(x, y, 0)] = a[idx(x + 1, y, 0)];
					a[idx(x + 1, y, 0)] = 0;
				}
			}
		}
	};

	const up = function(a) {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				if (y + 1 < height &&
					a[idx(x, y, 0)] === C.empty &&
					a[idx(x, y + 1, 0)] === C.up) {
					a[idx(x, y, 0)] = a[idx(x, y + 1, 0)];
					a[idx(x, y + 1, 0)] = 0;
				}
			}
		}
	};

	const down = function(b) {
		for (let y = height - 1; y >= 0; y--) {
			for (let x = 0; x < width; x++) {
				if (y - 1 >= 0 &&
					b[idx(x, y, 0)] === C.empty &&
					b[idx(x, y - 1, 0)] === C.down) {
					b[idx(x, y, 0)] = b[idx(x, y - 1, 0)];
					b[idx(x, y - 1, 0)] = 0;
				}
			}
		}
	};

	const calculate = function(a) {
		const b = new Float32Array(a.length);
		copy(a, b);
		right(b);
		left(b);
		up(b);
		down(b);
		return b;
	};

	return calculate;
};

const transfer = function(matrix, array) {
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			array[(y * width + x) * 4 + 0] = matrix[y][x][0];
			array[(y * width + x) * 4 + 1] = matrix[y][x][1];
			array[(y * width + x) * 4 + 2] = matrix[y][x][2];
			array[(y * width + x) * 4 + 3] = matrix[y][x][3];
			// console.log(
			// 	array[(y * width + x) * 4 + 0]);
			// break;
		}
	}
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
	const texture = new THREE.DataTexture(array, width, height, THREE.RGBAFormat, THREE.FloatType);
	transfer(matrix, array);

	// Create a three data texture from the matrix
	texture.needsUpdate = true;
	texture.magFilter = THREE.NearestFilter;
	texture.minFilter = THREE.NearestFilter;
	texture2.magFilter = THREE.LinearFilter;
	texture2.minFilter = THREE.LinearFilter;
	texture2.wrapS = THREE.ClampToEdgeWrapping;
	texture2.wrapT = THREE.ClampToEdgeWrapping;

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
			atlasres: { value: new THREE.Vector2(atlasWidth, atlasHeight), needsUpdate: true },
			res: { value: new THREE.Vector2(renderWidth, renderHeight), needsUpdate: true },
			iconsize: { value: new THREE.Vector2(iconSize / atlasWidth, iconSize / atlasHeight), needsUpdate: true },
			cellsize: { value: new THREE.Vector2(cellWidth, cellHeight), needsUpdate: true },
			iconcount: { value: iconCount, needsUpdate: true },
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
			uniform vec2 atlasres;
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
				// int iconindex = int(floor(pix.x * iconcount)); // % int(iconcount);
				float iconindex = pix.x;
				vec2 xy = vec2(iconindex, 0.0) * iconsize + pixoffset * iconsize;
				xy.y = 1.0 - xy.y;
				xy = (floor(xy * atlasres) + vec2(0.5))/ atlasres;
				vec4 rgba = texture2D(map2, xy);
				gl_FragColor = rgba;
			}
		`
	});

	let m2 = array;
	const gpuCanvas = document.createElement('canvas');
	const gpu = new GPU({
		canvas,
		context: renderer.getContext()
	});
	// calculate = getCalculate2(gpu);
	calculate = getCalculate2();

	const outputKernel =
		gpu.createKernel(function(a) {
			// this.color(
			// 	a[this.thread.y][this.thread.x][0],
			// 	a[this.thread.y][this.thread.x][1],
			// 	a[this.thread.y][this.thread.x][2],
			// 	a[this.thread.y][this.thread.x][3]);
			return a[this.thread.y][this.thread.x];
		}).setOutput([height, width]).setPipeline(); //.setGraphical(true);

	const calcNext = function() {
		console.log('calcNext');
		m2 = calculate(m2);
		// const array2 = m2[0][0].buffer;
		// const array2 = outputKernel(m2);
		// console.log(array2);

		// TODO: don't recreate the texture every frame
		const texture3 = new THREE.DataTexture(m2, width, height, THREE.RGBAFormat, THREE.FloatType);
		// transfer(m2, array);
		// console.log(m2);
		// texture3.needsUpdate = true;
		material.uniforms.map = { value: texture3, needsUpdate: true };
		material.uniforms.map.needsUpdate = true;
		material.uniforms.map.value.needsUpdate = true;
	};
	setInterval(calcNext, 1000);

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

const loadImages = function() {
	function draw() {
		var canvas = document.createElement('canvas');
		canvas.width = atlasWidth;
		canvas.height = atlasHeight;
		// canvas.style = "display: none;";
		document.body.appendChild(canvas);
		var ctx = canvas.getContext('2d');
		ctx.font = '50px serif';
		const y = 45;
		// Right arrow
		ctx.fillText('\u25B6', iconSize * 1, y);
		// Left arrow
		ctx.fillText('\u25C0', iconSize * 2, y);
		// Up arrow
		ctx.fillText('\u25B2', iconSize * 3, y);
		// Down arrow
		ctx.fillText('\u25BC', iconSize * 4, y);
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
