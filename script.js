const modal = document.getElementById("cartModal");
const openBtn = document.getElementById("openCart");
const closeBtn = document.getElementById("closeCart");

openBtn.onclick = () => {
  modal.style.display = "flex";
};

closeBtn.onclick = () => {
  modal.style.display = "none";
};

window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }
};
