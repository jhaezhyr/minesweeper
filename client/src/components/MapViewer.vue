<template>
<div>
  <div class="field">
    <div class="field-box">
      <p v-for="(line,index) in lines" :key="index">{{line}}</p>
    </div>
  </div>
  <div class="hud">
    <div class="buttons">
      <button class="ctrl up" @click="walkToward(0,-1)" :disabled="blownUp">↑</button>
      <button class="ctrl left" @click="walkToward(-1,0)" :disabled="blownUp">←</button>
      <button class="ctrl right" @click="walkToward(1,0)" :disabled="blownUp">→</button>
      <button class="ctrl down" @click="walkToward(0,1)" :disabled="blownUp">↓</button>
      <button class="ctrl up left" @click="walkToward(-1,-1)" :disabled="blownUp">↖</button>
      <button class="ctrl up right" @click="walkToward(1,-1)" :disabled="blownUp">↗</button>
      <button class="ctrl down left" @click="walkToward(-1,1)" :disabled="blownUp">↙</button>
      <button class="ctrl down right" @click="walkToward(1,1)" :disabled="blownUp">↘</button>
      <span class="ctrl">{{player.symbol}}</span>
    </div>
    <div class="buttons">
      <button class="ctrl up" @click="flagToward(0,-1)" :disabled="blownUp">↑</button>
      <button class="ctrl left" @click="flagToward(-1,0)" :disabled="blownUp">←</button>
      <button class="ctrl right" @click="flagToward(1,0)" :disabled="blownUp">→</button>
      <button class="ctrl down" @click="flagToward(0,1)" :disabled="blownUp">↓</button>
      <button class="ctrl up left" @click="flagToward(-1,-1)" :disabled="blownUp">↖</button>
      <button class="ctrl up right" @click="flagToward(1,-1)" :disabled="blownUp">↗</button>
      <button class="ctrl down left" @click="flagToward(-1,1)" :disabled="blownUp">↙</button>
      <button class="ctrl down right" @click="flagToward(1,1)" :disabled="blownUp">↘</button>
      <span class="ctrl">🏴</span>
    </div>
    <!-- <div>
      <button @click="renderChunks" :disabled="blownUp">Render</button><br>
      <button @click="sendPlayerUpdateToServer" :disabled="blownUp">Save Player</button><br>
      <button @click="requestMapAndPlayers" :disabled="blownUp">Get Map and Players</button>
    </div> -->
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
  async mounted() {
    this.resizeVisibility(window.innerWidth, window.innerHeight);
    await this.spawn();
    
    this.updateTimer = setInterval(async () => {
      if (this.waiting) {
        return;
      } else {
        //await this.requestMapAndPlayers();
        //this.renderChunks();
      }
    }, 1000);

    // Keep the visiblity updated according to the window's size
    const oldResize = window.onresize;
    window.onresize = () => {
      if (oldResize) {
        oldResize();
      }
      this.resizeVisibility(window.innerWidth, window.innerHeight);
    }

    document.addEventListener('keydown', (event) => {
      if (this.blownUp) {
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
          this.walkToward(-1,0);
        } else if (event.key == 'd') {
          this.walkToward(1,0);
        } else if (event.key == 'w') {
          this.walkToward(0,-1);
        } else if (event.key == 's') {
          this.walkToward(0,1);
        } else if (event.key == 'c') {
          this.walkToward(1,1);
        } else if (event.key == 'z') {
          this.walkToward(-1,1);
        } else if (event.key == 'e') {
          this.walkToward(1,-1);
        } else if (event.key == 'q') {
          this.walkToward(-1,-1);
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
      startPosition: { x: 0, y: 0 },
      discoveryBonusAchieved: false,
      needs: {
        getChunks: false,
        getPlayers: false,
        savePlayer: false,
        saveChunks: new Set(),
        render: false,
        whatsHere: '',
        scoreShift: 0,
        delayedInput: [],
      },
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
      
    },

  },
  methods: {
    async spawn() {
      await this.makePlayer(true);
      await this.requestMapAndPlayers();
      this.revealAroundMe();

      this.explore();
      this.fulfillNeeds();
    },
    async makePlayer(postponeReveal) {
      const newPlayer = await (await axios.post('/api/player')).data;
      this.player = newPlayer;
      this.setPosition(newPlayer.x, newPlayer.y);
      this.needs.savePlayer = false;
      this.startPosition.x = newPlayer.x;
      this.startPosition.y = newPlayer.y;
      this.discoveryBonusAchieved = false;
      this.myScore = 0;
      this.waiting = false;
      this.blownUp = false;
      if (!postponeReveal) {
        this.revealAroundMe();
      }
    },
    revealAroundMe() {
      console.log("I want to reveal around me.");
      this.reveal(-1,0, true);
      this.reveal(-1,1, true);
      this.reveal(0,1, true);
      this.reveal(1,1, true);
      this.reveal(1,0, true);
      this.reveal(1,-1, true);
      this.reveal(0,-1, true);
      this.reveal(-1,-1, true);
      this.reveal(0,0, true);
      console.log("I revealed around me!");
    },
    setPosition(x, y) {
      this.myPosition = { x, y };
      
      this.player.x = this.myPosition.x;
      this.player.y = this.myPosition.y;
      
      this.needs.savePlayer = true;
      this.needs.getChunks = true;
      this.needs.render = true;
    },
    resizeVisibility(width, height) {
      const oldVert = this.verticalVision;
      const oldHor = this.horizontalVision;
      this.verticalVision = Math.floor(((height-280)/300.0)/1.0 + 1);
      this.horizontalVision = Math.floor(((width-30)/300.0)/1.0 + 1);
      console.log(`visibility=${this.horizontalVision}x${this.verticalVision}`);
      if (oldVert != this.verticalVision || oldHor != this.horizontalVision) {
        this.needs.getChunks = true;
        this.needs.render = true;
      }
      this.fulfillNeeds();
    },
    async respawn() {
      await this.spawn();
    },
    blowUp() {
      this.waiting = true;
      this.blownUp = true;
      axios.delete(`/api/player/${this.player._id}`);
      this.needs.savePlayer = false;
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
            // If this chunk doesn't exist, just draw a blank.
            if (!chunk) {
              chars.concat(Array(chunkSize).fill(extras.invalidDisplay))
              continue;
            }
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
    reveal(dx, dy, flagging) {
      const extras = this.$root.$data;
      const here = extras.refTo(this.chunks, this.myPosition.x + dx, this.myPosition.y + dy);
      let newValue = undefined;
      const wasUndiscovered = !here.isDiscovered;

      if (here.isFlagged || !wasUndiscovered) {
        // Don't change it. It's in its final state.
      } else if (here.isBomb) {
        // It's a bomb!
        newValue = flagging ? extras.bombFlagged : extras.bombDiscovered;
      } else {
        // It's empty and undiscovered
        newValue = `${extras.countAdjBombsNew(this.chunks, here.global.x, here.global.y)}`;
      }

      if (newValue) {
        here.s = newValue;
        this.needs.render = true;
        this.needs.saveChunks.add(here.chunk);
      }
      if (dx === 0 && dy === 0) {
        this.needs.whatsHere = here.displayChar;
      }
      return { here, wasUndiscovered };
    },
    explore() {
      const extras = this.$root.$data;
      const { here, wasUndiscovered } = this.reveal(0, 0, false);
      if (here.isBomb && !here.isFlagged) {
        // It's a bomb!
        this.blowUp();
      } else if (wasUndiscovered) {
        // It's empty and undiscovered
        this.needs.scoreShift += extras.travelPoints;
        // Do we qualify for a bonus yet?
        if (!this.discoveryBonusAchieved
          && Math.abs(this.startPosition.x - this.myPosition.x) + Math.abs(this.startPosition.y - this.myPosition.y) > extras.discoveryBonusDistance) {
          // We do!
          this.needs.scoreShift += extras.discoveryBonus;
          this.discoveryBonusAchieved = true;
        }
      }
    },
    async walkToward(dx, dy) {
      if (this.waiting) {
        this.needs.delayedInput.push(() => { this.walkToward(dx, dy); });
        return;
      }
      this.setPosition(this.myPosition.x + dx, this.myPosition.y + dy);
      this.explore();
      await this.fulfillNeeds();
    },
    async flagToward(dx, dy) {
      if (this.waiting) {
        this.needs.delayedInput.push(() => { this.flagToward(dx, dy); });
        return;
      }
      const extras = this.$root.$data;
      const { here: there, wasUndiscovered } = this.reveal(dx, dy, true);
      if (!wasUndiscovered) {
        // Do nothing.
      } else if (there.isBomb) {
        // It's a bomb!
        this.needs.scoreShift += extras.trueFlagPoints;
      } else {
        // It's empty
        this.needs.scoreShift += extras.falseFlagPoints;
      }
      await this.fulfillNeeds();
    },

    async fulfillNeeds() {
      this.waiting = true;

      for (const c of this.needs.saveChunks) {
        await this.sendChunkUpdateToServer(c);
      }
      this.needs.saveChunks.clear();

      if (this.needs.savePlayer) {
        await axios.put(`/api/player/${this.player._id}`, { x: this.myPosition.x, y: this.myPosition.y });
      }
      this.needs.savePlayer = false;

      if (this.needs.getChunks || this.needs.getPlayers) {
        await this.requestMapAndPlayers();
      }
      this.needs.getChunks = false;
      this.needs.getPlayers = false;

      if (this.needs.render) {
        this.renderChunks();
      }
      this.whatsHere = this.needs.whatsHere;
      this.myScore += this.needs.scoreShift;
      this.needs.scoreShift = 0;
      this.needs.render = false;

      this.waiting = false;

      // TODO:  Implement a complete event loop.
      // This implementation, when working, will only safely execute one delayed input before race case.
      //for (const delayedInput of this.needs.delayedInput) {
      //  console.log(`Running delayed input: ${delayedInput}`);
      //  delayedInput();
      //}
      this.needs.delayedInput = [];

    },

    async sendChunkUpdateToServer(thisChunk) {
      try {
        await axios.put(`/api/chunk/${thisChunk._id}`, { data: thisChunk.data });
      } catch (err) {
        console.error(err);
      }
    },
    async sendPlayerUpdateToServer() {
      try {
        await axios.put(`/api/player/${this.player._id}`, { x: this.myPosition.x, y: this.myPosition.y });
      } catch (err) {
        console.error(err);
      }
    },
    async requestMapAndPlayers() {
      try {
        const bounds = this.loadedChunkBounds;

        this.players = (await axios.get(`/api/players`)).data;
        this.chunks = (await axios.get(`/api/chunks/${bounds.umin}-${bounds.umax}/${bounds.vmin}-${bounds.vmax}`)).data;
        console.log("Got data again.");

      } catch (err) {
        console.error(err);
      }
    },
    
  }
}

/*
What are the high-level events that could trigger a redraw, a chunk update, or a player update?
- Walk
- Flag
- Spawn
- Respawn
- Periodic update
- Resize window (render)
*/
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
  background-color: white;
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
