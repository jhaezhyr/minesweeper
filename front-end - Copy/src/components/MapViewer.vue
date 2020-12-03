<template>
<div>
  <div class="field">
    <div class="field-box">
      <p v-for="(line,index) in lines" :key="index">{{line}}</p>
    </div>
  </div>
  <div class="hud">
    <div class="buttons">
      <button class="ctrl up" @click="myPosition.y -= 1" :disabled="waiting||blownUp">↑</button>
      <button class="ctrl left" @click="myPosition.x -= 1" :disabled="waiting||blownUp">←</button>
      <button class="ctrl right" @click="myPosition.x += 1" :disabled="waiting||blownUp">→</button>
      <button class="ctrl down" @click="myPosition.y += 1" :disabled="waiting||blownUp">↓</button>
      <button class="ctrl up left" @click="walkToward(-1,-1)" :disabled="waiting||blownUp">↖</button>
      <button class="ctrl up right" @click="walkToward(1,-1)" :disabled="waiting||blownUp">↗</button>
      <button class="ctrl down left" @click="walkToward(-1,1)" :disabled="waiting||blownUp">↙</button>
      <button class="ctrl down right" @click="walkToward(1,1)" :disabled="waiting||blownUp">↘</button>
      <span class="ctrl">{{player.symbol}}</span>
    </div>
    <div class="buttons">
      <button class="ctrl up" @click="flagToward(0,-1)" :disabled="waiting||blownUp">↑</button>
      <button class="ctrl left" @click="flagToward(-1,0)" :disabled="waiting||blownUp">←</button>
      <button class="ctrl right" @click="flagToward(1,0)" :disabled="waiting||blownUp">→</button>
      <button class="ctrl down" @click="flagToward(0,1)" :disabled="waiting||blownUp">↓</button>
      <button class="ctrl up left" @click="flagToward(-1,-1)" :disabled="waiting||blownUp">↖</button>
      <button class="ctrl up right" @click="flagToward(1,-1)" :disabled="waiting||blownUp">↗</button>
      <button class="ctrl down left" @click="flagToward(-1,1)" :disabled="waiting||blownUp">↙</button>
      <button class="ctrl down right" @click="flagToward(1,1)" :disabled="waiting||blownUp">↘</button>
      <span class="ctrl">🏴</span>
    </div>
    <div>
      <h2>Here</h2>
      <h1>{{whatsHere}}</h1>
    </div>
    <div>
      <h2>Score</h2>
      <h1>{{myScore}}</h1>
    </div>
  </div>
  <BlowUp v-if="blownUp" :score="myScore" :respawn="respawn" />
</div>
</template>

<script>
import axios from 'axios';
import BlowUp from '@/components/BlowUp.vue';

// TODO:  Help page
// TODO:  Allow it to work without reloading everything every time I move.
// TODO:  Store the players' positions in the database.
// TODO:  Show all players on the field.
// TODO:  Update periodically the visible chunks.
// TODO:  (Maybe) discover contiguous patches.

