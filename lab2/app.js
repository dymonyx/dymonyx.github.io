const h1 = document.createElement("h1");
h1.textContent = "Just do it.";
document.body.append(h1);

const input = document.createElement("input");
input.type = "text";
input.placeholder = "Новая задача...";

const addBtn = document.createElement("button");
addBtn.textContent = "Добавить";
const list = document.createElement("ul");

addBtn.addEventListener("click", () => {
  const text = input.value.trim();
  if (text === "") {
    input.focus();
    return;
  }

  const li = document.createElement("li");
  li.textContent = text;
  list.append(li);

  input.value = "";
  input.focus();
});

document.body.append(input, addBtn, list);
