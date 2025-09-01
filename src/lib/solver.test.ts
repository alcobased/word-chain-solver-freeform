
import { generateConnections, solveSingleChain, solveMultiChain } from './solver';
import type { Circles, Queues } from '@/components/word-chain-solver';

describe('generateConnections', () => {
    it('should generate correct connections from a word list', () => {
      const wordList = 'TOAST STAND STOP OPEN ENTER';
      const expectedConnections = {
        TOAST: ['STAND', 'STOP'],
        STAND: [],
        STOP: ['OPEN'],
        OPEN: ['ENTER'],
        ENTER: [],
      };
  
      const result = generateConnections(wordList);
  
      // Sort arrays for consistent comparison
      Object.values(result).forEach(arr => arr.sort());
      Object.values(expectedConnections).forEach(arr => arr.sort());
  
      expect(result).toEqual(expectedConnections);
    });
});
