import {
  fechaLarga,
  PSS,
  SUS,
  addChoices,
  addScale,
  bindCounter,
  clearAlert,
  failConnection,
  fechaMx,
  flashSent,
  isAndroid,
  loadStatus,
  markMissing,
  mountChrome,
  mountCrisis,
  numberOptions,
  pssChoices,
  readJson,
  readScale,
  restoreButton,
  setBusy,
  show,
  showAlert,
  storedCode,
  withDev,
} from "./comun.js";

const OFFLINE = "No pudimos conectar. Intenta de nuevo en unos minutos.";

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
    const checks = [
      ["pss-post", 10, "Responde las 10 preguntas"],
      ["sus", 10, "Responde las 10 preguntas"],
      ["sat", 1, "¿Qué tan satisfecho/a estás con OK?"],
      ["nps", 1, "¿Qué tan probable es que recomiendes OK? a un compañero?"],
    ];
    const values = {};
    for (const [prefix, count, message] of checks) {
      const scale = readScale(prefix, count);
      if (!scale.values) {
        showAlert("post-alert", message);
        markMissing(scale.card);
        return;
      }
      values[prefix] = scale.values;
    }
    document.querySelectorAll(".q-card.missing").forEach((el) => el.classList.remove("missing"));

    const button = document.getElementById("post-send");
    setBusy(button, true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          fase: "post",
          code,
          pss: values["pss-post"],
          sus: values.sus,
          satisfaccion: values.sat[0],
          nps: values.nps[0],
          util: document.getElementById("util").value,
          mejora: document.getElementById("mejora").value,
        }),
      });
      const data = await readJson(res);
      if (res.ok) {
        await flashSent(button);
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
      restoreButton(button);
    } catch {
      showAlert("post-alert", OFFLINE);
      restoreButton(button);
    }
  });
}

async function boot() {
  mountCrisis();
  mountChrome();
  document.querySelectorAll(".home-link").forEach((link) => {
    link.href = withDev("/");
  });

  addScale(document.getElementById("pss-post"), "pss-post", PSS, pssChoices(), "stack");
  addScale(document.getElementById("sus-post"), "sus", SUS, numberOptions(1, 5), "sus");
  addChoices(document.getElementById("sat-post"), "sat", "sat-title", numberOptions(1, 5), "stack");
  addChoices(document.getElementById("nps-post"), "nps", "nps-title", numberOptions(0, 10), "nps");
  bindCounter(document.getElementById("post-form"), document.getElementById("post-count"), 22);
  wirePost();

  let status;
  try {
    status = await loadStatus();
  } catch {
    failConnection();
    return;
  }

  if (!isAndroid()) {
    show("p2");
    return;
  }

  const fase = status.fase === "PRE" || status.fase === "POST" ? status.fase : "AMBAS";
  if (fase === "PRE") {
    const aviso = status.post_desde
      ? `El cuestionario final se habilitará a partir del ${fechaLarga(status.post_desde)}.`
      : "El cuestionario final se habilitará al concluir las semanas de prueba.";
    showClosed(aviso);
    return;
  }

  show("post");
}

boot();
