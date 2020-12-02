const mongoose = require('mongoose');
const bodyParser = require("body-parser");
const express = require('express');
const extras = require('../front-end/public/extras.js');
const { chunkLocAt } = require('../front-end/public/extras.js');

// connect to the database
mongoose.connect('mongodb://localhost:27017/minesweeper', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const chunkSchema = new mongoose.Schema({
  u: Number,
  v: Number,
  data: String
});
chunkSchema.methods.updateData = function(newData) {
	this.data = newData;
	map.modifiedChunks.add(this);
}
// Create a model for items in the museum.
const Chunk = mongoose.model('Chunk', chunkSchema);


let map = {
	chunks: [],
	modifiedChunks: new Set(),
	invalidChunks: new Set(), // To be deleted

	async load() {
		try {
			console.log(`Loading chunks.`);
			debugger
			this.chunks = Array.from(await Chunk.find());
			this.modifiedChunks = new Set();
			this.invalidChunks = new Set();
			console.log(`Loaded ${this.chunks.length} chunks.`);
		} catch (err) {
			console.error(err);
		}
	},
	async save() {
		for (const chunk of this.modifiedChunks) {
			await chunk.save();
		}
		if (this.modifiedChunks.size > 0) {
			console.log(`Saved ${this.modifiedChunks.size} chunks.`);
		}
		this.modifiedChunks = new Set();
		
		for (const chunk of this.invalidChunks) {
			await chunk.deleteOne();
		}
		if (this.invalidChunks.size > 0) {
			console.log(`Deleted ${this.invalidChunks.size} chunks.`);
		}
		this.invalidChunks = new Set();
	},

	generateChunkAt(u, v) {
		// Generate the new chunk!
		let data = extras.emptyUndiscovered.repeat(extras.chunkSize*extras.chunkSize);
		for (let i = 0; i < extras.bombsPerChunk; i++) {
			const randIndex = Math.floor(Math.random() * extras.chunkSize * extras.chunkSize);
			data = extras.replaceAt(data, randIndex, extras.bombUndiscovered);
		}
		const chunk = new Chunk({
			u: u,
			v: v,
			data,
		});
		this.chunks.push(chunk);
		this.modifiedChunks.add(chunk);
		console.log("New chunk generated.");
		return chunk;
	},

	chunkAt(u, v) { // Must return a valid chunk, even if it has to generate it and/or scrap the existing one.
		let chunk = this.chunks.find(c => (c.u === u && c.v === v));
		if (!chunk || !chunk.data || chunk.data.length != extras.chunkSize*extras.chunkSize) {
			if (chunk)
				this.invalidChunks.add(chunk);
			// Generate the new chunk!
			chunk = this.generateChunkAt(u, v);
		}
		return chunk;
	},

	chunkWithID(id) { // May return a valid chunk, or undefined if none exists with this id.
		return this.chunks.find(c => c._id.toString() === id);
	},
	
	chunksIn(umin, umax, vmin, vmax) { // Must return valid chunks.
		if (umax < umin || vmax < vmin) {
			throw "Invalid arguments to getter.  Nyah!";
		}

		let chunks = this.chunks.filter(c => (c.u >= umin) && (c.u <= umax) && (c.v >= vmin) && (c.v <= vmax));
		for (let i = umin; i <= umax; i++) {
			for (let j = vmin; j <= vmax; j++) {
				// Check that every value really is there.  Generate any missing or invalid ones.
				let rightChunkIndex = chunks.findIndex(c => (c.u === i && c.v === j));
				let rightChunk = chunks[rightChunkIndex];
				if (rightChunkIndex === -1) {
					rightChunk = this.generateChunkAt(i,j);
					chunks.push(rightChunk);
				} else if (!rightChunk.data || rightChunk.data.length != extras.chunkSize * extras.chunkSize) {
					this.invalidChunks.add(rightChunk);
					rightChunk = this.generateChunkAt(i,j);
					chunks.push(rightChunk);
				}
			}
		}
		return chunks;
	}
}
map.load();
setInterval(async () => {
	await map.save();
}, 5000);


const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
/*
app.get('/api/chunk/:u/:v', async (req, res) => { // Gets the chunk with 
	try {
		let chunk = await Chunk.findOne({u: req.params.u, v: req.params.v});
		if (!chunk || !chunk.data || chunk.data.length != extras.chunkSize*extras.chunkSize) {
			if (chunk)
				await chunk.deleteOne();
			// Generate the new chunk!
			chunk = await generateChunkAt(req.params.u, req.params.v);
		}
		res.send(chunk);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});





app.get('/api/chunks/:umin-:umax/:vmin-:vmax', async (req, res) => { // Gets the chunk with 
	try {
		const umin = parseInt(req.params.umin);
		const umax = parseInt(req.params.umax);
		const vmin = parseInt(req.params.vmin);
		const vmax = parseInt(req.params.vmax);
		if (umax < umin || vmax < vmin) {
			throw "Invalid arguments to getter.  Nyah!";
		}

		let chunks = Array.from(await Chunk.find({
			u: { $gt: umin-1, $lt: umax+1 },
			v: { $gt: vmin-1, $lt: vmax+1 }
		}));
		for (let i = umin; i <= umax; i++) {
			for (let j = vmin; j <= vmax; j++) {
				// Check that every value really is there.  Generate any missing or invalid ones.
				let rightChunkIndex = chunks.findIndex(c => (c.u === i && c.v === j));
				let rightChunk = chunks[rightChunkIndex];
				if (rightChunkIndex === -1) {
					rightChunk = await generateChunkAt(i,j);
					chunks.push(rightChunk);
				} else if (!rightChunk.data || rightChunk.data.length != extras.chunkSize * extras.chunkSize) {
					await rightChunk.deleteOne();
					rightChunk = await generateChunkAt(i,j);
					chunks.push(rightChunk);
				}
			}
		}
		res.send(chunks);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

app.put('/api/chunk/:id', async (req, res) => {
	try {
		let chunk = await Chunk.findOne({_id: req.params.id});
		if (chunk) {
			chunk.data = req.body.data;
			await chunk.save();
		} else {
			res.sendStatus(500);
		}
		res.sendStatus(200);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
})*/
app.get('/api/chunk/:u/:v', async (req, res) => { // Gets the chunk with 
	let chunk = map.chunkAt(parseInt(req.params.u), parseInt(req.params.v));
	res.send(chunk);
});

app.get('/api/chunks/:umin-:umax/:vmin-:vmax', async (req, res) => { // Gets the chunk with 
	try {
		const umin = parseInt(req.params.umin);
		const umax = parseInt(req.params.umax);
		const vmin = parseInt(req.params.vmin);
		const vmax = parseInt(req.params.vmax);
		const chunks = map.chunksIn(umin, umax, vmin, vmax);
		res.send(chunks);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

app.put('/api/chunk/:id', async (req, res) => {
	try {
		const chunk = map.chunkWithID(req.params.id);
		if (chunk) {
			chunk.updateData(req.body.data);
			res.sendStatus(200);
		} else {
			res.sendStatus(500);
		}
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});


app.listen(3001, () => console.log('Server listening on port 3001!'));

