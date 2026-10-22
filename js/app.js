const BETA_URL = "";
const CODE_KEY = "ok_piloto_code";
const CONSENT_VERSION = "2026-10";
const OFFLINE = "No pudimos conectar. Intenta de nuevo en unos minutos.";

const PSS = [
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

const SUS = [
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

const state = { minDias: 14, consent: false };
let opener = null;

function params() {
  return new URLSearchParams(location.search);
}

function homeHref() {
  return params().has("dev") ? "/?dev=1" : "/";
}

function postHref() {
  const next = new URLSearchParams();
  next.set("fase", "post");
  if (params().has("dev")) next.set("dev", "1");
  return `/?${next.toString()}`;
}

function show(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === id);
  });
  const title = document.querySelector(`#${id} h1`);
  if (title) {
    title.tabIndex = -1;
    title.focus();
  }
  window.scrollTo(0, 0);
}

function mountCrisis() {
  const tpl = document.getElementById("crisis-tpl");
  document.querySelectorAll("[data-crisis]").forEach((slot) => {
    slot.replaceWith(tpl.content.cloneNode(true));
  });
}

function optionsFrom(pairs) {
  return pairs.map(([label, value]) => ({ label, value }));
}

function numberOptions(min, max) {
  const list = [];
  for (let value = min; value <= max; value += 1) {
    list.push({ label: String(value), value });
  }
  return list;
}

function addChoices(container, prefix, labelledBy, choices) {
  const box = document.createElement("div");
  box.className = "options";
  box.setAttribute("role", "radiogroup");
  box.setAttribute("aria-labelledby", labelledBy);
  choices.forEach((choice) => {
    const id = `${prefix}-0-${choice.value}`;
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `${prefix}-0`;
    input.id = id;
    input.value = String(choice.value);
    label.htmlFor = id;
    label.append(input, document.createTextNode(choice.label));
    box.append(label);
  });
  container.append(box);
}

function addScale(container, prefix, questions, choices) {
  questions.forEach((question, index) => {
    const field = document.createElement("fieldset");
    field.className = "scale";
    const legend = document.createElement("legend");
    legend.textContent = question;
    const box = document.createElement("div");
    box.className = "options";
    choices.forEach((choice) => {
      const id = `${prefix}-${index}-${choice.value}`;
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `${prefix}-${index}`;
      input.id = id;
      input.value = String(choice.value);
      label.htmlFor = id;
      label.append(input, document.createTextNode(choice.label));
      box.append(label);
    });
    field.append(legend, box);
    container.append(field);
  });
}

function readScale(prefix, count) {
  const values = [];
  for (let index = 0; index < count; index += 1) {
    const picked = document.querySelector(`input[name="${prefix}-${index}"]:checked`);
    if (!picked) {
      return {
        values: null,
        first: document.querySelector(`input[name="${prefix}-${index}"]`),
      };
    }
    values.push(Number(picked.value));
  }
  return { values, first: null };
}

function showAlert(id, message) {
  const alert = document.getElementById(id);
  alert.replaceChildren();
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-triangle-exclamation";
  icon.setAttribute("aria-hidden", "true");
  alert.append(icon, document.createTextNode(` ${message}`));
  alert.classList.add("show");
}

function clearAlert(id) {
  const alert = document.getElementById(id);
  alert.replaceChildren();
  alert.classList.remove("show");
}

function setBusy(button, busy) {
  button.disabled = busy;
  const icon = button.querySelector(".fa-spinner");
  if (icon) icon.hidden = !busy;
}

function focusables(root) {
  return [...root.querySelectorAll("a[href], button, input, select, textarea")].filter((el) => {
    if (el.disabled || el.hidden || el.closest("[hidden]")) return false;
    return el.getClientRects().length > 0;
  });
}

function trapTab(event) {
  if (event.key !== "Tab") return;
  const items = focusables(event.currentTarget);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function openModal(dialog, keepOpener) {
  if (!keepOpener && !document.querySelector("dialog[open]")) opener = document.activeElement;
  dialog.showModal();
  const title = dialog.querySelector("h2");
  title.tabIndex = -1;
  title.focus();
}

function closeModal(dialog) {
  if (dialog.open) dialog.close();
}

function atEnd(el) {
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
}

function codeMessage(code) {
  return `Tu código de participación es ${code}. Lo necesitarás para el cuestionario final del piloto de OK?: piloto.okapp.mx/?fase=post`;
}

function rememberCode(code) {
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {
    /* el navegador puede impedir el almacenamiento */
  }
}

function storedCode() {
  try {
    return localStorage.getItem(CODE_KEY) || "";
  } catch {
    return "";
  }
}

function fechaMx(iso) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });
}

