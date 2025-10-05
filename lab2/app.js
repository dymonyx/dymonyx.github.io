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
const list = document.createElement("ul");

function formatDate(iso) {
  if (!iso) return "Без даты";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function addItem(text, due) {
  const li = document.createElement("li");

  const check = document.createElement("button");
  check.type = "button";
  check.className = "check";

  const title = document.createElement("span");
  title.className = "title";
  title.textContent = text;

  const meta = document.createElement("small");
  meta.textContent = due ? `Дата: ${formatDate(due)}` : "Без даты";

  const body = document.createElement("div");
  body.className = "body";
  body.append(title, document.createTextNode(" "), meta);

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
    dIn.value = due || "";

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
      const newDue = dIn.value || null;
      if (!newTitle) return;
      title.textContent = newTitle;
      meta.textContent = newDue ? `Дата: ${formatDate(newDue)}` : "Без даты";
      due = newDue;
      body.replaceChildren(title, document.createTextNode(" "), meta);
    });

    cancelBtn.addEventListener("click", () => {
      body.replaceChildren(title, document.createTextNode(" "), meta);
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
  list.prepend(li);
}

addBtn.addEventListener("click", () => {
  const text = input.value.trim();
  const due = dueInput.value || null;
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

const controls = document.createElement("div");
controls.className = "controls";
controls.append(input, dueInput, addBtn);

document.body.append(controls, list);
