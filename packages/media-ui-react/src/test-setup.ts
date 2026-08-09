import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// `globals: false` in vitest.config.ts means @testing-library/react can't detect
// a global `afterEach` to auto-register its DOM cleanup, so each `render()` call
// would otherwise accumulate in `document.body` across tests in the same file.
afterEach(() => {
  cleanup();
});
