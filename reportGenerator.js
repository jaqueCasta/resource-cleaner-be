const { Storage } = require('@google-cloud/storage');
require('dotenv').config();
const storage = new Storage();
const BUCKET_NAME = process.env.REPORTS_BUCKET; 

async function generateJSONReport(data, PROJECT_ID) {
  const filename = `${PROJECT_ID}_report.json`;
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(filename);

  
  await file.save(JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });

  console.log(`Reporte guardado y actualizado en gs://${BUCKET_NAME}/${filename}`);
}

module.exports = { generateJSONReport };



/*const fs = require('fs');

function generateJSONReport(data, PROJECT_ID) {
  const filename = `./reports/${PROJECT_ID}_report.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  
  console.log(`Reporte guardado como: ${filename}`);
}

module.exports = { generateJSONReport };*/