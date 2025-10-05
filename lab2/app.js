const h1 = document.createElement("h1");
h1.textContent = "Just do it.";
document.body.append(h1);

const input = document.createElement("input");
input.type = "text";
input.placeholder = "Новая задача...";

const addBtn = document.createElement("button");
addBtn.textContent = "Добавить";
const list = document.createElement("ul");

function addItem(text) {
  const li = document.createElement("li");
  const title = document.createElement("span");
  title.textContent = text;

  const delBtn = document.createElement("button");
  delBtn.textContent = "Удалить";
  delBtn.addEventListener("click", () => {
    li.remove();
  });

  const actions = document.createElement("div");
  actions.append(delBtn);

  li.append(title, actions);
  list.append(li);
}

addBtn.addEventListener("click", () => {
  const text = input.value.trim();
  if (text === "") {
    input.focus();
    return;
  }
  addItem(text);
  input.value = "";
  input.focus();
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addBtn.click();
});

const controls = document.createElement("div");
controls.append(input, addBtn);

document.body.append(controls, list);
