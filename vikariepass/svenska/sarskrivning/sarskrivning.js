'use strict';

const discovery = [
  ['Vilket alternativ är namnet på ett yrke?', 'En sjuksköterska', 'En sjuk sköterska',
    'En sjuksköterska har ett visst yrke. En sjuk sköterska är en sköterska som är sjuk.'],
  ['Vilken av dem kan ligga i en godispåse?', 'En skumtomte', 'En skum tomte',
    'En skumtomte är en sorts godis. En skum tomte är en tomte som verkar skum.'],
  ['Vilket uttryck beskriver bara färgen på bäret?', 'Ett blått bär', 'Ett blåbär',
    'Ett blått bär kan vara vilket bär som helst som är blått. Ett blåbär är en särskild sorts bär.']
];

const practice = [
  ['Jag glömde mina [___] hemma.', 'gympaskor', 'gympa skor', 'Gympaskor är skor för gympa.'],
  ['Till idrotten behöver jag [___]. De gamla har gått sönder.', 'nya skor', 'nyaskor', 'Nya beskriver hur skorna är.'],
  ['Vi lämnade tillbaka boken på [___].', 'skolbiblioteket', 'skol biblioteket', 'Skolbiblioteket är biblioteket på skolan.'],
  ['Till maten drack jag ett glas [___].', 'kallt vatten', 'kalltvatten', 'Kallt beskriver temperaturen på vattnet.'],
  ['Vi hade en [___] medan de andra åt varm lunch.', 'kall lunch', 'kallunch', 'Kall beskriver temperaturen på lunchen.'],
  ['När det började regna tog jag på mig min [___].', 'regnjacka', 'regn jacka', 'En regnjacka är en jacka avsedd för regn.'],
  ['Hon satte upp en [___] på dörren för att visa när mötet började.', 'tydlig skylt', 'tydligskylt', 'Tydlig beskriver hur skylten är.'],
  ['Innan vi gick av bussen letade jag fram mitt [___].', 'busskort', 'buss kort', 'Ett busskort är ett kort för bussresor.'],
  ['Vi såg ett [___] som skymde stigen.', 'stort träd', 'stortträd', 'Stort beskriver trädets storlek.'],
  ['På friluftsdagen hade vi med oss var sin [___].', 'vattenflaska', 'vatten flaska', 'En vattenflaska är en flaska för vatten.'],
  ['Jag tog en [___] handduk ur skåpet.', 'helt torr', 'helttorr', 'Helt förstärker betydelsen av torr. Här står orden för sig.'],
  ['Vi lämnade in våra svar i [___] efter lektionen.', 'klassrummet', 'klass rummet', 'Ett klassrum är ett rum där en klass kan ha undervisning.'],
  ['Jag valde en [___] bok som får plats i fickan.', 'ovanligt liten', 'ovanligtliten', 'Ovanligt beskriver hur liten boken är.'],
  ['Jag använde en [___] för att mäta tiden.', 'stoppklocka', 'stopp klocka', 'En stoppklocka är ett sammansatt ord för en klocka som används vid tidtagning.'],
  ['För att markera viktiga ord använde jag en [___].', 'överstrykningspenna', 'överstryknings penna', 'En överstrykningspenna är en penna för överstrykning. S:et binder ihop delarna.']
];

const posterText = [
  ['På fredag öppnar skolans ', ['bok loppis', 'bokloppis', 'En bokloppis är en loppis där man säljer böcker.'],
    ' i ', ['klass rummet', 'klassrummet', 'Klassrum är ett ord för ett rum där en klass har undervisning.'],
    ' bredvid biblioteket. Ta gärna med en ', ['gammal bok', null, 'Gammal beskriver boken.'], '.'],
  ['På ett ', ['stort bord', null, 'Stort beskriver bordet.'], ' vid dörren finns en låda med ',
    ['serie tidningar', 'serietidningar', 'En serietidning är en tidning med tecknade serier.'],
    ' och ett par ', ['roliga spel', null, 'Roliga beskriver spelen.'],
    '. I hörnet står en ', ['bok hylla', 'bokhylla', 'En bokhylla är en hylla för böcker.'], ' med deckare.'],
  ['Efter ', ['lunch rasten', 'lunchrasten', 'Lunchrasten är rasten vid lunchen.'],
    ' ställer vi ut en ', ['tydlig skylt', null, 'Tydlig beskriver skylten.'],
    ' i korridoren. Kolla ', ['anslags tavlan', 'anslagstavlan', 'En anslagstavla är en tavla för anslag.'],
    ' för ', ['öppet tiderna', 'öppettiderna', 'Öppettider anger när något är öppet.'], '.']
];

const stages = ['discover', 'guide', 'practice', 'notice', 'exit', 'finished'];
const get = (id) => document.getElementById(id);
let correctCount = 0;
let streakCount = 0;
let posterChoices = [];

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function show(stage) {
  for (const id of stages) get(id).hidden = id !== stage;
  const progress = get('progress');
  progress.hidden = stage === 'finished';
  progress.textContent = `Del ${stages.indexOf(stage) + 1} av 5`;
  get(`${stage}-title`).focus();
}

