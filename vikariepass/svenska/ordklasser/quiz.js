import { explanations, sentencesByClass } from "./ord.js";

const byId = id => document.getElementById(id);
const storageKey = "lararverktyg:ordklasser:remaining:v1";
const classes = Object.keys(sentencesByClass);
const groups = classes.map(wordClass => sentencesByClass[wordClass].map(sentence => {
  const [before, word, after] = sentence.split("|");
  return { id: word.toLocaleLowerCase("sv"), wordClass, before, word, after };
}));
const questionsById = new Map(groups.flat().map(question => [question.id, question]));

function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function newDeck() {
  const shuffledGroups = groups.map(shuffle);
  return shuffledGroups[0].flatMap((_, i) =>
    shuffle(shuffledGroups.map(group => group[i].id))
  );
}

function loadDeck() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved) && saved.every(id => questionsById.has(id))) {
      return [...new Set(saved)];
    }
  } catch {
    // Träningen fungerar även när webbläsaren har stängt av lagring.
  }
  return newDeck();
}

let remaining = loadDeck();
let round = [];
let index = 0;
let score = 0;
let streak = 0;
let best = 0;

const setup = byId("setup");
const exercise = byId("exercise");
const summary = byId("summary");
const length = byId("length");
const sentence = byId("sentence");
const answers = byId("answers");
const feedback = byId("feedback");
const next = byId("next");

for (const wordClass of classes) {
  const button = document.createElement("button");
  button.className = "lv-btn-secondary";
  button.type = "button";
  button.textContent = wordClass;
  button.addEventListener("click", () => answer(wordClass));
  answers.append(button);
}

function start() {
  const count = Number(length.value);
  const selected = remaining.splice(0, count);
  if (selected.length < count) {
    const alreadySelected = new Set(selected);
    const deck = newDeck();
    remaining = deck.filter(id => !alreadySelected.has(id));
    selected.push(...remaining.splice(0, count - selected.length));
    remaining.push(...deck.filter(id => alreadySelected.has(id)));
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(remaining));
  } catch {
    // Den återstående ordleken finns kvar i minnet under besöket.
  }

  round = shuffle(selected).map(id => questionsById.get(id));
  index = score = streak = best = 0;
  setup.hidden = summary.hidden = true;
  exercise.hidden = false;
  showQuestion();
}

function showQuestion() {
  const { before, word, after } = round[index];
  const marked = document.createElement("mark");
  marked.textContent = word;
  sentence.replaceChildren(before, marked, after);
  byId("position").textContent = `${index + 1} / ${round.length}`;
  updateScore();

  for (const button of answers.children) {
    button.disabled = false;
    delete button.dataset.state;
  }
  feedback.textContent = "";
  delete feedback.dataset.state;
  next.hidden = true;
  sentence.focus();
}

function updateScore() {
  byId("score").textContent = score;
  byId("streak").textContent = streak;
  byId("best").textContent = best;
}

function answer(chosen) {
  const { wordClass, word } = round[index];
  const correct = chosen === wordClass;
  if (correct) {
    score++;
    streak++;
    best = Math.max(best, streak);
  } else {
    streak = 0;
  }
  updateScore();

  for (const button of answers.children) {
    button.disabled = true;
    if (button.textContent === wordClass) {
      button.dataset.state = "correct";
    } else if (button.textContent === chosen) {
      button.dataset.state = "incorrect";
    }
  }

  const verdict = correct ? "Rätt!" : "Fel svar.";
  feedback.dataset.state = correct ? "correct" : "incorrect";
  feedback.textContent = `${verdict} ”${word}” är här ${wordClass.toLocaleLowerCase("sv")}. ${explanations[wordClass]}`;
  next.textContent = index + 1 === round.length ? "Visa resultat" : "Nästa ord";
  next.hidden = false;
  feedback.focus();
}

byId("settings").addEventListener("submit", event => {
  event.preventDefault();
  start();
});

next.addEventListener("click", () => {
  index++;
  if (index < round.length) {
    showQuestion();
  } else {
    exercise.hidden = true;
    summary.hidden = false;
    byId("result").textContent = `Du fick ${score} rätt av ${round.length}.`;
    byId("result-best").textContent = `Bästa svit: ${best} rätt i rad.`;
    byId("summary-title").focus();
  }
});

byId("again").addEventListener("click", start);
byId("change").addEventListener("click", () => {
  summary.hidden = true;
  setup.hidden = false;
  length.focus();
});
