CREATE TABLE IF NOT EXISTS respuestas (
  id             BIGSERIAL PRIMARY KEY,
  code           TEXT NOT NULL,
  fase           TEXT NOT NULL CHECK (fase IN ('pre','post')),
  payload        JSONB NOT NULL,
  correo_enviado BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, fase)
);

-- Exportación anonimizada por institución. No incluir code en el CSV.
-- SELECT p.payload->>'institucion'          AS institucion,
--        (p.payload->>'pss_total')::int     AS pss_pre,
--        (q.payload->>'pss_total')::int     AS pss_post,
--        (q.payload->>'sus_score')::numeric AS sus,
--        (q.payload->>'satisfaccion')::int  AS satisfaccion,
--        (q.payload->>'nps')::int           AS nps
-- FROM respuestas p
-- LEFT JOIN respuestas q ON q.code = p.code AND q.fase = 'post'
-- WHERE p.fase = 'pre';