function renderQuestion(quiz, questions, index, nextStage) {
  const [prompt, correct, other, explanation] = questions[index];
  const count = make('p', 'question-count', `Fråga ${index + 1} av ${questions.length}`);
  const sentence = make('p', 'sentence');
  sentence.tabIndex = -1;
  if (prompt.includes('[___]')) {
    const [before, after] = prompt.split('[___]');
    const blank = make('mark', '', '…');
    blank.setAttribute('aria-label', 'lucka');
    sentence.append(before, blank, after);
  } else {
    sentence.textContent = prompt;
  }

  const choices = make('div', 'choices');
  const feedback = make('p', 'feedback');
  feedback.setAttribute('role', 'status');
  const last = index === questions.length - 1;
  const advance = make('button', 'lv-btn-next', last ? 'Gå vidare' : 'Nästa fråga');
  advance.type = 'button';
  advance.hidden = true;
  advance.addEventListener('click', () => {
    if (last) {
      show(nextStage);
    } else {
      renderQuestion(quiz, questions, index + 1, nextStage).focus();
    }
  });

  const answers = Math.random() < 0.5 ? [correct, other] : [other, correct];
  for (const answer of answers) {
    const choice = make('button', '', answer);
    choice.type = 'button';
    choice.addEventListener('click', () => {
      const isCorrect = answer === correct;
      for (const button of choices.children) {
        button.disabled = true;
        if (button.textContent === correct) button.dataset.state = 'correct';
      }
      if (!isCorrect) choice.dataset.state = 'incorrect';

      if (questions === practice) {
        if (isCorrect) correctCount += 1;
        streakCount = isCorrect ? streakCount + 1 : 0;
        get('correct-count').textContent = correctCount;
        get('streak-count').textContent = streakCount;
      }

      feedback.dataset.state = isCorrect ? 'correct' : 'incorrect';
      feedback.textContent = isCorrect ? `Rätt! ${explanation}` : `Rätt svar är ”${correct}”. ${explanation}`;
      advance.hidden = false;
      advance.focus();
    });
    choices.append(choice);
  }

  quiz.replaceChildren(count, sentence, choices, feedback, advance);
  return sentence;
}

function buildPoster() {
  const container = get('poster');
  container.replaceChildren();
  posterChoices = [];
  for (const parts of posterText) {
    const paragraph = make('p');
    for (const part of parts) {
      if (typeof part === 'string') {
        paragraph.append(part);
        continue;
      }

      const [separate, correct, reason] = part;
      const joined = correct ?? separate.replaceAll(' ', '');
      const button = make('button', 'join', separate);
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        const pressed = button.getAttribute('aria-pressed') === 'false';
        button.setAttribute('aria-pressed', String(pressed));
        button.textContent = pressed ? joined : separate;
        delete button.dataset.state;
        get('notice-feedback').replaceChildren();
      });
      posterChoices.push({ button, separate, correct, reason });
      paragraph.append(button);
    }
    container.append(paragraph);
  }
}

function checkPoster() {
  const mistakes = [];
  for (const { button, separate, correct, reason } of posterChoices) {
    const joined = button.getAttribute('aria-pressed') === 'true';
    const isCorrect = joined === Boolean(correct);
    button.dataset.state = isCorrect ? 'correct' : 'incorrect';
    if (!isCorrect) mistakes.push(`”${separate}”. ${reason}`);
  }

  const feedback = get('notice-feedback');
  if (mistakes.length) {
    feedback.dataset.state = 'incorrect';
    const list = make('ul');
    for (const mistake of mistakes) list.append(make('li', '', mistake));
    feedback.replaceChildren(make('p', '', 'Titta en gång till på de rödmarkerade uttrycken.'), list);
    return;
  }

  feedback.dataset.state = 'correct';
  feedback.textContent = 'Alla uttryck är rätt skrivna. Anslaget är klart!';
  for (const { button } of posterChoices) button.disabled = true;
  get('check-notice').hidden = true;
  get('start-exit').hidden = false;
  get('start-exit').focus();
}

function checkExit(event) {
  event.preventDefault();
  const correction = get('correction').value.trim().toLocaleLowerCase('sv')
    .replace(/\s+/g, ' ').replace(/\.$/, '');
  const feedback = get('exit-feedback');

  if (correction !== 'vi hängde vår färgglada affisch på anslagstavlan') {
    feedback.dataset.state = 'incorrect';
    feedback.textContent = 'Prova igen. Läs hela meningen och tänk på vilka två uttryck som kan bli sammansatta ord.';
    get('correction').focus();
    return;
  }
  if (!get('explanation').value.trim()) {
    feedback.dataset.state = 'incorrect';
    feedback.textContent = 'Skriv din egen förklaring innan du går vidare.';
    get('explanation').focus();
    return;
  }

  feedback.dataset.state = 'correct';
  feedback.textContent = 'Meningen är rätt skriven. Jämför gärna din förklaring med exemplet: Anslagstavlan är tavlan där man sätter upp anslag. Därför skriver vi anslagstavlan som ett ord.';
  get('correction').readOnly = true;
  get('explanation').readOnly = true;
  get('check-exit').hidden = true;
  get('finish-lesson').hidden = false;
  get('finish-lesson').focus();
}

renderQuestion(get('discover-quiz'), discovery, 0, 'guide');
buildPoster();
get('start-practice').addEventListener('click', () => {
  renderQuestion(get('practice-quiz'), practice, 0, 'notice');
  show('practice');
});
get('check-notice').addEventListener('click', checkPoster);
get('start-exit').addEventListener('click', () => show('exit'));
get('exit-form').addEventListener('submit', checkExit);
get('finish-lesson').addEventListener('click', () => {
  get('result').textContent = `Du fick ${correctCount} av ${practice.length} rätt i träningen och rättade skolans anslag.`;
  get('final-explanation').textContent = get('explanation').value.trim();
  show('finished');
});
get('restart').addEventListener('click', () => location.reload());
