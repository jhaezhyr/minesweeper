<template>
<div>
	<h1>Admin</h1>
	<div class="admin">
		<div class="section">
			<h2>Players</h2>
			<table>
				<tr>
					<th>Symbol</th>
					<th>X</th>
					<th>Y</th>
					<th>Options</th>
				</tr>
				<tr v-for="player in players" :key="player._id">
					<td>{{player.symbol}}</td>
					<td>{{player.x}}</td>
					<td>{{player.y}}</td>
					<td><button @click="deletePlayer(player)">Delete</button></td>
				</tr>
			</table>
			<button @click="updatePlayers">Update</button>
		</div>
		<div class="section">
			<h2>Scores</h2>
			<table>
				<tr>
					<th>Name</th>
					<th>Score</th>
					<th>Options</th>
				</tr>
				<tr v-for="score in scores" :key="score._id">
					<td>{{score.name}}</td>
					<td>{{score.score}}</td>
					<td><button @click="deleteScore(score)">Delete</button></td>
				</tr>
			</table>
			<button @click="updateScores">Update</button>
		</div>
		<div class="section">
			<h2>Chunks</h2>
			<button @click="cleanChunks">Clear out undiscovered chunks</button>
			<p>{{response}}</p>
		</div>
	</div>
</div>
</template>

<style scoped>
td, th {
	border-bottom: 2px solid var(--text-color);
	padding: 2px;
}
table {
  border-collapse: collapse;
}

.section {
	background: #bcc;
	border: 1px solid var(--text-color);
	border-radius: 10px;
	margin: 10px 10px;
	padding: 10px;
	text-align: left;
	flex-grow: 1;
}

.admin {
	display: flex;
}

button {
	padding: 4px;
}

</style>

<script>
import axios from 'axios';
export default {
	name: "Admin",
	data() {
		return {
			players: [],
			scores: [],
			response: '',
		};
	},
	methods: {
		async updatePlayers() {
			this.players = await (await axios.get('/api/players')).data;
		},
		async deletePlayer(player) {
			await axios.delete(`/api/player/${player._id}`);
			await this.updatePlayers();
		},
		async updateScores() {
			this.scores = await (await axios.get('/api/scoreboard/')).data;
		},
		async deleteScore(score) {
			await axios.delete(`/api/scoreboard/${score._id}`);
			await this.updateScores();
		},
		async cleanChunks() {
			this.response = `Deleted ${(await axios.post('/api/chunks/clean')).data.deleted} chunks.`;
		}
	},
	mounted() {
		this.updatePlayers();
		this.updateScores();
	},
}
</script>