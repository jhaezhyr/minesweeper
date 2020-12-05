class SpaceRef {
	constructor(global, chunk, localxy) {
		this.global = global;
		this.chunk = chunk;
		this.local = localxy;
		this.index = extras.localLocToIndex(localxy.locx, localxy.locy);
	}
	get chunkLoc() {
		return { u: this.chunk.u, v: this.chunk.v };
	}
	get s() {
		return this.chunk.data[this.index];
	}
	set s(newValue) {
        this.chunk.data = extras.replaceAt(this.chunk.data, this.index, newValue);
	}
	get isBomb() {
		const a = this.s;
		return (a === extras.bombDiscovered || a === extras.bombUndiscovered || a === extras.bombFlagged);
	}
	get isEmpty() { // What does this really mean?
		const a = this.s;
		return (a === extras.emptyDiscovered || a === extras.emptyUndiscovered || a === extras.emptyFlagged);
	}
	get isDiscovered() {
		const a = this.s;
		return !(a === extras.bombUndiscovered || a === extras.bombFlagged || a === extras.emptyFlagged || a === extras.emptyUndiscovered);
	}
	get isFlagged() {
		const a = this.s;
		return (a === extras.bombFlagged || a === extras.emptyFlagged);
	}
	get displayChar() {
		if (this.isFlagged) {
			return extras.flaggedDisplay;
		} else if (!this.isDiscovered) {
			return extras.undiscoveredDisplay;
		} else if (this.isBomb) {
			return extras.bombDiscoveredDisplay;
		} else if (this.isEmpty) {
			return extras.emptyDiscoveredDisplay;
		} else { // Must be a number!
			const int = parseInt(this.s);
			return extras.digitDisplay[int];
		}
	}
}



const extras = {
	replaceAt(str, index, replacement) {
		return str.substr(0, index) + replacement + str.substr(index + replacement.length);
	},
	chunkLocAt(x, y) {
		// -4,-3,-2,-1 -> -1
		// 0,1,2,3 -> 0
		// 4,5,6,7 -> 1
		return { u: Math.floor(x / this.chunkSize), v: Math.floor(y / this.chunkSize) };
	},
	localLocToGlobal(locx,locy,u,v) {
		return { x: locx + u*this.chunkSize, y: locy+v*this.chunkSize };
	},
	globalLocToLocal(x,y,u,v) {
		return { locx: x - u*this.chunkSize, locy: y - v*this.chunkSize };
	},
	localLocToIndex(x,y) {
		return x + y*this.chunkSize;
	},
	isInChunk(chunk,x,y) {
		const uv = this.chunkLocAt(x,y);
		return (uv.u === chunk.u && uv.v === chunk.v);
	},
	refTo(chunks, x, y) {
		const global = { x, y };
		const chunkLoc = extras.chunkLocAt(x, y);
		const chunk = chunks.find(c => (c.u === chunkLoc.u && c.v === chunkLoc.v));
		const local = extras.globalLocToLocal(x, y, chunkLoc.u, chunkLoc.v);
		return new SpaceRef(global, chunk, local);
	},
	refToLocal(chunk, locx, locy) {
		const global = extras.localLocToGlobal(locx, locy, chunk.u, chunk.v);
		return new SpaceRef(global, chunk, { locx, locy });
	},
	countAdjBombsNew(chunks, x, y) {
		// A new algorithm could work this way.
		// It would take in a small vector of chunks, maybe 20 or 30.  Just gaurantee that all the adjacent chunks are in it.
		// Every time we look for the whatshere data at a given newx and newy, we pass it the vector of chunks so it can certainly find it.
		let count = 0;
		const incrementAt = (newX,newY) => {
			if (this.refTo(chunks, newX, newY).isBomb) {
				count += 1;
			}
		}
		incrementAt(x-1,y+1);
		incrementAt(x-1,y);
		incrementAt(x-1,y-1);
		incrementAt(x,y-1);
		incrementAt(x+1,y-1);
		incrementAt(x+1,y);
		incrementAt(x+1,y+1);
		incrementAt(x,y+1);
		return count;
	},

	emptyUndiscovered: "_",
	bombUndiscovered: "b",
	emptyDiscovered: "0",
	bombDiscovered: "B",
	emptyFlagged:  "F",
	bombFlagged: "f",
	undiscoveredDisplay: "⬛",
	emptyDiscoveredDisplay: "⬜",
	bombDiscoveredDisplay: "💣",
	digitDisplay: ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣",'5️⃣','6️⃣','7️⃣',"8️⃣"],
	flaggedDisplay: "🏴",
	playerDisplay: "😊",
	invalidDisplay: "🟥",

	playerSymbols: ['😊','👍','🌹','🎉','🎶','🎆','🍕','🌘','🐱‍👤','🦄','🎈','💎','⚾','🎲','🎺','🍉','🌎','🔥','⭐'],
	//playerSymbols: ['!','@','#','$','%','^','&','*','+','|'],

	falseFlagPoints: -10,
	travelPoints: 1,
	trueFlagPoints: 10,
	discoveryBonus: 250,
	discoveryBonusDistance: 75,

	chunkSize: 6,
	minBombsPerChunk: 3,
	maxBombsPerChunk: 6,
};

module.exports = extras;