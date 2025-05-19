const { fetchIPs, fetchDisks, fetchVPCs} = require('./analizer');
const { generateJSONReport } = require('./reportGenerator');

(async () => {
  console.log("Iniciando busqueda de recursos huérfanos...");

  
  const ips = await fetchIPs();
  const disks = await fetchDisks();/*
  const vpcs = await fetchVPCs();*/
  const resources = [...ips, ...disks/*, ...vpcs*/];

  generateJSONReport(resources);
})();
