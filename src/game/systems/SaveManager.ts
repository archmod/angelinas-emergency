import { emptyProgress, parseProgress, serializeProgress, type Progress } from '@/core/rules/progress';

const KEY = 'angelina.progress.v1';

/** localStorage-backed progress. Failures (private mode, quota) degrade to in-memory. */
export class SaveManager {
  private progress: Progress;

  constructor(private readonly storage: Storage | null = safeStorage()) {
    this.progress = parseProgress(this.storage?.getItem(KEY));
  }

  get(): Progress {
    return this.progress;
  }

  set(p: Progress): void {
    this.progress = p;
    try {
      this.storage?.setItem(KEY, serializeProgress(p));
    } catch {
      /* quota / private mode: keep in memory only */
    }
  }

  reset(): void {
    this.set(emptyProgress());
  }
}

function safeStorage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
