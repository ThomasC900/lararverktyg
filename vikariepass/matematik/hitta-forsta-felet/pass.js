// Bråk markeras som [täljare/nämnare] i uppgifterna och visas stående.
const basic = [
  {
    prompt: "Lös ekvationen 4x + 11 = 27.",
    rows: ["4x = 27 − 11", "4x = 18", "x = 4,5"],
    error: 2,
    why: "27 − 11 är 16. På sista raden delas 18 med 4, men 18 kommer från räknefelet.",
    correction: "4x = 16, alltså x = 4."
  },
  {
    prompt: "Beräkna [1/3] + [1/6].",
    rows: ["[1/3] = [2/6]", "[2/6] + [1/6] = [3/12]", "[3/12] = [1/4]"],
    error: 2,
    why: "När nämnarna är lika adderar du täljarna. Storleken på delarna är fortfarande sjättedelar.",
    correction: "[2/6] + [1/6] = [3/6] = [1/2]."
  },
  {
    prompt: "En tröja kostar 300 kr. Priset sänks med 20 %. Beräkna det nya priset.",
    rows: ["20 % = 0,20", "0,20 · 300 kr = 60 kr", "Nytt pris = 300 kr + 60 kr = 360 kr"],
    error: 3,
    why: "60 kr är rabatten. Vid en prissänkning drar du av rabatten från ursprungspriset.",
    correction: "300 kr − 60 kr = 240 kr."
  },
  {
    prompt: "Lös ekvationen 3y + y − 5 = 11.",
    rows: ["3y + y = 3y", "3y − 5 = 11", "3y = 16", "y = [16/3]"],
    error: 1,
    why: "y betyder en y-term. Tre y-termer plus en y-term blir fyra.",
    correction: "4y − 5 = 11, sedan 4y = 16 och y = 4."
  },
  {
    prompt: "Beräkna [3/4] − [1/2].",
    rows: ["[1/2] = [2/4]", "[3/4] − [2/4] = [2/4]", "[2/4] = [1/2]"],
    error: 2,
    why: "Båda bråken är skrivna i fjärdedelar. Tre fjärdedelar minus två fjärdedelar är en fjärdedel.",
    correction: "[3/4] − [2/4] = [1/4]."
  },
  {
    prompt: "I en klass cyklar 12 av 30 elever till skolan. Hur många procent cyklar?",
    rows: ["Andelen är [30/12]", "[30/12] = 2,5", "2,5 = 250 %"],
    error: 1,
    why: "Delen är 12 elever och det hela är 30 elever. Sätt delen i täljaren.",
    correction: "[12/30] = 0,4 = 40 %."
  },
  {
    prompt: "Lös ekvationen 5x − 8 = 17.",
    rows: ["5x = 17 + 8", "5x = 25", "x = 25 − 5", "x = 20"],
    error: 3,
    why: "5x betyder 5 gånger x. För att få x ensamt delar du därför båda leden med 5.",
    correction: "x = 25 ÷ 5 = 5."
  },
  {
    prompt: "Beräkna [2/3] · [3/5].",
    rows: ["[2/3] · [3/5] = [5/8]", "[5/8] = 0,625"],
    error: 1,
    why: "Vid multiplikation multiplicerar du täljarna med varandra och nämnarna med varandra.",
    correction: "[2/3] · [3/5] = [6/15] = [2/5]."
  },
  {
    prompt: "Beräkna 15 % av 200 kr.",
    rows: ["10 % av 200 kr är 20 kr", "5 % av 200 kr är 10 kr", "15 % av 200 kr är 20 kr − 10 kr = 10 kr"],
    error: 3,
    why: "15 % kan delas upp i 10 % plus 5 %. Lägg därför ihop beloppen.",
    correction: "20 kr + 10 kr = 30 kr."
  },
  {
    prompt: "Lös ekvationen 4x + 2 = 3x + 10.",
    rows: ["x + 2 = 10", "x = 10 + 2", "x = 12"],
    error: 2,
    why: "Första raden fås genom att subtrahera 3x i båda leden. Därifrån behöver du subtrahera 2 i båda leden.",
    correction: "x = 10 − 2 = 8."
  },
  {
    prompt: "Förkorta [18/24] så långt som möjligt.",
    rows: ["[18/24] = [9/12]", "[9/12] = [3/4]", "[3/4] = [1/2]"],
    error: 3,
    why: "För att förkorta behöver du dela täljaren och nämnaren med samma tal. 3 och 4 har ingen gemensam delare större än 1.",
    correction: "[9/12] = [3/4], och där är bråket färdigförkortat."
  },
  {
    prompt: "Priset höjs från 80 kr till 100 kr. Beräkna den procentuella höjningen.",
    rows: ["Höjningen är 100 kr − 80 kr = 20 kr", "Andelen är [20/100]", "[20/100] = 20 %"],
    error: 2,
    why: "En procentuell förändring jämförs med det ursprungliga priset, som var 80 kr.",
    correction: "[20/80] = [1/4] = 25 %."
  }
];

