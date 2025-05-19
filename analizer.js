require('dotenv').config();
const axios = require('axios');
const PROJECT_ID = process.env.PROJECT_ID;
const BASE_URL = `https://compute.googleapis.com/compute/v1/projects`;
const { AssetServiceClient } = require('@google-cloud/asset');
const client = new AssetServiceClient();
const { google } = require('googleapis');
const compute = google.compute('v1');
const monitoring = google.monitoring('v3');
const logging = google.logging('v2');

async function getAllIps() {

  const request = {
    scope: `projects/${PROJECT_ID}`,
    query: '', 
    assetTypes: ['compute.googleapis.com/Address'], 
    pageSize: 1000, 
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
    console.log(ipsInfo); 

    return ipsInfo;

  } catch (err) {
    console.error("Error al obtener las IPs desde Asset Inventory:", err.message);
    return [];
  }
}




async function fetchDisks() {

  const request = {
    scope: `projects/${PROJECT_ID}`,
    query: '', 
    assetTypes: ['compute.googleapis.com/Disk'], 
    pageSize: 1000,  
  };

  try {
    const [response] = await client.searchAllResources(request);

    
    const disksInfo = (response || []).map(disco => ({
      recurso: "Disco",
      nombre:disco.displayName,
      proyecto: PROJECT_ID,
      locacion: disco.location,
      estado: disco.state,
      fechaEvaluacion: new Date().toISOString(),
    }));
    console.log(disksInfo); 

    return disksInfo;

  } catch (err) {
    console.error("Error al obtener las Discos desde Asset Inventory:", err.message);
    return [];
  }
}

async function fetchVPCs() {
  const request = {
    scope: `projects/${PROJECT_ID}`,
    query: '', 
    assetTypes: ['compute.googleapis.com/Network'], 
    pageSize: 1000,  
  };

  try {
    const [response] = await client.searchAllResources(request);

    
    const vpcInfo = (response || []).map(vpc => ({
      recurso: "VPC",
      nombre:vpc.displayName,
      proyecto: PROJECT_ID,
      locacion: vpc.location,
      estado: vpc.state,
      fechaEvaluacion: new Date().toISOString(),
    }));
    //console.log(vpcInfo); 

    return vpcInfo;

  } catch (err) {
    console.error("Error al obtener las VPC desde Asset Inventory:", err.message);
    return [];
  }
  /*
  const url = `${BASE_URL}/${PROJECT_ID}/global/networks`;
  try {
    const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${await getAccessToken()}` } });
    return (data.items || []).filter(vpc => !vpc.subnetworks || vpc.subnetworks.length === 0)
      .map(vpc => ({
        recurso: "VPC",
        tipo: "Red",
        id: vpc.name,
        proyecto: PROJECT_ID,
        estado: "Sin subredes",
        criteriosViolados: ["Sin subredes configuradas"],
        fechaEvaluacion: new Date().toISOString()
      }));
  } catch (err) {
    console.error("Error al obtener VPCs:", err.message);
    return [];
  }*/
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

  //const details = res.data;

  //const hasTraffic = await hasRecentTraffic(projectId, details.address);

  //return { ...details, hasTraffic }; 
  return res.data 
}


async function fetchIPs() {

  const ips = await getAllIps(PROJECT_ID);

  const results = [];

  for (const ip of ips) {
    const parts = ip.name.split('/');
    const regionIndex = parts.indexOf('regions');
    const globalIndex = parts.indexOf('global');
    
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
        results.push({
          id: ip.name,
          nombre: ip.id,
          ip : details.address,
          region,
          estado: details.status,
          usuarios: details.purpose || [], //solo para comprobar
          fechaCreacion: ip.createTime,
        });
      }
    } catch (err) {
      console.error(`Error al obtener detalles para IP ${ip.displayName}:`, err.message);
    }
  }

  return results;
}

async function hasRecentTraffic(projectId, ipAddress) {
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const filter = `
    resource.type="gce_subnetwork"
    logName="projects/${projectId}/logs/compute.googleapis.com%2Fvpc_flows"
    (jsonPayload.connection.src_ip="${ipAddress}" OR jsonPayload.connection.dest_ip="${ipAddress}")
    timestamp >= "${thirtyDaysAgo.toISOString()}" AND timestamp <= "${now.toISOString()}"
  `;

  try {
    const res = await logging.entries.list({
      auth,
      requestBody: {
        resourceNames: [`projects/${projectId}`],
        filter: filter.trim(),
        pageSize: 1, 
      },
    });

    console.log(res.data.entries)
    return (res.data.entries && res.data.entries.length > 0);
  } catch (err) {
    console.error(`Error consultando tráfico en VPC Flow Logs para IP ${ipAddress}:`, err.message);
    return false; 
  }
}
module.exports = { fetchIPs, fetchDisks, fetchVPCs };

