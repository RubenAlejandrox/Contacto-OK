import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const PSS_REVERSE = new Set([3, 4, 6, 7]);
const CONSENT_VERSION = "2026-10";
const FAIL_TEXT = "No pudimos conectar. Intenta de nuevo en unos minutos.";
const INSTITUCIONES = ["ITTOL", "Otra"];
const CARRERAS = [
  "Ingeniería en Sistemas Computacionales",
  "Ingeniería en Tecnologías de la Información y Comunicaciones",
  "Ingeniería Mecatrónica",
  "Ingeniería Electromecánica",
  "Ingeniería Electrónica",
  "Ingeniería Industrial",
  "Ingeniería Química",
  "Ingeniería en Gestión Empresarial",
  "Ingeniería Logística",
  "Otra",
];

const MSG = {
  FASE_PRE:
    "El registro inicial ha concluido. Si ya participaste, ingresa tu código para el cuestionario final.",
  FASE_POST:
    "El cuestionario final se habilitará al concluir las semanas de prueba.",
  CODIGO: "Código no encontrado. Revisa que esté bien escrito.",
  YA: "Este código ya envió el cuestionario final.",
  TODAVIA: "Aún estás en tu periodo de prueba con OK?.",
  DATOS: "Datos inválidos.",
};

let sqlFn;

export function faseActual() {
  const value = process.env.PILOTO_FASE;
  if (value === "PRE" || value === "POST" || value === "AMBAS") return value;
  return "AMBAS";
}

export function minDiasPost() {
  const raw = process.env.MIN_DIAS_POST;
  if (raw === undefined || raw === "") return 14;
  if (!/^\d+$/.test(raw)) return 14;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 0) return 14;
  return n;
}

export function pssTotal(pss) {
  return pss.reduce((sum, value, index) => {
    return sum + (PSS_REVERSE.has(index) ? 4 - value : value);
  }, 0);
}

export function susScore(sus) {
  const sum = sus.reduce((total, value, index) => {
    const item = index + 1;
    return total + (item % 2 === 1 ? value - 1 : 5 - value);
  }, 0);
  return sum * 2.5;
}

export function makeCode() {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i += 1) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

function db() {
  if (!process.env.DATABASE_URL) {
    const error = new Error("no-db");
    error.code = "NO_DB";
    throw error;
  }
  if (!sqlFn) sqlFn = neon(process.env.DATABASE_URL);
  return sqlFn;
}

function rowsOf(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
}

function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(body);
}

function fail(res, status, error, codigo, extra) {
  send(res, status, { error, codigo, ...extra });
}

function readJson(req) {
  const body = req.body;
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  if (typeof body === "string" && body.trim()) return JSON.parse(body);
  return null;
}

function isInt(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isScale(value, length, min, max) {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((item) => isInt(item, min, max))
  );
}

function clip(value, max) {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, max);
  return text;
}

function requiredText(value, max) {
  const text = clip(value, max);
  if (!text) return null;
  return text;
}

function listasValidas(institucion, carrera) {
  if (!INSTITUCIONES.includes(institucion) || !CARRERAS.includes(carrera)) return false;
  if (institucion === "Otra" && carrera !== "Otra") return false;
  return true;
}

async function insertPre(code, institucion, carrera, semestre, edad, pss, total) {
  const result = await db().query(
    `WITH p AS (
       INSERT INTO participantes (code, consent_version, institucion, carrera, semestre, edad)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO NOTHING
       RETURNING code
     )
     INSERT INTO pss (code, momento, respuestas, total)
     SELECT code, 'pre', $7::smallint[], $8 FROM p
     RETURNING code`,
    [code, CONSENT_VERSION, institucion, carrera, semestre, edad, pss, total]
  );
  return rowsOf(result);
}

async function insertPost(code, pss, total, sus, score, satisfaccion, nps, util, mejora) {
  const result = await db().query(
    `WITH e AS (
       INSERT INTO evaluacion_app (
         code, sus_respuestas, sus_score, satisfaccion, nps, util, mejora
       )
       VALUES ($1, $2::smallint[], $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO NOTHING
       RETURNING code
     )
     INSERT INTO pss (code, momento, respuestas, total)
     SELECT code, 'post', $8::smallint[], $9 FROM e
     ON CONFLICT (code, momento) DO NOTHING
     RETURNING code`,
    [code, sus, score, satisfaccion, nps, util, mejora, pss, total]
  );
  return rowsOf(result);
}

