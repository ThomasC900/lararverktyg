const $ = (id) => document.getElementById(id);
const prefixes = [
  { name: "kilo", symbol: "k", power: 3 },
  { name: "hekto", symbol: "h", power: 2 },
  { name: "deka", symbol: "da", power: 1 },
  { name: "utan prefix", symbol: "", power: 0 },
  { name: "deci", symbol: "d", power: -1 },
  { name: "centi", symbol: "c", power: -2 },
  { name: "milli", symbol: "m", power: -3 }
];
const bases = [
  { name: "meter", symbol: "m" },
  { name: "liter", symbol: "l" },
  { name: "gram", symbol: "g" }
];
const ladderCells = [...$("ladder").children];
let tasks = [];
let index = 0;
let firstTry = 0;
let solved = 0;
let streak = 0;
let missed = false;
let finished = false;

function normalizeDecimal(value) {
  const match = value.trim().match(/^((?:\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)?)(?:[.,](\d+))?$/);
  if (!match || !(match[1] || match[2])) return null;
  const whole = match[1].replace(/\s/g, "").replace(/^0+/, "") || "0";
  const fraction = (match[2] || "").replace(/0+$/, "");
  return fraction ? whole + "." + fraction : whole;
}

function shiftDecimal(value, power) {
  const [whole, fraction = ""] = value.split(".");
  const digits = whole + fraction;
  const point = whole.length + power;
  if (point <= 0) return normalizeDecimal("0." + "0".repeat(-point) + digits);
  if (point >= digits.length) return normalizeDecimal(digits.padEnd(point, "0"));
  return normalizeDecimal(digits.slice(0, point) + "." + digits.slice(point));
}

function format(value) {
  const [whole, fraction] = String(value).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return fraction ? grouped + "," + fraction : grouped;
}

function unit(prefix, base) {
  return prefix.symbol + base.symbol;
}

function describeShift(power) {
  const steps = Math.abs(power);
  const direction = power > 0 ? "åt höger" : "åt vänster";
  const operation = power > 0 ? "multiplicera med " : "dividera med ";
  return steps + " steg " + direction + " i prefixraden → " + operation + format(10 ** steps) + ".";
}

function fillDemoUnits(from = 0, to = -2) {
  const base = bases[$("demo-base").value];
  for (const [select, selected] of [[$("demo-from"), from], [$("demo-to"), to]]) {
    select.replaceChildren(...prefixes.map(prefix =>
      new Option(unit(prefix, base), prefix.power, false, prefix.power === selected)
    ));
  }
}

function renderDemo() {
  const base = bases[$("demo-base").value];
  const from = prefixes[$("demo-from").selectedIndex];
  const to = prefixes[$("demo-to").selectedIndex];
  const power = from.power - to.power;
  const value = normalizeDecimal($("demo-value").value);
  for (const cell of ladderCells) {
    const cellPower = Number(cell.dataset.power);
    cell.classList.toggle("endpoint", cellPower === from.power || cellPower === to.power);
    cell.classList.toggle("between", cellPower > Math.min(from.power, to.power) && cellPower < Math.max(from.power, to.power));
  }

  if (value === null) {
    $("demo-result").textContent = "Skriv ett tal, till exempel 2,5.";
    return;
  }

  const equation = document.createElement("strong");
  equation.textContent = format(value) + " " + unit(from, base) + " = " + format(shiftDecimal(value, power)) + " " + unit(to, base);
  const explanation = document.createElement("span");
  explanation.textContent = power === 0 ? "Samma enhet. Talet är oförändrat." : describeShift(power);
  $("demo-result").replaceChildren(equation, explanation);
}

function addChoices(container, group, options) {
  for (const [index, option] of options.entries()) {
    const id = group + "-" + index;
    const wrapper = document.createElement("div");
    wrapper.className = "choice";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = group;
    input.value = index;
    input.id = id;
    input.checked = true;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = option.name[0].toUpperCase() + option.name.slice(1);
    if (group === "prefix" && option.symbol) label.textContent += " (" + option.symbol + ")";
    wrapper.append(input, label);
    container.append(wrapper);
  }
}

function chosen(group, options) {
  return [...document.querySelectorAll('input[name="' + group + '"]:checked')].map(input => options[input.value]);
}

