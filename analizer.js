

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
