import { AVISO_APP_URL, BETA_URL, CARRERAS, CONSENT_VERSION, SITIO_URL } from "./config.js";
import {
  fechaLarga,
  PSS,
  addScale,
  bindCounter,
  clearAlert,
  failConnection,
  flashSent,
  isAndroid,
  loadStatus,
  markMissing,
  mountChrome,
  mountCrisis,
  pssChoices,
  readJson,
  readScale,
  rememberCode,
  restoreButton,
  setBusy,
  show,
  showAlert,
  withDev,
} from "./comun.js";

const state = { minDias: 14, postDesde: null };
let opener = null;

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

function leave() {
  location.href = withDev("/?sin_consentimiento=1");
}

function codeMessage(code) {
  return `Tu código de participación es ${code}. Lo necesitarás para el cuestionario final del piloto de OK?: ${SITIO_URL}/final`;
}

function setStep(step) {
  const label = document.getElementById("step-label");
  const bar = document.getElementById("step-bar");
  label.textContent = `Paso ${step} de 2`;
  bar.style.width = step === 1 ? "50%" : "100%";
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
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      leave();
    });
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", leave);
  });

  body.addEventListener("scroll", () => {
    if (atEnd(body)) read.disabled = false;
  });

  document.getElementById("cancel-notice").addEventListener("click", leave);

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
    opener = null;
    closeModal(m2);
    setStep(1);
    show("p3");
    document.getElementById("institucion").focus();
  });

  document.getElementById("decline").addEventListener("click", leave);

  return { m1, body, read, moving: () => moving };
}

function wireCarrera() {
  const institucion = document.getElementById("institucion");
  const carrera = document.getElementById("carrera");
  const list = document.getElementById("carrera");
  CARRERAS.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    list.append(option);
  });
  institucion.addEventListener("change", () => {
    if (institucion.value === "Otra") {
      carrera.value = "Otra";
      carrera.disabled = true;
      return;
    }
    carrera.disabled = false;
    carrera.value = "";
  });
}

function wirePre(modals) {
  document.getElementById("profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setStep(2);
    show("p4");
  });

  document.getElementById("pre-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert("pre-alert");
    const scale = readScale("pss-pre", 10);
    if (!scale.values) {
      showAlert("pre-alert", "Responde las 10 preguntas");
      markMissing(scale.card);
      return;
    }
    document.querySelectorAll(".q-card.missing").forEach((el) => el.classList.remove("missing"));

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
        document.getElementById("p12-text").textContent = data.error;
        show("p12");
        return;
      }
      if (!res.ok || !data.code) {
        showAlert("pre-alert", data.error || "No pudimos conectar. Intenta de nuevo en unos minutos.");
        restoreButton(button);
        return;
      }
      await flashSent(button);
      presentCode(data.code);
    } catch {
      showAlert("pre-alert", "No pudimos conectar. Intenta de nuevo en unos minutos.");
      restoreButton(button);
    }
  });

  return modals;
}

function presentCode(code) {
  document.getElementById("code-value").textContent = code;
  rememberCode(code);
  const days = document.getElementById("min-days");
  if (state.postDesde) {
    const fecha = fechaLarga(state.postDesde);
    document.getElementById("paso-uso").textContent = `Úsala hasta el ${fecha}.`;
    document.getElementById("min-days-text").textContent =
      `El cuestionario final se habilita a partir del ${fecha}.`;
    days.hidden = false;
  } else if (state.minDias > 0) {
    document.getElementById("min-days-n").textContent = `${state.minDias} días`;
    days.hidden = false;
  } else {
    days.hidden = true;
  }
  show("p5");
}

function wireCodeTools() {
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

async function boot() {
  mountCrisis();
  mountChrome();
  document.querySelectorAll(".home-link").forEach((link) => {
    link.href = withDev("/");
  });
  document.getElementById("beta-link").href = BETA_URL;
  document.getElementById("aviso-app").href = AVISO_APP_URL;
  addScale(document.getElementById("pss-pre"), "pss-pre", PSS, pssChoices(), "stack");
  bindCounter(document.getElementById("pre-form"), document.getElementById("pre-count"), 10);
  wireCarrera();
  const modals = wireModals();
  wirePre(modals);
  wireCodeTools();

  let status;
  try {
    status = await loadStatus();
  } catch {
    failConnection();
    return;
  }

  state.minDias = Number.isInteger(status.min_dias_post) ? status.min_dias_post : 14;
  state.postDesde = status.post_desde || null;
  if (state.postDesde) {
    const fecha = fechaLarga(state.postDesde);
    const que = document.getElementById("que-haras");
    que.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = "Qué harás.";
    que.append(
      strong,
      document.createTextNode(
        ` Responderás un cuestionario inicial (unos 8 minutos), usarás la app y, a partir del ${fecha}, responderás un cuestionario final (unos 10 minutos).`
      )
    );
  }

  if (!isAndroid()) {
    show("p2");
    return;
  }

  const fase = status.fase === "PRE" || status.fase === "POST" ? status.fase : "AMBAS";
  if (fase === "POST") {
    document.getElementById("p1b-text").textContent =
      "El registro inicial ha concluido. Si ya participaste, ingresa tu código para el cuestionario final.";
    show("p1b");
    return;
  }

  const m1 = document.getElementById("m1");
  const body = document.getElementById("m1-body");
  const read = document.getElementById("read-notice");
  read.disabled = true;
  body.scrollTop = 0;
  openModal(m1);
  requestAnimationFrame(() => {
    if (atEnd(body)) read.disabled = false;
  });
}

boot();
