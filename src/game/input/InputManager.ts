import { EMPTY_SOURCE, deriveIntent, mergeSources, type InputIntent, type SourceState } from '@/core/input/intent';

export interface InputSource {
  /** Called once per frame; returns the current held-state of this device. */
  read(): SourceState;
  destroy?(): void;
}

/** Collects all input sources into a single per-frame InputIntent. Owned by GameScene. */
export class InputManager {
  private readonly sources = new Set<InputSource>();
  private previous: SourceState = EMPTY_SOURCE;
  private current: InputIntent = deriveIntent(EMPTY_SOURCE, EMPTY_SOURCE);

  addSource(source: InputSource): () => void {
    this.sources.add(source);
    return () => this.sources.delete(source);
  }

  /** Call exactly once per frame before entities read `intent`. */
  update(): InputIntent {
    const merged = mergeSources([...this.sources].map((s) => s.read()));
    this.current = deriveIntent(merged, this.previous);
    this.previous = merged;
    return this.current;
  }

  get intent(): InputIntent {
    return this.current;
  }

  destroy(): void {
    for (const s of this.sources) s.destroy?.();
    this.sources.clear();
  }
}
