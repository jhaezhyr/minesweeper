<template>
  <div id="app">
    <div class="nav">
      <router-link to="/"><h2 class="logo">Minehunt.io</h2></router-link>
      <div class="nav-menu">
        <router-link to="/help">Help</router-link> |
        <router-link to="/admin">Admin</router-link> |
        <router-link to="/scoreboard">Scoreboard</router-link>
      </div>
    </div>
    <router-view/>
    <footer>
      <hr />
      <p>All content copyright © 2020 Braeden Hintze</p>
      <p><a target="_blank" href="https://github.com/jhaezhyr/minesweeper"><svg height="16" viewBox="0 0 16 16" version="1.1" width="16" aria-hidden="true"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg></a></p>
    </footer>
  </div>
</template>

<style>
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}
:root {
  --text-color: #2c3e50
}

</style>
<style scoped>

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: var(--text-color);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
}

.nav {
  background: #eee;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 30px;
  margin-bottom: 30px;
}
.logo {
  margin-right: 100px;
}

.nav a {
  font-weight: bold;
  color: #2c3e50;
}

.nav a.router-link-exact-active {
  color: #42b983;
}

hr {
  margin: 10px 15px;
}

footer {
  position: relative;
  z-index: -10;
}

</style>
