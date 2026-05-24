import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from 'yaml';
import { extractLabels, extractTraefikInfo, resolveStatus, parseDockerComposePs } from '../src/commands/info.js';

function doc(yaml) {
  return parseDocument(yaml);
}

// --- extractLabels ---

test('extractLabels — returns empty object when no labels node', () => {
  const d = doc('services:\n  app:\n    image: nginx\n');
  assert.deepEqual(extractLabels(d, 'app'), {});
});

test('extractLabels — parses seq labels into key/value pairs', () => {
  const d = doc(
    'services:\n  app:\n    labels:\n' +
    '      - traefik.enable=true\n' +
    '      - traefik.http.routers.app.rule=Host(`app.localhost`)\n'
  );
  const labels = extractLabels(d, 'app');
  assert.equal(labels['traefik.enable'], 'true');
  assert.equal(labels['traefik.http.routers.app.rule'], 'Host(`app.localhost`)');
});

test('extractLabels — parses map labels into key/value pairs', () => {
  const d = doc(
    'services:\n  app:\n    labels:\n' +
    '      traefik.enable: "true"\n' +
    '      traefik.http.routers.app.rule: Host(`app.localhost`)\n'
  );
  const labels = extractLabels(d, 'app');
  assert.equal(labels['traefik.enable'], 'true');
  assert.equal(labels['traefik.http.routers.app.rule'], 'Host(`app.localhost`)');
});

test('extractLabels — seq: parses string scalar containing equals sign', () => {
  const d = doc('services:\n  app:\n    labels:\n      - traefik.enable=true\n');
  const labels = extractLabels(d, 'app');
  assert.equal(labels['traefik.enable'], 'true');
});

test('extractLabels — seq: coerces non-string scalar (number) via item.value', () => {
  const d = doc('services:\n  app:\n    labels:\n      - 42\n');
  assert.doesNotThrow(() => extractLabels(d, 'app'));
});

test('extractLabels — map: always stringifies boolean value to "true"', () => {
  const d = doc('services:\n  app:\n    labels:\n      traefik.enable: true\n');
  const labels = extractLabels(d, 'app');
  assert.equal(labels['traefik.enable'], 'true');
});

test('extractLabels — seq: skips items without an equals sign', () => {
  const d = doc('services:\n  app:\n    labels:\n      - noequalssign\n      - key=value\n');
  const labels = extractLabels(d, 'app');
  assert.ok(!('noequalssign' in labels));
  assert.equal(labels['key'], 'value');
});

test('extractLabels — seq: value may contain equals signs', () => {
  const d = doc(
    'services:\n  app:\n    labels:\n' +
    '      - traefik.http.routers.app.rule=Host(`app.localhost`) && PathPrefix(`/`)\n'
  );
  const labels = extractLabels(d, 'app');
  assert.equal(
    labels['traefik.http.routers.app.rule'],
    'Host(`app.localhost`) && PathPrefix(`/`)'
  );
});

// --- extractTraefikInfo ---

test('extractTraefikInfo — returns null when traefik.enable is absent', () => {
  assert.equal(extractTraefikInfo({}), null);
});

test('extractTraefikInfo — returns null when traefik.enable is "false"', () => {
  assert.equal(extractTraefikInfo({ 'traefik.enable': 'false' }), null);
});

test('extractTraefikInfo — detects traefik.enable as string "true"', () => {
  const result = extractTraefikInfo({
    'traefik.enable': 'true',
    'traefik.http.routers.app.rule': 'Host(`app.localhost`)',
    'traefik.http.services.app.loadbalancer.server.port': '80',
  });
  assert.deepEqual(result, { domain: 'app.localhost', port: '80' });
});

test('extractTraefikInfo — detects traefik.enable as boolean true', () => {
  const result = extractTraefikInfo({
    'traefik.enable': true,
    'traefik.http.routers.app.rule': 'Host(`app.localhost`)',
    'traefik.http.services.app.loadbalancer.server.port': '3000',
  });
  assert.deepEqual(result, { domain: 'app.localhost', port: '3000' });
});

test('extractTraefikInfo — extracts domain from double-quoted rule', () => {
  const result = extractTraefikInfo({
    'traefik.enable': 'true',
    'traefik.http.routers.app.rule': 'Host("app.localhost")',
  });
  assert.ok(result !== null);
  assert.equal(result.domain, 'app.localhost');
});

test('extractTraefikInfo — extracts first host from chained rule', () => {
  const result = extractTraefikInfo({
    'traefik.enable': 'true',
    'traefik.http.routers.app.rule': 'Host(`app.localhost`) || Host(`alias.localhost`)',
  });
  assert.ok(result !== null);
  assert.equal(result.domain, 'app.localhost');
});

test('extractTraefikInfo — extracts first host from multi-argument Host()', () => {
  const result = extractTraefikInfo({
    'traefik.enable': 'true',
    'traefik.http.routers.app.rule': 'Host(`app.localhost`, `alias.localhost`)',
  });
  assert.ok(result !== null);
  assert.equal(result.domain, 'app.localhost');
});

test('extractTraefikInfo — extracts host from multi-argument Host() with spaces', () => {
  const result = extractTraefikInfo({
    'traefik.enable': 'true',
    'traefik.http.routers.app.rule': 'Host( `app.localhost` , `alias.localhost` )',
  });
  assert.ok(result !== null);
  assert.equal(result.domain, 'app.localhost');
});

