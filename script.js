const STAGE_WIDTH = 720;
const STAGE_HEIGHT = 540;

const PIVOT = { x: 359.67, y: 273.69 };
const HOUR_HAND_LENGTH = 101;
const MINUTE_HAND_LENGTH = 129;
const GRAB_DISTANCE = 18;
const HOUR_IMAGE_ANGLE = 120; // the hour hand image points at 4

const TOTAL_QUESTIONS = 10;
const START_TIME = 4 * 60;
const OCLOCK_CHANCE = 0.3;
const NO_OCLOCK_AUDIO = [11];
const NEXT_QUESTION_DELAY = 1800;

const AUDIO_PATH = "assets/audio/";

const stage = document.getElementById("stage");
const hourHand = document.getElementById("hand-hour");
const minuteHand = document.getElementById("hand-minute");
const digital = document.getElementById("digital");
const digitalTime = document.getElementById("digital-time");
const replayBtn = document.getElementById("replay-btn");
const questionBanner = document.getElementById("question-banner");
const questionText = document.getElementById("question-text");
const progressText = document.getElementById("progress");
const feedback = document.getElementById("feedback");
const startScreen = document.getElementById("start-screen");
const endScreen = document.getElementById("end-screen");

// Minutes since 12:00. Not wrapped to 0-719 so the hands never animate backwards.
let clockMinutes = START_TIME;

let questions = [];
let questionIndex = 0;
let acceptingAnswers = false;
let dragging = null;

function mod(value, n) {
  return ((value % n) + n) % n;
}

