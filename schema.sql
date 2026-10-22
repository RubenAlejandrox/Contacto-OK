-- Migración v1.4: borra la tabla de prueba anterior
DROP TABLE IF EXISTS respuestas;

-- Datos del participante (uno por código)
CREATE TABLE IF NOT EXISTS participantes (
  code            TEXT PRIMARY KEY,
  consent_version TEXT NOT NULL,
  institucion     TEXT NOT NULL,
  carrera         TEXT NOT NULL,
  semestre        TEXT NOT NULL,
  edad            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PSS-10: una fila al inicio (pre) y otra al final (post)
CREATE TABLE IF NOT EXISTS pss (
  code       TEXT NOT NULL REFERENCES participantes(code) ON DELETE CASCADE,
  momento    TEXT NOT NULL CHECK (momento IN ('pre','post')),
  respuestas SMALLINT[] NOT NULL CHECK (array_length(respuestas, 1) = 10),
  total      SMALLINT NOT NULL CHECK (total BETWEEN 0 AND 40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (code, momento)
);

-- Evaluación de la app (solo en el cuestionario final)
CREATE TABLE IF NOT EXISTS evaluacion_app (
  code           TEXT PRIMARY KEY REFERENCES participantes(code) ON DELETE CASCADE,
  sus_respuestas SMALLINT[] NOT NULL CHECK (array_length(sus_respuestas, 1) = 10),
  sus_score      NUMERIC(5,1) NOT NULL CHECK (sus_score BETWEEN 0 AND 100),
  satisfaccion   SMALLINT NOT NULL CHECK (satisfaccion BETWEEN 1 AND 5),
  nps            SMALLINT NOT NULL CHECK (nps BETWEEN 0 AND 10),
  util           TEXT,
  mejora         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vista para exportar (sin code)
CREATE OR REPLACE VIEW v_resultados AS
SELECT p.institucion, p.carrera, p.semestre, p.edad,
       pre.total               AS pss_pre,
       post.total              AS pss_post,
       post.total - pre.total  AS pss_cambio,
       e.sus_score, e.satisfaccion, e.nps
FROM participantes p
JOIN pss pre       ON pre.code = p.code AND pre.momento = 'pre'
LEFT JOIN pss post ON post.code = p.code AND post.momento = 'post'
LEFT JOIN evaluacion_app e ON e.code = p.code;

-- Comentarios abiertos, sin code:
-- SELECT p.institucion, e.util, e.mejora
-- FROM evaluacion_app e JOIN participantes p USING (code);

-- Borrar a un participante (derechos ARCO); borra todo en cascada:
-- DELETE FROM participantes WHERE code = 'XXXXXX';
