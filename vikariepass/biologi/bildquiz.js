const get = (id) => document.getElementById(id);
const photos = get("photos");
const answers = get("answers");
const dialog = get("photo-dialog");
const largePhoto = get("large-photo");

let round = [];
let index = 0;
let score = 0;
let streak = 0;
let best = 0;
let answered = false;

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function start() {
  round = shuffle(quiz.items).slice(0, Number(get("length").value));
  index = score = streak = best = 0;
  get("setup").hidden = true;
  get("summary").hidden = true;
  get("exercise").hidden = false;
  showQuestion();
}

function showQuestion() {
  const item = round[index];
  answered = false;
  get("position").textContent = `${index + 1} / ${round.length}`;
  get("question").setAttribute("aria-label", `Fråga ${index + 1} av ${round.length}. ${quiz.question}`);
  get("feedback").textContent = "";
  get("next").hidden = true;
  updateScore();

  const captions = quiz.captions(item);
  photos.replaceChildren(...captions.map((caption, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "photo";
    const image = new Image();
    image.alt = item.images[i];
    image.src = `bilder/${item.id}-${i + 1}.webp`;
    button.append(image, caption);
    button.addEventListener("click", () => {
      get("photo-title").textContent = caption;
      largePhoto.src = image.src;
      largePhoto.alt = image.alt;
      dialog.showModal();
    });
    return button;
  }));

  const otherItems = quiz.items.filter((choice) => choice !== item);
  const distractors = shuffle(otherItems).slice(0, 3);
  const similar = quiz.similar(item);
  if (similar && !distractors.includes(similar)) distractors[0] = similar;
  answers.replaceChildren(...shuffle([item, ...distractors]).map((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lv-btn-secondary";
    button.textContent = choice.name;
    button.dataset.item = choice.id;
    button.addEventListener("click", () => answer(item, choice, button));
    return button;
  }));
  get("question").focus();
}

function updateScore() {
  get("score").textContent = score;
  get("streak").textContent = streak;
  get("best").textContent = best;
}

function answer(item, choice, selected) {
  if (answered) return;
  answered = true;

  const correct = item === choice;
  if (correct) {
    score++;
    streak++;
    best = Math.max(best, streak);
  } else {
    streak = 0;
    selected.classList.add("wrong");
  }
  updateScore();

  for (const button of answers.children) {
    button.setAttribute("aria-disabled", "true");
    button.tabIndex = -1;
    if (Number(button.dataset.item) === item.id) button.classList.add("correct");
  }
  get("feedback").textContent = `${correct ? "Rätt!" : "Rätt svar är " + item.name.toLowerCase() + "."} ${item.clue}`;
  get("next").textContent = index + 1 < round.length ? "Nästa fråga" : "Visa resultat";
  get("next").hidden = false;
}

get("settings").addEventListener("submit", (event) => {
  event.preventDefault();
  start();
});
get("next").addEventListener("click", () => {
  index++;
  if (index < round.length) {
    showQuestion();
    return;
  }
  get("exercise").hidden = true;
  get("summary").hidden = false;
  get("result").textContent = `Du fick ${score} rätt av ${round.length}.`;
  get("result-best").textContent = `Bästa svit: ${best} rätt i rad.`;
  get("summary-title").focus();
});
get("again").addEventListener("click", start);
get("change").addEventListener("click", () => {
  get("summary").hidden = true;
  get("setup").hidden = false;
  get("length").focus();
});
