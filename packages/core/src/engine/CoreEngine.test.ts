/**
 * Test for CoreEngine
 */

import { describe, it, expect } from 'vitest';
import { CoreEngine } from './index';

describe('CoreEngine', () => {
  it('should instantiate correctly', () => {
    const engine = new CoreEngine();
    expect(engine).toBeDefined();
  });
});