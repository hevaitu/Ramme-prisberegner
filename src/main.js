const defaults = {
  vatRate: 0.25,
  frames: [
    { id: "1425-102", name: "Rammeliste sort mat", unit: "kr./m", price: 33 },
    { id: "1515-220", name: "Rammeliste sølv", unit: "kr./m", price: 28 },
    { id: "1530-365", name: "Rammeliste brun espresso", unit: "kr./m", price: 53 },
    { id: "1530-600", name: "Rammeliste massiv ask", unit: "kr./m", price: 59 },
    { id: "420", name: "Rammeliste eg nr. 420", unit: "kr./m", price: 46 },
    { id: "32RAA", name: "Rammeliste rå nr. 32", unit: "kr./m", price: 34 },
    { id: "448", name: "Rammeliste sæbebehandlet eg nr. 448", unit: "kr./m", price: 46 },
    { id: "461", name: "Rammeliste eg nr. 461", unit: "kr./m", price: 53 }
  ],
  floatFrames: [
    { id: "1685-11", name: "Svæveliste sort mat", unit: "kr./m", price: 58 }
  ],
  glass: [
    { id: "2-FL", name: "2 mm float glas", unit: "kr./m²", price: 105 },
    { id: "UV-70", name: "UV70 / museumsglas", unit: "kr./m²", price: 525 }
  ],
  surfaces: [
    { id: "backboard", name: "Syrefri museumspap 3 mm", unit: "kr./m²", price: 168.57 }
  ],
  fixedAddons: [
    { id: "passepartout", name: "Passepartout", unit: "kr./ramme", price: 250 },
    { id: "spacer", name: "Distanceliste", unit: "kr./ramme", price: 200 },
    { id: "supplies", name: "Småmaterialer", unit: "kr./ramme", price: 35 }
  ]
};

const storageKey = "ramme-prisberegner-v2";
let data = loadData();

const formIds = [
  "standardFrame",
  "floatFrame",
  "frameWidth",
  "frameHeight",
  "quantity",
  "frameProfile",
  "floatProfile",
  "glassType",
  "usePassepartout",
  "includeSpacer",
  "frameWaste",
  "glassWaste",
  "boardWaste",
  "markupMultiplier",
  "rounding"
];

const els = Object.fromEntries(formIds.map((id) => [id, document.getElementById(id)]));

function loadData() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return clone(defaults);

  try {
    const parsed = JSON.parse(saved);
    return normalizeData(parsed);
  } catch {
    return clone(defaults);
  }
}

function saveData() {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeData(saved) {
  const next = clone(defaults);
  Object.keys(next).forEach((key) => {
    if (Array.isArray(next[key])) {
      const savedList = Array.isArray(saved[key]) ? saved[key] : [];
      next[key] = next[key].map((defaultItem) => ({
        ...defaultItem,
        ...(savedList.find((item) => item.id === defaultItem.id) || {})
      }));
    } else if (saved[key] !== undefined) {
      next[key] = saved[key];
    }
  });
  return next;
}

function setInitialFormValues() {
  els.rounding.value = "5";
}

function money(value) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0
  }).format(value);
}

