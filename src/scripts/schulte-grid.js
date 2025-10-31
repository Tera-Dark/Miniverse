const difficulties = {
  simple: { size: 3, label: "简单" },
  normal: { size: 4, label: "普通" },
  hard: { size: 5, label: "困难" },
  challenge: { size: 6, label: "挑战" },
  extreme: { size: 7, label: "极限" },
};

const pastelPalettes = [
  { background: "#E8F6F3", color: "#13453b" },
  { background: "#FFF4E6", color: "#5b3610" },
  { background: "#E7F0FE", color: "#1f3c88" },
  { background: "#F3E8FF", color: "#3a2474" },
  { background: "#FDF2F8", color: "#712749" },
  { background: "#F2FBF9", color: "#10412f" },
  { background: "#F5F0FF", color: "#44306c" },
  { background: "#EAF4FC", color: "#1f2a44" },
  { background: "#FAF7F0", color: "#3d3424" },
];

const fontFamilies = [
  '"Nunito", "PingFang SC", "Microsoft YaHei", sans-serif',
  '"Poppins", "PingFang SC", "Microsoft YaHei", sans-serif',
  '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
  '"Quicksand", "PingFang SC", "Microsoft YaHei", sans-serif',
  '"Baloo 2", "PingFang SC", "Microsoft YaHei", sans-serif',
];

const borderRadiusOptions = [14, 16, 18, 20, 24];

const state = {
  difficultyKey: "simple",
  nextNumber: 1,
  maxNumber: 9,
  startTime: null,
  timerInterval: null,
};

const gridElement = document.getElementById("grid");
const nextNumberElement = document.getElementById("next-number");
const timerElement = document.getElementById("timer");
const resultElement = document.getElementById("result");
const restartButton = document.getElementById("restart-button");
const difficultyButtons = Array.from(
  document.querySelectorAll(".difficulty-button")
);

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function formatTime(elapsed) {
  const totalMilliseconds = Math.floor(elapsed);
  const minutes = Math.floor(totalMilliseconds / 60000)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  const tenths = Math.floor((totalMilliseconds % 1000) / 100);
  return `${minutes}:${seconds}.${tenths}`;
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function startTimer() {
  state.startTime = performance.now();
  stopTimer();
  state.timerInterval = setInterval(() => {
    const elapsed = performance.now() - state.startTime;
    timerElement.textContent = formatTime(elapsed);
  }, 80);
}

function randomPastel() {
  return pastelPalettes[Math.floor(Math.random() * pastelPalettes.length)];
}

function randomFontFamily() {
  return fontFamilies[Math.floor(Math.random() * fontFamilies.length)];
}

function randomRadius() {
  return borderRadiusOptions[Math.floor(Math.random() * borderRadiusOptions.length)];
}

function randomFontSize(size) {
  const base = size >= 6 ? 1.3 : size >= 5 ? 1.5 : 1.7;
  const max = size >= 6 ? 1.8 : size >= 5 ? 2.1 : 2.4;
  const value = (Math.random() * (max - base) + base).toFixed(2);
  return `${value}rem`;
}

function resetResult() {
  resultElement.classList.remove("is-visible");
  resultElement.textContent = "";
}

function announceResult(message) {
  resultElement.textContent = message;
  resultElement.classList.add("is-visible");
}

function updateNextNumberDisplay() {
  nextNumberElement.textContent = state.nextNumber;
}

function applyRandomAppearance(element, size) {
  const { background, color } = randomPastel();
  element.style.backgroundColor = background;
  element.style.color = color;
  element.style.fontFamily = randomFontFamily();
  element.style.borderRadius = `${randomRadius()}px`;
  element.style.fontSize = randomFontSize(size);
  element.style.fontWeight = Math.random() > 0.6 ? 700 : 600;
}

function createCell(number, size) {
  const button = document.createElement("button");
  button.className = "cell";
  button.type = "button";
  button.textContent = number;
  button.dataset.value = String(number);
  button.setAttribute("role", "gridcell");
  button.setAttribute("aria-label", `数字 ${number}`);
  applyRandomAppearance(button, size);
  return button;
}

function setGridTemplate(size) {
  const minWidth = size >= 6 ? 60 : size >= 5 ? 74 : 90;
  gridElement.style.gridTemplateColumns = `repeat(${size}, minmax(${minWidth}px, 1fr))`;
}

function generateGrid(difficultyKey) {
  const { size, label } = difficulties[difficultyKey];
  state.difficultyKey = difficultyKey;
  state.nextNumber = 1;
  state.maxNumber = size * size;

  stopTimer();
  timerElement.textContent = "00:00.0";
  state.startTime = null;
  resetResult();
  updateNextNumberDisplay();

  const numbers = shuffle(Array.from({ length: state.maxNumber }, (_, i) => i + 1));
  gridElement.innerHTML = "";
  setGridTemplate(size);

  numbers.forEach((number) => {
    const cell = createCell(number, size);
    gridElement.appendChild(cell);
  });

  gridElement.setAttribute("aria-rowcount", String(size));
  gridElement.setAttribute("aria-colcount", String(size));
  const activeButton = difficultyButtons.find((btn) => btn.dataset.difficulty === difficultyKey);
  if (activeButton) {
    difficultyButtons.forEach((btn) => btn.classList.remove("is-active"));
    activeButton.classList.add("is-active");
  }

  announceResult(`难度「${label}」已准备就绪，点击数字 1 开始挑战。`);
}

function handleCorrectClick(target) {
  if (state.nextNumber === 1 && state.startTime === null) {
    startTimer();
  }

  target.classList.add("correct");
  target.disabled = true;
  state.nextNumber += 1;
  updateNextNumberDisplay();

  if (state.nextNumber > state.maxNumber) {
    stopTimer();
    const elapsed = performance.now() - state.startTime;
    nextNumberElement.textContent = "完成";
    announceResult(
      `🎉 恭喜通关！用时 ${formatTime(elapsed)}，试试更高难度或刷新挑战记录吧。`
    );
  }
}

function handleWrongClick(target) {
  target.classList.add("is-wrong");
  setTimeout(() => {
    target.classList.remove("is-wrong");
  }, 200);
}

function handleGridClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const value = Number(target.dataset.value);
  if (Number.isNaN(value)) return;

  if (value === state.nextNumber) {
    handleCorrectClick(target);
  } else if (value > state.nextNumber) {
    handleWrongClick(target);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  gridElement.addEventListener("click", handleGridClick);

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const { difficulty } = button.dataset;
      if (!difficulty) return;
      if (difficulty === state.difficultyKey) {
        generateGrid(difficulty);
      } else {
        generateGrid(difficulty);
      }
    });
  });

  restartButton.addEventListener("click", () => {
    generateGrid(state.difficultyKey);
  });

  generateGrid(state.difficultyKey);
});
