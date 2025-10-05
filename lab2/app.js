const h1 = document.createElement("h1");
h1.textContent = "Just do it.";
document.body.append(h1);

const input = document.createElement("input");
input.type = "text";
input.placeholder = "Новая задача...";

const dueInput = document.createElement("input");
dueInput.type = "date";

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

const list = document.createElement("ul");

function formatDate(iso) {
  if (!iso) return "Без даты";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

let currentSort = "none";

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

function addItem(text, due) {
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
      meta.textContent = newDue ? `Дата: ${formatDate(newDue)}` : "Без даты";
      li.dataset.due = newDue;
      body.replaceChildren(title, meta);
      if (currentSort !== "none") applySort();
    });

    cancelBtn.addEventListener("click", () => {
      body.replaceChildren(title, meta);
    });

    body.replaceChildren(tIn, dIn, saveBtn, cancelBtn);
    tIn.focus();
  });

  delBtn.addEventListener("click", () => {
    li.remove();
  });

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(editBtn, delBtn);

  li.append(check, body, actions);

  if (currentSort === "none") {
    list.prepend(li);
  } else {
    list.append(li);
    applySort();
  }
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
  dueInput.value = "";
  input.focus();
});

[input, dueInput].forEach((el) => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addBtn.click();
  });
});

sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value;
  if (currentSort === "none") return;
  applySort();
});

const controls = document.createElement("div");
controls.className = "controls";
controls.append(input, dueInput, addBtn, sortSelect);

document.body.append(controls, list);
