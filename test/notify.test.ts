import test from 'node:test';
import assert from 'node:assert/strict';
import { toast } from '../src/notify';

test('falls back to main-window alert when ProgressWindow toast fails', () => {
  const alerts: string[] = [];
  (globalThis as any).Zotero = {
    ProgressWindow: function () {
      throw new Error('ProgressWindow unavailable');
    },
    getMainWindow: () => ({
      alert: (message: string) => { alerts.push(message); }
    })
  };

  toast('후보 노트 저장');

  assert.deepEqual(alerts, ['Vocab Flow: 후보 노트 저장']);
});
