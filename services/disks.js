const { AssetServiceClient } = require('@google-cloud/asset');
const client = new AssetServiceClient();
const { google } = require('googleapis');
const compute = google.compute('v1');
const { VMInactive } = require('./vm.js');

async function fetchDisks(PROJECT_ID) {

  const request = {
    scope: `projects/${PROJECT_ID}`,
    query: '', 
    assetTypes: ['compute.googleapis.com/Disk'], 
  };
  
  try {
    const [response] = await client.searchAllResources(request);

    const disksInfo = [];

    for (const disco of (response || [])) {
      const uso = disco.additionalAttributes?.fields?.users?.listValue?.values;

      var instanceName = "";

      if (Array.isArray(uso) && uso.length > 0) {
        const usoString = uso[0]?.stringValue;
        const parts = usoString.split('/');
        instanceName = parts[parts.length - 1];
      }

      const estaEnUso = Array.isArray(uso) && uso.length > 0;

      const tieneSnapshotReciente = await hasRecentSnapshot(PROJECT_ID, disco.displayName, disco.location);

      const criteriosViolados = [];

      var score = 0;

      if (!estaEnUso){
        criteriosViolados.push("No conectado a instancias");
        score = 1;
        if (!tieneSnapshotReciente){
          criteriosViolados.push("Sin snapshots recientes");
          score = 3;
        } 
      }else{

        if(await VMInactive(PROJECT_ID, instanceName )){
          criteriosViolados.push("Instancia conectada sin uso en los ultimos 30 dias");
          score = 1;        
        }
        if (!tieneSnapshotReciente){
          criteriosViolados.push("Tiene conexión a instancia, pero no tiene snapshots recientes");
          score = 3;
        } 
      }
      if(criteriosViolados.length > 0){
        disksInfo.push({
          recurso: "Disco",
          nombre: disco.displayName,
          proyecto: PROJECT_ID, 
          link: `https://console.cloud.google.com/compute/disksDetail/zones/${disco.location}/disks/${disco.displayName}?project=${PROJECT_ID}`,
          region: disco.location,
          estado: disco.state,
          uso: instanceName || [],
          criteriosViolados,
          score: score,
        });
      }
    }
    return disksInfo;

  } catch (err) {
    if (err.message.includes('Compute Engine API has not been used in project')) {
      console.error('Compute Engine API no habilitada');
      return 'Compute Engine API no habilitada';
    }
    console.error("Error al obtener los Discos en el projecto :", PROJECT_ID, err.message);
    return [];
  }
}


async function hasRecentSnapshot(projectId, diskName, diskZone) {
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const res = await compute.snapshots.list({
    project: projectId,
    auth,
  });

  const snapshots = res.data.items || [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return snapshots.some(snapshot => 
    snapshot.sourceDisk?.endsWith(`/zones/${diskZone}/disks/${diskName}`) && 
    new Date(snapshot.creationTimestamp) >= thirtyDaysAgo
  );
  
}

module.exports = { fetchDisks }