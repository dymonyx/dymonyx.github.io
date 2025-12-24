(function () {
  const SIZE = 4;
  const STORAGE_STATE_KEY = "g2048-state";
  const STORAGE_LEADERS_KEY = "g2048-leaders";
  const ANIM_MS = 170;

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

  let tiles = [];
  let tileIdSeq = 1;

  let isAnimating = false;
  let canUndo = false;
  let prevState = null;

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
      board.append(cell);
      row.push(cell);
    }
    cells.push(row);
  }

  const tilesLayer = document.createElement("div");
  tilesLayer.className = "tiles-layer";
  board.append(tilesLayer);

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

  const tileEls = new Map();
  const tilesIndex = new Map();

  function renderBackgroundGrid() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        cells[r][c].textContent = "";
      }
    }
  }

  function updateTileElement(el, t) {
    el.dataset.value = String(t.value);
    let inner = el.firstElementChild;
    if (!inner || !inner.classList.contains("tile-inner")) {
      el.textContent = "";
      inner = document.createElement("div");
      inner.className = "tile-inner";
      el.append(inner);
    }
    inner.textContent = String(t.value);
  }

  function renderTiles(animate) {
    const ids = new Set(tiles.map((t) => t.id));
    for (const [id, el] of tileEls) {
      if (!ids.has(id)) {
        el.remove();
        tileEls.delete(id);
      }
    }

    const lr = tilesLayer.getBoundingClientRect();

    for (const t of tiles) {
      let el = tileEls.get(t.id);
      const isNew = !el;

      const cell = cells[t.r][t.c];
      const cr = cell.getBoundingClientRect();
      const x = cr.left - lr.left;
      const y = cr.top - lr.top;
      const w = cr.width;
      const h = cr.height;

      if (!el) {
        el = document.createElement("div");
        el.className = "tile";
        const inner = document.createElement("div");
        inner.className = "tile-inner";
        el.append(inner);
        el.style.width = w + "px";
        el.style.height = h + "px";
        el.style.transition = "none";
        el.style.transform = `translate(${x}px, ${y}px)`;
        tileEls.set(t.id, el);
        tilesLayer.append(el);
        requestAnimationFrame(() => {
          if (tileEls.get(t.id) === el) el.style.transition = "";
        });
      }

      el.classList.toggle("new", !!t.isNew);
      el.classList.toggle("merged", !!t.isMerged);
      el.classList.toggle("removing", !!t.isRemoving);

      el.style.width = w + "px";
      el.style.height = h + "px";

      const inner = el.firstElementChild;
      if (inner) inner.style.fontSize = Math.max(18, w * 0.42) + "px";

      updateTileElement(el, t);

      if (!animate && isNew) {
        el.style.transition = "none";
        el.style.transform = `translate(${x}px, ${y}px)`;
        requestAnimationFrame(() => (el.style.transition = ""));
      } else {
        el.style.transform = `translate(${x}px, ${y}px)`;
      }
    }

    for (const t of tiles) {
      t.isNew = false;
      t.isMerged = false;
    }
  }

  function rebuildGridFromTiles() {
    const m = createMatrix(SIZE, 0);
    for (const t of tiles) {
      if (t.isRemoving) continue;
      m[t.r][t.c] = t.value;
    }
    grid = m;
  }

  function getEmptyCells() {
    const occ = createMatrix(SIZE, false);
    for (const t of tiles) {
      if (t.isRemoving) continue;
      occ[t.r][t.c] = true;
    }
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!occ[r][c]) empty.push({ r, c });
      }
    }
    return empty;
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

  function findTileAt(r, c) {
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      if (t.isRemoving) continue;
      if (t.r === r && t.c === c) return t;
    }
    return null;
  }

  function spawnTileAt(r, c, value) {
    tiles.push({
      id: tileIdSeq++,
      value,
      r,
      c,
      isNew: true,
      isMerged: false,
      isRemoving: false,
    });
  }

  function spawnRandomTiles(min, max) {
    const empty = getEmptyCells();
    if (empty.length === 0) return;

    const count =
      empty.length === 1
        ? 1
        : Math.min(max, min + Math.floor(Math.random() * (max - min + 1)));

    for (let i = 0; i < count && empty.length > 0; i++) {
      const index = Math.floor(Math.random() * empty.length);
      const cell = empty.splice(index, 1)[0];
      const value = Math.random() < 0.9 ? 2 : 4;
      spawnTileAt(cell.r, cell.c, value);
    }
  }

  function updateScoreUI() {
    scoreValue.textContent = String(score);
    bestValue.textContent = String(best);
  }

  function updateUndoUI() {
    undoBtn.disabled = !canUndo || gameOver || view !== "game" || isAnimating;
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
    const safeTiles = tiles
      .filter((t) => !t.isRemoving)
      .map((t) => ({ id: t.id, value: t.value, r: t.r, c: t.c }));

    const state = {
      score,
      best,
      gameOver,
      canUndo,
      prevState,
      tiles: safeTiles,
      tileIdSeq,
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
      if (!state) return false;

      score = Number(state.score) || 0;
      best = Number(state.best) || 0;
      gameOver = !!state.gameOver;
      canUndo = !!state.canUndo;
      prevState = state.prevState || null;

      tiles = Array.isArray(state.tiles) ? state.tiles : [];
      tileIdSeq = Number(state.tileIdSeq) || 1;

      tiles = tiles.map((t) => ({
        id: t.id,
        value: t.value,
        r: t.r,
        c: t.c,
        isNew: false,
        isMerged: false,
        isRemoving: false,
      }));

      rebuildGridFromTiles();
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

  function addLeaderRecord(name, scoreValue2) {
    const trimmed = name.trim() || "Без имени";
    leaders.push({
      name: trimmed,
      score: scoreValue2,
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

  function rebuildTilesIndex() {
    tilesIndex.clear();
    for (const t of tiles) tilesIndex.set(t.id, t);
  }

  function tilesById(id) {
    return tilesIndex.get(id);
  }

  function slideTilesLine(lineTiles) {
    const existing = [];
    for (let i = 0; i < lineTiles.length; i++) {
      const id = lineTiles[i];
      if (id != null) {
        const t = tilesById(id);
        if (t && !t.isRemoving) existing.push({ id, value: t.value });
      }
    }

    const moves = [];
    const merges = [];
    let gained = 0;

    let write = 0;
    for (let i = 0; i < existing.length; i++) {
      const cur = existing[i];
      const next = existing[i + 1];

      if (next && next.value === cur.value) {
        const keepId = cur.id;
        const removeId = next.id;
        const newValue = cur.value * 2;

        moves.push({ id: keepId, to: write });
        moves.push({ id: removeId, to: write });

        merges.push({ keepId, removeId, newValue });
        gained += newValue;

        write++;
        i++;
      } else {
        moves.push({ id: cur.id, to: write });
        write++;
      }
    }

    return { moves, merges, gained, moved: true };
  }

  function move(direction) {
    if (isAnimating) return;
    if (gameOver || view !== "game") return;

    const snapshot = {
      grid: cloneMatrix(grid),
      tiles: tiles
        .filter((t) => !t.isRemoving)
        .map((t) => ({ id: t.id, value: t.value, r: t.r, c: t.c })),
      score,
      best,
      gameOver,
      tileIdSeq,
    };

    rebuildTilesIndex();

    let totalGained = 0;
    let anyMoved = false;
    const removeIds = new Set();

    function setTilePosByLineIndex(tileId, fixed, idx, axis) {
      const t = tilesById(tileId);
      if (!t) return;
      if (axis === "row") {
        if (t.r === fixed && t.c === idx) return;
        t.r = fixed;
        t.c = idx;
      } else {
        if (t.r === idx && t.c === fixed) return;
        t.r = idx;
        t.c = fixed;
      }
      anyMoved = true;
    }

    if (direction === "left" || direction === "right") {
      for (let r = 0; r < SIZE; r++) {
        const line = new Array(SIZE).fill(null);
        for (let c = 0; c < SIZE; c++) {
          const t = findTileAt(r, c);
          line[c] = t ? t.id : null;
        }

        const working = direction === "left" ? line : line.slice().reverse();
        const res = slideTilesLine(working);

        totalGained += res.gained;

        for (const mv of res.moves) {
          const idx = direction === "left" ? mv.to : SIZE - 1 - mv.to;
          setTilePosByLineIndex(mv.id, r, idx, "row");
        }

        for (const m of res.merges) {
          const keep = tilesById(m.keepId);
          if (keep) {
            keep.value = m.newValue;
            keep.isMerged = true;
          }
          const rem = tilesById(m.removeId);
          if (rem && keep) {
            rem.isRemoving = true;
            rem.r = keep.r;
            rem.c = keep.c;
          }
          removeIds.add(m.removeId);
        }
      }
    } else {
      for (let c = 0; c < SIZE; c++) {
        const line = new Array(SIZE).fill(null);
        for (let r = 0; r < SIZE; r++) {
          const t = findTileAt(r, c);
          line[r] = t ? t.id : null;
        }

        const working = direction === "up" ? line : line.slice().reverse();
        const res = slideTilesLine(working);

        totalGained += res.gained;

        for (const mv of res.moves) {
          const idx = direction === "up" ? mv.to : SIZE - 1 - mv.to;
          setTilePosByLineIndex(mv.id, c, idx, "col");
        }

        for (const m of res.merges) {
          const keep = tilesById(m.keepId);
          if (keep) {
            keep.value = m.newValue;
            keep.isMerged = true;
          }
          const rem = tilesById(m.removeId);
          if (rem && keep) {
            rem.isRemoving = true;
            rem.r = keep.r;
            rem.c = keep.c;
          }
          removeIds.add(m.removeId);
        }
      }
    }

    if (!anyMoved) return;

    rebuildGridFromTiles();
    score += totalGained;
    if (score > best) best = score;

    prevState = snapshot;
    canUndo = true;

    spawnRandomTiles(1, 2);
    rebuildGridFromTiles();

    renderBackgroundGrid();
    renderTiles(true);
    updateScoreUI();
    saveState();

    isAnimating = true;
    updateUndoUI();

    setTimeout(function () {
      if (removeIds.size) {
        tiles = tiles.filter((t) => !removeIds.has(t.id));
      }
      rebuildGridFromTiles();
      saveState();

      isAnimating = false;
      updateUndoUI();

      if (!canMove()) {
        gameOver = true;
        setView("over");
        saveState();
      }
    }, ANIM_MS);
  }

  function handleUndo() {
    if (!canUndo || gameOver || view !== "game") return;
    if (!prevState) return;
    if (isAnimating) return;

    grid = cloneMatrix(prevState.grid);
    tiles = (prevState.tiles || []).map((t) => ({
      id: t.id,
      value: t.value,
      r: t.r,
      c: t.c,
      isNew: false,
      isMerged: false,
      isRemoving: false,
    }));
    score = prevState.score;
    best = prevState.best;
    gameOver = prevState.gameOver;
    tileIdSeq = prevState.tileIdSeq;

    prevState = null;
    canUndo = false;

    rebuildGridFromTiles();
    renderBackgroundGrid();
    renderTiles(false);
    updateScoreUI();
    updateUndoUI();
    saveState();
  }

  function startNewGame() {
    grid = createMatrix(SIZE, 0);
    tiles = [];
    tileIdSeq = 1;

    score = 0;
    gameOver = false;

    isAnimating = false;
    canUndo = false;
    prevState = null;

    const initialCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < initialCount; i++) spawnRandomTiles(1, 1);

    rebuildGridFromTiles();
    renderBackgroundGrid();
    renderTiles(false);
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

  function handleKeyDown(e) {
    if (view !== "game") return;
    if (isAnimating) return;

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

    if (!isTouchDevice()) touchControls.hidden = true;

    window.addEventListener("resize", function () {
      if (view === "game") renderTiles(false);
    });
  }

  function init() {
    loadLeaders();

    const loaded = loadState();
    if (!loaded) {
      startNewGame();
    } else {
      rebuildGridFromTiles();
      renderBackgroundGrid();
      renderTiles(false);
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
