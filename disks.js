require('dotenv').config();
const PROJECT_ID = process.env.PROJECT_ID;
const { AssetServiceClient } = require('@google-cloud/asset');
const client = new AssetServiceClient();
const { google } = require('googleapis');
const compute = google.compute('v1');
const { VMInactive } = require('./vm.js');


async function fetchDisks() {
  const request = {
    scope: `projects/${PROJECT_ID}`,
    query: '', 
    assetTypes: ['compute.googleapis.com/Disk'], 
    pageSize: 1000,  
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
      if (!estaEnUso) criteriosViolados.push("No conectado a instancias");
      if (!tieneSnapshotReciente) criteriosViolados.push("Sin snapshots recientes");

      if(await VMInactive(PROJECT_ID, instanceName )){
        criteriosViolados.push("Instancia conectada sin uso en los ultimos 30 dias");
        disksInfo.push({
          recurso: "Disco",
          nombre: disco.displayName,
          proyecto: PROJECT_ID, 
          locacion: disco.location,
          estado: disco.state,
          uso: instanceName || [],
          criteriosViolados
        });        
      }
    }
    const discosHuérfanos = disksInfo.filter(disco => disco.criteriosViolados.length > 0 );
    return discosHuérfanos;

  } catch (err) {
    console.error("Error al obtener los Discos desde Asset Inventory:", err.message);
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

async function fetchSnapshots() {
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  try {
    const res = await compute.snapshots.list({
      project: PROJECT_ID,
      auth,
    });
    const snapshots = res.data.items || [];

    const snapshotMap = {};
    for (const snap of snapshots) {
      if (!snapshotMap[snap.sourceDisk]) {
        snapshotMap[snap.sourceDisk] = [];
      }
      snapshotMap[snap.sourceDisk].push(snap);
    }

    const [discoResponse] = await client.searchAllResources({
      scope: `projects/${PROJECT_ID}`,
      assetTypes: ['compute.googleapis.com/Disk'],
      pageSize: 1000,
    });

    const discosExistentes = new Set(
      discoResponse.map(d => {
        const parts = d.name.split('/');
        return parts[parts.length - 1];
      })
    );

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const snapshotInfo = [];

    for (const [diskUrl, snaps] of Object.entries(snapshotMap)) {
      const ordenadas = snaps.sort((a, b) => new Date(a.creationTimestamp) - new Date(b.creationTimestamp));
      ; 
      for (let i = 0; i < ordenadas.length; i++) {
        const snap = ordenadas[i];
        const criteriosViolados = [];
        const sourceDiskName = snap.sourceDisk.split('/').pop()
        
        if (ordenadas.length > 1 && i < ordenadas.length - 1) {
          criteriosViolados.push("Tiene otras snapshots más recientes");

          const fechaCreacion = new Date(snap.creationTimestamp);

          if (fechaCreacion < thirtyDaysAgo) {
            criteriosViolados.push("Tiene más de 30 días desde su creación");
          }
          if (!discosExistentes.has(sourceDiskName)) {
            criteriosViolados.push("Su disco de origen no existe");
          }
        }else{
          if (!discosExistentes.has(sourceDiskName)) {
            criteriosViolados.push("Su disco de origen no existe, pero es la snapshot mas reciente");
          }
        }
        
        

        if (criteriosViolados.length > 0) {
          snapshotInfo.push({
            recurso: "Snapshot",
            nombre: snap.name,
            discoOrigen: snap.sourceDisk,
            fechaCreacion: snap.creationTimestamp,
            criteriosViolados,
            fechaEvaluacion: now.toISOString(),
          });
        }
      }
    }

    return snapshotInfo;
  } catch (err) {
    console.error("Error al obtener snapshots:", err.message);
    return [];
  }
}

module.exports = { fetchDisks, fetchSnapshots }