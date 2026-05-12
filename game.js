document.addEventListener("DOMContentLoaded", () => {
  const difficulty = document.body.dataset.difficulty || "easy";

  const difficultySettings = {
    easy: { playerLife: 3, robotLife: 3 },
    medium: { playerLife: 3, robotLife: 6 },
    hard: { playerLife: 3, robotLife: 9 },
  };

  const config = difficultySettings[difficulty] || difficultySettings.easy;

  const moves = ["rock", "paper", "scissors"];
  const moveIcons = { rock: "✊", paper: "✋", scissors: "✌" };
  const itemDefinitions = {
    reg: { label: "Gyógyító", img: "reg.webp", description: "+1 életerő" },
    ero: { label: "Erő", img: "ero.png", description: "Következő győzelem 2× sebzés" },
    finger: { label: "Finger", img: "finger.webp", description: "Semmi" },
  };

  const playerLifeEl = document.getElementById("player-life");
  const playerMaxLifeEl = document.getElementById("player-max-life");
  const robotLifeEl = document.getElementById("robot-life");
  const robotMaxLifeEl = document.getElementById("robot-max-life");
  const roundNumberEl = document.getElementById("round-number");
  const battleMessageEl = document.getElementById("battle-message");
  const playerHotbarEl = document.getElementById("player-hotbar");
  const robotHotbarEl = document.getElementById("robot-hotbar");
  const playerEffectText = document.getElementById("player-effect");
  const robotEffectText = document.getElementById("robot-effect");
  const chestPanel = document.getElementById("chest-panel");
  const chestPlayerItemEl = document.getElementById("chest-player-item");
  const chestRobotItemEl = document.getElementById("chest-robot-item");
  const gamePage = document.querySelector(".game-page");
  const countdownOverlay = document.getElementById("countdown-overlay");
  const countdownNumberEl = document.getElementById("countdown-number");
  const gameOverOverlay = document.getElementById("game-over-overlay");
  const newGameButton = document.getElementById("new-game-button");

  let playerLife = config.playerLife;
  let robotLife = config.robotLife;
  let playerBuff = false;
  let robotBuff = false;
  let round = 1;
  let gameOver = false;
  let chestOpen = false;
  let gameStartTime = Date.now();  // Track game start time for leaderboard

  const playerHotbar = [null, null, null];
  const robotHotbar = [null, null, null];

  const moveButtons = document.querySelectorAll(".move-button");

  newGameButton.addEventListener("click", () => {
    closeLeaderboardModal();
    window.location.reload();
  });

  moveButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const move = button.dataset.move;
      if (!move || gameOver || chestOpen) {
        return;
      }
      playRound(move);
    });
  });

  function startCountdown() {
    if (!countdownOverlay || !countdownNumberEl || !gamePage) {
      return;
    }
    gamePage.classList.add("hidden");
    countdownOverlay.classList.remove("hidden");
    countdownOverlay.classList.add("visible");

    let count = 3;
    countdownNumberEl.textContent = count;

    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        countdownNumberEl.textContent = count;
      } else {
        clearInterval(interval);
        countdownOverlay.classList.remove("visible");
        countdownOverlay.classList.add("hidden");
        showGamePage();
      }
    }, 1000);
  }

  function showGamePage() {
    if (!gamePage) {
      return;
    }
    gamePage.classList.remove("hidden");
    gamePage.classList.add("visible");
  }

  function showGameOver() {
    if (!gamePage || !gameOverOverlay) {
      return;
    }
    gamePage.classList.add("fade-out");
    setTimeout(() => {
      gamePage.classList.add("hidden");
      gamePage.classList.remove("fade-out", "visible");
      gameOverOverlay.classList.remove("hidden");
      gameOverOverlay.classList.add("visible");
      
      // Show the leaderboard modal after a short delay
      setTimeout(() => {
        showLeaderboardModal();
      }, 800);
    }, 500);
  }

  function showLeaderboardModal() {
    const elapsedTime = Math.round((Date.now() - gameStartTime) / 1000);
    const playerWon = robotLife <= 0;
    
    // If player lost, don't show the modal
    if (!playerWon) return;
    
    const modal = document.getElementById('leaderboard-modal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.classList.add('visible');
    
    const timeDisplay = document.getElementById('final-time');
    if (timeDisplay) {
      const minutes = Math.floor(elapsedTime / 60);
      const seconds = elapsedTime % 60;
      timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    const playerNameInput = document.getElementById('player-name-input');
    if (playerNameInput) {
      playerNameInput.value = '';
      playerNameInput.focus();
    }
  }

  function saveScoreToLeaderboard() {
    const elapsedTime = Math.round((Date.now() - gameStartTime) / 1000);
    const playerNameInput = document.getElementById('player-name-input');
    const playerName = (playerNameInput?.value || 'Ismeretlen').trim();
    
    if (!playerName || playerName.length === 0) {
      alert('Kérjük add meg a nevedet!');
      return;
    }
    
    // Save to leaderboard
    fetch('/save-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player_name: playerName,
        time: elapsedTime,
        difficulty: difficulty
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        closeLeaderboardModal();
      }
    })
    .catch(error => console.error('Error saving score:', error));
  }

  function closeLeaderboardModal() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('visible');
    }
  }

  function playRound(playerMove) {
    const robotMove = moves[Math.floor(Math.random() * moves.length)];
    const winner = getWinner(playerMove, robotMove);
    let message = `Te: ${moveIcons[playerMove]} - AI: ${moveIcons[robotMove]}. `;

    if (winner === "tie") {
      message += "Döntetlen, senki nem kap sérülést.";
    } else {
      const damage = calculateDamage(winner);
      if (winner === "player") {
        robotLife = Math.max(0, robotLife - damage);
        message += `Nyertél, a robot ${damage} sebzést kap.`;
      } else {
        playerLife = Math.max(0, playerLife - damage);
        message += `Vesztettél, te ${damage} sebzést kaptál.`;
      }
      clearBuffIfUsed(winner);
    }

    updateBattleMessage(message);
    updateStatus();

    if (checkGameOver()) {
      return;
    }

    setTimeout(() => {
      openChest();
    }, 700);
  }

  function calculateDamage(winner) {
    if (winner === "player") {
      return playerBuff ? 2 : 1;
    }
    if (winner === "robot") {
      return robotBuff ? 2 : 1;
    }
    return 0;
  }

  function clearBuffIfUsed(winner) {
    if (winner === "player" && playerBuff) {
      playerBuff = false;
    }
    if (winner === "robot" && robotBuff) {
      robotBuff = false;
    }
  }

  function getWinner(playerMove, robotMove) {
    if (playerMove === robotMove) {
      return "tie";
    }
    if (
      (playerMove === "rock" && robotMove === "scissors") ||
      (playerMove === "paper" && robotMove === "rock") ||
      (playerMove === "scissors" && robotMove === "paper")
    ) {
      return "player";
    }
    return "robot";
  }

  function checkGameOver() {
    if (playerLife <= 0) {
      gameOver = true;
      updateBattleMessage("Vesztettél. A játék véget ért.");
      setButtonsEnabled(false);
      showGameOver();
      return true;
    }
    if (robotLife <= 0) {
      gameOver = true;
      updateBattleMessage("Nyertél! A robot legyőzve.");
      setButtonsEnabled(false);
      showGameOver();
      return true;
    }
    return false;
  }

  function setButtonsEnabled(enabled) {
    moveButtons.forEach((button) => {
      button.disabled = !enabled;
    });
  }

  function openChest() {
    chestOpen = true;
    const playerItem = getRandomChestItem();
    const robotItem = getRandomChestItem();

    giveItemToHotbar(playerHotbar, playerItem);
    giveItemToHotbar(robotHotbar, robotItem);

    chestPlayerItemEl.innerHTML = renderChestItem(playerItem);
    chestRobotItemEl.innerHTML = renderChestItem(robotItem);

    chestPanel.classList.remove("hidden", "fade-out");
    chestPanel.classList.add("visible");

    setTimeout(() => {
      chestPanel.classList.add("fade-out");
    }, 1800);

    setTimeout(() => {
      chestPanel.classList.remove("visible", "fade-out");
      chestPanel.classList.add("hidden");
      chestOpen = false;
      round += 1;
      updateStatus();
      robotAutoUse();
    }, 2400);
  }

  function getRandomChestItem() {
    const random = Math.random();
    if (random < 0.2) {
      return "reg";
    }
    if (random < 0.4) {
      return "ero";
    }
    return "finger";
  }

  function giveItemToHotbar(hotbar, itemId) {
    if (itemId === "finger") {
      return;
    }
    const slotIndex = hotbar.findIndex((slot) => slot === null);
    if (slotIndex === -1) {
      return;
    }
    hotbar[slotIndex] = itemId;
  }

  function renderChestItem(itemId) {
    const item = itemDefinitions[itemId];
    return `<span class="chest-item-label"><img src="${item.img}" alt="${item.label}" /><strong>${item.label}</strong></span>`;
  }

  function robotAutoUse() {
    if (robotBuff) {
      return;
    }
    if (robotHotbar.includes("reg") && robotLife <= 2) {
      useRobotItem("reg");
      return;
    }
    if (robotHotbar.includes("ero") && Math.random() < 0.35) {
      useRobotItem("ero");
    }
  }

  function useRobotItem(itemId) {
    const slotIndex = robotHotbar.indexOf(itemId);
    if (slotIndex === -1) {
      return;
    }
    robotHotbar[slotIndex] = null;
    if (itemId === "reg") {
      if (robotLife < config.robotLife) {
        robotLife += 1;
        updateBattleMessage("AI használta a gyógyító itemet és +1 életerőt kapott.");
      } else {
        updateBattleMessage("AI használta a gyógyító itemet, de életereje már teljes.");
      }
    }
    if (itemId === "ero") {
      robotBuff = true;
      updateBattleMessage("AI használta az erőpotit! Következő győzelme dupla sebzést ad.");
    }
    updateStatus();
  }

  function updateStatus() {
    playerLifeEl.textContent = playerLife;
    playerMaxLifeEl.textContent = config.playerLife;
    robotLifeEl.textContent = robotLife;
    robotMaxLifeEl.textContent = config.robotLife;
    roundNumberEl.textContent = `Kör ${round}`;
    playerEffectText.textContent = playerBuff ? "Erő aktív" : "Nincs hatás";
    robotEffectText.textContent = robotBuff ? "Erő aktív" : "Nincs hatás";
    updateHealthFill();
    renderHotbar(playerHotbarEl, playerHotbar, true);
    renderHotbar(robotHotbarEl, robotHotbar, false);
  }

  function updateHealthFill() {
    const playerFill = document.getElementById("player-health-fill");
    const robotFill = document.getElementById("robot-health-fill");
    const playerPercent = Math.max(0, Math.min(100, Math.round((playerLife / config.playerLife) * 100)));
    const robotPercent = Math.max(0, Math.min(100, Math.round((robotLife / config.robotLife) * 100)));
    playerFill.style.width = `${playerPercent}%`;
    robotFill.style.width = `${robotPercent}%`;
  }

  function renderHotbar(container, hotbar, clickable) {
    container.innerHTML = hotbar
      .map((itemId, index) => {
        const content = itemId ? itemDefinitions[itemId] : null;
        const label = content
          ? `<img src="${content.img}" alt="${content.label}" /><span>${content.label}</span>`
          : "Üres";
        return `
          <button class="hotbar-slot ${itemId || "empty"}" data-index="${index}" ${clickable && !gameOver ? "" : "disabled"}>
            ${label}
          </button>
        `;
      })
      .join("");

    if (clickable) {
      container.querySelectorAll(".hotbar-slot").forEach((button) => {
        button.addEventListener("click", () => {
          if (gameOver || chestOpen) {
            return;
          }
          const index = Number(button.dataset.index);
          usePlayerItem(index);
        });
      });
    }
  }

  function usePlayerItem(index) {
    const itemId = playerHotbar[index];
    if (!itemId) {
      updateBattleMessage("Nincs item ebben a slotban.");
      return;
    }

    playerHotbar[index] = null;
    if (itemId === "finger") {
      updateBattleMessage("A ládából finger jött, semmi nem történt.");
      updateStatus();
      return;
    }

    if (itemId === "reg") {
      if (playerLife >= config.playerLife) {
        updateBattleMessage("Életerőd már teljes, a gyógyító item nem használható most.");
      } else {
        playerLife += 1;
        updateBattleMessage("Használtad a gyógyító itemet: +1 életerő.");
      }
    }

    if (itemId === "ero") {
      playerBuff = true;
      updateBattleMessage("Használtad az erőpotit! Következő győzelmed dupla sebzést ad.");
    }

    updateStatus();
  }

  function updateBattleMessage(text) {
    battleMessageEl.textContent = text;
  }

  updateStatus();
  startCountdown();
});
