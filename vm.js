require('dotenv').config();
const PROJECT_ID = process.env.PROJECT_ID;
const { AssetServiceClient } = require('@google-cloud/asset');
const client = new AssetServiceClient();
const { google } = require('googleapis');
const axios = require('axios');


async function VMInactive(projectId, vmInstance){
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const tokenResponse = await auth.getAccessToken();
  const token = tokenResponse.token || tokenResponse;

  const request = {
    scope: `projects/${projectId}`,
    query: '', 
    assetTypes: ['compute.googleapis.com/Instance'], 
    pageSize: 1000,  
  };
  try {
    const [response] = await client.searchAllResources(request);
    const vm = (response || []).find(v => v.displayName === vmInstance);
    const instanceID =  vm.additionalAttributes.fields?.id?.stringValue;

    if (!vm) {
      console.log(`VM ${vmInstance} no encontrada`);
      return false;
    }

    const estado = vm.resource?.data?.status || vm.state || 'UNKNOWN';
    
    if (estado === 'RUNNING') {
      return false; 
    }
    
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const filter = `metric.type="compute.googleapis.com/instance/cpu/utilization" AND resource.labels.instance_id="${instanceID}"`;
    const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries` +
      `?filter=${encodeURIComponent(filter)}` +
      `&interval.startTime=${thirtyDaysAgo.toISOString()}` +
      `&interval.endTime=${now.toISOString()}` +
      `&aggregation.alignmentPeriod=2592000s` +
      `&aggregation.perSeriesAligner=ALIGN_MEAN`;

    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const timeSeries = res.data.timeSeries || [];

    for (const series of timeSeries) {
      for (const point of series.points) {
        if (point.value.doubleValue > 0) {
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    console.error("Error al obtener las Discos desde Asset Inventory:", err.message);
    return false;
  }
}


async function fetchVMs(){
    const request = {
        scope: `projects/${PROJECT_ID}`,
        query: '', 
        assetTypes: ['compute.googleapis.com/Instance'], 
        pageSize: 1000,  
    };
    
    try {
        const [response] = await client.searchAllResources(request);

        const vmsInfo = [];

        for (const vm of (response || [])) {

            const criteriosViolados = [];
            
            if(await VMInactive(PROJECT_ID, vm.displayName )){
                criteriosViolados.push("Instancia sin uso en los ultimos 30 dias");
                vmsInfo.push({
                    recurso: "Instancia",
                    nombre: vm.displayName,
                    proyecto: PROJECT_ID, 
                    locacion: vm.location,
                    estado: vm.state,
                    criteriosViolados,
                });    

            }
        }
        
        return vmsInfo;

    } catch (err) {
        console.error("Error al obtener los Discos desde Asset Inventory:", err.message);
        return [];
    }
}

module.exports = {fetchVMs, VMInactive}