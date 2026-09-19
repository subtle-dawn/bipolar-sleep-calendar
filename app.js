'use strict';
const MOODS = { high: '躁', up: 'やや躁', steady: '安定', down: 'やや鬱', low: '鬱' };
const STORAGE_KEY = 'mood-sleep-calendar-v1';
const timeValid = value => typeof value === 'string' && (/^([01]\d|2[0-3]):[0-5]\d$/.test(value) || value === '');
const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
function sleepMinutes(record) {
  if (!record.bed || !record.wake) return null;
  return minutes(record.wake) - minutes(record.bed) + record.offset * 1440;
}
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function validateRecords(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('記録形式が正しくありません。');
  const clean = {};
  for (const [key, record] of Object.entries(data)) {
    const parsed = new Date(`${key}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || isNaN(parsed) || dateKey(parsed) !== key || !record || typeof record !== 'object') throw new Error('日付または記録が正しくありません。');
    if (!(record.mood === '' || Object.hasOwn(MOODS, record.mood)) || !timeValid(record.bed) || !timeValid(record.wake) || ![0, 1].includes(record.offset) || typeof record.note !== 'string' || record.note.length > 1000) throw new Error('記録内容が正しくありません。');
    const duration = sleepMinutes(record);
    if (duration !== null && (duration <= 0 || duration > 1440)) throw new Error('睡眠時間は0時間より長く、24時間以内で記録してください。');
    clean[key] = { mood: record.mood, bed: record.bed, wake: record.wake, offset: record.offset, note: record.note };
  }
  return clean;
}
function durationLabel(value) { return `${Math.floor(value / 60)}時間${value % 60 ? `${value % 60}分` : ''}`; }
if (typeof module !== 'undefined') module.exports = { sleepMinutes, validateRecords, dateKey };
if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  let records = {}, selected, storageHealthy = true;
  const now = new Date();
  let month = new Date(now.getFullYear(), now.getMonth(), 1);
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) records = validateRecords(JSON.parse(raw)); }
  catch { storageHealthy = false; }
  function persist(next, restoring = false) {
    if (!storageHealthy && !restoring) { $('form-error').textContent = '保存データを読み込めていないため保存できません。バックアップからの復元をお試しください。'; return false; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); records = next; storageHealthy = true; return true; }
    catch { $('form-error').textContent = '保存できませんでした。ブラウザの保存設定・空き容量を確認してください。'; return false; }
  }
  function render() {
    $('month-title').textContent = `${month.getFullYear()}年 ${month.getMonth() + 1}月`;
    const start = new Date(month); start.setDate(1 - month.getDay());
    const cells = Math.ceil((month.getDay() + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7) * 7;
    $('calendar').replaceChildren();
    for (let i = 0; i < cells; i++) {
      const date = new Date(start); date.setDate(start.getDate() + i);
      const key = dateKey(date), record = records[key];
      const button = document.createElement('button'); button.className = `day${date.getMonth() !== month.getMonth() ? ' outside' : ''}${key === dateKey(now) ? ' today' : ''}`;
      button.setAttribute('aria-label', `${date.getMonth() + 1}月${date.getDate()}日 ${record ? [MOODS[record.mood], record.wake && `起床${record.wake}`, record.bed && `就寝${record.offset ? '前日' : '当日'}${record.bed}`, record.note].filter(Boolean).join('、') : '未記録'}、記録を編集`);
      if (key === dateKey(now)) button.setAttribute('aria-current', 'date');
      function add(text, className) { const span = document.createElement('span'); span.className = className; span.textContent = text; button.append(span); return span; }
      add(date.getDate(), 'date-number');
      if (record) {
        if (record.mood) add(MOODS[record.mood], `mood ${record.mood}`);
        const times = add('', 'times');
        if (record.wake || record.bed) {
          for (const [icon, value, kind] of [['☀', record.wake, 'wake-time'], ['☾', record.bed, 'bed-time']]) {
            const row = document.createElement('span'); row.className = kind;
            row.append(Object.assign(document.createElement('span'), { className: 'time-icon', textContent: `${icon} ` }), document.createTextNode(value || '—'));
            times.append(row);
          }
        }
        if (record.note) add(record.note, 'day-note');
      } else add('＋', 'empty-plus');
      button.addEventListener('click', () => openRecord(key)); $('calendar').append(button);
    }
  }
  function updateDuration() {
    const value = sleepMinutes({ bed: $('bed').value, wake: $('wake').value, offset: Number($('bed-offset').value) });
    $('duration').textContent = value === null ? '起床した日付に睡眠を記録します。' : value <= 0 || value > 1440 ? '時刻と就寝した日を確認してください。' : `睡眠時間：${durationLabel(value)}`;
  }
  function openRecord(key) {
    selected = key; $('record-form').reset(); $('form-error').textContent = '';
    const date = new Date(`${key}T12:00:00`);
    $('edit-title').textContent = date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' });
    const record = records[key];
    if (record) {
      if (record.mood) document.querySelector(`input[name="mood"][value="${record.mood}"]`).checked = true;
      $('bed').value = record.bed; $('wake').value = record.wake; $('bed-offset').value = record.offset; $('note').value = record.note;
    }
    $('delete').hidden = !record; updateDuration(); $('editor').showModal();
  }
  $('prev').onclick = () => { month.setMonth(month.getMonth() - 1); render(); };
  $('next').onclick = () => { month.setMonth(month.getMonth() + 1); render(); };
  $('this-month').onclick = () => { const today = new Date(); month = new Date(today.getFullYear(), today.getMonth(), 1); render(); };
  $('today-record').onclick = () => openRecord(dateKey(new Date()));
  $('close').onclick = () => $('editor').close();
  for (const id of ['bed', 'wake', 'bed-offset']) $(id).addEventListener('input', updateDuration);
  $('record-form').onsubmit = event => {
    event.preventDefault();
    const record = { mood: document.querySelector('input[name="mood"]:checked')?.value || '', bed: $('bed').value, wake: $('wake').value, offset: Number($('bed-offset').value), note: $('note').value.trim() };
    if (!record.mood && !record.bed && !record.wake && !record.note) { $('form-error').textContent = '気分・時刻・メモのいずれかを入力してください。'; return; }
    try { validateRecords({ [selected]: record }); } catch (error) { $('form-error').textContent = error.message; return; }
    if (persist({ ...records, [selected]: record })) { month = new Date(`${selected.slice(0, 7)}-01T12:00:00`); render(); $('editor').close(); }
  };
  $('delete').onclick = () => {
    if (!confirm('この日の記録を削除しますか？')) return;
    const next = { ...records }; delete next[selected];
    if (persist(next)) { render(); $('editor').close(); }
  };
  $('export').onclick = () => {
    if (!storageHealthy) { alert('保存データの読み込みに失敗しているため、バックアップを作成できません。'); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, records }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `躁鬱睡眠カレンダー-${dateKey(new Date())}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
   
  };
  $('import').onclick = () => $('import-file').click();
  $('import-file').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 5000000) throw new Error('ファイルは5MB以下にしてください。');
      const data = JSON.parse(await file.text());
      if (data.version !== 1) throw new Error('対応していないバックアップ形式です。');
      const imported = validateRecords(data.records);
      if (!confirm(`${Object.keys(imported).length}日分の記録を復元します。同じ日付の記録は上書きされます。よろしいですか？`)) return;
      if (persist({ ...records, ...imported }, true)) { render(); }
    } catch (error) { alert(`復元できませんでした：${error.message}`); }
    finally { event.target.value = ''; }
  };
  render();
}
