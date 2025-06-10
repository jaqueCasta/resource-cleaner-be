const { parse } = require('json2csv');
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const BUCKET_NAME = process.env.REPORTS_BUCKET;

async function generateCSVReport(data, PROJECT_ID) {
  const filename = `${PROJECT_ID}_report.csv`;

  const normalizedData = data.map(item => ({
    recurso: item.recurso || '',
    nombre: item.nombre || '',
    proyecto: item.proyecto || '',
    ip: item.ip || '',
    link: item.link || '',
    region: item.region || '',
    estado: item.estado || '',
    uso: item.uso || '',
    criteriosViolados: item.criteriosViolados ? item.criteriosViolados.join('; ') : '',
    score: item.score || ''
  }));

  const csvData = parse(normalizedData, {
    delimiter: ',', 
    fields: [
      'recurso', 'nombre', 'proyecto', 'ip', 'link', 'region', 'estado', 'uso', 'criteriosViolados', 'score'
    ]
  });

  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(filename);

  await file.save(csvData, {
    contentType: 'text/csv', 
  });

  console.log(`Reporte CSV guardado en el bucket gs://${BUCKET_NAME}/${filename}`);
}

module.exports = { generateCSVReport };
