import { CODE_KEY, INSTAGRAM_URL, LOGO_SRC, OFFLINE } from "./config.js";

export const PSS = [
  "¿Con qué frecuencia te has sentido afectado/a por algo que ocurrió inesperadamente?",
  "¿Con qué frecuencia has sentido que no podías controlar las cosas importantes de tu vida?",
  "¿Con qué frecuencia te has sentido nervioso/a o estresado/a?",
  "¿Con qué frecuencia has confiado en tu capacidad para manejar tus problemas personales?",
  "¿Con qué frecuencia has sentido que las cosas te iban bien?",
  "¿Con qué frecuencia has sentido que no podías afrontar todas las cosas que tenías que hacer?",
  "¿Con qué frecuencia has podido controlar las dificultades de tu vida?",
  "¿Con qué frecuencia has sentido que tenías todo bajo control?",
  "¿Con qué frecuencia te has enfadado porque las cosas que te ocurrieron estaban fuera de tu control?",
  "¿Con qué frecuencia has sentido que las dificultades se acumulaban tanto que no podías superarlas?",
];

export const SUS = [
  "Creo que me gustaría usar esta aplicación con frecuencia.",
  "Encontré la aplicación innecesariamente compleja.",
  "Pensé que la aplicación era fácil de usar.",
  "Creo que necesitaría ayuda de una persona con conocimientos técnicos para usarla.",
  "Encontré que las funciones de la aplicación estaban bien integradas.",
  "Pensé que había demasiada inconsistencia en la aplicación.",
  "Imagino que la mayoría de las personas aprendería a usarla muy rápido.",
  "Encontré la aplicación muy incómoda de usar.",
  "Me sentí muy seguro/a usando la aplicación.",
  "Necesité aprender muchas cosas antes de poder usarla.",
];

const PSS_OPTIONS = [
  ["Nunca", 0],
  ["Casi nunca", 1],
  ["A veces", 2],
  ["Frecuentemente", 3],
  ["Muy frecuentemente", 4],
];

export function params() {
  return new URLSearchParams(location.search);
}

export function withDev(path) {
  return params().has("dev") ? `${path}${path.includes("?") ? "&" : "?"}dev=1` : path;
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent) || params().has("dev");
}

export function show(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    const on = screen.id === id;
    screen.classList.toggle("active", on);
    if (on) screen.classList.remove("enter");
  });
  const active = document.getElementById(id);
  if (active) {
    active.classList.add("enter");
    const title = active.querySelector("h1");
    if (title) {
      title.tabIndex = -1;
      title.focus();
    }
  }
  window.scrollTo(0, 0);
}

export function mountCrisis() {
  const tpl = document.getElementById("crisis-tpl");
  if (!tpl) return;
  document.querySelectorAll("[data-crisis]").forEach((slot) => {
    slot.replaceWith(tpl.content.cloneNode(true));
  });
}

export function mountChrome() {
  document.querySelectorAll("[data-logo]").forEach((img) => {
    img.src = LOGO_SRC;
  });
  document.querySelectorAll("[data-instagram]").forEach((link) => {
    link.href = INSTAGRAM_URL;
  });
}

export function optionsFrom(pairs) {
  return pairs.map(([label, value]) => ({ label, value }));
}

export function pssChoices() {
  return optionsFrom(PSS_OPTIONS);
}

export function numberOptions(min, max) {
  const list = [];
  for (let value = min; value <= max; value += 1) {
    list.push({ label: String(value), value });
  }
  return list;
}

export function addScale(container, prefix, questions, choices, layout) {
  questions.forEach((question, index) => {
    const field = document.createElement("fieldset");
    field.className = `q-card scale ${layout}`;
    const legend = document.createElement("legend");
    const num = document.createElement("span");
    num.className = "q-num";
    num.textContent = `${index + 1} de ${questions.length}`;
    const text = document.createElement("span");
    text.textContent = question;
    legend.append(num, text);
    const box = document.createElement("div");
    box.className = `options options-${layout}`;
    choices.forEach((choice) => {
      const id = `${prefix}-${index}-${choice.value}`;
      const label = document.createElement("label");
      label.className = "choice";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `${prefix}-${index}`;
      input.id = id;
      input.value = String(choice.value);
      const mark = document.createElement("i");
      mark.className = "fa-solid fa-circle-check";
      mark.setAttribute("aria-hidden", "true");
      label.append(input, mark, document.createTextNode(choice.label));
      box.append(label);
    });
    if (layout === "sus") {
      const ends = document.createElement("div");
      ends.className = "ends";
      ends.append(span("Totalmente en desacuerdo"), span("Totalmente de acuerdo"));
      field.append(legend, box, ends);
    } else if (layout === "nps") {
      const ends = document.createElement("div");
      ends.className = "ends";
      ends.append(span("Nada probable"), span("Muy probable"));
      field.append(legend, box, ends);
    } else {
      field.append(legend, box);
    }
    container.append(field);
  });
}

