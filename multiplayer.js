let socket;
const SERVER_STORAGE_KEY = "kpo_server_url";

function normalizeServerAddress(address) {
  if (!address) return "";
  let value = address.trim();
  if (!value) return "";

  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }

  return value.replace(/\/$/, "");
}

function resolveServerUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = normalizeServerAddress(params.get("server") || "");
  const fromStorage = normalizeServerAddress(localStorage.getItem(SERVER_STORAGE_KEY) || "");

  if (fromQuery) {
    localStorage.setItem(SERVER_STORAGE_KEY, fromQuery);
    return fromQuery;
  }

  if (fromStorage) {
    return fromStorage;
  }

  if (
    window.location.protocol.startsWith("http") &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return window.location.origin;
  }

  return "http://localhost:5000";
}

function getCurrentMultiplayerServer() {
  return resolveServerUrl();
}

function setMultiplayerServer(serverAddress) {
  const normalized = normalizeServerAddress(serverAddress);
  if (!normalized) {
    return false;
  }

  localStorage.setItem(SERVER_STORAGE_KEY, normalized);
  return true;
}

function initSocket() {
  if (typeof io === "undefined") {
    setTimeout(initSocket, 100);
    return;
  }

  const serverUrl = resolveServerUrl();
  socket = io(serverUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ["polling", "websocket"],
  });

  window.socket = socket;
  setupSocketHandlers();
}

function setupSocketHandlers() {
  const isLobbyPage = window.location.pathname.toLowerCase().includes("tobbjatekos.html");

  socket.on("connect", () => {
    console.log("Kapcsolodva:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("Hiba:", err.message || err);
  });

  socket.on("room_created", (data) => {
    if (!isLobbyPage) return;

    const statusEl = document.getElementById("createStatus");
    if (typeof showStatus === "function" && statusEl) {
      showStatus(statusEl, `Szoba letrehozva! Kod: ${data.room_code}`, "success");
    }

    const playerName = data?.room_data?.players?.[0]?.name || "";
    setTimeout(() => {
      window.location.href = `game.html?room=${data.room_code}&player=${encodeURIComponent(playerName)}`;
    }, 700);
  });

  socket.on("room_joined", (data) => {
    if (!isLobbyPage) return;

    const statusEl = document.getElementById("joinStatus");
    const roomCode = data?.room_data?.code || "";
    const player = data?.room_data?.players?.find((p) => p.sid === socket.id);
    const playerName = player?.name || "";

    if (typeof showStatus === "function" && statusEl) {
      showStatus(statusEl, "Csatlakozas sikeres!", "success");
    }

    setTimeout(() => {
      window.location.href = `game.html?room=${roomCode}&player=${encodeURIComponent(playerName)}`;
    }, 700);
  });

  socket.on("error", (data) => {
    const message = data?.message || "Ismeretlen hiba";
    const createStatusEl = document.getElementById("createStatus");
    const joinStatusEl = document.getElementById("joinStatus");

    if (typeof showStatus === "function") {
      if (createStatusEl) showStatus(createStatusEl, message, "error");
      if (joinStatusEl) showStatus(joinStatusEl, message, "error");
    }

    console.error("Szerver hiba:", message);
  });
}

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

function makeChoice(roomCode, playerName, choice) {
  socket.emit("make_choice", {
    room_code: roomCode,
    player_name: playerName,
    choice,
  });
}

function reconnectPlayer(roomCode, playerName) {
  socket.emit("reconnect_player", {
    room_code: roomCode,
    player_name: playerName,
  });
}

window.createMultiplayerRoom = createMultiplayerRoom;
window.joinMultiplayerRoom = joinMultiplayerRoom;
window.makeChoice = makeChoice;
window.reconnectPlayer = reconnectPlayer;
window.setMultiplayerServer = setMultiplayerServer;
window.getCurrentMultiplayerServer = getCurrentMultiplayerServer;

initSocket();