/*
async function fetchIPs() {
  const url = `${BASE_URL}/${PROJECT_ID}/regions/-/addresses`;
  try {
    const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${await getAccessToken()}` } });
    return (data.items || []).filter(ip => ip.status === 'STATIC' && (!ip.users || ip.users.length === 0))
      .map(ip => ({
        recurso: "IP",
        tipo: "Estática",
        id: ip.address,
        proyecto: PROJECT_ID,
        estado: ip.status,
        criteriosViolados: ["No asociada a recursos"],
        fechaEvaluacion: new Date().toISOString()
      }));
  } catch (err) {
    console.error("Error al obtener IPs:", err.message);
    return [];
  }
}

async function fetchIPs() {
  const url = `${BASE_URL}/${PROJECT_ID}/regions/-/addresses`;
  try {
    const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${await getAccessToken()}` } });

    const ips = (data.items || []).filter(ip => ip.status === 'RESERVED' && (!ip.users || ip.users.length === 0));

    // Para cada IP, se agrega la verificación de tráfico reciente
    const ipsWithTrafficCheck = await Promise.all(ips.map(async ip => {
      const ipAddress = ip.address;

      // Consultar métricas de tráfico (entrante y saliente) para la IP
      const trafficMetrics = await getTrafficMetrics(ipAddress);
      const hasTraffic = trafficMetrics.receivedBytes > 0 || trafficMetrics.sentBytes > 0;
      const isRecentUsage = checkRecentUsage(ipAddress);

      return {
        recurso: "IP",
        tipo: "Estática",
        id: ip.address,
        proyecto: PROJECT_ID,
        estado: ip.status,
        criteriosViolados: [
          "No asociada a recursos", 
          !hasTraffic ? "Sin tráfico reciente" : null,
          !isRecentUsage ? "Sin uso en los últimos 30 días" : null
        ].filter(Boolean),  // Filtramos los nulls
        fechaEvaluacion: new Date().toISOString()
      };
    }));

    return ipsWithTrafficCheck;

  } catch (err) {
    console.error("Error al obtener IPs:", err.message);
    return [];
  }
}

async function getTrafficMetrics(ipAddress) {
  // Hacer consulta a la Monitoring API para obtener métricas de tráfico de la IP
  const url = `https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries`;
  const metricsQuery = {
    "filter": `metric.type="compute.googleapis.com/forwarding_rule/received_bytes_count" AND resource.label."ip_address" = "${ipAddress}"`,
    "interval": {
      "startTime": "2024-01-01T00:00:00Z",  // Fecha de inicio, puedes ajustarlo
      "endTime": new Date().toISOString()
    },
    "aggregation": {
      "alignmentPeriod": "86400s",  // 1 día
      "perSeriesAligner": "ALIGN_RATE"
    }
  };

  try {
    const { data } = await axios.post(url, metricsQuery, { headers: { Authorization: `Bearer ${await getAccessToken()}` } });

    // Obtiene las métricas de tráfico
    const receivedBytes = data?.timeSeries?.[0]?.points?.[0]?.value?.int64Value || 0;
    const sentBytes = data?.timeSeries?.[1]?.points?.[0]?.value?.int64Value || 0;

    return {
      receivedBytes: parseInt(receivedBytes, 10),
      sentBytes: parseInt(sentBytes, 10)
    };
  } catch (err) {
    console.error("Error al obtener métricas de tráfico:", err.message);
    return { receivedBytes: 0, sentBytes: 0 };  // No se encontró tráfico
  }
}

// Verifica si la IP ha tenido uso reciente (por ejemplo, conexiones o cambios)
function checkRecentUsage(ipAddress) {
  // Implementa la lógica de la verificación del uso reciente, por ejemplo:
  // Consultar los registros de acceso o cualquier tipo de dato que te indique que la IP ha sido utilizada.
  // Aquí podemos simular que siempre tiene uso reciente para el ejemplo.

  return true; // Aquí se puede personalizar según los logs que obtengas
}

*/
