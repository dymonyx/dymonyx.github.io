const h1 = document.createElement("h1");
h1.textContent = "Just do it.";
document.body.append(h1);

const input = document.createElement("input");
input.type = "text";
input.placeholder = "Новая задача...";

const todayISO = () => new Date().toISOString().split("T")[0];
const dueInput = document.createElement("input");
dueInput.type = "date";
dueInput.value = todayISO();

const addBtn = document.createElement("button");
addBtn.textContent = "Добавить";
const sortSelect = document.createElement("select");
const optNone = document.createElement("option");
optNone.value = "none";
optNone.textContent = "Без сортировки";
const optAsc = document.createElement("option");
optAsc.value = "date_asc";
optAsc.textContent = "Дата ↑";
const optDesc = document.createElement("option");
optDesc.value = "date_desc";
optDesc.textContent = "Дата ↓";
sortSelect.append(optNone, optAsc, optDesc);

const filterSelect = document.createElement("select");
const fAll = document.createElement("option");
fAll.value = "all";
fAll.textContent = "Все";
const fActive = document.createElement("option");
fActive.value = "to-do";
fActive.textContent = "To do";
const fDone = document.createElement("option");
fDone.value = "done";
fDone.textContent = "Завершённые";
filterSelect.append(fAll, fActive, fDone);
const searchInput = document.createElement("input");
searchInput.type = "text";
searchInput.placeholder = "Поиск по названию...";

const list = document.createElement("ul");

function formatDate(iso) {
  if (!iso) return "Без даты";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

let currentSort = "none";
let currentFilter = "all";
let currentQuery = "";

function applySort() {
  if (currentSort === "none") return;
  const asc = currentSort === "date_asc";
  [...list.children]
    .sort((a, b) => {
      const ad = a.dataset.due || (asc ? "9999-12-31" : "0000-01-01");
      const bd = b.dataset.due || (asc ? "9999-12-31" : "0000-01-01");
      return asc ? ad.localeCompare(bd) : bd.localeCompare(ad);
    })
    .forEach((li) => list.append(li));
}

function applyFilter() {
  const q = currentQuery.trim().toLowerCase();
  [...list.children].forEach((li) => {
    const done = li.classList.contains("done");
    const titleEl = li.querySelector(".title");
    const matches = !q || titleEl.textContent.toLowerCase().includes(q);
    let visible = true;
    if (currentFilter === "to-do") visible = !done;
    else if (currentFilter === "done") visible = done;
    li.hidden = !(visible && matches);
  });
}

function saveState() {
  const items = [...list.children].map((li) => ({
    title: li.querySelector(".title").textContent,
    due: li.dataset.due || "",
    done: li.classList.contains("done"),
  }));
  localStorage.setItem("to-do-app", JSON.stringify(items));
}

let dragging = null;

function makeDraggable(li) {
  li.draggable = currentSort === "none";
  li.addEventListener("dragstart", (e) => {
    if (currentSort !== "none") return;
    dragging = li;
    e.dataTransfer.effectAllowed = "move";
    li.classList.add("dragging");
  });
  li.addEventListener("dragover", (e) => {
    if (currentSort !== "none") return;
    if (!dragging || dragging === li) return;
    e.preventDefault();
    const position = li.getBoundingClientRect();
    const after = e.clientY > position.top + position.height / 2;
    if (after) li.after(dragging);
    else li.before(dragging);
  });
  li.addEventListener("drop", (e) => {
    if (currentSort !== "none") return;
    e.preventDefault();
    saveState();
  });
  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    dragging = null;
    saveState();
  });
}

function updateDraggableState() {
  [...list.children].forEach((li) => {
    li.draggable = currentSort === "none";
  });
}

function createItem(text, due, done = false) {
  const li = document.createElement("li");
  li.dataset.due = due || "";

  const check = document.createElement("button");
  check.type = "button";
  check.className = "check";

  const title = document.createElement("span");
  title.className = "title";
  title.textContent = text;

  const meta = document.createElement("small");
  meta.className = "meta";
  meta.textContent = due ? `Дата: ${formatDate(due)}` : "Без даты";

  const body = document.createElement("div");
  body.className = "body";
  body.append(title, meta);

  const editBtn = document.createElement("button");
  editBtn.textContent = "Изменить";

  const delBtn = document.createElement("button");
  delBtn.textContent = "Удалить";

  check.addEventListener("click", () => {
    li.classList.toggle("done");
    applyFilter();
    saveState();
  });

  editBtn.addEventListener("click", () => {
    if (body.querySelector("input")) return;

    const tIn = document.createElement("input");
    tIn.type = "text";
    tIn.value = title.textContent;

    const dIn = document.createElement("input");
    dIn.type = "date";
    dIn.value = li.dataset.due || "";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Сохранить";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Отмена";

    const onKey = (e) => {
      if (e.key === "Enter") saveBtn.click();
    };
    tIn.addEventListener("keydown", onKey);
    dIn.addEventListener("keydown", onKey);

    saveBtn.addEventListener("click", () => {
      const newTitle = tIn.value.trim();
      const newDue = dIn.value || "";
      if (!newTitle) return;
      title.textContent = newTitle;
      li.dataset.due = newDue;
      meta.textContent = newDue ? `Дата: ${formatDate(newDue)}` : "Без даты";
      body.replaceChildren(title, meta);
      if (currentSort !== "none") applySort();
      applyFilter();
      saveState();
    });

    cancelBtn.addEventListener("click", () => {
      body.replaceChildren(title, meta);
    });

    body.replaceChildren(tIn, dIn, saveBtn, cancelBtn);
    tIn.focus();
  });

  delBtn.addEventListener("click", () => {
    li.remove();
    saveState();
  });

  const actions = document.createElement("nav");
  actions.className = "actions";
  actions.append(editBtn, delBtn);

  if (done) li.classList.add("done");

  li.append(check, body, actions);
  makeDraggable(li);
  return li;
}

function addItem(text, due) {
  const li = createItem(text, due, false);
  if (currentSort === "none") {
    list.prepend(li);
  } else {
    list.append(li);
    applySort();
  }
  applyFilter();
  saveState();
}

function loadState() {
  const raw = localStorage.getItem("to-do-app");
  if (!raw) return;
  try {
    const items = JSON.parse(raw);
    items.forEach(({ title, due, done }) => {
      const li = createItem(title, due, done);
      list.append(li);
    });
    applySort();
    applyFilter();
  } catch {}
}

addBtn.addEventListener("click", () => {
  const text = input.value.trim();
  const due = dueInput.value || "";
  if (text === "") {
    input.focus();
    return;
  }
  addItem(text, due);
  input.value = "";
  dueInput.value = todayISO();
  input.focus();
});

[input, dueInput].forEach((el) => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addBtn.click();
  });
});

sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value;
  if (currentSort !== "none") applySort();
  applyFilter();
  updateDraggableState();
  saveState();
});

filterSelect.addEventListener("change", () => {
  currentFilter = filterSelect.value;
  applyFilter();
});

searchInput.addEventListener("input", () => {
  currentQuery = searchInput.value;
  applyFilter();
});

const controls = document.createElement("nav");
controls.className = "controls";
controls.append(input, dueInput, addBtn, sortSelect, filterSelect, searchInput);

document.body.append(controls, list);

loadState();
updateDraggableState();
