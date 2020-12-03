<template>
<div class="page">
	<div class="board">
		<h2>Scoreboard</h2>
		<p v-for="(score, index) in scores" :key="index">{{score.name}}: {{score.score}}</p>
	</div>
</div>
</template>

<script>
import axios from 'axios';
export default {
	name: "Scoreboard",
	data() {
		return {
			scores: []
		}
	},
	async mounted() {
		this.scores = await (await axios.get('/api/scoreboard')).data;
	}
}
</script>

<style scoped>
.board {
	width: 400px;
	border: 1px solid grey;
	text-align: left;
	padding: 10px;
	margin-left: auto;
	margin-right: auto;
}
h2 {
	text-align: center;
}
</style>