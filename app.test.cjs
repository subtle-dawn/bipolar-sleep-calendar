const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateRecords } = require('./app.js');
const record = { mood: 'steady', bed: '23:30', wake: '07:00', offset: 1, note: '' };
test('バックアップの正常な記録を復元', () => assert.deepEqual(validateRecords({ '2026-09-19': record }), { '2026-09-19': record }));
test('日時の範囲によってインポートを拒否しない', () => assert.doesNotThrow(() => validateRecords({ '2026-02-30': { ...record, wake: '25:00' } })));
test('記録形式のチェックは維持する', () => { for (const change of [{ mood: 'constructor' }, { wake: null }, { note: null }]) assert.throws(() => validateRecords({ '2026-09-19': { ...record, ...change } })); });
test('時刻の前後関係と同時刻を許可', () => { for (const change of [{ offset: 0 }, { bed: '01:00' }, { bed: '07:00' }]) assert.doesNotThrow(() => validateRecords({ '2026-09-19': { ...record, ...change } })); });

test('昼寝のみの記録がバックアップの往復で保持される', () => {
  const records = { '2026-09-25': { mood: '', bed: '', wake: '', note: '', napStart: '13:00', napEnd: '14:30' } };
  assert.deepEqual(validateRecords(JSON.parse(JSON.stringify(validateRecords(records)))), records);
});
test('昼寝の片方の時刻のみ・空欄も保存できる', () => {
  for (const nap of [{ napStart: '13:00' }, { napEnd: '14:30' }, { napStart: '', napEnd: '' }]) {
    const records = { '2026-09-25': { ...record, ...nap } };
    assert.deepEqual(validateRecords(records), records);
  }
});
test('昼寝の不正な型を拒否する', () => {
  for (const nap of [{ napStart: null }, { napEnd: 14 }, { napStart: [] }, { napEnd: {} }]) {
    assert.throws(() => validateRecords({ '2026-09-25': { ...record, ...nap } }), /昼寝/);
  }
});