function shortestChange(change, fullCircle) {
  return mod(change + fullCircle / 2, fullCircle) - fullCircle / 2;
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pad2(number) {
  return String(number).padStart(2, "0");
}

function toHourMinute(totalMinutes) {
  const whole = mod(Math.round(totalMinutes), 720);
  return { hour: Math.floor(whole / 60) || 12, minute: whole % 60 };
}

function describe(question) {
  if (question.minute === 0) return `${question.hour} o'clock`;
  return `${question.hour}:${pad2(question.minute)}`;
}

// ---------- Clock ----------

function drawClock() {
  minuteHand.style.transform = `rotate(${clockMinutes * 6}deg)`;
  hourHand.style.transform = `rotate(${clockMinutes * 0.5 - HOUR_IMAGE_ANGLE}deg)`;

  // "!" is a blank digit in the DSEG7 font
  const { hour, minute } = toHourMinute(clockMinutes);
  digitalTime.textContent = `${String(hour).padStart(2, "!")}:${pad2(minute)}`;
}

// ---------- Questions ----------

function makeQuestions() {
  const list = [];
  let previous = { hour: toHourMinute(clockMinutes).hour, minute: -1 };

  while (list.length < TOTAL_QUESTIONS) {
    const hour = randomInt(1, 12);
    const wantOclock = previous.minute !== 0 && Math.random() < OCLOCK_CHANCE;
    const minute = wantOclock ? 0 : randomInt(1, 11) * 5;

    const sameHourAsLast = hour === previous.hour;
    const noAudio = minute === 0 && NO_OCLOCK_AUDIO.includes(hour);
    const alreadyAsked = list.some((q) => q.hour === hour && q.minute === minute);
    if (sameHourAsLast || noAudio || alreadyAsked) continue;

    const question = { hour, minute };
    list.push(question);
    previous = question;
  }
  return list;
}

function showQuestion() {
  const question = questions[questionIndex];
  questionText.textContent = `Set the clock to ${describe(question)}`;
  progressText.textContent = `${questionIndex + 1} / ${TOTAL_QUESTIONS}`;
  questionBanner.classList.remove("hidden");
  acceptingAnswers = true;
  playQuestionAudio();
}

function checkAnswer() {
  const question = questions[questionIndex];
  const { hour, minute } = toHourMinute(clockMinutes);
  if (hour !== question.hour || minute !== question.minute) return;

  acceptingAnswers = false;
  stopAudio();
  playChime();
  feedback.classList.remove("hidden");
  digital.classList.add("correct");

  setTimeout(() => {
    feedback.classList.add("hidden");
    digital.classList.remove("correct");
    questionIndex++;
    if (questionIndex < TOTAL_QUESTIONS) {
      showQuestion();
    } else {
      questionBanner.classList.add("hidden");
      endScreen.classList.remove("hidden");
    }
  }, NEXT_QUESTION_DELAY);
}

// ---------- Audio ----------

const audioCache = {};
let audioRun = 0;
let audioContext = null;

function getAudio(file) {
  if (!audioCache[file]) {
    audioCache[file] = new Audio(AUDIO_PATH + file);
    audioCache[file].preload = "auto";
  }
  return audioCache[file];
}

function questionClips(question) {
  if (question.minute === 0) {
    return ["set-the-clock-to.mp3", `oclock/${question.hour}.mp3`];
  }
  return [
    "set-the-clock-to.mp3",
    `hours/${question.hour}.mp3`,
    `minutes/${pad2(question.minute)}.mp3`,
  ];
}

function playSequence(files) {
  stopAudio();
  const run = audioRun;
  replayBtn.classList.add("playing");

  function playClip(i) {
    if (run !== audioRun) return;
    if (i >= files.length) {
      replayBtn.classList.remove("playing");
      return;
    }
    const clip = getAudio(files[i]);
    clip.currentTime = 0;
    clip.onended = () => playClip(i + 1);
    clip.play().catch(() => replayBtn.classList.remove("playing"));
  }
  playClip(0);
}

function stopAudio() {
  audioRun++;
  for (const clip of Object.values(audioCache)) {
    clip.onended = null;
    clip.pause();
  }
  replayBtn.classList.remove("playing");
}

function playQuestionAudio() {
  playSequence(questionClips(questions[questionIndex]));
}

function preloadAllAudio() {
  getAudio("set-the-clock-to.mp3");
  for (let h = 1; h <= 12; h++) {
    getAudio(`hours/${h}.mp3`);
    if (!NO_OCLOCK_AUDIO.includes(h)) getAudio(`oclock/${h}.mp3`);
  }
  for (let m = 5; m <= 55; m += 5) getAudio(`minutes/${pad2(m)}.mp3`);
}

function playChime() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    [784, 1047].forEach((frequency, i) => {
      const start = now + i * 0.14;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "triangle";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch (error) {
    // Web Audio unavailable: skip the chime
  }
}

// ---------- Dragging ----------

function toStagePoint(event) {
  const box = stage.getBoundingClientRect();
  return {
    x: ((event.clientX - box.left) * STAGE_WIDTH) / box.width,
    y: ((event.clientY - box.top) * STAGE_HEIGHT) / box.height,
  };
}

// 0° = 12 o'clock, clockwise
function angleOf(point) {
  const degrees = (Math.atan2(point.x - PIVOT.x, PIVOT.y - point.y) * 180) / Math.PI;
  return mod(degrees, 360);
}

function distanceToHand(point, handAngle, handLength) {
  const radians = (handAngle * Math.PI) / 180;
  const dirX = Math.sin(radians);
  const dirY = -Math.cos(radians);
  const dx = point.x - PIVOT.x;
  const dy = point.y - PIVOT.y;
  const along = dx * dirX + dy * dirY;
  const across = Math.abs(dx * dirY - dy * dirX);
  if (along < -10 || along > handLength + 12 || across > GRAB_DISTANCE) return Infinity;
  return across;
}

function handUnder(point) {
  const toMinute = distanceToHand(point, clockMinutes * 6, MINUTE_HAND_LENGTH);
  const toHour = distanceToHand(point, clockMinutes * 0.5, HOUR_HAND_LENGTH);
  if (toMinute === Infinity && toHour === Infinity) return null;
  return toHour < toMinute ? "hour" : "minute";
}

function moveHandTo(point) {
  const angle = angleOf(point);
  if (dragging === "minute") {
    clockMinutes += shortestChange(angle / 6 - mod(clockMinutes, 60), 60);
  } else {
    clockMinutes += shortestChange(angle * 2 - mod(clockMinutes, 720), 720);
  }
  drawClock();
}

function setSnapping(on) {
  hourHand.classList.toggle("snapping", on);
  minuteHand.classList.toggle("snapping", on);
}

stage.addEventListener("pointerdown", (event) => {
  if (!acceptingAnswers || event.target.closest("button")) return;
  const hand = handUnder(toStagePoint(event));
  if (!hand) return;

  dragging = hand;
  setSnapping(false);
  stage.setPointerCapture(event.pointerId);
  stage.style.cursor = "grabbing";
  event.preventDefault();
});

stage.addEventListener("pointermove", (event) => {
  const point = toStagePoint(event);
  if (dragging) {
    moveHandTo(point);
  } else if (acceptingAnswers && !event.target.closest("button")) {
    stage.style.cursor = handUnder(point) ? "grab" : "";
  }
});

function endDrag() {
  if (!dragging) return;
  dragging = null;
  stage.style.cursor = "";

  setSnapping(true);
  clockMinutes = Math.round(clockMinutes / 5) * 5;
  drawClock();
  checkAnswer();
}

stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);

// ---------- Game flow ----------

function startGame() {
  startScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  preloadAllAudio();
  questions = makeQuestions();
  questionIndex = 0;
  showQuestion();
}

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("play-again-btn").addEventListener("click", startGame);

replayBtn.addEventListener("click", () => {
  if (acceptingAnswers) playQuestionAudio();
});

// ---------- Scaling ----------

function fitStage() {
  const scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
  const left = (window.innerWidth - STAGE_WIDTH * scale) / 2;
  const top = (window.innerHeight - STAGE_HEIGHT * scale) / 2;
  stage.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
}

window.addEventListener("resize", fitStage);
fitStage();
drawClock();