function decimal(value, digits = 2) {
  return new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function byId(list, id) {
  return list.find((item) => item.id === id) || list[0];
}

function fixedAddon(id) {
  return byId(data.fixedAddons, id);
}

function numeric(id) {
  return Number.parseFloat(els[id].value) || 0;
}

function selectedJobType() {
  return els.floatFrame.checked ? "float" : "standard";
}

function populateSelect(select, list) {
  const previousValue = select.value;
  select.innerHTML = "";
  list.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} (${decimal(item.price, item.price % 1 ? 2 : 0)} ${item.unit})`;
    select.appendChild(option);
  });
  if (list.some((item) => item.id === previousValue)) {
    select.value = previousValue;
  }
}

function renderRateEditor(containerId, listName) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  data[listName].forEach((item) => {
    const row = document.createElement("div");
    row.className = "rate-row";
    row.innerHTML = `
      <div>
        <div class="rate-name">${item.name}</div>
        <div class="rate-meta">${item.id} · ${item.unit}</div>
      </div>
      <label>
        Pris
        <input type="number" min="0" step="0.01" value="${item.price}" data-list="${listName}" data-id="${item.id}">
      </label>
    `;
    container.appendChild(row);
  });
}

function renderRates() {
  populateSelect(els.frameProfile, data.frames);
  populateSelect(els.floatProfile, data.floatFrames);
  populateSelect(els.glassType, data.glass);
  renderRateEditor("frameRates", "frames");
  renderRateEditor("floatRates", "floatFrames");
  renderRateEditor("surfaceRates", "glass");

  const surfaceContainer = document.getElementById("surfaceRates");
  data.surfaces.forEach((item) => {
    const row = document.createElement("div");
    row.className = "rate-row";
    row.innerHTML = `
      <div>
        <div class="rate-name">${item.name}</div>
        <div class="rate-meta">${item.id} · ${item.unit}</div>
      </div>
      <label>
        Pris
        <input type="number" min="0" step="0.01" value="${item.price}" data-list="surfaces" data-id="${item.id}">
      </label>
    `;
    surfaceContainer.appendChild(row);
  });

  renderRateEditor("fixedRates", "fixedAddons");
}

function updateMode() {
  document.body.dataset.mode = selectedJobType();
}

function calculate() {
  updateMode();

  const jobType = selectedJobType();
  const quantity = Math.max(1, Math.round(numeric("quantity")));
  const frameWidth = numeric("frameWidth");
  const frameHeight = numeric("frameHeight");
  const perimeter = 2 * (frameWidth + frameHeight) / 100;
  const area = frameWidth * frameHeight / 10000;
  const frameMeters = perimeter * (1 + numeric("frameWaste") / 100);
  const glassArea = area * (1 + numeric("glassWaste") / 100);
  const boardArea = area * (1 + numeric("boardWaste") / 100);
  const multiplier = Math.max(1, numeric("markupMultiplier"));

  const selectedFrame = jobType === "float"
    ? byId(data.floatFrames, els.floatProfile.value)
    : byId(data.frames, els.frameProfile.value);
  const backboard = byId(data.surfaces, "backboard");
  const materialLines = [
    { name: selectedFrame.name, cost: frameMeters * selectedFrame.price }
  ];

  if (jobType === "standard") {
    const glass = byId(data.glass, els.glassType.value);
    materialLines.push(
      { name: glass.name, cost: glassArea * glass.price },
      { name: "Bagplade", cost: boardArea * backboard.price }
    );
  }

  const fixedLines = [
    { name: fixedAddon("supplies").name, cost: fixedAddon("supplies").price },
    jobType === "standard" && els.usePassepartout.checked
      ? { name: fixedAddon("passepartout").name, cost: fixedAddon("passepartout").price }
      : null,
    jobType === "standard" && els.includeSpacer.checked
      ? { name: fixedAddon("spacer").name, cost: fixedAddon("spacer").price }
      : null
  ].filter(Boolean);

  const lines = [...materialLines, ...fixedLines].filter((line) => line.cost > 0);
  const subtotal = lines.reduce((sum, line) => sum + line.cost * multiplier, 0) * quantity;
  const rounding = Math.max(1, numeric("rounding"));
  const roundedSubtotal = Math.ceil(subtotal / rounding) * rounding;
  const totalIncVat = roundedSubtotal * (1 + data.vatRate);

  document.getElementById("outerSize").textContent = `${decimal(frameWidth, 1)} × ${decimal(frameHeight, 1)} cm`;
  document.getElementById("frameMeters").textContent = `${decimal(frameMeters)} m`;
  document.getElementById("glassArea").textContent = jobType === "standard" ? `${decimal(glassArea)} m²` : "Ingen";
  document.getElementById("totalExVat").textContent = `${money(roundedSubtotal)} ekskl. moms`;
  document.getElementById("totalIncVat").textContent = money(totalIncVat);

  const rows = [
    ...lines.map((line) => ({ name: `${line.name} × ${decimal(multiplier, 1)}`, value: line.cost * multiplier * quantity })),
    { name: "Afrunding", value: roundedSubtotal - subtotal },
    { name: "Moms 25%", value: totalIncVat - roundedSubtotal }
  ];

  document.getElementById("breakdown").innerHTML = rows.map((line) => `
    <tr>
      <td>${line.name}</td>
      <td>${money(line.value)}</td>
    </tr>
  `).join("");
}

function bindEvents() {
  document.getElementById("calculatorForm").addEventListener("input", calculate);
  document.getElementById("calculatorForm").addEventListener("change", calculate);

  document.querySelector(".data-panel").addEventListener("input", (event) => {
    const input = event.target.closest("input[data-list]");
    if (!input) return;

    const list = data[input.dataset.list];
    const item = byId(list, input.dataset.id);
    item.price = Number.parseFloat(input.value) || 0;
    saveData();
    populateSelect(els.frameProfile, data.frames);
    populateSelect(els.floatProfile, data.floatFrames);
    populateSelect(els.glassType, data.glass);
    calculate();
  });

  document.getElementById("resetButton").addEventListener("click", () => {
    data = clone(defaults);
    localStorage.removeItem(storageKey);
    renderRates();
    calculate();
  });
}

renderRates();
bindEvents();
setInitialFormValues();
calculate();
