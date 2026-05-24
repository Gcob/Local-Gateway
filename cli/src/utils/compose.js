import { readFileSync, writeFileSync } from 'fs';
import { parseDocument, isMap, isSeq } from 'yaml';

const GATEWAY_NETWORK = 'local_gateway';

export function readCompose(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const doc = parseDocument(content);
  const servicesNode = doc.get('services');
  if (!servicesNode) return { doc, services: [] };
  const parsed = servicesNode.toJSON();
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error("'services' in docker-compose.yml must be a mapping");
  }
  return { doc, services: Object.keys(parsed) };
}

export function writeCompose(filePath, doc) {
  writeFileSync(filePath, doc.toString(), 'utf8');
}

export function addTraefikLabels(doc, service, domain, port) {
  const newLabels = [
    'traefik.enable=true',
    `traefik.http.routers.${service}.rule=Host(\`${domain}\`)`,
    `traefik.http.services.${service}.loadbalancer.server.port=${port}`,
    `traefik.docker.network=${GATEWAY_NETWORK}`,
  ];

  let labelsNode = doc.getIn(['services', service, 'labels']);
  if (!labelsNode) {
    doc.setIn(['services', service, 'labels'], doc.createNode(newLabels));
  } else if (isSeq(labelsNode)) {
    for (const label of newLabels) {
      const key = label.split('=')[0];
      const idx = labelsNode.items.findIndex(
        (item) => typeof item.value === 'string' && item.value.startsWith(key + '=')
      );
      if (idx >= 0) {
        labelsNode.items[idx] = doc.createNode(label);
      } else {
        labelsNode.add(doc.createNode(label));
      }
    }
  } else if (isMap(labelsNode)) {
    for (const label of newLabels) {
      const eqIdx = label.indexOf('=');
      labelsNode.set(label.slice(0, eqIdx), label.slice(eqIdx + 1));
    }
  } else {
    throw new Error(`'labels' for service '${service}' has an unexpected type in docker-compose.yml`);
  }

  let serviceNets = doc.getIn(['services', service, 'networks']);
  if (!serviceNets) {
    doc.setIn(['services', service, 'networks'], doc.createNode([GATEWAY_NETWORK]));
  } else {
    const netJson = serviceNets.toJSON();
    const hasGateway = Array.isArray(netJson)
      ? netJson.includes(GATEWAY_NETWORK)
      : GATEWAY_NETWORK in netJson;
    if (!hasGateway) {
      if (Array.isArray(netJson)) {
        serviceNets.add(doc.createNode(GATEWAY_NETWORK));
      } else {
        serviceNets.set(GATEWAY_NETWORK, null);
      }
    }
  }

  if (!doc.has('networks')) {
    doc.set('networks', doc.createNode({ [GATEWAY_NETWORK]: { external: true } }));
  } else {
    const topNets = doc.get('networks');
    if (!isMap(topNets)) {
      throw new Error("'networks' in docker-compose.yml must be a mapping");
    }
    if (!topNets.has(GATEWAY_NETWORK)) {
      topNets.set(GATEWAY_NETWORK, doc.createNode({ external: true }));
    }
  }
}
