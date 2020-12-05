const mongoose = require('mongoose');
const bodyParser = require("body-parser");
const express = require('express');
const extras = require('../client/public/extras.js');
const { chunkLocAt, localLocToIndex, refTo, refToLocal } = require('../client/public/extras.js');

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
	chunkDictionary: new Map(),
	modifiedChunks: new Set(), // To be saved
	invalidChunks: new Set(), // To be deleted
	exploredRadius: 0,
	players: [],
	modifiedPlayers: new Set(),
	invalidPlayers: new Set(),

	async load() {
		const now = Date.now();
		try {
			console.log(`Loading chunks.`);
			this.chunkDictionary = new Map();
			for (const c of Array.from(await Chunk.find())) {
				this.replaceChunk(c); // That'll do some extra work, including adding it to modifiedChunks, but that'll be set to [] again in a couple lines.
			}
			//Array.from(await Chunk.find()).forEach(this.addChunk);
			this.players = Array.from(await Player.find());
			this.modifiedChunks = new Set();
			this.invalidChunks = new Set();
			this.modifiedPlayers = new Set();
			this.invalidPlayers = new Set();
			console.log(`Loaded ${this.chunkDictionary.size} chunks.`);
			console.log(`Loaded ${this.players.length} players.`);
		} catch (err) {
			console.error(err);
		}
		console.log(`Completed load in ${Date.now() - now} milliseconds`);
	},
	async save() {
		const now = Date.now();
		try {
			// Chunks
			for (const chunk of this.modifiedChunks) {
				try {
					await chunk.save();
				} catch (err) {
					console.error(err);
				}
			}
			if (this.modifiedChunks.size > 0) {
				console.log(`Saved ${this.modifiedChunks.size} chunks.`);
			}
			this.modifiedChunks = new Set();
			
			for (const chunk of this.invalidChunks) {
				try {
					await chunk.deleteOne();
				} catch (err) {
					console.error(err);
				}
			}
			if (this.invalidChunks.size > 0) {
				console.log(`Deleted ${this.invalidChunks.size} chunks.`);
			}
			this.invalidChunks = new Set();

			//Players
			for (const player of this.modifiedPlayers) {
				try {
					await player.save();
				} catch (err) {
					console.error(err);
				}
			}
			if (this.modifiedPlayers.size > 0) {
				console.log(`Saved ${this.modifiedPlayers.size} players.`);
			}
			this.modifiedPlayers = new Set();
			
			for (const player of this.invalidPlayers) {
				try {
					await player.deleteOne();
				} catch (err) {
					console.error(err);
				}
			}
			if (this.invalidPlayers.size > 0) {
				console.log(`Deleted ${this.invalidPlayers.size} players.`);
			}
			this.invalidPlayers = new Set();
		} catch (err) {
			console.error(err);
		}
		console.log(`Completed save() in ${Date.now() - now} milliseconds`);
	},
	removePlayer(player) {
		this.invalidPlayers.add(player);
		const index = this.players.indexOf(player);
		this.players.splice(index, 1);
	},
	replaceChunk(chunk) { // This is also used as an 'addChunk' function.
		const oldChunk = this.chunkDictionary.get(`${chunk.u},${chunk.v}`);
		if (oldChunk) {
			this.invalidChunks.add(oldChunk);
		}
		this.chunkDictionary.set(`${chunk.u},${chunk.v}`, chunk);
		this.modifiedChunks.add(chunk);
	},
	deleteChunkAt(u, v) {
		const oldChunk = this.chunkDictionary.get(`${u},${v}`);
		if (oldChunk) {
			this.invalidChunks.add(oldChunk);
		}
		this.chunkDictionary.delete(`${oldChunk.u},${oldChunk.v}`, undefined);
	},
	isUnexplored(chunk) {
		if (this.isInvalidChunk(chunk)) {
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
	isInvalidChunk(chunk) {
		return (!chunk || !chunk.data || chunk.data.length != extras.chunkSize*extras.chunkSize || typeof chunk.u !== 'number' || typeof chunk.v !== 'number');
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
				if (this.isUnexplored(this.chunkAt(u,v))) {
					// An ungenerated chunk!
					return { u, v };
				}
			}
			// -u side
			u = -r;
			for (v = -r; v <= r; v++) {
				if (this.isUnexplored(this.chunkAt(u,v))) {
					// An ungenerated chunk!
					return { u, v };
				}
			}
			// +v side
			v = r;
			for (u = -r + 1; u < r; u++) {
				if (this.isUnexplored(this.chunkAt(u,v))) {
					// An ungenerated chunk!
					return { u, v };
				}
			}
			// -v side
			v = -r;
			for (u = -r + 1; u < r; u++) {
				if (this.isUnexplored(this.chunkAt(u,v))) {
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
		const bombsToAdd = extras.minBombsPerChunk + Math.floor(Math.random() * (1 + extras.maxBombsPerChunk - extras.minBombsPerChunk));
		console.log(bombsToAdd);
		let data = extras.emptyUndiscovered.repeat(extras.chunkSize*extras.chunkSize);
		for (let i = 0; i < bombsToAdd; i++) {
			const randIndex = Math.floor(Math.random() * extras.chunkSize * extras.chunkSize);
			data = extras.replaceAt(data, randIndex, extras.bombUndiscovered);
		}
		const chunk = new Chunk({
			u: u,
			v: v,
			data,
		});
		this.replaceChunk(chunk);
		console.log("New chunk generated.");
		return chunk;
	},

	chunkAt(u, v) { // Must return a valid chunk, even if it has to generate it and/or scrap the existing one.
		let chunk = this.chunkDictionary.get(`${u},${v}`);
		if (this.isInvalidChunk(chunk)) {
			if (chunk) {
				console.error(`Invalid chunk: ${chunk}`);
			}
			chunk = this.generateChunkAt(u, v);
		}
		return chunk;
	},

	chunkWithID(id) { // May return a valid chunk, or undefined if none exists with this id.
		for (const c of this.chunkDictionary.values()) {
			if (c._id.toString() === id) {
				return c;
			}
		}
		return undefined;
	},
	
	chunksIn(umin, umax, vmin, vmax) { // Must return valid chunks.
		if (umax < umin || vmax < vmin) {
			throw "Invalid arguments to getter.  Nyah!";
		}
		
		let chunks = [];
		for (let i = umin; i <= umax; i++) {
			for (let j = vmin; j <= vmax; j++) {
				// Check that every value really is there.  Generate any missing or invalid ones.
				let rightChunk = this.chunkAt(i,j);
				chunks.push(rightChunk);
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
	const now = Date.now();
	let chunk = map.chunkAt(parseInt(req.params.u), parseInt(req.params.v));
	res.send(chunk);
	console.log(`Completed get(/api/chunk/:u/:v) request in ${Date.now() - now} milliseconds`);
});

app.get('/api/chunks/:umin-:umax/:vmin-:vmax', async (req, res) => { // Gets the chunk with 
	const now = Date.now();
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
	console.log(`Completed get(/api/chunks/:umin-:umax/:vmin-:vmax) request in ${Date.now() - now} milliseconds`);
});

app.put('/api/chunk/:id', async (req, res) => {
	const now = Date.now();
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
	console.log(`Completed put(/api/chunk/:id) request in ${Date.now() - now} milliseconds`);
});

app.get('/api/scoreboard/', async (_req, res) => {
	const now = Date.now();
	try {
		const scores = Array.from(await Score.find({}).sort({ score: 'desc'}).limit(5));
		res.send(scores);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
	console.log(`Completed get(/api/scoreboard/:id) request in ${Date.now() - now} milliseconds`);
});

app.post('/api/scoreboard/', async (req, res) => {
	const now = Date.now();
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
	console.log(`Completed post(/api/scoreboard/) request in ${Date.now() - now} milliseconds`);
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
	console.log(`Completed delete(/api/scoreboard/:id) request in ${Date.now() - now} milliseconds`);
});

app.post('/api/player/', async (_req, res) => { // Makes a new player
	const now = Date.now();
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
	console.log(`Completed get(/api/player/:id) request in ${Date.now() - now} milliseconds`);
});

app.put('/api/player/:id', async (req, res) => {
	const now = Date.now();
	try {
		const player = map.players.find(p => p._id == req.params.id);
		if (!player) {
			throw `Couldn't find player with id ${req.params.id}`
		}
		if (req.body.x !== undefined) {
			player.x = req.body.x;
		}
		if (req.body.y !== undefined) {
			player.y = req.body.y;
		}
		map.modifiedPlayers.add(player);
		res.send(player);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
	console.log(`Completed put(/api/player/:id) request in ${Date.now() - now} milliseconds`);
});

app.get('/api/players', async (req, res) => {
	const now = Date.now();
	try {
		res.send(map.players);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
	console.log(`Completed get(/api/players) request in ${Date.now() - now} milliseconds`);
});

app.get('/api/player/:id', async (req, res) => {
	const now = Date.now();
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
	console.log(`Completed get(/api/player/:id) request in ${Date.now() - now} milliseconds`);
});

app.delete('/api/player/:id', async (req, res) => {
	const now = Date.now();
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
	console.log(`Completed delete(/api/player/:id) request in ${Date.now() - now} milliseconds`);
});

app.post('/api/chunks/clean', async (_req, res) => {
	const now = Date.now();
	try {
		let chunksDeleted = 0;
		for (const [loc, chunk] of map.chunkDictionary) {
			if (map.isUnexplored(chunk)) {
				// An unexplored chunk!
				map.deleteChunkAt(chunk.u, chunk.v);
				chunksDeleted++;
			}
		}
		console.log(`Deleted ${chunksDeleted} unexplored chunks.`);
		res.send({ deleted: chunksDeleted });
		map.generateChunkAt(0,0);
		map.exploredRadius = 0;
	} catch (err) {
		console.error(err);
		res.sendStatus(500);
	}
	console.log(`Completed delete(/api/chunks/clean) request in ${Date.now() - now} milliseconds`);
});




app.listen(3001, () => console.log('Server listening on port 3001!'));