function showView(id) {
  for (const section of document.querySelectorAll("main > section")) section.hidden = section.id !== id;
  $(id).querySelector("h2[tabindex]")?.focus();
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function buildTasks(selectedPrefixes, selectedBases, count) {
  const pairs = selectedPrefixes.flatMap(from =>
    selectedPrefixes.filter(to => from !== to).map(to => ({ from, to }))
  );
  const combinations = selectedBases.flatMap(base => pairs.map(pair => ({ base, ...pair })));
  let remaining = [];
  return Array.from({ length: count }, () => {
    if (!remaining.length) remaining = [...combinations];
    const [combination] = remaining.splice(randomInt(0, remaining.length - 1), 1);
    const { from, to } = combination;
    const power = from.power - to.power;
    const places = randomInt(0, Math.min(Math.abs(power), 2));
    const largerValue = shiftDecimal(String(randomInt(2, 99)), -places);
    const smallerValue = shiftDecimal(largerValue, Math.abs(power));
    const value = power > 0 ? largerValue : smallerValue;
    const answer = power > 0 ? smallerValue : largerValue;
    return { ...combination, power, value, answer };
  });
}

function showTask() {
  const { value, from, to, base } = tasks[index];
  missed = false;
  finished = false;
  $("question-count").textContent = "Uppgift " + (index + 1) + " av " + tasks.length;
  $("streak").textContent = "Rätt i rad: " + streak;
  $("progress").max = tasks.length;
  $("progress").value = index;
  $("problem").textContent = format(value) + " " + unit(from, base) + " = ? " + unit(to, base);
  $("answer-unit").textContent = unit(to, base);
  $("answer").value = "";
  $("answer").readOnly = false;
  $("check").hidden = false;
  $("show-answer").hidden = false;
  $("next").hidden = true;
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  preparePlaceValue(value);
  $("answer").focus();
}

function finishTask(correct) {
  const { answer, to, base, power } = tasks[index];
  if (correct) solved++;
  if (correct && !missed) {
    firstTry++;
    streak++;
  } else {
    streak = 0;
  }

  finished = true;
  $("streak").textContent = "Rätt i rad: " + streak;
  $("progress").value = index + 1;
  const solution = format(answer) + " " + unit(to, base);
  $("feedback").textContent = correct ? "Rätt! " + solution + "." : "Svaret är " + solution + ". " + describeShift(power);
  $("feedback").className = "feedback " + (correct ? "good" : "hint-result");
  $("answer").value = format(answer);
  $("answer").readOnly = true;
  $("check").hidden = true;
  $("show-answer").hidden = true;
  $("next").hidden = false;
  $("next").focus();
}

function nextTask() {
  index++;
  if (index < tasks.length) {
    showTask();
    return;
  }
  $("score").textContent = firstTry + " av " + tasks.length + " rätt på första försöket";
  $("summary").textContent = "Du löste " + solved + " av " + tasks.length + " uppgifter.";
  showView("result");
}

const maxWholeDigits = 9;
const maxFractionDigits = 8;
let placedValue = null;
let movedValue = null;
let leftmostPower = 3;
let rightmostPower = -3;

function preparePlaceValue(value) {
  $("place-value-input").value = format(value);
  placedValue = movedValue = null;
  leftmostPower = 3;
  rightmostPower = -3;
  renderPlaceValue();
  $("place-value-grid").parentElement.scrollLeft = 0;
}

function fitsPlaceValue(value) {
  const [whole, fraction = ""] = value.split(".");
  return whole.length <= maxWholeDigits && fraction.length <= maxFractionDigits;
}

function renderPlaceValue() {
  const [whole, fraction = ""] = (movedValue ?? "").split(".");
  leftmostPower = Math.max(leftmostPower, whole.length - 1);
  rightmostPower = Math.min(rightmostPower, -fraction.length);

  const grid = $("place-value-grid");
  const cells = [];
  const columns = [];
  for (let power = leftmostPower; power >= rightmostPower; power--) {
    const cell = document.createElement("div");
    cell.className = "place-value-column";
    const label = document.createElement("span");
    label.textContent = format(shiftDecimal("1", power));
    const digit = document.createElement("b");
    digit.textContent = power >= 0 ? whole.at(-power - 1) ?? "" : fraction[-power - 1] ?? "";
    cell.append(label, digit);
    cells.push(cell);
    columns.push(Math.abs(power) >= 6 ? "minmax(3.4rem, 1fr)" : "minmax(var(--place-column-min), 1fr)");
    if (power === 0) {
      const comma = document.createElement("span");
      comma.className = "place-value-comma";
      comma.textContent = ",";
      comma.setAttribute("aria-hidden", "true");
      cells.push(comma);
      columns.push("1rem");
    }
  }

  grid.style.gridTemplateColumns = columns.join(" ");
  grid.replaceChildren(...cells);
  $("place-value-status").textContent = movedValue === null ? "" : "Talet i positionssystemet är " + format(movedValue) + ".";
  $("shift-left").disabled = movedValue === null || !fitsPlaceValue(shiftDecimal(movedValue, 1));
  $("shift-right").disabled = movedValue === null || !fitsPlaceValue(shiftDecimal(movedValue, -1));
  $("reset-place-value").disabled = movedValue === null;
}

function movePlaceValue(power) {
  movedValue = shiftDecimal(movedValue, power);
  renderPlaceValue();
}

for (const button of document.querySelectorAll("[data-view]")) {
  button.addEventListener("click", () => showView(button.dataset.view));
}

$("practice-ladder").append(...ladderCells.map(cell => cell.cloneNode(true)));
$("place-value-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = normalizeDecimal($("place-value-input").value);
  if (value === null || !fitsPlaceValue(value)) {
    $("place-value-status").textContent = "Skriv ett tal med högst nio heltalssiffror och åtta decimaler.";
    $("place-value-input").focus();
    return;
  }
  placedValue = movedValue = value;
  renderPlaceValue();
});
$("shift-left").addEventListener("click", () => movePlaceValue(1));
$("shift-right").addEventListener("click", () => movePlaceValue(-1));
$("reset-place-value").addEventListener("click", () => {
  movedValue = placedValue;
  $("place-value-input").value = format(placedValue);
  renderPlaceValue();
});