async function handlePre(res, body) {
  if (faseActual() === "POST") {
    fail(res, 403, MSG.FASE_PRE, "FASE_CERRADA");
    return;
  }

  const trap = body.web;
  const trapped = typeof trap === "string" ? trap.trim() !== "" : Boolean(trap);
  if (trapped) {
    send(res, 200, { code: makeCode() });
    return;
  }

  const institucion = requiredText(body.institucion, 80);
  const carrera = requiredText(body.carrera, 80);
  const semestre = requiredText(body.semestre, 10);
  const edad = requiredText(body.edad, 20);
  if (
    body.consent !== true ||
    body.consent_version !== CONSENT_VERSION ||
    !institucion ||
    !carrera ||
    !semestre ||
    !edad ||
    !listasValidas(institucion, carrera) ||
    !isScale(body.pss, 10, 0, 4)
  ) {
    fail(res, 400, MSG.DATOS, "DATOS_INVALIDOS");
    return;
  }

  const total = pssTotal(body.pss);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode();
    const rows = await insertPre(code, institucion, carrera, semestre, edad, body.pss, total);
    if (rows.length > 0) {
      send(res, 200, { code });
      return;
    }
  }

  fail(res, 500, FAIL_TEXT, "ERROR");
}

async function handlePost(res, body) {
  if (faseActual() === "PRE") {
    fail(res, 403, MSG.FASE_POST, "FASE_CERRADA");
    return;
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const util = clip(body.util, 600);
  const mejora = clip(body.mejora, 600);
  if (
    !isScale(body.pss, 10, 0, 4) ||
    !isScale(body.sus, 10, 1, 5) ||
    !isInt(body.satisfaccion, 1, 5) ||
    !isInt(body.nps, 0, 10) ||
    util === null ||
    mejora === null
  ) {
    fail(res, 400, MSG.DATOS, "DATOS_INVALIDOS");
    return;
  }

  if (!CODE_RE.test(code)) {
    fail(res, 400, MSG.CODIGO, "CODIGO_NO_ENCONTRADO");
    return;
  }

  const days = minDiasPost();
  const found = rowsOf(
    await db().query(
      `SELECT created_at,
              created_at + make_interval(days => $2::int) AS disponible_desde,
              now() >= created_at + make_interval(days => $2::int) AS listo
       FROM participantes
       WHERE code = $1`,
      [code, days]
    )
  );

  if (found.length === 0) {
    fail(res, 400, MSG.CODIGO, "CODIGO_NO_ENCONTRADO");
    return;
  }

  const already = rowsOf(
    await db().query(`SELECT code FROM evaluacion_app WHERE code = $1`, [code])
  );
  if (already.length > 0) {
    fail(res, 409, MSG.YA, "YA_RESPONDIDO");
    return;
  }

  const row = found[0];
  const listo = row.listo === true || row.listo === "t" || row.listo === "true";
  if (!listo) {
    const cuando = row.disponible_desde;
    const disponible =
      cuando instanceof Date ? cuando.toISOString() : new Date(cuando).toISOString();
    fail(res, 403, MSG.TODAVIA, "TODAVIA_NO", { disponible_desde: disponible });
    return;
  }

  const inserted = await insertPost(
    code,
    body.pss,
    pssTotal(body.pss),
    body.sus,
    susScore(body.sus),
    body.satisfaccion,
    body.nps,
    util,
    mejora
  );
  if (inserted.length === 0) {
    fail(res, 409, MSG.YA, "YA_RESPONDIDO");
    return;
  }

  send(res, 200, { ok: true });
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      send(res, 200, {
        fase: faseActual(),
        correo_habilitado: false,
        min_dias_post: minDiasPost(),
      });
      return;
    }

    if (req.method !== "POST") {
      fail(res, 405, MSG.DATOS, "DATOS_INVALIDOS");
      return;
    }

    let body;
    try {
      body = readJson(req);
    } catch {
      fail(res, 400, MSG.DATOS, "DATOS_INVALIDOS");
      return;
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      fail(res, 400, MSG.DATOS, "DATOS_INVALIDOS");
      return;
    }

    if (body.fase === "pre") {
      await handlePre(res, body);
      return;
    }
    if (body.fase === "post") {
      await handlePost(res, body);
      return;
    }

    fail(res, 400, MSG.DATOS, "DATOS_INVALIDOS");
  } catch {
    if (!res.headersSent) fail(res, 500, FAIL_TEXT, "ERROR");
  }
}
