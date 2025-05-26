const { fetchIPs } = require('./ips.js');
const { fetchDisks, fetchSnapshots } = require('./disks.js');
const { fetchVPCs } = require('./vpc.js');
const { fetchVMs } = require('./vm.js');

const { generateJSONReport } = require('./reportGenerator');

(async () => {
  console.log("Iniciando busqueda de recursos huérfanos...");

  
  const ips = await fetchIPs();
  const disks = await fetchDisks();
  const snapshots = await fetchSnapshots();
  const vms = await fetchVMs();
  //const vpcs = await fetchVPCs();
  const resources = [...ips, ...disks, ...snapshots, ...vms/*, ...vpcs*/];
  //const resources = [...disks, ...snapshots];
  generateJSONReport(resources);
})();
