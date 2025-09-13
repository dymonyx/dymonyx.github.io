const modal = document.getElementById("cartModal");
const openBtn = document.getElementById("openCart");
const closeBtn = document.getElementById("closeCart");
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const form = document.querySelector('#cartModal form');
const submitBtn = form.querySelector('button[type="submit"]');
const fName = form.querySelector('input[placeholder="Имя"]');
const fLast = form.querySelector('input[placeholder="Фамилия"]');
const fAddr = form.querySelector('input[placeholder="Адрес доставки"]');
const fPhone = form.querySelector('input[placeholder="Телефон"]');

let cart = JSON.parse(localStorage.getItem('cart')) || [];

function updateCart() {
  if (!cartItemsEl || !cartTotalEl) return;

  cartItemsEl.innerHTML = '';
  let total = 0;

  cart.forEach((item, index) => {
    const lineSum = item.price * item.qty;
    total += lineSum;

    cartItemsEl.innerHTML += `
      <div class="cart-row">
        <img src="${item.img}" alt="">
        <div class="name">${item.name}</div>
        <input type="number" value="${item.qty}" min="1" data-index="${index}">
        <div class="price">${lineSum} ₽</div>
        <button data-index="${index}" class="remove">Удалить</button>
      </div>
    `;
  });

  cartTotalEl.textContent = total + ' ₽';
  localStorage.setItem('cart', JSON.stringify(cart));
  setSubmitState();
}

function validateForm() {
  let ok = true;

  const req = (el, cond, msg) => {
    el.setCustomValidity(cond ? '' : msg);
    if (!cond) ok = false;
  };

  req(fName,  fName.value.trim().length >= 1, 'Введите имя');
  req(fLast,  fLast.value.trim().length >= 1, 'Введите фамилию');
  req(fAddr,  fAddr.value.trim().length >= 5, 'Введите адрес');
  req(fPhone, /^\+?[0-9()\-\s]{7,}$/.test(fPhone.value.trim()), 'Введите телефон');

  return ok;
}

function resetProductButtons() {
  document.querySelectorAll('.product button').forEach(button => {
    button.textContent = "Добавить в корзину";
    button.onclick = () => {
      const product = button.closest('.product');
      const name = product.querySelector('h3').textContent;
      const price = Number(product.dataset.price);
      const img = product.querySelector('img').src;

      let found = cart.find(item => item.name === name);

      if (!found) {
        cart.push({ name, price, qty: 1, img });
      } else {
        found.qty += 1;
      }
      updateCart();

      button.textContent = "Перейти в корзину";
      button.onclick = () => {
        modal.style.display = "flex";
        setSubmitState();
      };
    };
  });
}

function setSubmitState() {
  submitBtn.disabled = (cart.length === 0);
}

updateCart();

openBtn.onclick = () => {
  modal.style.display = "flex";
  setSubmitState();
};

closeBtn.onclick = () => {
  modal.style.display = "none";
  resetProductButtons();
};

window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
    resetProductButtons();
  }
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validateForm()) {
    form.reportValidity();
    return;
  }
  alert('Заказ создан!');
  cart = [];
  updateCart();
  form.reset();
  modal.style.display = 'none';
  resetProductButtons();
});


cartItemsEl.onclick = (event) => {
  if (event.target.classList.contains('remove')) {
    const index = Number(event.target.dataset.index);
    cart.splice(index, 1);
    updateCart();
  }
};

cartItemsEl.onchange = (event) => {
  if (event.target.type === 'number') {
    const index = Number(event.target.dataset.index);
    cart[index].qty = Math.max(1, Number(event.target.value) || 1);
    updateCart();
  }
};

[fName, fLast, fAddr, fPhone].forEach(el => {
  el.addEventListener('input', () => validateForm());
});