function span(text) {
  const el = document.createElement("span");
  el.textContent = text;
  return el;
}

export function addChoices(container, prefix, labelledBy, choices, layout) {
  const field = document.createElement("fieldset");
  field.className = `q-card scale ${layout}`;
  field.setAttribute("aria-labelledby", labelledBy);
  const box = document.createElement("div");
  box.className = `options options-${layout}`;
  box.setAttribute("role", "radiogroup");
  box.setAttribute("aria-labelledby", labelledBy);
  choices.forEach((choice) => {
    const id = `${prefix}-0-${choice.value}`;
    const label = document.createElement("label");
    label.className = "choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `${prefix}-0`;
    input.id = id;
    input.value = String(choice.value);
    const mark = document.createElement("i");
    mark.className = "fa-solid fa-circle-check";
    mark.setAttribute("aria-hidden", "true");
    label.append(input, mark, document.createTextNode(choice.label));
    box.append(label);
  });
  field.append(box);
  if (layout === "nps") {
    const ends = document.createElement("div");
    ends.className = "ends";
    ends.append(span("Nada probable"), span("Muy probable"));
    field.append(ends);
  }
  container.append(field);
}

export function readScale(prefix, count) {
  const values = [];
  for (let index = 0; index < count; index += 1) {
    const picked = document.querySelector(`input[name="${prefix}-${index}"]:checked`);
    const card = document.querySelector(`input[name="${prefix}-${index}"]`)?.closest(".q-card");
    if (!picked) {
      return { values: null, card, first: document.querySelector(`input[name="${prefix}-${index}"]`) };
    }
    values.push(Number(picked.value));
  }
  return { values, card: null, first: null };
}

export function markMissing(card) {
  document.querySelectorAll(".q-card.missing").forEach((el) => el.classList.remove("missing"));
  if (!card) return;
  card.classList.add("missing");
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function bindCounter(root, out, total) {
  const paint = () => {
    const n = root.querySelectorAll("input[type=radio]:checked").length;
    out.textContent = `${n} de ${total} respondidas`;
  };
  root.addEventListener("change", paint);
  paint();
}

export function showAlert(id, message) {
  const alert = document.getElementById(id);
  alert.replaceChildren();
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-triangle-exclamation";
  icon.setAttribute("aria-hidden", "true");
  alert.append(icon, document.createTextNode(` ${message}`));
  alert.classList.remove("show");
  void alert.offsetWidth;
  alert.classList.add("show");
}

export function clearAlert(id) {
  const alert = document.getElementById(id);
  alert.replaceChildren();
  alert.classList.remove("show");
}

export function setBusy(button, busy) {
  button.disabled = busy;
  if (!button.dataset.label) button.dataset.label = button.innerHTML;
  if (!busy) return;
  button.replaceChildren();
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-spinner fa-spin";
  icon.setAttribute("aria-hidden", "true");
  button.append(icon, document.createTextNode(" Enviando..."));
}

export function restoreButton(button) {
  button.disabled = false;
  if (button.dataset.label) button.innerHTML = button.dataset.label;
}

export function flashSent(button) {
  button.disabled = true;
  button.replaceChildren();
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-circle-check";
  icon.setAttribute("aria-hidden", "true");
  button.append(icon, document.createTextNode(" Enviado"));
  return new Promise((resolve) => {
    window.setTimeout(resolve, 600);
  });
}

export function disableForms() {
  document.querySelectorAll("button, input, select, textarea").forEach((el) => {
    if (el.closest("dialog")) return;
    el.disabled = true;
  });
}

export async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function loadStatus() {
  const res = await fetch("/api/submit", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("estado");
  return res.json();
}

export function fechaMx(iso) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });
}

export function rememberCode(code) {
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {
    /* el navegador puede impedir el almacenamiento */
  }
}

export function storedCode() {
  try {
    return localStorage.getItem(CODE_KEY) || "";
  } catch {
    return "";
  }
}

export function failConnection() {
  disableForms();
  show("offline");
}

export { OFFLINE };
