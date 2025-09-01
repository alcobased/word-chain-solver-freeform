
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

describe('solveSingleChain', () => {
    it('should find a valid 12-letter chain and only one', () => {
        const wordList = 'TOAST STOP OPEN ENTER';
        const words = wordList.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase());
        const connections = generateConnections(wordList);

        const queue = Array.from({ length: 12 }, (_, i) => `c${i}`);
        const circles: Circles = {};
        queue.forEach(id => {
            circles[id] = { x: 0, y: 0 };
        });

        const result = solveSingleChain(queue, circles, words, connections);

        expect(result).toHaveLength(1);
        
        const solution = result[0];
        const solutionWords = solution.solution;
        let constructedChain = "";
        if (solutionWords.length > 0) {
            constructedChain = solutionWords[0];
            for (let i = 1; i < solutionWords.length; i++) {
                constructedChain += solutionWords[i].slice(2);
            }
        }
        
        expect(constructedChain.length).toBe(12);
        expect(solutionWords).toEqual(['TOAST', 'STOP', 'OPEN', 'ENTER']);
        expect(constructedChain).toBe('TOASTOPENTER');
    });

    it('should find 2 valid solutions when multiple chains are possible', () => {
        const wordList = 'TOAST STOP OPEN ENTER COAST';
        const words = wordList.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase());
        const connections = generateConnections(wordList);

        const queue = Array.from({ length: 12 }, (_, i) => `c${i}`);
        const circles: Circles = {};
        queue.forEach(id => {
            circles[id] = { x: 0, y: 0 };
        });

        const results = solveSingleChain(queue, circles, words, connections);

        expect(results).toHaveLength(2);

        const constructedChains = results.map(res => {
            const solutionWords = res.solution;
            if (solutionWords.length === 0) return "";
            let chain = solutionWords[0];
            for (let i = 1; i < solutionWords.length; i++) {
                chain += solutionWords[i].slice(2);
            }
            return chain;
        });

        expect(constructedChains).toContain('TOASTOPENTER');
        expect(constructedChains).toContain('COASTOPENTER');
    });
});
