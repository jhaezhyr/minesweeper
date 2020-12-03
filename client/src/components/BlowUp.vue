<template>
<div class="overlay">
	<div class="center">
		<h1>You blew up</h1>
		<h2>Your score: {{score}}</h2>
		<p>
			Input your name:<br>
			<input v-model="name"/><button :disabled="nameIsInvalid" @click="respawnPressed">Respawn</button>
		</p>
		<Scoreboard />
	</div>
</div>
</template>

<script>
import axios from 'axios';
import Scoreboard from '@/components/Scoreboard.vue';

export default {
	name: "BlowUp",
	components: {
		Scoreboard
	},
	props: {
		score: Number,
		respawn: Function,
	},
	data() {
		return {
			name: ""
		}
	},
	methods: {
		respawnPressed() {
			axios.post('/api/scoreboard', { score: this.score, name: this.name } );
			this.respawn();
		},
	},
	computed: {
		nameIsInvalid() {
			return (this.name === "" || this.name.includes(' '));
		},
	}
}
</script>

<style scoped>
.overlay {
	position: fixed;
	height: 100%;
	width: 100%;
	top: 0;
	left: 0;
	background-color: rgba(0,0,0,0.8);
	z-index: 5;
	display: flex;
	justify-content: center;
	color: white;
}
.center {
	justify-self: center;
	align-self: center;
}
</style>