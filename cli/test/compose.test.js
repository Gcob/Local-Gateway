import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from 'yaml';
import { addTraefikLabels } from '../src/utils/compose.js';

function doc(yaml) {
  return parseDocument(yaml);
}

function labels(d, service) {
  const node = d.getIn(['services', service, 'labels']);
  assert.ok(node, `expected 'labels' to exist on service '${service}'`);
  return node.toJSON();
}

function networks(d, service) {
  const node = d.getIn(['services', service, 'networks']);
  assert.ok(node, `expected 'networks' to exist on service '${service}'`);
  return node.toJSON();
}

const EXPECTED_LABELS = [
  'traefik.enable=true',
  'traefik.http.routers.app.rule=Host(`app.localhost`)',
  'traefik.http.services.app.loadbalancer.server.port=80',
  'traefik.docker.network=local_gateway',
];

function hasLabels(d, service, expected) {
  const l = labels(d, service);
  if (Array.isArray(l)) {
    return expected.every((label) => l.includes(label));
  }
  return expected.every((label) => {
    const eqIdx = label.indexOf('=');
    const key = label.slice(0, eqIdx);
    const value = label.slice(eqIdx + 1);
    return String(l[key]) === value;
  });
}

// --- labels ---

test('creates label sequence when service has none', () => {
  const d = doc('services:\n  app:\n    image: nginx\n');
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  assert.ok(hasLabels(d, 'app', EXPECTED_LABELS));
});

test('appends to existing label sequence', () => {
  const d = doc('services:\n  app:\n    image: nginx\n    labels:\n      - custom=value\n');
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  const l = labels(d, 'app');
  assert.ok(l.includes('custom=value'));
  assert.ok(l.includes('traefik.enable=true'));
});

test('updates existing traefik label in sequence (idempotent)', () => {
  const d = doc(
    'services:\n  app:\n    image: nginx\n    labels:\n' +
    '      - traefik.enable=true\n' +
    '      - traefik.http.routers.app.rule=Host(`old.localhost`)\n' +
    '      - traefik.http.services.app.loadbalancer.server.port=3000\n' +
    '      - traefik.docker.network=local_gateway\n'
  );
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  const l = labels(d, 'app');
  assert.ok(l.includes('traefik.http.routers.app.rule=Host(`app.localhost`)'));
  assert.ok(!l.includes('traefik.http.routers.app.rule=Host(`old.localhost`)'));
  assert.equal(l.filter((x) => x.startsWith('traefik.http.routers.app.rule=')).length, 1);
});

test('handles labels as map', () => {
  const d = doc('services:\n  app:\n    image: nginx\n    labels:\n      custom: value\n');
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  const l = d.getIn(['services', 'app', 'labels']).toJSON();
  assert.ok(l['traefik.enable'] === 'true' || l['traefik.enable'] === true);
  assert.equal(l['traefik.docker.network'], 'local_gateway');
});

// --- service networks ---

test('creates network sequence when service has none', () => {
  const d = doc('services:\n  app:\n    image: nginx\n');
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  assert.deepEqual(networks(d, 'app'), ['local_gateway']);
});

test('appends local_gateway to existing network sequence', () => {
  const d = doc('services:\n  app:\n    image: nginx\n    networks:\n      - web\n');
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  assert.deepEqual(networks(d, 'app'), ['web', 'local_gateway']);
});

test('skips duplicate in network sequence (idempotent)', () => {
  const d = doc('services:\n  app:\n    image: nginx\n    networks:\n      - local_gateway\n');
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  assert.deepEqual(networks(d, 'app'), ['local_gateway']);
});

test('appends local_gateway to network map', () => {
  const d = doc('services:\n  app:\n    image: nginx\n    networks:\n      web:\n');
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  const n = networks(d, 'app');
  assert.ok('web' in n);
  assert.ok('local_gateway' in n);
});

test('skips duplicate in network map (idempotent)', () => {
  const d = doc('services:\n  app:\n    image: nginx\n    networks:\n      local_gateway:\n');
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  const keys = Object.keys(networks(d, 'app'));
  assert.equal(keys.filter((k) => k === 'local_gateway').length, 1);
});

// --- top-level networks ---

test('creates top-level networks when absent', () => {
  const d = doc('services:\n  app:\n    image: nginx\n');
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  assert.deepEqual(d.getIn(['networks', 'local_gateway']).toJSON(), { external: true });
});

test('adds local_gateway to existing top-level networks', () => {
  const d = doc('services:\n  app:\n    image: nginx\nnetworks:\n  web:\n');
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  assert.deepEqual(d.getIn(['networks', 'local_gateway']).toJSON(), { external: true });
  assert.ok(d.hasIn(['networks', 'web']));
});

test('skips top-level local_gateway when already declared (idempotent)', () => {
  const d = doc('services:\n  app:\n    image: nginx\nnetworks:\n  local_gateway:\n    external: true\n');
  addTraefikLabels(d, 'app', 'app.localhost', 80);
  const keys = Object.keys(d.get('networks').toJSON());
  assert.equal(keys.filter((k) => k === 'local_gateway').length, 1);
});

test('throws when top-level networks is not a mapping', () => {
  const d = doc('services:\n  app:\n    image: nginx\nnetworks:\n  - web\n');
  assert.throws(() => addTraefikLabels(d, 'app', 'app.localhost', 80), /must be a mapping/);
});