test('extractTraefikInfo — returns null when rule has no Host() match', () => {
  assert.equal(
    extractTraefikInfo({
      'traefik.enable': 'true',
      'traefik.http.routers.app.rule': 'HostRegexp(`{subdomain:[a-z]+}.localhost`)',
    }),
    null
  );
});

test('extractTraefikInfo — defaults port to "—" when absent', () => {
  const result = extractTraefikInfo({
    'traefik.enable': 'true',
    'traefik.http.routers.app.rule': 'Host(`app.localhost`)',
  });
  assert.ok(result !== null);
  assert.equal(result.port, '—');
});

test('extractTraefikInfo — handles arbitrary router name (not matching service)', () => {
  const result = extractTraefikInfo({
    'traefik.enable': 'true',
    'traefik.http.routers.custom-router-name.rule': 'Host(`app.localhost`)',
    'traefik.http.services.custom-router-name.loadbalancer.server.port': '8080',
  });
  assert.deepEqual(result, { domain: 'app.localhost', port: '8080' });
});

test('extractTraefikInfo — does not pair port from unrelated service', () => {
  // router is 'web', port belongs to 'db' — should not be paired
  const result = extractTraefikInfo({
    'traefik.enable': 'true',
    'traefik.http.routers.web.rule': 'Host(`app.localhost`)',
    'traefik.http.services.db.loadbalancer.server.port': '5432',
  });
  assert.ok(result !== null);
  assert.equal(result.domain, 'app.localhost');
  assert.equal(result.port, '—');
});

test('extractTraefikInfo — respects .service label to resolve port', () => {
  // router 'web' points to service 'backend' via .service label
  const result = extractTraefikInfo({
    'traefik.enable': 'true',
    'traefik.http.routers.web.rule': 'Host(`app.localhost`)',
    'traefik.http.routers.web.service': 'backend',
    'traefik.http.services.backend.loadbalancer.server.port': '3000',
  });
  assert.deepEqual(result, { domain: 'app.localhost', port: '3000' });
});

test('extractTraefikInfo — returns "—" when named service has no port (no fallback to unrelated service)', () => {
  const result = extractTraefikInfo({
    'traefik.enable': 'true',
    'traefik.http.routers.web.rule': 'Host(`app.localhost`)',
    'traefik.http.services.other.loadbalancer.server.port': '8080',
  });
  assert.ok(result !== null);
  assert.equal(result.port, '—');
});

test('extractTraefikInfo — does not throw when rule value is a non-string', () => {
  assert.doesNotThrow(() =>
    extractTraefikInfo({
      'traefik.enable': true,
      'traefik.http.routers.app.rule': 42,
    })
  );
});

test('extractTraefikInfo — coerces numeric port to string', () => {
  const result = extractTraefikInfo({
    'traefik.enable': 'true',
    'traefik.http.routers.app.rule': 'Host(`app.localhost`)',
    'traefik.http.services.app.loadbalancer.server.port': 3000,
  });
  assert.ok(result !== null);
  assert.equal(result.port, '3000');
});

// --- parseDockerComposePs ---

test('parseDockerComposePs — returns empty object for empty output', () => {
  assert.deepEqual(parseDockerComposePs(''), {});
  assert.deepEqual(parseDockerComposePs('   \n  \n'), {});
});

test('parseDockerComposePs — returns empty object for null/undefined input', () => {
  assert.deepEqual(parseDockerComposePs(null), {});
  assert.deepEqual(parseDockerComposePs(undefined), {});
});

test('parseDockerComposePs — parses single service', () => {
  assert.deepEqual(parseDockerComposePs('web\trunning'), { web: 'running' });
});

test('parseDockerComposePs — parses multiple services', () => {
  assert.deepEqual(
    parseDockerComposePs('web\trunning\ndb\texited\nredis\trunning'),
    { web: 'running', db: 'exited', redis: 'running' }
  );
});

test('parseDockerComposePs — trims trailing whitespace from state', () => {
  assert.deepEqual(parseDockerComposePs('web\trunning  '), { web: 'running' });
});

test('parseDockerComposePs — handles state containing spaces', () => {
  assert.deepEqual(parseDockerComposePs('web\texited (1)'), { web: 'exited (1)' });
});

test('parseDockerComposePs — skips lines without a tab', () => {
  assert.deepEqual(parseDockerComposePs('noTabLine\nweb\trunning'), { web: 'running' });
});

// --- resolveStatus ---

test('resolveStatus — returns "unknown" when dockerStatus is null (Docker unavailable)', () => {
  assert.equal(resolveStatus(null, 'web'), 'unknown');
});

test('resolveStatus — returns "stopped" when service is absent from empty result', () => {
  assert.equal(resolveStatus({}, 'web'), 'stopped');
});

test('resolveStatus — returns "stopped" when service is absent from non-empty result', () => {
  assert.equal(resolveStatus({ db: 'running' }, 'web'), 'stopped');
});

test('resolveStatus — returns actual state when service is present', () => {
  assert.equal(resolveStatus({ web: 'running' }, 'web'), 'running');
  assert.equal(resolveStatus({ web: 'exited' }, 'web'), 'exited');
});
