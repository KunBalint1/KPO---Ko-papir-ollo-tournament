const socket = io({
  transports: ["websocket", "polling"]
});

window.socket = socket;

socket.on("connect", () => {
  console.log("Kapcsolódva!");
});

socket.on("connect_error", (err) => {
  console.error("Hiba:", err);
});

function createMultiplayerRoom(playerName, gameType) {
  socket.emit("create_room", {
    player_name: playerName,
    game_type: gameType,
  });
}

function joinMultiplayerRoom(roomCode, playerName) {
  socket.emit("join_room", {
    room_code: roomCode,
    player_name: playerName,
  });
}

window.createMultiplayerRoom = createMultiplayerRoom;
window.joinMultiplayerRoom = joinMultiplayerRoom;