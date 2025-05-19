const fs = require('fs');

function generateJSONReport(data) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `report_${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Reporte guardado como: ${filename}`);
}

module.exports = { generateJSONReport };
