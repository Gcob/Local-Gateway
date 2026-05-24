import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, normalize, parse, sep } from 'path';
import { homedir } from 'os';
import { abbreviatePath } from '../src/utils/paths.js';

const home = homedir();

test('abbreviatePath — abbreviates path inside home directory', () => {
  const p = `${home}${sep}projects${sep}myapp${sep}docker-compose.yml`;
  assert.equal(abbreviatePath(p), `~${sep}projects${sep}myapp${sep}docker-compose.yml`);
});

test('abbreviatePath — returns ~ when path is exactly home directory', () => {
  assert.equal(abbreviatePath(home), '~');
});

test('abbreviatePath — returns ~ when path is home directory with trailing separator', () => {
  assert.equal(abbreviatePath(home + sep), '~');
});

test('abbreviatePath — does not abbreviate path with shared prefix but different user', () => {
  const impostor = `${home}2${sep}project`;
  assert.equal(abbreviatePath(impostor), impostor);
});

test('abbreviatePath — does not abbreviate sibling directory of home', () => {
  const sibling = `${dirname(home)}${sep}otheruser${sep}file`;
  assert.equal(abbreviatePath(sibling), sibling);
});

test('abbreviatePath — returns path unchanged when outside home directory', () => {
  const p = `${sep}var${sep}www${sep}app`;
  assert.equal(abbreviatePath(p), p);
});

test('abbreviatePath — does not corrupt filesystem root', () => {
  const root = parse(sep).root;
  assert.equal(abbreviatePath(root), root);
});

test('abbreviatePath — root with extra trailing separator does not produce empty string or home abbreviation', () => {
  const root = parse(sep).root;
  const withExtra = normalize(root + sep);
  const result = abbreviatePath(withExtra);
  assert.ok(result.length > 0, 'result must not be empty');
  assert.ok(!result.startsWith('~'), 'root must not be abbreviated as home');
});

test('abbreviatePath — returns empty string for null input', () => {
  assert.equal(abbreviatePath(null), '');
});

test('abbreviatePath — returns empty string for undefined input', () => {
  assert.equal(abbreviatePath(undefined), '');
});