export default {
  name: 'MapViewer',
  components: {
    BlowUp,
  },
  async created() {
    this.resizeVisibility(window.innerWidth, window.innerHeight);
    await this.makePlayer();
    await this.getScreen();
    this.explore();
    this.updateTimer = setInterval(() => {
      this.getScreen();
    }, 1000);
  },
  async mounted() {
    // Keep the visiblity updated according to the window's size
    const oldResize = window.onresize;
    window.onresize = () => {
      if (oldResize) {
        oldResize();
      }
      this.resizeVisibility(window.innerWidth, window.innerHeight);
    }

    document.addEventListener('keydown', (event) => {
      if (this.waiting || this.blownUp) {
        return;
      }
      if (event.shiftKey) {
        if (event.key == 'A') {
          this.flagToward(-1,0);
        } else if (event.key == 'D') {
          this.flagToward(1,0);
        } else if (event.key == 'W') {
          this.flagToward(0,-1);
        } else if (event.key == 'S') {
          this.flagToward(0,1);
        } else if (event.key == 'Q') {
          this.flagToward(-1,-1);
        } else if (event.key == 'E') {
          this.flagToward(1,-1);
        } else if (event.key == 'Z') {
          this.flagToward(-1,1);
        } else if (event.key == 'C') {
          this.flagToward(1,1);
        }
      } else {
        if (event.key == 'a') {
          this.myPosition.x -= 1;
        } else if (event.key == 'd') {
          this.myPosition.x += 1;
        } else if (event.key == 'w') {
          this.myPosition.y -= 1;
        } else if (event.key == 's') {
          this.myPosition.y += 1;
        } else if (event.key == 'c') {
          this.walkToward(1,1);
        } else if (event.key == 'z') {
          this.myPosition = { x: this.myPosition.x - 1, y: this.myPosition.y + 1 };
        } else if (event.key == 'e') {
          this.myPosition = { x: this.myPosition.x + 1, y: this.myPosition.y - 1 };
        } else if (event.key == 'q') {
          this.myPosition = { x: this.myPosition.x - 1, y: this.myPosition.y - 1 };
        }
      }
    });
  },
  async beforeDestroy() {
    clearInterval(this.updateTimer);
    axios.delete(`/api/player/${this.player._id}`);
  },
  data() {
    return {
      chunks: [],
      lines: ["Loading", "battlefield"], // NOTE: Do we need a key for the for loop?
      player: undefined,
      players: [],
      myPosition: { x: 0, y: 0 },
      verticalVision: 1,
      horizontalVision: 2,
      waiting: true,
      blownUp: false,
      myScore: 0,
      whatsHere: '',
      updateTimer: undefined,
    }
  },
  computed: {
    myChunk2() {
      return this.chunks.find(c => (c.u === this.myChunkLoc.u && c.v === this.myChunkLoc.v));
    },
    myChunkLoc() {
      return this.$root.$data.chunkLocAt(this.myPosition.x, this.myPosition.y);
    },
    visibleChunkBounds() {
      return {
        umin: this.myChunkLoc.u - this.horizontalVision,
        umax: this.myChunkLoc.u + this.horizontalVision,
        vmin: this.myChunkLoc.v - this.verticalVision,
        vmax: this.myChunkLoc.v + this.verticalVision,
      };
    },
    loadedChunkBounds() {
      return {
        umin: this.myChunkLoc.u - Math.max(1, this.horizontalVision),
        umax: this.myChunkLoc.u + Math.max(1, this.horizontalVision),
        vmin: this.myChunkLoc.v - Math.max(1, this.verticalVision),
        vmax: this.myChunkLoc.v + Math.max(1, this.verticalVision),
      };
    },
  },
  watch: {
    async myChunkLoc() {
      this.waiting = true;
      this.player.x = this.myPosition.x;
      this.player.y = this.myPosition.y;
      
      axios.put(`/api/player/${this.player._id}`, { x: this.myPosition.x, y: this.myPosition.y });

      await this.getScreen();
      
      this.explore();
      
      this.waiting = false;
    },

  },
  methods: {
    async makePlayer() {
      const newPlayer = await (await axios.post('/api/player')).data;
      this.myPosition.x = newPlayer.x;
      this.myPosition.y = newPlayer.y;
      this.player = newPlayer;
      this.myScore = 0;
      this.waiting = false;
      this.blownUp = false;
    },
    resizeVisibility(width, height) {
      const oldVert = this.verticalVision;
      const oldHor = this.horizontalVision;
      this.verticalVision = Math.floor(((height-280)/300.0)/1.0 + 1);
      this.horizontalVision = Math.floor(((width-30)/300.0)/1.0 + 1);
      console.log(`visibility=${this.horizontalVision}x${this.verticalVision}`);
      if (oldVert != this.verticalVision || oldHor != this.horizontalVision) {
        this.getScreen();
      }
    },
    respawn() {
      this.makePlayer();
    },
    blowUp() {
      this.waiting = true;
      this.blownUp = true;
      axios.delete(`/api/player/${this.player._id}`);
    },
    async getScreen() {
      try {
        const bounds = this.loadedChunkBounds;

        this.players = (await axios.get(`/api/players`)).data;
        this.chunks = (await axios.get(`/api/chunks/${bounds.umin}-${bounds.umax}/${bounds.vmin}-${bounds.vmax}`)).data;
        this.renderChunks();

      } catch (err) {
        console.error(err);
      }
    },
    renderChunks() {
      let result = [];
      const extras = this.$root.$data;
      const chunkSize = extras.chunkSize;

      const bounds = this.visibleChunkBounds;

      for (let v = bounds.vmin; v <= bounds.vmax; v++) {
        for (let locy = 0; locy < chunkSize; locy++) {
          let chars = [];
          for (let u = bounds.umin; u <= bounds.umax; u++) {
            const chunk = this.chunks.find(c => (c.u === u && c.v === v));
            let miniChars = Array.from(chunk.data.substr(locy*chunkSize,chunkSize));
            for (let locx = 0; locx < chunkSize; locx++) {
              const here = extras.refToLocal(chunk, locx, locy);
              miniChars[locx] = here.displayChar;
              
              const globalLoc = here.global;
              for (const player of this.players) {
                if (globalLoc.x === player.x && globalLoc.y === player.y) {
                  // A player is here.
                  miniChars[locx] = player.symbol;
                  break;
                }
              }
            }
            chars = chars.concat(miniChars);
          }
          result.push(chars.join(""));
        }
      }
      this.lines = result;
    },
    explore() {
      const extras = this.$root.$data;
      const here = extras.refTo(this.chunks, this.myPosition.x, this.myPosition.y);
      this.whatsHere = here.displayChar;
      let newValue = undefined;
      if (here.isDiscovered) {
        // Do nothing. It's been discovered already.
      } else if (here.isBomb) {
        // It's a bomb!
        newValue = extras.bombDiscovered;
        this.blowUp();
      } else {
        // It's empty and undiscovered
        newValue = `${extras.countAdjBombsNew(this.chunks, here.global.x, here.global.y)}`;
        this.myScore += extras.travelPoints;
      }

      if (here.isEmpty) {
        // It's empty and undiscovered!
        newValue = `${extras.countAdjBombsNew(this.chunks, this.myPosition.x, this.myPosition.y)}`;
      } else if (here.isBomb) {
        // TODO: Blow up.
        newValue = extras.bombDiscovered;
      } else {
        // This thing has already been discovered.
      }
      if (newValue) {
        here.s = newValue;
        this.whatsHere = here.displayChar;
        axios.put(`/api/chunk/${here.chunk._id}`, { data: here.chunk.data });
        this.renderChunks();
      }
    },
    walkToward(dx, dy) {
      this.myPosition = { x: this.myPosition.x + dx, y: this.myPosition.y + dy };
    },
    flagToward(dx, dy) {
      const extras = this.$root.$data;
      const there = extras.refTo(this.chunks, this.myPosition.x + dx, this.myPosition.y + dy);
      let newValue = undefined;
      if (there.isDiscovered) {
        // Do nothing.
      } else if (there.isBomb) {
        // It's a bomb!
        newValue = extras.bombFlagged;
        this.myScore += extras.trueFlagPoints;
      } else {
        // It's empty
        newValue = `${extras.countAdjBombsNew(this.chunks, there.global.x, there.global.y)}`;
        this.myScore += extras.falseFlagPoints;
      }
      if (newValue) {
        there.s = newValue;
        axios.put(`/api/chunk/${there.chunk._id}`, { data: there.chunk.data });
        this.renderChunks();
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
p {
  padding: 0;
  margin: 0;
  font-family: 'Courier New', Courier, monospace;
}

.field {
  position: fixed;
  z-index: -1;
  top: -300px;
  bottom: -300px;
  left: -300px;
  right: -300px;
  display: flex;
  justify-items: center;
  align-content: center;
}

.field-box {
  margin: auto;
}

.hud {
  position: fixed;
  width: 100%;
  bottom: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  background-color: #EEE;
  padding: 10px;
}

.buttons {
  position: relative;
  border: 1px solid black;
  width: 100px;
  height: 100px;
}

button {
  padding: 4px;
}

.ctrl {
  position: absolute;
  top: 50%;  /* position the top  edge of the element at the middle of the parent */
  left: 50%; /* position the left edge of the element at the middle of the parent */
  transform: translate(-50%, -50%); /* This is a shorthand of*/
}
.left {
  left: calc(50% - 30px);
}
.right {
  left: calc(50% + 30px);
}
.up {
  top: calc(50% - 30px);
}
.down {
  top: calc(50% + 30px);
}
</style>
