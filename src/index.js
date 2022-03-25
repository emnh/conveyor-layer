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
			matrices[0][y].push(Math.random());
			matrices[1][y].push(Math.random());
		}
	}
	return matrices;
};

const main = function() {
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

	console.log(out);
};

$(main);