function showClosed(message) {
  document.getElementById("p12-text").textContent = message;
  show("p12");
}

function showTooSoon(iso) {
  const text = document.getElementById("p11-text");
  text.replaceChildren();
  text.append("Aún estás en tu periodo de prueba con OK?. Vuelve a partir del ");
  const strong = document.createElement("strong");
  strong.textContent = fechaMx(iso);
  text.append(strong);
  text.append(" para responder tu cuestionario final.");
  show("p11");
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function wireModals() {
  const m1 = document.getElementById("m1");
  const m2 = document.getElementById("m2");
  const body = document.getElementById("m1-body");
  const read = document.getElementById("read-notice");
  const checks = ["c-age", "c-notice", "c-join"].map((id) => document.getElementById(id));
  let moving = false;

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("keydown", trapTab);
    dialog.addEventListener("close", () => {
      if (moving || document.querySelector("dialog[open]")) return;
      if (opener && typeof opener.focus === "function") opener.focus();
      opener = null;
    });
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      closeModal(document.getElementById(button.getAttribute("data-close")));
    });
  });

  document.getElementById("join").addEventListener("click", () => {
    document.getElementById("reject").hidden = true;
    read.disabled = true;
    body.scrollTop = 0;
    openModal(m1);
    requestAnimationFrame(() => {
      if (atEnd(body)) read.disabled = false;
    });
  });

  body.addEventListener("scroll", () => {
    if (atEnd(body)) read.disabled = false;
  });

  document.getElementById("cancel-notice").addEventListener("click", () => closeModal(m1));

  read.addEventListener("click", () => {
    checks.forEach((box) => {
      box.checked = false;
    });
    document.getElementById("accept").disabled = true;
    moving = true;
    closeModal(m1);
    openModal(m2, true);
    moving = false;
  });

  checks.forEach((box) => {
    box.addEventListener("change", () => {
      document.getElementById("accept").disabled = !checks.every((item) => item.checked);
    });
  });

  document.getElementById("accept").addEventListener("click", () => {
    if (!checks.every((item) => item.checked)) return;
    state.consent = true;
    opener = null;
    closeModal(m2);
    show("p3");
    document.getElementById("institucion").focus();
  });

  document.getElementById("decline").addEventListener("click", () => {
    state.consent = false;
    document.getElementById("reject").hidden = false;
    closeModal(m2);
    show("p1");
  });
}

function wirePre() {
  document.getElementById("profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    show("p4");
  });

  document.getElementById("pre-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert("pre-alert");
    const scale = readScale("pss-pre", 10);
    if (!scale.values) {
      showAlert("pre-alert", "Responde las 10 preguntas");
      scale.first.focus();
      return;
    }

    const button = document.getElementById("pre-send");
    setBusy(button, true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          fase: "pre",
          consent: true,
          consent_version: CONSENT_VERSION,
          institucion: document.getElementById("institucion").value,
          carrera: document.getElementById("carrera").value,
          semestre: document.getElementById("semestre").value,
          edad: document.getElementById("edad").value,
          pss: scale.values,
          web: document.getElementById("web").value,
        }),
      });
      const data = await readJson(res);
      if (res.status === 403 && data.codigo === "FASE_CERRADA") {
        showClosed(data.error);
        return;
      }
      if (!res.ok || !data.code) {
        showAlert("pre-alert", data.error || OFFLINE);
        setBusy(button, false);
        return;
      }
      presentCode(data.code);
    } catch {
      showAlert("pre-alert", OFFLINE);
      setBusy(button, false);
    }
  });
}

function presentCode(code) {
  document.getElementById("code-value").textContent = code;
  rememberCode(code);
  const days = document.getElementById("min-days");
  if (state.minDias > 0) {
    document.getElementById("min-days-n").textContent = `${state.minDias} días`;
    days.hidden = false;
  } else {
    days.hidden = true;
  }
  const beta = document.getElementById("beta-link");
  if (BETA_URL) {
    beta.href = BETA_URL;
    beta.removeAttribute("aria-disabled");
  }
  show("p5");
}

