const mongoose = require('mongoose');
const bodyParser = require("body-parser");
const express = require('express');
const extras = require('../front-end/public/extras.js');
const { chunkLocAt, localLocToIndex, refTo, refToLocal } = require('../front-end/public/extras.js');

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

const scoreSchema = new mongoose.Schema({
	score: Number,
	name: String,
});
const Score = mongoose.model('Score', scoreSchema);

const playerSchema = new mongoose.Schema({
	symbol: String,
	x: Number,
	y: Number,
});
const Player = mongoose.model('Player', playerSchema);

let map = {
	chunks: [],
	modifiedChunks: new Set(), // To be saved
	invalidChunks: new Set(), // To be deleted
	exploredRadius: 0,
	players: [],
	modifiedPlayers: new Set(),
	invalidPlayers: new Set(),

	async load() {
		try {
			console.log(`Loading chunks.`);
			debugger
			this.chunks = Array.from(await Chunk.find());
			this.players = Array.from(await Player.find());
			this.modifiedChunks = new Set();
			this.invalidChunks = new Set();
			this.modifiedPlayers = new Set();
			this.invalidPlayers = new Set();
			console.log(`Loaded ${this.chunks.length} chunks.`);
			console.log(`Loaded ${this.players.length} players.`);
		} catch (err) {
			console.error(err);
		}
	},
	async save() {
		// Chunks
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

		//Players
		for (const player of this.modifiedPlayers) {
			await player.save();
		}
		if (this.modifiedPlayers.size > 0) {
			console.log(`Saved ${this.modifiedPlayers.size} players.`);
		}
		this.modifiedPlayers = new Set();
		
		for (const player of this.invalidPlayers) {
			await player.deleteOne();
		}
		if (this.invalidPlayers.size > 0) {
			console.log(`Deleted ${this.invalidPlayers.size} players.`);
		}
		this.invalidPlayers = new Set();
	},
	removePlayer(player) {
		this.invalidPlayers.add(player);
		const index = this.players.indexOf(player);
		this.players.splice(index, 1);
	},
	removeChunk(chunk) {
		this.invalidChunks.add(chunk);
		const index = this.chunks.indexOf(chunk);
		this.chunks.splice(index, 1);
	},
	isUnexplored(chunk) {
		if (!chunk) {
			return true;
		}
		for (let locy = 0; locy < extras.chunkSize; locy++) {
			for (let locx = 0; locx < extras.chunkSize; locx++) {
				if (refToLocal(chunk, locx, locy).isDiscovered) {
					return false;
				}
			}
		}

		return true;
	},
	unexploredChunkLoc() { // Returns the u/v of some chunk that is near the map but HASN'T been explored at all.
		let r = this.exploredRadius + 1;
		while (true) {
			// Explore the square of radius r.
			let u = 0;
			let v = 0;
			// +u side
			u = r;
			for (v = -r; v <= r; v++) {
				if (this.isUnexplored(this.chunks.find(c => (c.u === u && c.v === v)))) {
					// An ungenerated chunk!
					return { u, v };
				}
			}
			// -u side
			u = -r;
			for (v = -r; v <= r; v++) {
				if (this.isUnexplored(this.chunks.find(c => (c.u === u && c.v === v)))) {
					// An ungenerated chunk!
					return { u, v };
				}
			}
			// +v side
			v = r;
			for (u = -r + 1; u < r; u++) {
				if (this.isUnexplored(this.chunks.find(c => (c.u === u && c.v === v)))) {
					// An ungenerated chunk!
					return { u, v };
				}
			}
			// -v side
			v = -r;
			for (u = -r + 1; u < r; u++) {
				if (this.isUnexplored(this.chunks.find(c => (c.u === u && c.v === v)))) {
					// An ungenerated chunk!
					return { u, v };
				}
			}

			r++;
			this.exploredRadius++;
		}
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
				this.removeChunk(chunk);
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
					this.removeChunk(rightChunk);
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
			res.send(chunk);
		} else {
			res.sendStatus(500);
		}
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

app.get('/api/scoreboard/', async (_req, res) => {
	try {
		const scores = Array.from(await Score.find({}).sort({ score: 'desc'}).limit(5));
		res.send(scores);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

app.post('/api/scoreboard/', async (req, res) => {
	try {
		const score = new Score({
			score: req.body.score,
			name: req.body.name,
		});
		await score.save();
		res.send(score);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

app.delete('/api/scoreboard/:id', async (req, res) => {
	try {
		const score = Score.findOne({ _id: req.params.id });
		if (!score) {
			throw `Couldn't find score with id ${req.params.id}`
		}
		await score.deleteOne();
		res.send(score);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

app.post('/api/player/', async (_req, res) => { // Makes a new player
	try {
		const symbol = extras.playerSymbols[Math.floor(Math.random() * extras.playerSymbols.length)];
		const chunkLoc = map.unexploredChunkLoc();
		const chunk = map.chunkAt(chunkLoc.u, chunkLoc.v);
		let localLoc;
		do {
			localLoc = { locx: Math.floor(Math.random() * extras.chunkSize), locy: Math.floor(Math.random() * extras.chunkSize) };
		} while (extras.refToLocal(chunk, localLoc.locx, localLoc.locy).isBomb);
		const loc = extras.localLocToGlobal(localLoc.locx, localLoc.locy, chunkLoc.u, chunkLoc.v);
		const player = new Player({
			symbol,
			x: loc.x,
			y: loc.y,
		});
		map.players.push(player);
		map.modifiedPlayers.add(player);
		res.send(player);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

app.put('/api/player/:id', async (req, res) => {
	try {
		const player = map.players.find(p => p._id == req.params.id);
		if (!player) {
			throw `Couldn't find player with id ${req.params.id}`
		}
		if (req.body.x) {
			player.x = req.body.x;
		}
		if (req.body.y) {
			player.y = req.body.y;
		}
		map.modifiedPlayers.add(player);
		res.send(player);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

app.get('/api/players', async (req, res) => {
	try {
		res.send(map.players);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

app.get('/api/player/:id', async (req, res) => {
	try {
		const player = map.players.find(p => p._id == req.params.id);
		if (!player) {
			throw `Couldn't find player with id ${req.params.id}`
		}
		res.send(player);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

app.delete('/api/player/:id', async (req, res) => {
	try {
		const player = map.players.find(p => p._id == req.params.id);
		if (!player) {
			throw `Couldn't find player with id ${req.params.id}`
		}
		map.removePlayer(player);
		res.sendStatus(200);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});




app.listen(3001, () => console.log('Server listening on port 3001!'));

