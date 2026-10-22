import { fechaLarga, withDev, isAndroid, show, mountCrisis, mountChrome, loadStatus } from "./comun.js";

function applyPhase(fase, postDesde) {
  const join = document.getElementById("join");
  const closedBox = document.getElementById("p1b");
  const goPost = document.getElementById("go-post");
  const postClosed = document.getElementById("post-closed");
  goPost.href = withDev("/final");
  if (fase === "POST") {
    join.hidden = true;
    closedBox.hidden = false;
  }
  if (fase === "PRE") {
    goPost.hidden = true;
    postClosed.hidden = false;
    if (postDesde) {
      postClosed.textContent = `El cuestionario final se habilitará a partir del ${fechaLarga(postDesde)}.`;
    }
  }
}

async function boot() {
  mountCrisis();
  mountChrome();
  document.querySelectorAll(".home-link").forEach((link) => {
    link.href = withDev("/");
  });
  document.getElementById("go-post").href = withDev("/final");
  document.getElementById("join").addEventListener("click", () => {
    location.href = withDev("/registro");
  });

  if (/Instagram/i.test(navigator.userAgent)) {
    document.getElementById("ig-note").hidden = false;
  }
  if (new URLSearchParams(location.search).get("sin_consentimiento") === "1") {
    document.getElementById("reject").hidden = false;
  }

  let status;
  try {
    status = await loadStatus();
  } catch {
    document.getElementById("join").disabled = true;
    show("offline");
    return;
  }

  if (!isAndroid()) {
    show("p2");
    return;
  }

  const fase = status.fase === "PRE" || status.fase === "POST" ? status.fase : "AMBAS";
  if (status.post_desde) {
    document.getElementById("pocos-minutos").textContent =
      "Cerca de 8 minutos al inicio, 10 al final y uso libre de la app hasta el cuestionario final.";
  }
  applyPhase(fase, status.post_desde || null);
  show("p1");
}

boot();
