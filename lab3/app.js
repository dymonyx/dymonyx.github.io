(function () {
  const SIZE = 4;
  const STORAGE_STATE_KEY = "g2048-state";
  const STORAGE_LEADERS_KEY = "g2048-leaders";

  function isTouchDevice() {
    return "ontouchstart" in window;
  }

  function createMatrix(size, fill) {
    const m = [];
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) row.push(fill);
      m.push(row);
    }
    return m;
  }

  function cloneMatrix(m) {
    return m.map(function (row) {
      return row.slice();
    });
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return dd + "." + mm + "." + yy + " " + hh + ":" + min;
  }

  let grid = createMatrix(SIZE, 0);
  let score = 0;
  let best = 0;
  let gameOver = false;
  let canUndo = false;
  let prevGrid = null;
  let prevScore = 0;
  let prevGameOver = false;
  let leaders = [];
  let view = "game";

  const app = document.createElement("div");
  app.className = "app";

  const appInner = document.createElement("div");
  appInner.className = "app-inner";
  app.append(appInner);

  const header = document.createElement("div");
  header.className = "header";

  const headerTop = document.createElement("div");
  headerTop.className = "header-top";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = "2048";

  const scoresBox = document.createElement("div");
  scoresBox.className = "scores";

  const scoreBox = document.createElement("div");
  scoreBox.className = "score-box";
  const scoreLabel = document.createElement("div");
  scoreLabel.className = "score-box-label";
  scoreLabel.textContent = "Счёт";
  const scoreValue = document.createElement("div");
  scoreValue.className = "score-box-value";
  scoreValue.textContent = "0";
  scoreBox.append(scoreLabel, scoreValue);

  const bestBox = document.createElement("div");
  bestBox.className = "score-box";
  const bestLabel = document.createElement("div");
  bestLabel.className = "score-box-label";
  bestLabel.textContent = "Рекорд";
  const bestValue = document.createElement("div");
  bestValue.className = "score-box-value";
  bestValue.textContent = "0";
  bestBox.append(bestLabel, bestValue);

  scoresBox.append(scoreBox, bestBox);
  headerTop.append(title, scoresBox);

  const headerControls = document.createElement("div");
  headerControls.className = "header-controls";

  const newGameBtn = document.createElement("button");
  newGameBtn.type = "button";
  newGameBtn.textContent = "Начать заново";

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.className = "return";
  undoBtn.textContent = "Отмена хода";

  const leadersBtn = document.createElement("button");
  leadersBtn.type = "button";
  leadersBtn.className = "secondary";
  leadersBtn.textContent = "Таблица лидеров";

  headerControls.append(newGameBtn, undoBtn, leadersBtn);
  header.append(headerTop, headerControls);

  const boardWrapper = document.createElement("div");
  boardWrapper.className = "board-wrapper";

  const board = document.createElement("div");
  board.className = "board";

  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    const row = [];
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      cell.dataset.value = "0";
      cell.textContent = "";
      board.append(cell);
      row.push(cell);
    }
    cells.push(row);
  }
  boardWrapper.append(board);

  const touchControls = document.createElement("div");
  touchControls.className = "touch-controls";

  const btnUpPlaceholderLeft = document.createElement("button");
  btnUpPlaceholderLeft.type = "button";
  btnUpPlaceholderLeft.className = "center-placeholder";
  btnUpPlaceholderLeft.tabIndex = -1;

  const upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.textContent = "↑";

  const btnUpPlaceholderRight = document.createElement("button");
  btnUpPlaceholderRight.type = "button";
  btnUpPlaceholderRight.className = "center-placeholder";
  btnUpPlaceholderRight.tabIndex = -1;

  const leftBtn = document.createElement("button");
  leftBtn.type = "button";
  leftBtn.textContent = "←";

  const downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.textContent = "↓";

  const rightBtn = document.createElement("button");
  rightBtn.type = "button";
  rightBtn.textContent = "→";

  touchControls.append(
    btnUpPlaceholderLeft,
    upBtn,
    btnUpPlaceholderRight,
    leftBtn,
    downBtn,
    rightBtn
  );

  const gameOverOverlay = document.createElement("div");
  gameOverOverlay.className = "overlay";
  gameOverOverlay.style.display = "none";

  const gameOverInner = document.createElement("div");
  gameOverInner.className = "overlay-inner";

  const gameOverTitle = document.createElement("div");
  gameOverTitle.className = "overlay-title";
  gameOverTitle.textContent = "Игра окончена";

  const gameOverMessage = document.createElement("div");
  gameOverMessage.className = "overlay-message";
  gameOverMessage.textContent =
    "Нет возможных ходов. Вы можете сохранить свой результат.";

  const gameOverRow = document.createElement("div");
  gameOverRow.className = "overlay-row";

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Ваше имя";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Введите имя для таблицы лидеров";

  gameOverRow.append(nameLabel, nameInput);

  const gameOverActions = document.createElement("div");
  gameOverActions.className = "overlay-actions";

  const saveResultBtn = document.createElement("button");
  saveResultBtn.type = "button";
  saveResultBtn.textContent = "Сохранить результат";

  const restartFromOverlayBtn = document.createElement("button");
  restartFromOverlayBtn.type = "button";
  restartFromOverlayBtn.className = "secondary";
  restartFromOverlayBtn.textContent = "Начать заново";

  gameOverActions.append(saveResultBtn, restartFromOverlayBtn);

  gameOverInner.append(
    gameOverTitle,
    gameOverMessage,
    gameOverRow,
    gameOverActions
  );
  gameOverOverlay.append(gameOverInner);

  const leadersOverlay = document.createElement("div");
  leadersOverlay.className = "overlay";
  leadersOverlay.style.display = "none";

  const leadersInner = document.createElement("div");
  leadersInner.className = "overlay-inner";

  const leadersTitle = document.createElement("div");
  leadersTitle.className = "overlay-title";
  leadersTitle.textContent = "Таблица лидеров";

  const leadersMsg = document.createElement("div");
  leadersMsg.className = "overlay-message";
  leadersMsg.textContent = "Топ-10 сохранённых результатов.";

  const tableWrapper = document.createElement("div");
  const table = document.createElement("table");
  table.className = "leader-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const thPlace = document.createElement("th");
  thPlace.textContent = "№";
  const thName = document.createElement("th");
  thName.textContent = "Имя";
  const thScore = document.createElement("th");
  thScore.textContent = "Очки";
  const thDate = document.createElement("th");
  thDate.textContent = "Дата";
  headRow.append(thPlace, thName, thScore, thDate);
  thead.append(headRow);

  const tbody = document.createElement("tbody");

  table.append(thead, tbody);
  tableWrapper.append(table);

  const leadersActions = document.createElement("div");
  leadersActions.className = "overlay-actions";

  const closeLeadersBtn = document.createElement("button");
  closeLeadersBtn.type = "button";
  closeLeadersBtn.textContent = "Закрыть";

  leadersActions.append(closeLeadersBtn);

  leadersInner.append(leadersTitle, leadersMsg, tableWrapper, leadersActions);
  leadersOverlay.append(leadersInner);

  appInner.append(header, boardWrapper, touchControls);
  document.body.append(app, gameOverOverlay, leadersOverlay);

  function getEmptyCells() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) empty.push({ r: r, c: c });
      }
    }
    return empty;
  }

  function spawnRandomTiles(min, max) {
    const empty = getEmptyCells();
    if (empty.length === 0) return [];

    const spawned = [];
    const count =
      empty.length === 1
        ? 1
        : Math.min(max, min + Math.floor(Math.random() * (max - min + 1)));

    for (let i = 0; i < count && empty.length > 0; i++) {
      const index = Math.floor(Math.random() * empty.length);
      const cell = empty.splice(index, 1)[0];
      const value = Math.random() < 0.9 ? 2 : 4;
      grid[cell.r][cell.c] = value;
      spawned.push(cell);
    }
    return spawned;
  }

  function canMove() {
    if (getEmptyCells().length > 0) return true;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        if (r + 1 < SIZE && grid[r + 1][c] === v) return true;
        if (c + 1 < SIZE && grid[r][c + 1] === v) return true;
      }
    }
    return false;
  }

  function slideLine(line) {
    const nonZero = [];
    for (let i = 0; i < line.length; i++) {
      if (line[i] !== 0) nonZero.push(line[i]);
    }

    const result = [];
    const mergedIndices = [];
    let gained = 0;

    for (let i = 0; i < nonZero.length; i++) {
      if (nonZero[i] === nonZero[i + 1]) {
        const mergedVal = nonZero[i] * 2;
        result.push(mergedVal);
        gained += mergedVal;
        mergedIndices.push(result.length - 1);
        i++;
      } else {
        result.push(nonZero[i]);
      }
    }

    while (result.length < SIZE) result.push(0);

    let moved = false;
    for (let i = 0; i < SIZE; i++) {
      if (result[i] !== line[i]) {
        moved = true;
        break;
      }
    }

    return {
      line: result,
      gained: gained,
      moved: moved,
      mergedIndices: mergedIndices,
    };
  }

  function move(direction) {
    if (gameOver || view !== "game") return;

    let totalGained = 0;
    let anyMoved = false;
    const mergedCells = [];

    const gridBefore = cloneMatrix(grid);
    const scoreBefore = score;
    const gameOverBefore = gameOver;

    if (direction === "left" || direction === "right") {
      for (let r = 0; r < SIZE; r++) {
        const row = grid[r].slice();
        const working = direction === "left" ? row : row.slice().reverse();
        const res = slideLine(working);

        totalGained += res.gained;
        if (res.moved) anyMoved = true;

        const finalLine =
          direction === "left" ? res.line : res.line.slice().reverse();
        grid[r] = finalLine;

        if (res.moved) {
          for (let i = 0; i < res.mergedIndices.length; i++) {
            const idx = res.mergedIndices[i];
            const col = direction === "left" ? idx : SIZE - 1 - idx;
            mergedCells.push({ r: r, c: col });
          }
        }
      }
    } else {
      for (let c = 0; c < SIZE; c++) {
        const column = [];
        for (let r = 0; r < SIZE; r++) column.push(grid[r][c]);

        const working = direction === "up" ? column : column.slice().reverse();
        const res = slideLine(working);

        totalGained += res.gained;
        if (res.moved) anyMoved = true;

        const finalCol =
          direction === "up" ? res.line : res.line.slice().reverse();
        for (let r = 0; r < SIZE; r++) grid[r][c] = finalCol[r];

        if (res.moved) {
          for (let i = 0; i < res.mergedIndices.length; i++) {
            const idx = res.mergedIndices[i];
            const row = direction === "up" ? idx : SIZE - 1 - idx;
            mergedCells.push({ r: row, c: c });
          }
        }
      }
    }

    if (!anyMoved) return;

    score += totalGained;
    if (score > best) best = score;

    prevGrid = gridBefore;
    prevScore = scoreBefore;
    prevGameOver = gameOverBefore;
    canUndo = true;

    const spawned = spawnRandomTiles(1, 2);

    if (!canMove()) {
      gameOver = true;
      setView("over");
    }

    renderGrid(mergedCells, spawned);
    updateScoreUI();
    saveState();
    updateUndoUI();
  }

  function isCellIn(list, r, c) {
    if (!list) return false;
    for (let i = 0; i < list.length; i++) {
      if (list[i].r === r && list[i].c === c) return true;
    }
    return false;
  }

  function renderGrid(mergedCells, spawnedCells) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = cells[r][c];
        const value = grid[r][c];

        cell.classList.remove("cell-new");
        cell.classList.remove("cell-merged");

        cell.dataset.value = String(value);
        cell.textContent = value === 0 ? "" : String(value);

        if (isCellIn(mergedCells, r, c)) cell.classList.add("cell-merged");
        if (isCellIn(spawnedCells, r, c)) cell.classList.add("cell-new");
      }
    }
  }

  function updateScoreUI() {
    scoreValue.textContent = String(score);
    bestValue.textContent = String(best);
  }

  function updateUndoUI() {
    undoBtn.disabled = !canUndo || gameOver || view !== "game";
  }

  function setView(next) {
    view = next;

    if (view === "game") {
      gameOverOverlay.style.display = "none";
      leadersOverlay.style.display = "none";
    } else if (view === "over") {
      gameOverOverlay.style.display = "flex";
      leadersOverlay.style.display = "none";
    } else {
      gameOverOverlay.style.display = "none";
      leadersOverlay.style.display = "flex";
    }

    updateUndoUI();

    if (isTouchDevice()) {
      touchControls.hidden = view !== "game";
    } else {
      touchControls.hidden = true;
    }
  }

  function saveState() {
    const state = {
      grid: grid,
      score: score,
      best: best,
      gameOver: gameOver,
      canUndo: canUndo,
      prevGrid: prevGrid,
      prevScore: prevScore,
      prevGameOver: prevGameOver,
    };
    try {
      localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_STATE_KEY);
      if (!raw) return false;
      const state = JSON.parse(raw);
      if (!state || !Array.isArray(state.grid)) return false;

      grid = state.grid.map(function (row) {
        return row.length === SIZE ? row.slice() : new Array(SIZE).fill(0);
      });
      score = Number(state.score) || 0;
      best = Number(state.best) || 0;
      gameOver = !!state.gameOver;
      canUndo = !!state.canUndo;
      prevGrid = state.prevGrid
        ? state.prevGrid.map(function (row) {
            return row.slice();
          })
        : null;
      prevScore = Number(state.prevScore) || 0;
      prevGameOver = !!state.prevGameOver;
      return true;
    } catch (e) {
      return false;
    }
  }

  function saveLeaders() {
    try {
      localStorage.setItem(STORAGE_LEADERS_KEY, JSON.stringify(leaders));
    } catch (e) {}
  }

  function loadLeaders() {
    try {
      const raw = localStorage.getItem(STORAGE_LEADERS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) leaders = parsed;
    } catch (e) {
      leaders = [];
    }
  }

  function addLeaderRecord(name, scoreValue) {
    const trimmed = name.trim() || "Без имени";
    leaders.push({
      name: trimmed,
      score: scoreValue,
      date: new Date().toISOString(),
    });
    leaders.sort(function (a, b) {
      return b.score - a.score;
    });
    if (leaders.length > 10) leaders.length = 10;
    saveLeaders();
  }

  function renderLeadersTable() {
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

    if (!leaders.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.textContent = "Пока нет сохранённых результатов.";
      row.append(cell);
      tbody.append(row);
      return;
    }

    leaders.forEach(function (rec, index) {
      const tr = document.createElement("tr");

      const tdPlace = document.createElement("td");
      tdPlace.textContent = String(index + 1);

      const tdName = document.createElement("td");
      tdName.textContent = rec.name;

      const tdScore = document.createElement("td");
      tdScore.textContent = String(rec.score);

      const tdDate = document.createElement("td");
      tdDate.textContent = formatDate(rec.date);

      tr.append(tdPlace, tdName, tdScore, tdDate);
      tbody.append(tr);
    });
  }

  function startNewGame() {
    grid = createMatrix(SIZE, 0);
    score = 0;
    gameOver = false;
    canUndo = false;
    prevGrid = null;
    prevScore = 0;
    prevGameOver = false;

    const initialCount = 1 + Math.floor(Math.random() * 3);
    let spawned = [];
    for (let i = 0; i < initialCount; i++) {
      spawned = spawned.concat(spawnRandomTiles(1, 1));
    }

    renderGrid(null, spawned);
    updateScoreUI();
    updateUndoUI();
    setView("game");
    saveState();

    nameInput.value = "";
    gameOverMessage.textContent =
      "Нет возможных ходов. Вы можете сохранить свой результат.";
    nameInput.hidden = false;
    nameLabel.hidden = false;
    saveResultBtn.hidden = false;
  }

  function handleUndo() {
    if (!canUndo || gameOver || view !== "game") return;
    if (!prevGrid) return;

    grid = cloneMatrix(prevGrid);
    score = prevScore;
    gameOver = prevGameOver;
    canUndo = false;
    prevGrid = null;

    renderGrid();
    updateScoreUI();
    updateUndoUI();
    saveState();
  }

  function handleKeyDown(e) {
    if (view !== "game") return;
    if (e.key === "ArrowUp") {
      move("up");
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      move("down");
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      move("left");
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      move("right");
      e.preventDefault();
    }
  }

  function attachEvents() {
    newGameBtn.addEventListener("click", startNewGame);
    undoBtn.addEventListener("click", handleUndo);

    leadersBtn.addEventListener("click", function () {
      renderLeadersTable();
      setView("leaderboard");
    });

    closeLeadersBtn.addEventListener("click", function () {
      setView("game");
    });

    restartFromOverlayBtn.addEventListener("click", startNewGame);

    saveResultBtn.addEventListener("click", function () {
      if (gameOverMessage.textContent === "Ваш рекорд сохранён.") return;
      addLeaderRecord(nameInput.value, score);
      renderLeadersTable();
      gameOverMessage.textContent = "Ваш рекорд сохранён.";
      nameInput.hidden = true;
      nameLabel.hidden = true;
      saveResultBtn.hidden = true;
    });

    upBtn.addEventListener("click", function () {
      move("up");
    });
    downBtn.addEventListener("click", function () {
      move("down");
    });
    leftBtn.addEventListener("click", function () {
      move("left");
    });
    rightBtn.addEventListener("click", function () {
      move("right");
    });

    document.addEventListener("keydown", handleKeyDown);

    if (!isTouchDevice()) {
      touchControls.hidden = true;
    }
  }

  function init() {
    loadLeaders();

    const loaded = loadState();
    if (!loaded) {
      startNewGame();
    } else {
      renderGrid();
      updateScoreUI();
      updateUndoUI();
      if (gameOver || !canMove()) {
        gameOver = true;
        setView("over");
      } else {
        setView("game");
      }
    }

    attachEvents();
  }

  init();
})();
