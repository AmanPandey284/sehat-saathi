import { describe, expect, it } from 'vitest';
import { evaluateSafety } from './safetyEngine';

describe('safety engine', () => {
  it('flags breathing difficulty', () => expect(evaluateSafety({ breathingDifficulty: 'yes' })).toHaveLength(1));
  it('flags blood in cough', () => expect(evaluateSafety({ bloodInCough: 'yes' })).toHaveLength(1));
  it('flags severe pain', () => expect(evaluateSafety({ severity: 8 })).toHaveLength(1));
  it('does not diagnose', () => expect(evaluateSafety({ cough: 'yes' })).toHaveLength(0));
});
