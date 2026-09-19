const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateRecords } = require('./app.js');
const record = { mood: 'steady', bed: '23:30', wake: '07:00', offset: 1, note: '' };
test('バックアップの正常な記録を復元', () => assert.deepEqual(validateRecords({ '2026-09-19': record }), { '2026-09-19': record }));
test('日時の範囲によってインポートを拒否しない', () => assert.doesNotThrow(() => validateRecords({ '2026-02-30': { ...record, wake: '25:00' } })));
test('記録形式のチェックは維持する', () => { for (const change of [{ mood: 'constructor' }, { wake: null }, { note: null }]) assert.throws(() => validateRecords({ '2026-09-19': { ...record, ...change } })); });
test('時刻の前後関係と同時刻を許可', () => { for (const change of [{ offset: 0 }, { bed: '01:00' }, { bed: '07:00' }]) assert.doesNotThrow(() => validateRecords({ '2026-09-19': { ...record, ...change } })); });
