require('dotenv').config();
const axios = require('axios');
const GOOGLE_CHAT_WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL;
const REPORTS_BUCKET = process.env.REPORTS_BUCKET;

async function sendGoogleChatAlert() {
  if (!GOOGLE_CHAT_WEBHOOK_URL) {
    console.warn('No se ha configurado GOOGLE_CHAT_WEBHOOK_URL, no se enviará alerta');
    return;
  }
  const bucketUrl = `https://console.cloud.google.com/storage/browser/${REPORTS_BUCKET}`;

  const message = {
    text: `El reporte del proyecto ha sido actualizado.\nBucket: ${REPORTS_BUCKET} : ${bucketUrl}\nPor favor revisa el bucket.`,
  };

  try {
    await axios.post(GOOGLE_CHAT_WEBHOOK_URL, message);
    console.log('Alerta enviada a Google Chat');
  } catch (error) {
    console.error('Error enviando alerta a Google Chat:', error.message);
  }
}

module.exports = { sendGoogleChatAlert };