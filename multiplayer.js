let socket;
const SERVER_STORAGE_KEY = "kpo_server_url";
const SESSION_STORAGE_KEY = "kpo_session_data";

// Session management
const sessionManager = {
  currentSession: null,
  
  initSession(roomCode, playerName) {
    this.currentSession = {
      roomCode: roomCode,
      playerName: playerName,
      sessionId: this.generateSessionId(),
      createdAt: new Date().toISOString()
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession));
    console.log("Szoba szesszió inicializálva:", this.currentSession);
  },
  
  getSession() {
    if (this.currentSession) {
      return this.currentSession;
    }
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      this.currentSession = JSON.parse(stored);
      return this.currentSession;
    }
    return null;
  },
  
  clearSession() {
    this.currentSession = null;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    console.log("Szoba szesszió törlödve");
  },
  
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

function normalizeServerAddress(address) {
  if (!address) return "";
  let value = address.trim();
  if (!value) return "";

  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }

  value = value.replace(/\/$/, "");

  if (/^https?:\/\/[^/]+$/i.test(value) && !/:\d+$/.test(value.replace(/^https?:\/\//i, ""))) {
    value += ":5500";
  }

  return value;
}

function normalizeRoomIdentifier(value) {
  if (!value) return "";
  let result = value.trim();
  result = result.replace(/^https?:\/\//i, "");
  result = result.split("/")[0];
  result = result.split(":")[0];
  return result;
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

  return "http://localhost:5500";
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
    console.log("Kapcsolódva a szerverhez:", socket.id);
    
    // Ha van mentett szesszió, próbáljon újracsatlakozni
    const session = sessionManager.getSession();
    if (session && !isLobbyPage) {
      console.log("Szesszió talált, újracsatlakozás próbája...");
      setTimeout(() => {
        reconnectPlayer(session.roomCode, session.playerName);
      }, 500);
    }
  });

  socket.on("connect_error", (err) => {
    console.error("Hiba a szerverhez való csatlakozás során:", err.message || err);
  });

  socket.on("room_created", (data) => {
    if (!isLobbyPage) return;

    console.log("Szoba sikeresen létrehozva:", data.room_code);
    
    // Szesszió inicializálása
    const playerName = data?.room_data?.players?.[0]?.name || "";
    sessionManager.initSession(data.room_code, playerName);
    
    const statusEl = document.getElementById("createStatus");
    if (typeof showStatus === "function" && statusEl) {
      showStatus(statusEl, `Szoba létrehozva! Host IP: ${data.room_code}`, "success");
    }

    setTimeout(() => {
      window.location.href = `game.html?room=${data.room_code}&player=${encodeURIComponent(playerName)}&session=${sessionManager.currentSession.sessionId}`;
    }, 700);
  });

  socket.on("room_joined", (data) => {
    if (!isLobbyPage) return;

    console.log("Szobához sikeresen csatlakozva");

    const statusEl = document.getElementById("joinStatus");
    const roomCode = data?.room_data?.code || "";
    const player = data?.room_data?.players?.find((p) => p.sid === socket.id);
    const playerName = player?.name || data?.room_data?.players?.[1]?.name || "";

    // Szesszió inicializálása
    sessionManager.initSession(roomCode, playerName);
    
    if (typeof showStatus === "function" && statusEl) {
      showStatus(statusEl, "Csatlakozás sikeres!", "success");
    }

    setTimeout(() => {
      window.location.href = `game.html?room=${roomCode}&player=${encodeURIComponent(playerName)}&session=${sessionManager.currentSession.sessionId}`;
    }, 700);
  });

  socket.on("player_joined", (data) => {
    console.log("Új játékos csatlakozta a szobához:", data.player_name);
    
    if (!isLobbyPage) {
      // Game page might need to update UI for new player
      if (typeof onPlayerJoined === "function") {
        onPlayerJoined(data);
      }
    }
  });

  socket.on("player_reconnected", (data) => {
    console.log("Játékos újracsatlakoztat:", data.player_name);
    
    if (typeof onPlayerReconnected === "function") {
      onPlayerReconnected(data);
    }
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
  const roomIdentifier = normalizeRoomIdentifier(getCurrentMultiplayerServer());
  
  console.log("Szoba létrehozása:", { playerName, gameType, roomIdentifier });
  
  socket.emit("create_room", {
    player_name: playerName,
    game_type: gameType,
    room_identifier: roomIdentifier,
  });
}

function joinMultiplayerRoom(roomCode, playerName) {
  console.log("Szobához csatlakozás próbája:", { roomCode, playerName });
  
  socket.emit("join_room", {
    room_code: roomCode,
    player_name: playerName,
  });
}

function makeChoice(roomCode, playerName, choice) {
  console.log("Választás küldése:", { roomCode, playerName, choice });
  
  socket.emit("make_choice", {
    room_code: roomCode,
    player_name: playerName,
    choice,
  });
}

function reconnectPlayer(roomCode, playerName) {
  console.log("Játékos újracsatlakoztatása:", { roomCode, playerName });
  
  socket.emit("reconnect_player", {
    room_code: roomCode,
    player_name: playerName,
  });
}

async function getAvailableRooms() {
  try {
    const serverUrl = getCurrentMultiplayerServer();
    const response = await fetch(`${serverUrl}/rooms`);
    
    if (!response.ok) {
      console.error("Szobák lekérésének hibája:", response.status);
      return [];
    }
    
    const data = await response.json();
    console.log("Elérhető szobák:", data.rooms);
    
    // Csak a "waiting" státuszú szobákat adjuk vissza (amelyekben nincs még 2 játékos)
    const availableRooms = data.rooms.filter(room => 
      room.status === 'waiting' || (room.players && room.players.length === 1)
    );
    
    return availableRooms;
  } catch (error) {
    console.error("Hiba a szobák lekérésekor:", error);
    return [];
  }
}

window.createMultiplayerRoom = createMultiplayerRoom;
window.joinMultiplayerRoom = joinMultiplayerRoom;
window.makeChoice = makeChoice;
window.reconnectPlayer = reconnectPlayer;
window.setMultiplayerServer = setMultiplayerServer;
window.getCurrentMultiplayerServer = getCurrentMultiplayerServer;
window.getAvailableRooms = getAvailableRooms;
window.sessionManager = sessionManager;

initSocket();