const { google } = require('googleapis');
const { fetchVMs } = require('./services/vm.js');
const { fetchIPs } = require('./services/ips.js');
const { fetchDisks } = require('./services/disks.js');
const { generateJSONReport } = require('./reportGenerator');
const { fetchSnapshots } = require('./services/snapshots.js');
const { sendGoogleChatAlert } = require('./services/webhookChat.js');


(async () => {
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform.read-only'],
  });
  
  const cloudResourceManager = google.cloudresourcemanager({
    version: 'v1',
    auth,
  });
  
  const res = await cloudResourceManager.projects.list();

  const projects = res.data.projects || [];

 // const whitelist = ["opt-test-438021","tracker-fleet-prod"];//,"shared-resources-418617"];
  
  const whitelist = ["ubicaserv","camaras-be","camaras-smx","shared-resources-418617", 
    "dev-projects-265715","data-bi-254516","mm-trackig-fleet","mm-gateway","tracking-hk",
    "metricams-dev","traxion-249315","tracking-arca","metrimoto","pmf-security-dev","networking-metrica",
    "iris-prod-448716","administracion-mm","idealease-431218","pmf-security-prod","tracking-elglobo",
    "iris-dev-450915","tf-bepensa","dev-outsourcing","tracker-fleet-prod","tracking-pmf","pepsico-latam",
    "tracker-fleet-dev","tracking-estafeta","opt-test-438021","analytics-ses","cybersecurity-test-376417",
    "lookermetrica","tracking-kof","labs-459015","aforos","apigee-metrica","shared-resources-dev-420022",
    "proyectos-441904","plataforma-mb","pmf-backup-data","cybersecurity-tools-418423","tracking-fleet-mexico",
    "mm-billing","instalit-dev","reportgps-dev","analytics-helpdesk","instalit-prod"
  ];
  

  for(const project of whitelist )
  {
     await analyzer(project);
  }

  await sendGoogleChatAlert();

})();


async function analyzer(PROJECT_ID){
  console.log(`Iniciando busqueda de recursos huérfanos en el proyecto ${PROJECT_ID}`);

  const ips = await fetchIPs(PROJECT_ID);
  const disks = await fetchDisks(PROJECT_ID);
  const snapshots = await fetchSnapshots(PROJECT_ID);
  const vms = await fetchVMs(PROJECT_ID);

  const resources = [...ips, ...disks, ...snapshots, ...vms];

  generateJSONReport(resources, PROJECT_ID);
}