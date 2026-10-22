# OK? — sitio del piloto

Sitio estático y una función serverless para el registro y el cuestionario final del piloto. No envía correo y no guarda datos de contacto.

## Variables de entorno

| Variable | Valores | Defecto |
|---|---|---|
| `DATABASE_URL` | cadena de Neon | — |
| `PILOTO_FASE` | `PRE`, `POST`, `AMBAS` | `AMBAS` |
| `MIN_DIAS_POST` | entero ≥ 0 | `14` |

Un valor inválido de `PILOTO_FASE` se trata como `AMBAS`. Un valor inválido de `MIN_DIAS_POST` se trata como `14`. En Preview conviene `MIN_DIAS_POST=0`.

`BETA_URL` no es una variable de entorno: se define en `js/config.js` antes de abrir el piloto.

## Cambiar la fase

Vercel → Settings → Environment Variables → editar `PILOTO_FASE` → **Redeploy** del último despliegue de producción. Los cambios de variables solo aplican a despliegues nuevos. El cambio queda activo en cerca de un minuto.

| Valor | Registro | Cuestionario final |
|---|---|---|
| `PRE` | Abierto | Cerrado |
| `POST` | Cerrado | Abierto |
| `AMBAS` | Abierto | Abierto |

## Base de datos

Ejecutar `schema.sql` en Neon. El script borra la tabla de prueba `respuestas` y crea `participantes`, `pss`, `evaluacion_app` y la vista `v_resultados`.

La vista exporta por institución sin la columna `code`. No incluir `code` en los CSV que se entreguen. Para borrar a un participante: `DELETE FROM participantes WHERE code = 'XXXXXX';`.

## Probar la API

Sustituir `BASE` por el origen local o de Preview. Hace falta `DATABASE_URL`. Con `MIN_DIAS_POST=14`, el cuestionario final inmediato responde `TODAVIA_NO`. Con `MIN_DIAS_POST=0`, responde `200`.

```bash
curl -sS BASE/api/submit

curl -sS -X POST BASE/api/submit -H "Content-Type: application/json" -d "{\"fase\":\"pre\",\"consent\":true,\"consent_version\":\"2026-10\",\"institucion\":\"ITTOL\",\"carrera\":\"Ingeniería en Sistemas Computacionales\",\"semestre\":\"3\",\"edad\":\"18-20\",\"pss\":[0,1,2,3,4,0,1,2,3,4],\"web\":\"\"}"

curl -sS -X POST BASE/api/submit -H "Content-Type: application/json" -d "{\"fase\":\"pre\",\"consent\":true,\"consent_version\":\"2026-10\",\"institucion\":\"ITTOL\",\"carrera\":\"Ingeniería en Sistemas Computacionales\",\"semestre\":\"3\",\"edad\":\"18-20\",\"pss\":[0,1,2,3,4,0,1,2,3,4],\"web\":\"x\"}"

curl -sS -X POST BASE/api/submit -H "Content-Type: application/json" -d "{\"fase\":\"pre\",\"consent\":true,\"consent_version\":\"2026-10\",\"institucion\":\"Otra escuela\",\"carrera\":\"Ingeniería Industrial\",\"semestre\":\"3\",\"edad\":\"18-20\",\"pss\":[0,1,2,3,4,0,1,2,3,4],\"web\":\"\"}"

curl -sS -X POST BASE/api/submit -H "Content-Type: application/json" -d "{\"fase\":\"post\",\"code\":\"CODIGO\",\"pss\":[0,1,2,3,4,0,1,2,3,4],\"sus\":[1,2,3,4,5,1,2,3,4,5],\"satisfaccion\":4,\"nps\":9,\"util\":\"\",\"mejora\":\"\"}"

curl -sS -X POST BASE/api/submit -H "Content-Type: application/json" -d "{\"fase\":\"post\",\"code\":\"NOEXISTE\",\"pss\":[0,0,0,0,0,0,0,0,0,0],\"sus\":[1,1,1,1,1,1,1,1,1,1],\"satisfaccion\":1,\"nps\":0,\"util\":\"\",\"mejora\":\"\"}"
```

El segundo envío del mismo código debe responder `409`. Para el arreglo de ejemplo, `pss_total` es 16 y `sus_score` es 50.

`?dev=1` solo omite la detección de Android. No salta la fase ni la ventana de días.
