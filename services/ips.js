const { AssetServiceClient } = require('@google-cloud/asset');
const client = new AssetServiceClient();
const { google } = require('googleapis');
const compute = google.compute('v1');

async function getAllIps(PROJECT_ID) {
  const request = {
    scope: `projects/${PROJECT_ID}`,
    query: '', 
    assetTypes: ['compute.googleapis.com/Address'], 
  };

  try {
    const [response] = await client.searchAllResources(request);
    const ipsInfo = (response || []).map(ip => ({
      recurso: "IP",
      tipo: "Estática",
      id: ip.displayName,
      name: ip.name,
      proyecto: PROJECT_ID,
      estado: ip.state,
      fechaEvaluacion: new Date().toISOString(),
    }));

    return ipsInfo;

  } catch (err) {
    console.error("Error al obtener las IPs en el projecto :", PROJECT_ID, err.message);
    return [];
  }
}


async function getIpDetails(projectId, region, addressName) {
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  let res;
  if (region === 'global') {
    res = await compute.globalAddresses.get({
      project: projectId,
      address: addressName,
      auth,
    });
  } else {
    res = await compute.addresses.get({
      project: projectId,
      region,
      address: addressName,
      auth,
    });
  }
  return res.data 
}

async function fetchIPs(PROJECT_ID) {

  const ips = await getAllIps(PROJECT_ID);

  const results = [];
  
  for (const ip of ips) {
    const parts = ip.name.split('/');
    const regionIndex = parts.indexOf('regions');
    const globalIndex = parts.indexOf('global');
    const criteriosViolados = [];

    let region = '';
    let addressName = '';

    if (regionIndex !== -1) {
      region = parts[regionIndex + 1];
      addressName = parts[regionIndex + 3];
    } else if (globalIndex !== -1) {
      region = 'global';
      addressName = parts[globalIndex + 2];
    } else {
      console.log(`IP ${ip.displayName} no tiene región valida, saltando...`);
      continue;
    }

    try {
      const details = await getIpDetails(PROJECT_ID, region, addressName);
      
      if (details.status === 'RESERVED' && (!details.purpose || details.purpose.length === 0)) {
        criteriosViolados.push("IP sin uso");
        
        results.push({
          recurso:'IP',
          nombre: ip.id,
          proyecto: PROJECT_ID,
          ip : details.address,
          link: `https://console.cloud.google.com/networking/addresses/list?project=${PROJECT_ID}`,
          region,
          estado: details.status,
          criteriosViolados,
          score: 1
        });
      }
    } catch (err) {
      console.error(`Error al obtener detalles para IP ${ip.displayName} en el proyecto ${PROJECT_ID} :`, err.message);
    }
  }

  return results;
}


module.exports = { fetchIPs }