function wireCodeTools() {
  const beta = document.getElementById("beta-link");
  if (!BETA_URL) {
    beta.removeAttribute("href");
    beta.setAttribute("aria-disabled", "true");
    beta.addEventListener("click", (event) => event.preventDefault());
  }

  document.getElementById("copy-code").addEventListener("click", async () => {
    const code = document.getElementById("code-value").textContent;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const area = document.createElement("textarea");
      area.value = code;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    const button = document.getElementById("copy-code");
    button.replaceChildren();
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-circle-check";
    icon.setAttribute("aria-hidden", "true");
    button.append(icon, document.createTextNode(" Copiado"));
  });

  document.getElementById("download-code").addEventListener("click", () => {
    const code = document.getElementById("code-value").textContent;
    const blob = new Blob([codeMessage(code)], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "codigo-ok-piloto.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  const share = document.getElementById("share-code");
  if (navigator.share) share.hidden = false;
  share.addEventListener("click", async () => {
    const code = document.getElementById("code-value").textContent;
    try {
      await navigator.share({ text: codeMessage(code) });
    } catch {
      /* cerrar el menú de compartir no es un fallo del envío */
    }
  });
}

function wirePost() {
  const input = document.getElementById("code-input");
  input.addEventListener("input", () => {
    const next = input.value.toUpperCase();
    if (next !== input.value) input.value = next;
  });
  const saved = storedCode();
  if (saved) input.value = saved.toUpperCase();

  document.getElementById("post-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert("post-alert");
    const code = input.value.trim().toUpperCase();
    if (!code) {
      showAlert("post-alert", "Escribe tu código");
      input.focus();
      return;
    }
    const pss = readScale("pss-post", 10);
    if (!pss.values) {
      showAlert("post-alert", "Responde las 10 preguntas");
      pss.first.focus();
      return;
    }
    const sus = readScale("sus", 10);
    if (!sus.values) {
      showAlert("post-alert", "Responde las 10 preguntas");
      sus.first.focus();
      return;
    }
    const sat = readScale("sat", 1);
    if (!sat.values) {
      showAlert("post-alert", "¿Qué tan satisfecho/a estás con OK?");
      sat.first.focus();
      return;
    }
    const nps = readScale("nps", 1);
    if (!nps.values) {
      showAlert("post-alert", "¿Qué tan probable es que recomiendes OK? a un compañero?");
      nps.first.focus();
      return;
    }

    const button = document.getElementById("post-send");
    setBusy(button, true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          fase: "post",
          code,
          pss: pss.values,
          sus: sus.values,
          satisfaccion: sat.values[0],
          nps: nps.values[0],
          util: document.getElementById("util").value,
          mejora: document.getElementById("mejora").value,
        }),
      });
      const data = await readJson(res);
      if (res.ok) {
        show("p10");
        return;
      }
      if (data.codigo === "TODAVIA_NO") {
        showTooSoon(data.disponible_desde);
        return;
      }
      if (data.codigo === "FASE_CERRADA") {
        showClosed(data.error);
        return;
      }
      showAlert("post-alert", data.error || OFFLINE);
      setBusy(button, false);
    } catch {
      showAlert("post-alert", OFFLINE);
      setBusy(button, false);
    }
  });
}

function applyPhase(fase) {
  const join = document.getElementById("join");
  const closedBox = document.getElementById("p1b");
  const goPost = document.getElementById("go-post");
  const postClosed = document.getElementById("post-closed");
  goPost.href = postHref();

  if (fase === "POST") {
    join.hidden = true;
    closedBox.hidden = false;
  }
  if (fase === "PRE") {
    goPost.hidden = true;
    postClosed.hidden = false;
  }
}

async function boot() {
  mountCrisis();
  document.querySelectorAll(".home-link").forEach((link) => {
    link.href = homeHref();
  });
  document.getElementById("go-post").href = postHref();

  addScale(document.getElementById("pss-pre"), "pss-pre", PSS, optionsFrom(PSS_OPTIONS));
  addScale(document.getElementById("pss-post"), "pss-post", PSS, optionsFrom(PSS_OPTIONS));
  addScale(document.getElementById("sus-post"), "sus", SUS, numberOptions(1, 5));
  addChoices(document.getElementById("sat-post"), "sat", "sat-title", numberOptions(1, 5));
  addChoices(document.getElementById("nps-post"), "nps", "nps-title", numberOptions(0, 10));

  wireModals();
  wirePre();
  wireCodeTools();
  wirePost();

  if (/Instagram/i.test(navigator.userAgent)) {
    document.getElementById("ig-note").hidden = false;
  }

  let status;
  try {
    const res = await fetch("/api/submit", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("estado");
    status = await res.json();
  } catch {
    show("offline");
    return;
  }

  state.minDias = Number.isInteger(status.min_dias_post) ? status.min_dias_post : 14;
  const android = /Android/i.test(navigator.userAgent) || params().has("dev");
  if (!android) {
    show("p2");
    return;
  }

  const fase = status.fase === "PRE" || status.fase === "POST" ? status.fase : "AMBAS";
  if (params().get("fase") === "post") {
    if (fase === "PRE") {
      showClosed("El cuestionario final se habilitará al concluir las semanas de prueba.");
      return;
    }
    show("post");
    return;
  }

  applyPhase(fase);
  show("p1");
}

boot();
