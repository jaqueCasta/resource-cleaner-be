require('dotenv').config();
const PROJECT_ID = process.env.PROJECT_ID;
const { AssetServiceClient } = require('@google-cloud/asset');
const client = new AssetServiceClient();
const { google } = require('googleapis');
const compute = google.compute('v1');
 
async function fetchVPCs() {
  const request = {
    scope: `projects/${PROJECT_ID}`,
    query: '', 
    assetTypes: ['compute.googleapis.com/Network'], 
    pageSize: 1000,  
  };

  try {
const [response] = await client.searchAllResources(request);
    const auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const vpcInfo = (response || []).map(vpc => ({
      recurso: "VPC",
      id: vpc.name,
      nombre:vpc.displayName,
      proyecto: PROJECT_ID,
      locacion: vpc.location,
      estado: vpc.state,
      fechaEvaluacion: new Date().toISOString(),
    }));
    console.log(vpcInfo); 

    for (subs in vpcInfo){
      const subnets = await listAllSubnetsForVpc(PROJECT_ID, vpcInfo.nombre , auth);
    }
    

    //console.log(subnets);

    return vpcInfo;

  } catch (err) {
    console.error("Error al obtener las VPC desde Asset Inventory:", err.message);
    return [];
  }
}

async function listAllSubnetsForVpc(projectId, vpcUrl, auth) {
  
  const regionsRes = await compute.regions.list({ project: projectId, auth });
  const regions = regionsRes.data.items.map(region => region.name);

  let subnets = [];

  for (const region of regions) {
    try {
      const res = await compute.subnetworks.list({
        project: projectId,
        region,
        auth,
      });
      //console.log(res);
      const subnetsInRegion = (res.data.items || []).filter(subnet =>
        subnet.network === vpcUrl
      )
      console.log(vpcUrl);
      console.log("......")
      //console.log(res.data.items);
      subnets = subnets.concat(subnetsInRegion);
    } catch (e) {
      console.warn(`Error en región ${region}:`, e.message);
    }
  }

  return subnets;
}





module.exports = { fetchVPCs };