
import { generateConnections, solveMultiChain } from './solver';
import type { Circles, Queues, MultiSolution } from '@/components/word-chain-solver';

describe('solveMultiChain', () => {
  let words: string[];
  let connections: Record<string, string[]>;

  beforeEach(() => {
    const wordList = 'MAST STAND SPEED EDGE GEAR';
    words = wordList.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase());
    connections = generateConnections(wordList);
  });

  describe('with disjointed chains', () => {
    let circles: Circles;
    let queues: Queues;

    beforeEach(() => {
      circles = {};
      queues = {
        chain1: ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'], // MASTAND
        chain2: ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'], // SPEEDGEAR
      };
      Object.keys(queues).forEach(key => {
          queues[key].forEach((id, i) => {
              if (!circles[id]) {
                  circles[id] = { x: i * 10, y: (key === 'chain1' ? 0 : 20) };
              }
          });
      });
    });

    it('should solve for two separate chains, "MASTAND" and "SPEEDGEAR"', () => {
        const result = solveMultiChain(queues, circles, words, connections);

        expect(result.solution).not.toBeNull();
        
        const solution = result.solution as MultiSolution;
        
        expect(solution.chain1.solution).toEqual(['MAST', 'STAND']);
        expect(solution.chain1.chain).toEqual('MASTAND');
        
        expect(solution.chain2.solution).toEqual(['SPEED', 'EDGE', 'GEAR']);
        expect(solution.chain2.chain).toEqual('SPEEDGEAR');

        expect(result.reasoning).toContain('Successfully found a solution');
    });
  });

});
