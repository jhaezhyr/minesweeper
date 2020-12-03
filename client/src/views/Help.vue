<template>
  <div class="about">
    <h1>How to play Minehunt.io</h1>
    <p>Atten-hut! Welcome to the battlefield, soldier. The commander has assigned you to scare up all the mines out there and flag them to be disarmed.</p>
    <img src="https://www.wasdkeyboards.com/pub/media/catalog/product/cache/image/2500x700/e9c3970ab036de70892d86c6d221abfe/m/o/mod-wasd_2.png" class="suppimg"/>
    <p>You can move your emoji player in any direction on the field using either a keyboard or the buttons at the bottom of your screen. Keyboard controls are WASD for horizontal and vertical movement, and QEZC for diagonal movement.</p>
    <p>Be careful as you explore the field. If you step on a mine, you'll light up like a Fourth of July firecracker. When you discover a tile, it may change to blue, indicating that a mine is in one of the adjacent tiles. The white number in the tile indicates exactly how many mines there are nearby. Nearby mines can be in tiles touching your own along the sides or even at the corners; you're always adjacent to eigth other tiles.</p>
    <p>Use the blue tiles as clues and deduce the locations of the mines. When you're sure of where a mine is, flag it. Tonight the engineers will come and to disarm all the mines on the field. They'll get mighty grumpy if you flag a clear tile to waste their time!</p>
    <p>You will gain points as you explore the battlefield and flag mines.</p>
    <ul>
      <li>1 point: Discover a clear tile</li>
      <li>10 points: Flag a bomb tile</li>
      <li>-10 points: Flag a clear tile</li>
    </ul>
    <p>Check the scoreboard to see this week's minehunting heroes!</p>
    <p>That's all you'll need to know, soldier. Ready, march!</p>
  </div>
</template>

<style scoped>
.suppimg {
  width: 30%;
  float: right;
  border: 10px solid #ddc;
}
p {
  margin-bottom: 10px;
}
h1, h2 {
  margin-bottom: 10px;
}
.about {
  padding: 10px;
  margin-left: auto;
  margin-right: auto;
  max-width: 800px;
  text-align: left;
}
li {
  margin-left: 20px;
}
ul {
  margin-bottom: 10px;
}
</style>