const advanced = [
  {
    prompt: "Lös ekvationen 2(x + 3) = 18.",
    rows: ["2x + 3 = 18", "2x = 15", "x = 7,5"],
    error: 1,
    why: "Tvåan framför parentesen multipliceras med båda termerna i parentesen.",
    correction: "2x + 6 = 18, sedan 2x = 12 och x = 6."
  },
  {
    prompt: "Beräkna [3/4] ÷ [1/2].",
    rows: ["[3/4] ÷ [1/2] = [3/4] · [1/2]", "[3/4] · [1/2] = [3/8]"],
    error: 1,
    why: "När du delar med en halv multiplicerar du med 2. Frågan är hur många halvor som ryms i tre fjärdedelar.",
    correction: "[3/4] · 2 = [6/4] = [3/2]."
  },
  {
    prompt: "Ett pris på 500 kr sänks först med 20 % och höjs sedan med 20 %. Beräkna slutpriset.",
    rows: ["Första rabatten är 0,20 · 500 kr = 100 kr", "Efter sänkningen kostar varan 400 kr", "Nästa höjning är 0,20 · 500 kr = 100 kr", "Slutpriset är 400 kr + 100 kr = 500 kr"],
    error: 3,
    why: "Höjningen räknas på priset efter sänkningen, alltså 400 kr.",
    correction: "Höjningen är 0,20 · 400 kr = 80 kr. Slutpriset är 480 kr."
  },
  {
    prompt: "Lös ekvationen 5y + 2 − 2y = y + 10.",
    rows: ["3y + 2 = y + 10", "2y + 2 = 10", "2y = 10 + 2", "y = 6"],
    error: 3,
    why: "När du tar bort 2 från vänsterledet måste du också subtrahera 2 i högerledet.",
    correction: "2y = 10 − 2 = 8, alltså y = 4."
  }
];

const intro = document.querySelector("#intro");
const exercise = document.querySelector("#exercise");
const summary = document.querySelector("#summary");
const progress = document.querySelector("#progress");
const steps = document.querySelector("#steps");
const feedback = document.querySelector("#feedback");
const solution = document.querySelector("#solution");
const advance = document.querySelector("#advance");
const extend = document.querySelector("#extend");

let questions = basic;
let index = 0;
let firstTry = 0;
let attempts = 0;
let solved = false;

function writeMath(element, text) {
  element.replaceChildren();
  for (const part of text.split(/(\[\d+\/\d+\])/)) {
    if (!part.startsWith("[")) {
      element.append(part);
      continue;
    }
    const mathNamespace = "http://www.w3.org/1998/Math/MathML";
    const math = document.createElementNS(mathNamespace, "math");
    const fraction = document.createElementNS(mathNamespace, "mfrac");
    for (const number of part.slice(1, -1).split("/")) {
      const node = document.createElementNS(mathNamespace, "mn");
      node.textContent = number;
      fraction.append(node);
    }
    math.append(fraction);
    element.append(math);
  }
}

function start(questionsToUse) {
  questions = questionsToUse;
  index = 0;
  firstTry = 0;
  intro.hidden = true;
  summary.hidden = true;
  exercise.hidden = false;
  showQuestion();
}

function showQuestion() {
  attempts = 0;
  solved = false;
  const task = questions[index];
  const label = questions === basic ? "Uppgift" : "Fördjupning";
  progress.textContent = `${label} ${index + 1} av ${questions.length}`;
  writeMath(document.querySelector("#prompt"), task.prompt);
  feedback.textContent = "";
  solution.hidden = true;
  advance.hidden = true;
  advance.textContent = index + 1 === questions.length ? "Visa sammanfattning →" : "Nästa uppgift →";

  steps.replaceChildren(...task.rows.map((row, position) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "step";
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = `Rad ${position + 1}`;
    const expression = document.createElement("span");
    expression.className = "math";
    writeMath(expression, row);
    button.append(label, expression);
    button.addEventListener("click", () => checkRow(task, position + 1, button));
    item.append(button);
    return item;
  }));
  progress.focus();
}

function checkRow(task, row, button) {
  if (solved || button.hasAttribute("aria-disabled")) return;
  attempts += 1;
  if (row !== task.error) {
    button.classList.add("tried");
    button.setAttribute("aria-disabled", "true");
    feedback.textContent = row < task.error
      ? `Rad ${row} stämmer. Fortsätt leta längre ner.`
      : `Det första felet finns före rad ${row}. Titta på raderna ovanför.`;
    return;
  }

  solved = true;
  if (attempts === 1) firstTry += 1;
  button.classList.add("first-error");
  steps.querySelectorAll("button").forEach(step => step.setAttribute("aria-disabled", "true"));
  feedback.textContent = `Rätt, det första felet finns på rad ${row}. ${task.why}`;
  writeMath(document.querySelector("#correction"), task.correction);
  solution.hidden = false;
  advance.hidden = false;
}

function showSummary() {
  const isBasic = questions === basic;
  const title = document.querySelector("#summary-title");
  title.textContent = isBasic ? "Grundpasset är klart" : "Fördjupningen är klar";
  document.querySelector("#score").textContent = `Du hittade första felet direkt i ${firstTry} av ${questions.length} uppgifter.`;
  document.querySelector("#reflection").hidden = !isBasic;
  extend.hidden = !isBasic;
  exercise.hidden = true;
  summary.hidden = false;
  title.focus();
}

document.querySelector("#start").addEventListener("click", () => start(basic));
advance.addEventListener("click", () => {
  index += 1;
  if (index === questions.length) showSummary();
  else showQuestion();
});
extend.addEventListener("click", () => start(advanced));
document.querySelector("#restart").addEventListener("click", () => {
  document.querySelector("#reflection-answer").value = "";
  summary.querySelector("details").open = false;
  summary.hidden = true;
  intro.hidden = false;
  document.querySelector("#intro-title").focus();
});
