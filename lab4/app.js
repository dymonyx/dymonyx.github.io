(function () {
  const STORAGE_KEY = "weather-app";
  const REQUEST_TIMEOUT_MS = 5000;

  function safeJsonParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function formatShortDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso || "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return dd + "." + mm;
  }

  function weekdayRu(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    return days[d.getDay()];
  }

  function weatherCodeToText(code) {
    const c = Number(code);
    if (!Number.isFinite(c)) return "—";
    // Open-Meteo interpretation codes
    if (c === 0) return "Ясно";
    if (c === 1) return "Преимущественно ясно";
    if (c === 2) return "Переменная облачность";
    if (c === 3) return "Пасмурно";
    if (c === 45) return "Туман";
    if (c === 48) return "Изморозь";
    if (c === 51) return "Слабая морось";
    if (c === 53) return "Умеренная морось";
    if (c === 55) return "Сильная морось";
    if (c === 56) return "Слабая ледяная морось";
    if (c === 57) return "Сильная ледяная морось";
    if (c === 61) return "Слабый дождь";
    if (c === 63) return "Умеренный дождь";
    if (c === 65) return "Сильный дождь";
    if (c === 66) return "Слабый ледяной дождь";
    if (c === 67) return "Сильный ледяной дождь";
    if (c === 71) return "Слабый снег";
    if (c === 73) return "Умеренный снег";
    if (c === 75) return "Сильный снег";
    if (c === 77) return "Град";
    if (c === 80) return "Слабый ливень";
    if (c === 81) return "Умеренный ливень";
    if (c === 82) return "Сильный ливень";
    if (c === 85) return "Слабый снегопад";
    if (c === 86) return "Сильный снегопад";
    if (c === 95) return "Гроза";
    if (c === 96) return "Слабая гроза с градом";
    if (c === 99) return "Сильная гроза с градом";
    return "Код " + c;
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function debounce(fn, ms) {
    let t = null;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(null, args);
      }, ms);
    };
  }

  function uid() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  async function fetchWithTimeout(url, opts, timeoutMs) {
    const ms = Math.max(1, Number(timeoutMs) || REQUEST_TIMEOUT_MS);
    const controller = new AbortController();

    if (opts && opts.signal) {
      opts.signal.addEventListener("abort", function () {
        controller.abort();
      });
    }

    const t = setTimeout(function () {
      controller.abort();
    }, ms);

    try {
      const res = await fetch(
        url,
        Object.assign({}, opts || {}, { signal: controller.signal })
      );
      return res;
    } finally {
      clearTimeout(t);
    }
  }

  function normalizeFetchError(err) {
    if (err && err.name === "AbortError") {
      return { type: "abort", message: "Запрос отменён." };
    }

    const msg = err && err.message ? String(err.message) : "";

    if (msg.toLowerCase().includes("failed to fetch")) {
      const offline =
        typeof navigator !== "undefined" && navigator.onLine === false;
      return {
        type: "network",
        message: offline
          ? "Нет подключения к интернету. Проверьте сеть и попробуйте ещё раз."
          : "Не удалось получить данные. Проверьте интернет и попробуйте ещё раз.",
      };
    }

    if (msg.includes("HTTP")) {
      const m = msg.match(/HTTP\s+(\d+)/);
      const code = m ? Number(m[1]) : null;

      if (code === 429) {
        return {
          type: "rate",
          message:
            "Слишком много запросов. Подождите немного и нажмите «Обновить».",
        };
      }
      if (code >= 500) {
        return {
          type: "server",
          message:
            "Сервис погоды временно недоступен (ошибка сервера). Попробуйте позже.",
        };
      }
      if (code === 400 || code === 404) {
        return {
          type: "bad",
          message:
            "Не удалось получить прогноз по выбранной локации. Попробуйте другой город.",
        };
      }
      if (code) {
        return {
          type: "http",
          message: "Ошибка запроса (HTTP " + code + "). Попробуйте ещё раз.",
        };
      }
    }

    if (msg.toLowerCase().includes("timeout")) {
      return {
        type: "timeout",
        message:
          "Превышено время ожидания ответа. Проверьте интернет и нажмите «Обновить».",
      };
    }

    return {
      type: "unknown",
      message: "Произошла ошибка при загрузке. Нажмите «Обновить».",
    };
  }

  let state = {
    base: null,
    extras: [],
    activeId: "base",
  };

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== "object") return false;

    const next = {
      base: parsed.base && typeof parsed.base === "object" ? parsed.base : null,
      extras: Array.isArray(parsed.extras) ? parsed.extras : [],
      activeId: typeof parsed.activeId === "string" ? parsed.activeId : "base",
    };

    next.extras = next.extras
      .filter(function (x) {
        return x && typeof x === "object";
      })
      .map(function (x) {
        return {
          id: String(x.id || uid()),
          label: String(x.label || "Город"),
          lat: Number(x.lat),
          lon: Number(x.lon),
        };
      })
      .filter(function (x) {
        return Number.isFinite(x.lat) && Number.isFinite(x.lon);
      })
      .slice(0, 20);

    if (next.activeId !== "base") {
      const ok = next.extras.some(function (c) {
        return c.id === next.activeId;
      });
      if (!ok) next.activeId = "base";
    }

    state = next;
    return true;
  }

  async function geocodeCity(name, signal) {
    const q = encodeURIComponent(name);
    const url =
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      q +
      "&count=8&language=ru&format=json";

    const res = await fetchWithTimeout(
      url,
      { signal: signal },
      REQUEST_TIMEOUT_MS
    );
    if (!res.ok) throw new Error("Geocoding error: HTTP " + res.status);

    const json = await res.json();
    const results = Array.isArray(json.results) ? json.results : [];
    return results.map(function (r) {
      const labelParts = [];
      if (r.name) labelParts.push(r.name);
      if (r.admin1) labelParts.push(r.admin1);
      if (r.country) labelParts.push(r.country);
      return {
        label: labelParts.join(", "),
        lat: Number(r.latitude),
        lon: Number(r.longitude),
      };
    });
  }

  async function fetchForecast(lat, lon, signal) {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" +
      encodeURIComponent(lat) +
      "&longitude=" +
      encodeURIComponent(lon) +
      "&current=temperature_2m,weather_code,wind_speed_10m" +
      "&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max" +
      "&forecast_days=3" +
      "&timezone=auto";

    const res = await fetchWithTimeout(
      url,
      { signal: signal },
      REQUEST_TIMEOUT_MS
    );
    if (!res.ok) throw new Error("Forecast error: HTTP " + res.status);

    const json = await res.json();

    const daily = json.daily || {};
    const times = Array.isArray(daily.time) ? daily.time : [];
    const tMax = Array.isArray(daily.temperature_2m_max)
      ? daily.temperature_2m_max
      : [];
    const tMin = Array.isArray(daily.temperature_2m_min)
      ? daily.temperature_2m_min
      : [];
    const wCode = Array.isArray(daily.weather_code) ? daily.weather_code : [];
    const pop = Array.isArray(daily.precipitation_probability_max)
      ? daily.precipitation_probability_max
      : [];

    const days = [];
    for (let i = 0; i < Math.min(3, times.length); i++) {
      days.push({
        date: times[i],
        tMax: tMax[i],
        tMin: tMin[i],
        code: wCode[i],
        pop: pop[i],
      });
    }

    const current = json.current || {};
    return {
      current: {
        temp: current.temperature_2m,
        code: current.weather_code,
        wind: current.wind_speed_10m,
      },
      days: days,
    };
  }

  const app = createEl("div", "app");
  const appInner = createEl("div", "app-inner");
  app.append(appInner);

  const header = createEl("div", "header");
  const headerTop = createEl("div", "header-top");
  const title = createEl("div", "title", "Прогноз погоды");

  const meta = createEl("div", "meta");
  const metaBox = createEl("div", "meta-box");
  const metaLabel = createEl("div", "meta-box-label", "Городов");
  const metaValue = createEl("div", "meta-box-value", "0");
  metaBox.append(metaLabel, metaValue);
  meta.append(metaBox);

  headerTop.append(title, meta);

  const headerControls = createEl("div", "header-controls");
  const refreshBtn = createEl("button", "", "Обновить");
  refreshBtn.type = "button";

  const addCityBtn = createEl("button", "secondary", "Добавить город");
  addCityBtn.type = "button";

  const resetBtn = createEl("button", "return", "Сбросить выбор");
  resetBtn.type = "button";

  headerControls.append(refreshBtn, addCityBtn, resetBtn);
  header.append(headerTop, headerControls);

  const tabs = createEl("div", "tabs");
  const panel = createEl("div", "panel");

  appInner.append(header, tabs, panel);
  document.body.append(app);

  const overlay = createEl("div", "overlay");
  overlay.style.display = "none";
  const overlayInner = createEl("div", "overlay-inner");

  const overlayTitle = createEl("div", "overlay-title", "Добавить город");
  const overlayMsg = createEl(
    "div",
    "overlay-message",
    "Введите город и выберите из списка."
  );

  const row = createEl("div", "overlay-row");
  const label = createEl("label", "", "Город");
  const input = createEl("input", "");
  input.type = "text";
  input.placeholder = "Например: Москва";
  input.autocomplete = "off";

  const suggest = createEl("div", "suggest");
  suggest.style.display = "none";

  const hint = createEl("div", "hint", "");
  const fieldError = createEl("div", "field-error", "");

  row.append(label, input, suggest, hint, fieldError);

  const overlayActions = createEl("div", "overlay-actions");
  const saveBtn = createEl("button", "", "Сохранить");
  saveBtn.type = "button";
  const cancelBtn = createEl("button", "secondary", "Отмена");
  cancelBtn.type = "button";

  overlayActions.append(saveBtn, cancelBtn);

  overlayInner.append(overlayTitle, overlayMsg, row, overlayActions);
  overlay.append(overlayInner);
  document.body.append(overlay);

  let dataCache = {};

  function setCache(key, next) {
    dataCache[key] = Object.assign({}, dataCache[key] || {}, next);
  }

  function activePlace() {
    if (state.activeId === "base") return { id: "base", place: state.base };
    const c = state.extras.find(function (x) {
      return x.id === state.activeId;
    });
    return { id: c ? c.id : "base", place: c || state.base };
  }

  function updateMetaUI() {
    const count = (state.base ? 1 : 0) + state.extras.length;
    metaValue.textContent = String(count);
  }

  function renderTabs() {
    while (tabs.firstChild) tabs.removeChild(tabs.firstChild);

    if (state.base) {
      tabs.append(createTab("base", state.base.label, "Основной"));
    }

    state.extras.forEach(function (c, idx) {
      tabs.append(createTab(c.id, c.label, "Доп. #" + (idx + 1)));
    });

    if (!tabs.firstChild) {
      tabs.append(createEl("div", "state", "Пока нет выбранной локации."));
    }
  }

  function createTab(id, labelText, sub) {
    const btn = createEl("button", "tab");
    btn.type = "button";
    if (state.activeId === id) btn.classList.add("active");

    const main = createEl("div", "", labelText);
    const small = createEl("small", "", sub);
    btn.append(main, small);

    btn.addEventListener("click", function () {
      state.activeId = id;
      saveState();
      renderTabs();
      renderPanel();
    });

    return btn;
  }

  function renderForecastBlock(payload) {
    const wrap = document.createElement("div");

    const current = payload.current || {};
    const curText =
      "Сейчас: " +
      Math.round(Number(current.temp)) +
      "°C, " +
      weatherCodeToText(current.code) +
      ", ветер " +
      Math.round(Number(current.wind)) +
      " км/ч";

    wrap.append(createEl("div", "state", curText));

    const grid = createEl("div", "forecast");
    const days = Array.isArray(payload.days) ? payload.days : [];

    days.forEach(function (d, i) {
      const card = createEl("div", "day");
      const head = createEl(
        "div",
        "day-title",
        i === 0 ? "Сегодня" : weekdayRu(d.date)
      );
      const sub = createEl(
        "div",
        "day-sub",
        formatShortDate(d.date) + " • " + weatherCodeToText(d.code)
      );

      const kv = createEl("div", "kv");
      kv.append(
        createEl("div", "", "Макс"),
        createEl("div", "", Math.round(Number(d.tMax)) + "°C"),
        createEl("div", "", "Мин"),
        createEl("div", "", Math.round(Number(d.tMin)) + "°C"),
        createEl("div", "", "Осадки"),
        createEl(
          "div",
          "",
          Number.isFinite(Number(d.pop)) ? Math.round(Number(d.pop)) + "%" : "—"
        )
      );

      card.append(head, sub, kv);
      grid.append(card);
    });

    wrap.append(grid);
    return wrap;
  }

  function renderPanel() {
    while (panel.firstChild) panel.removeChild(panel.firstChild);

    const ap = activePlace();
    const place = ap.place;

    if (!place) {
      panel.append(
        createEl(
          "div",
          "state",
          "Нужно выбрать город или разрешить геолокацию."
        )
      );
      return;
    }

    const top = createEl("div", "panel-title");
    const h2 = createEl("h2", "", place.label || "Локация");
    const badge = createEl(
      "div",
      "badge",
      ap.id === "base" ? "Основной" : "Доп. город"
    );
    top.append(h2, badge);

    panel.append(top);

    const cache = dataCache[ap.id] || { status: "idle" };

    if (cache.status === "loading") {
      panel.append(createEl("div", "state", "Загрузка прогноза..."));
    } else if (cache.status === "error") {
      panel.append(
        createEl("div", "state error", cache.error || "Ошибка загрузки.")
      );
      panel.append(
        createEl("div", "hint", "Нажмите «Обновить», чтобы повторить.")
      );
    } else if (cache.status === "success") {
      panel.append(renderForecastBlock(cache.data));
    } else {
      panel.append(createEl("div", "state", "Нажмите «Обновить»."));
    }

    const actions = createEl("div", "actions-row");

    const removeBtn = createEl("button", "secondary", "Удалить");
    removeBtn.type = "button";
    removeBtn.disabled = ap.id === "base";

    removeBtn.addEventListener("click", function () {
      if (ap.id === "base") return;
      state.extras = state.extras.filter(function (c) {
        return c.id !== ap.id;
      });
      state.activeId = "base";
      saveState();
      updateMetaUI();
      renderTabs();
      renderPanel();
      refetchAll();
    });
  }

  let overlayMode = "add-extra";
  let selectedCity = null;
  let geoAbort = null;

  function openOverlay(mode) {
    overlayMode = mode;
    selectedCity = null;
    fieldError.textContent = "";
    input.value = "";
    suggest.style.display = "none";
    suggest.innerHTML = "";

    if (mode === "base-required") {
      overlayTitle.textContent = "Выберите город";
      overlayMsg.textContent =
        "Геолокация недоступна/отклонена. Введите город и выберите из списка.";
      cancelBtn.textContent = "Закрыть";
    } else {
      overlayTitle.textContent = "Добавить город";
      overlayMsg.textContent = "Введите город и выберите из списка.";
      cancelBtn.textContent = "Отмена";
    }

    overlay.style.display = "flex";
    input.focus();
  }

  function closeOverlay() {
    overlay.style.display = "none";
  }

  function renderSuggest(items) {
    suggest.innerHTML = "";
    if (!items.length) {
      suggest.style.display = "none";
      return;
    }
    items.forEach(function (it) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = it.label;
      b.addEventListener("click", function () {
        selectedCity = it;
        input.value = it.label;
        suggest.style.display = "none";
        fieldError.textContent = "";
      });
      suggest.append(b);
    });
    suggest.style.display = "block";
  }

  const doSuggest = debounce(async function (text) {
    const t = (text || "").trim();
    selectedCity = null;
    fieldError.textContent = "";

    if (geoAbort) geoAbort.abort();
    geoAbort = new AbortController();

    if (t.length < 2) {
      renderSuggest([]);
      return;
    }

    try {
      const res = await geocodeCity(t, geoAbort.signal);
      const filtered = res
        .filter(function (x) {
          return Number.isFinite(x.lat) && Number.isFinite(x.lon) && x.label;
        })
        .slice(0, 8);

      renderSuggest(filtered);
    } catch (e) {
      renderSuggest([]);
    }
  }, 250);

  input.addEventListener("input", function () {
    doSuggest(input.value);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveBtn.click();
    }
  });

  cancelBtn.addEventListener("click", function () {
    closeOverlay();
  });

  saveBtn.addEventListener("click", function () {
    fieldError.textContent = "";

    const val = (input.value || "").trim();
    if (!val) {
      fieldError.textContent = "Введите город.";
      return;
    }

    if (!selectedCity || selectedCity.label !== val) {
      fieldError.textContent = "Выберите город из выпадающего списка.";
      return;
    }

    if (
      !Number.isFinite(selectedCity.lat) ||
      !Number.isFinite(selectedCity.lon)
    ) {
      fieldError.textContent = "Некорректные координаты города.";
      return;
    }

    if (overlayMode === "base-required") {
      state.base = {
        mode: "city",
        label: selectedCity.label,
        lat: selectedCity.lat,
        lon: selectedCity.lon,
      };
      state.activeId = "base";
    } else {
      const exists =
        state.extras.some(function (c) {
          return (
            c.label.toLowerCase() === selectedCity.label.toLowerCase() ||
            (Math.abs(c.lat - selectedCity.lat) < 0.0001 &&
              Math.abs(c.lon - selectedCity.lon) < 0.0001)
          );
        }) ||
        (state.base &&
          Math.abs(state.base.lat - selectedCity.lat) < 0.0001 &&
          Math.abs(state.base.lon - selectedCity.lon) < 0.0001);

      if (exists) {
        fieldError.textContent = "Этот город уже добавлен.";
        return;
      }

      state.extras.push({
        id: uid(),
        label: selectedCity.label,
        lat: selectedCity.lat,
        lon: selectedCity.lon,
      });

      if (!state.base) {
        state.base = {
          mode: "city",
          label: selectedCity.label,
          lat: selectedCity.lat,
          lon: selectedCity.lon,
        };
        state.extras.pop();
        state.activeId = "base";
      }
    }

    saveState();
    updateMetaUI();
    renderTabs();
    renderPanel();
    closeOverlay();
    refetchAll();
  });

  async function tryInitGeolocationAsBase() {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) {
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          state.base = {
            mode: "geo",
            label: "Текущее местоположение",
            lat: lat,
            lon: lon,
          };
          state.activeId = "base";
          saveState();
          resolve(true);
        },
        function () {
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    });
  }

  let fetchAbort = null;

  async function refetchAll() {
    if (fetchAbort) fetchAbort.abort();
    fetchAbort = new AbortController();

    if (!state.base) return;

    setCache("base", { status: "loading", error: null, data: null });
    state.extras.forEach(function (c) {
      setCache(c.id, { status: "loading", error: null, data: null });
    });
    renderPanel();

    const tasks = [];

    tasks.push(
      (async function () {
        try {
          const data = await fetchForecast(
            state.base.lat,
            state.base.lon,
            fetchAbort.signal
          );
          setCache("base", { status: "success", data: data });
        } catch (e) {
          const norm = normalizeFetchError(e);
          if (norm.type === "abort") return;
          setCache("base", { status: "error", error: norm.message });
        }
      })()
    );

    state.extras.forEach(function (c) {
      tasks.push(
        (async function () {
          try {
            const data = await fetchForecast(c.lat, c.lon, fetchAbort.signal);
            setCache(c.id, { status: "success", data: data });
          } catch (e) {
            const norm = normalizeFetchError(e);
            if (norm.type === "abort") return;
            setCache(c.id, { status: "error", error: norm.message });
          }
        })()
      );
    });

    await Promise.all(tasks);
    renderPanel();
  }

  refreshBtn.addEventListener("click", function () {
    refetchAll();
  });

  addCityBtn.addEventListener("click", function () {
    openOverlay("add-extra");
  });

  resetBtn.addEventListener("click", function () {
    state = { base: null, extras: [], activeId: "base" };
    dataCache = {};
    saveState();
    updateMetaUI();
    renderTabs();
    renderPanel();
    bootstrap();
  });

  async function bootstrap() {
    updateMetaUI();
    renderTabs();
    renderPanel();

    if (state.base) {
      refetchAll();
      return;
    }

    const ok = await tryInitGeolocationAsBase();
    updateMetaUI();
    renderTabs();
    renderPanel();

    if (ok) {
      refetchAll();
    } else {
      openOverlay("base-required");
    }
  }

  function init() {
    loadState();
    updateMetaUI();
    renderTabs();
    renderPanel();
    bootstrap();
  }

  init();
})();
