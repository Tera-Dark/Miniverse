import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import cancellationTaskGame from './index';

describe('cancellation task game module', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    cancellationTaskGame.destroy();
    host.remove();
  });

  it('mounts interactive layout', () => {
    cancellationTaskGame.init(host);

    expect(host.querySelector('.cancellation-game')).not.toBeNull();
    expect(host.querySelector('.schulte-table')).not.toBeNull();
    expect(host.querySelector('.cancellation-game__metric-value')).not.toBeNull();
  });
});
