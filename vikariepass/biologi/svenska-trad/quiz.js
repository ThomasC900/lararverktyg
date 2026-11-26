const trees = [
  { id: 1, name: "Tall", conifer: true,
    clue: "Tallen har långa barr som sitter två och två. Högt upp på stammen är barken ofta orangebrun.",
    images: ["Ett träd med bred, oregelbunden krona och grenar som breder ut sig åt sidorna.", "Orangebrun bark i tunna flagor.", "Långa, smala barr i par på en kvist."] },
  { id: 2, name: "Gran", conifer: true,
    clue: "Granens korta barr sitter ett och ett runt kvisten. Trädet har ofta en spetsig topp.",
    images: ["Ett träd med spetsig topp och grenar långt ner på stammen.", "Gråbrun, fjällig bark.", "Korta, spetsiga barr runt en kvist."] },
  { id: 3, name: "Vårtbjörk (björk)",
    clue: "Vårtbjörken har ofta vit bark med mörka märken. Bladen är trekantiga med tandad kant.",
    images: ["Ett ljust träd med smala grenar och luftig krona.", "Vit bark med mörka streck och fläckar.", "Ett spetsigt, ungefär trekantigt blad med tandad kant."] },
  { id: 4, name: "Ek",
    clue: "Ekens blad känns igen på sina rundade flikar. Äldre ekar har ofta grov bark med djupa fåror.",
    images: ["Ett träd med bred krona och grova grenar.", "Grov bark med djupa fåror.", "Ett blad med djupt inskurna, rundade flikar."] },
  { id: 5, name: "Bok",
    clue: "Boken har ofta slät, grå bark. Bladen är ovala med svagt vågig kant.",
    images: ["Ett lövträd med tät krona och grå stam.", "Slät, grå bark.", "Kopparbruna, ovala blad med spets och svagt vågig kant."] },
  { id: 6, name: "Lönn",
    clue: "Lönnens blad har flera spetsiga flikar som strålar ut från bladets skaft.",
    images: ["Ett lövträd med en bred, rundad krona.", "Gråbrun bark med fåror.", "Gröna blad med stora spetsiga flikar som strålar från bladbasen."] },
  { id: 7, name: "Rönn",
    clue: "Ett rönnblad består av flera tandade småblad som sitter parvis, med ett ensamt småblad längst ut.",
    images: ["Ett lövträd med upprätta grenar och relativt luftig krona.", "Gråbrun bark.", "Flera smala, tandade småblad längs ett gemensamt skaft."] },
  { id: 8, name: "Asp",
    clue: "Asplövet är ofta runt med vågig, grovt tandad kant. Det långa, platta bladskaftet gör att lövet lätt darrar i vinden.",
    images: ["Ett högt lövträd med smal stam och luftig krona.", "Grågrön bark med mörka märken.", "Flera nästan runda blad med grovt tandad kant. Ett yngre blad till höger är mer spetsigt."] }
];

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
  round = shuffle(trees).slice(0, Number(get("length").value));
  index = score = streak = best = 0;
  get("setup").hidden = true;
  get("summary").hidden = true;
  get("exercise").hidden = false;
  showQuestion();
}

function showQuestion() {
  const tree = round[index];
  answered = false;
  get("position").textContent = `${index + 1} / ${round.length}`;
  get("question").setAttribute("aria-label", `Fråga ${index + 1} av ${round.length}. Vilket träd är det?`);
  get("feedback").textContent = "";
  get("next").hidden = true;
  updateScore();

  const captions = ["Hela trädet", "Stam och bark", tree.conifer ? "Barr" : "Blad"];
  photos.replaceChildren(...captions.map((caption, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "photo";
    const image = new Image();
    image.alt = tree.images[i];
    image.src = `bilder/${tree.id}-${i + 1}.webp`;
    button.append(image, caption);
    button.addEventListener("click", () => {
      get("photo-title").textContent = caption;
      largePhoto.src = image.src;
      largePhoto.alt = image.alt;
      dialog.showModal();
    });
    return button;
  }));

  const otherTrees = trees.filter((choice) => choice !== tree);
  const distractors = shuffle(otherTrees).slice(0, 3);
  if (tree.conifer && !distractors.some((choice) => choice.conifer)) {
    distractors[0] = otherTrees.find((choice) => choice.conifer);
  }
  answers.replaceChildren(...shuffle([tree, ...distractors]).map((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lv-btn-secondary";
    button.textContent = choice.name;
    button.dataset.tree = choice.id;
    button.addEventListener("click", () => answer(tree, choice, button));
    return button;
  }));
  get("question").focus();
}

function updateScore() {
  get("score").textContent = score;
  get("streak").textContent = streak;
  get("best").textContent = best;
}

function answer(tree, choice, selected) {
  if (answered) return;
  answered = true;

  const correct = tree === choice;
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
    if (Number(button.dataset.tree) === tree.id) button.classList.add("correct");
  }
  get("feedback").textContent = `${correct ? "Rätt!" : "Rätt svar är " + tree.name.toLowerCase() + "."} ${tree.clue}`;
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
