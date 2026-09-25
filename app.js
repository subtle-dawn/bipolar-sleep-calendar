'use strict';
const MOODS = { high: '躁', up: 'やや躁', steady: '安定', down: 'やや鬱', low: '鬱' };
const STORAGE_KEY = 'mood-sleep-calendar-v1';
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function validateRecords(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('記録形式が正しくありません。');
  const clean = {};
  for (const [key, record] of Object.entries(data)) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('記録形式が正しくありません。');
    if (!(record.mood === '' || Object.hasOwn(MOODS, record.mood)) || typeof record.bed !== 'string' || typeof record.wake !== 'string' || typeof record.note !== 'string' || record.note.length > 1000) throw new Error('記録内容が正しくありません。');
    if ((record.napStart !== undefined && typeof record.napStart !== 'string') || (record.napEnd !== undefined && typeof record.napEnd !== 'string')) throw new Error('昼寝の記録形式が正しくありません。');
    Object.defineProperty(clean, key, { value: { mood: record.mood, bed: record.bed, wake: record.wake, ...(record.napStart !== undefined ? { napStart: record.napStart } : {}), ...(record.napEnd !== undefined ? { napEnd: record.napEnd } : {}), ...(record.offset !== undefined ? { offset: record.offset } : {}), note: record.note }, enumerable: true, configurable: true, writable: true });
  }
  return clean;
}
if (typeof module !== 'undefined') module.exports = { validateRecords, dateKey };
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
      button.setAttribute('aria-label', `${date.getMonth() + 1}月${date.getDate()}日 ${record ? [MOODS[record.mood], record.wake && `起床${record.wake}`, record.napStart && `昼寝開始${record.napStart}`, record.napEnd && `昼寝終了${record.napEnd}`, record.bed && `就寝${record.bed}`, record.note].filter(Boolean).join('、') : '未記録'}、記録を編集`);
      if (key === dateKey(now)) button.setAttribute('aria-current', 'date');
      function add(text, className) { const span = document.createElement('span'); span.className = className; span.textContent = text; button.append(span); return span; }
      add(date.getDate(), 'date-number');
      const hasInput = record && [record.mood, record.wake, record.napStart, record.napEnd, record.bed, record.note].some(value => value?.trim());
      if (hasInput) {
        const mood = add(MOODS[record.mood] || '\u00a0', `mood ${record.mood || 'unrecorded'}`);
        if (!record.mood) mood.setAttribute('aria-hidden', 'true');
        const times = add('', 'times');
        for (const [icon, value, kind] of [
          ['☀️', record.wake, 'wake-time'],
          ['😪', record.napStart, 'nap-start-time'],
          ['😲', record.napEnd, 'nap-end-time'],
          ['🌙', record.bed, 'bed-time']
        ]) {
          const row = document.createElement('span'); row.className = kind;
          if (value?.trim()) {
            row.append(Object.assign(document.createElement('span'), { className: 'time-icon', textContent: `${icon} ` }), document.createTextNode(value));
          } else {
            row.textContent = '\u00a0';
            row.setAttribute('aria-hidden', 'true');
          }
          times.append(row);
        }
        if (record.note) add(record.note, 'day-note');
      } else add('＋', 'empty-plus');
      button.addEventListener('click', () => openRecord(key)); $('calendar').append(button);
    }
  }
  function openRecord(key) {
    selected = key; $('record-form').reset(); $('form-error').textContent = '';
    const date = new Date(`${key}T12:00:00`);
    $('edit-title').textContent = date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' });
    const record = records[key];
    if (record) {
      if (record.mood) document.querySelector(`input[name="mood"][value="${record.mood}"]`).checked = true;
      $('nap-start').value = record.napStart || ''; $('nap-end').value = record.napEnd || '';
      $('bed').value = record.bed; $('wake').value = record.wake; $('note').value = record.note;
    }
    $('delete').hidden = !record; $('editor').showModal();
    $('close').focus({ preventScroll: true }); $('editor').scrollTop = 0;
  }
  $('prev').onclick = () => { month.setMonth(month.getMonth() - 1); render(); };
  $('next').onclick = () => { month.setMonth(month.getMonth() + 1); render(); };
  $('this-month').onclick = () => { const today = new Date(); month = new Date(today.getFullYear(), today.getMonth(), 1); render(); };
  $('today-record').onclick = () => openRecord(dateKey(new Date()));
  $('close').onclick = () => $('editor').close();
  $('record-form').onsubmit = event => {
    event.preventDefault();
    const record = { mood: document.querySelector('input[name="mood"]:checked')?.value || '', bed: $('bed').value, wake: $('wake').value, napStart: $('nap-start').value, napEnd: $('nap-end').value, note: $('note').value.trim() };
    if (!record.mood && !record.bed && !record.wake && !record.napStart && !record.napEnd && !record.note) { $('form-error').textContent = '気分・時刻・メモのいずれかを入力してください。'; return; }
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
