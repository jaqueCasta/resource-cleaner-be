const { AssetServiceClient } = require('@google-cloud/asset');
const client = new AssetServiceClient();
const { google } = require('googleapis');
const compute = google.compute('v1');


async function fetchSnapshots(PROJECT_ID) {
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
      
      for (let i = 0; i < ordenadas.length; i++) {
        const snap = ordenadas[i];
        const criteriosViolados = [];
        var score = 0;
        const sourceDiskName = snap.sourceDisk.split('/').pop()
        
        if (ordenadas.length > 1 && i < ordenadas.length - 1) {
          criteriosViolados.push("Tiene otras snapshots más recientes");
          score=2;
          const fechaCreacion = new Date(snap.creationTimestamp);

          if (fechaCreacion < thirtyDaysAgo) {
            criteriosViolados.push("Tiene más de 30 días desde su creación");
            score=1;
          }
          if (!discosExistentes.has(sourceDiskName)) {
            criteriosViolados.push("Su disco de origen no existe");
            score=2;
          }
        }else{
          if (!discosExistentes.has(sourceDiskName)) {
            criteriosViolados.push("Su disco de origen no existe, pero es la snapshot mas reciente");
            score=3;
          }
        }

        if (criteriosViolados.length > 0) {
          snapshotInfo.push({
            recurso: "Snapshot",
            nombre: snap.name,
            proyecto: PROJECT_ID,
            link: `https://console.cloud.google.com/compute/snapshotsDetail/projects/${PROJECT_ID}/global/snapshots/${snap.name}?project=${PROJECT_ID}`,
            discoOrigen: snap.sourceDiskName,
            fechaCreacion: snap.creationTimestamp,
            criteriosViolados,
            score: score,
          });
        }
      }
    }

    return snapshotInfo;
  } catch (err) {
    console.error("Error al obtener snapshots en el projecto :", PROJECT_ID, err.message);
    return [];
  }
}

module.exports = { fetchSnapshots }