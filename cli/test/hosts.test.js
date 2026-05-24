import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesHost, addHost } from '../src/utils/hosts.js';

test('matchesHost — detects domain as first hostname token', () => {
  assert.ok(matchesHost('127.0.0.1   app.localhost\n', 'app.localhost'));
});

test('matchesHost — detects domain preceded by whitespace', () => {
  assert.ok(matchesHost('127.0.0.1\tapp.localhost\n', 'app.localhost'));
});

test('matchesHost — detects domain followed by comment', () => {
  assert.ok(matchesHost('127.0.0.1   app.localhost # managed by local-gateway\n', 'app.localhost'));
});

test('matchesHost — detects domain followed by another hostname', () => {
  assert.ok(matchesHost('127.0.0.1   app.localhost other.localhost\n', 'app.localhost'));
});

test('matchesHost — returns false when domain is absent', () => {
  assert.ok(!matchesHost('127.0.0.1   other.localhost\n', 'app.localhost'));
});

test('matchesHost — does not match partial domain prefix', () => {
  assert.ok(!matchesHost('127.0.0.1   myapp.localhost\n', 'app.localhost'));
});

test('matchesHost — does not match partial domain suffix', () => {
  assert.ok(!matchesHost('127.0.0.1   app.localhost.extra\n', 'app.localhost'));
});

test('matchesHost — handles dots correctly (no regex bleed)', () => {
  assert.ok(!matchesHost('127.0.0.1   appXlocalhost\n', 'app.localhost'));
});

test('matchesHost — works across multiple lines', () => {
  const content = '127.0.0.1   first.localhost\n127.0.0.1   app.localhost\n';
  assert.ok(matchesHost(content, 'app.localhost'));
  assert.ok(!matchesHost(content, 'missing.localhost'));
});

test('matchesHost — ignores fully commented-out lines', () => {
  assert.ok(!matchesHost('# 127.0.0.1   app.localhost\n', 'app.localhost'));
});

test('matchesHost — ignores lines with leading whitespace before comment marker', () => {
  assert.ok(!matchesHost('  # 127.0.0.1   app.localhost\n', 'app.localhost'));
});

test('matchesHost — does not match domain that appears only in an inline comment', () => {
  assert.ok(!matchesHost('127.0.0.1   localhost # app.localhost\n', 'app.localhost'));
});

test('matchesHost — matching is case-insensitive', () => {
  assert.ok(matchesHost('127.0.0.1   APP.LOCALHOST\n', 'app.localhost'));
  assert.ok(matchesHost('127.0.0.1   app.localhost\n', 'APP.LOCALHOST'));
});

test('addHost — throws on invalid domain', () => {
  assert.throws(
    () => addHost('invalid domain!', { skipCheck: true }),
    /Invalid domain/
  );
});

test('addHost — throws on domain with path separator', () => {
  assert.throws(
    () => addHost('app/localhost', { skipCheck: true }),
    /Invalid domain/
  );
});

test('addHost — throws on empty label (double dot)', () => {
  assert.throws(() => addHost('app..localhost', { skipCheck: true }), /Invalid domain/);
});

test('addHost — throws on leading dot', () => {
  assert.throws(() => addHost('.app.localhost', { skipCheck: true }), /Invalid domain/);
});

test('addHost — throws on trailing dot', () => {
  assert.throws(() => addHost('app.localhost.', { skipCheck: true }), /Invalid domain/);
});

test('addHost — throws on leading hyphen in label', () => {
  assert.throws(() => addHost('-app.localhost', { skipCheck: true }), /Invalid domain/);
});

test('addHost — throws on trailing hyphen in label', () => {
  assert.throws(() => addHost('app-.localhost', { skipCheck: true }), /Invalid domain/);
});