$("demo-base").append(...bases.map((base, index) => new Option(base.name, index)));
fillDemoUnits();
renderDemo();
$("demo").addEventListener("submit", (event) => event.preventDefault());
$("demo").addEventListener("input", (event) => {
  if (event.target === $("demo-base")) fillDemoUnits(Number($("demo-from").value), Number($("demo-to").value));
  renderDemo();
});
$("swap").addEventListener("click", () => {
  const from = $("demo-from").value;
  $("demo-from").value = $("demo-to").value;
  $("demo-to").value = from;
  renderDemo();
});

addChoices($("prefix-choices"), "prefix", prefixes);
addChoices($("base-choices"), "base", bases);
$("settings").addEventListener("input", () => { $("settings-feedback").hidden = true; });
$("settings").addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedPrefixes = chosen("prefix", prefixes);
  const selectedBases = chosen("base", bases);
  if (selectedPrefixes.length < 2 || !selectedBases.length) {
    $("settings-feedback").textContent = "Välj minst två prefixalternativ och minst en grundenhet.";
    $("settings-feedback").hidden = false;
    return;
  }
  tasks = buildTasks(selectedPrefixes, selectedBases, Number($("count").value));
  index = firstTry = solved = streak = 0;
  showView("practice");
  showTask();
});

$("answer-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (finished) return;
  const value = normalizeDecimal($("answer").value);
  const task = tasks[index];
  if (value === task.answer) {
    finishTask(true);
    return;
  }
  if (value === null) {
    $("feedback").textContent = "Skriv talet utan enhet. Både decimalkomma och decimalpunkt fungerar.";
  } else {
    missed = true;
    streak = 0;
    $("streak").textContent = "Rätt i rad: 0";
    $("feedback").textContent = "Försök igen. " + describeShift(task.power);
  }
  $("feedback").className = "feedback bad";
  $("answer").focus();
  $("answer").select();
});
$("show-answer").addEventListener("click", () => finishTask(false));
$("next").addEventListener("click", nextTask);
$("stop").addEventListener("click", () => showView("setup"));
