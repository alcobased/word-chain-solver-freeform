
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
        chain1: ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'], // MASTAND or CASTAND etc.
        chain2: ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'], // SPEEDGEAR or STEEDGEAR etc.
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

        expect(result.solutions).toHaveLength(1);
        const solution = result.solutions[0];
        
        expect(solution.chain1.solution).toEqual(['MAST', 'STAND']);
        expect(solution.chain1.chain).toEqual('MASTAND');
        
        expect(solution.chain2.solution).toEqual(['SPEED', 'EDGE', 'GEAR']);
        expect(solution.chain2.chain).toEqual('SPEEDGEAR');

        expect(result.reasoning).toContain('Successfully found 1 solution(s)');
    });

    it('should find all possible solutions when multiple words are valid', () => {
      const extraWords = 'CAST STEED';
      const extendedWordList = words.join(' ') + ' ' + extraWords;
      const extendedWords = extendedWordList.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase());
      const extendedConnections = generateConnections(extendedWordList);
      
      const result = solveMultiChain(queues, circles, extendedWords, extendedConnections);
      
      // Chain 1 possibilities: MASTAND, CASTAND, MASTEED, CASTEED (4)
      // Chain 2 possibilities: SPEEDGEAR, STEEDGEAR (2)
      // Total should be 4 * 2 = 8.
      expect(result.solutions).toHaveLength(8);

      const solutionChains = result.solutions.map(sol => ({
          chain1: sol.chain1.chain,
          chain2: sol.chain2.chain
      }));

      // Check for a few expected combinations to ensure correctness
      expect(solutionChains).toContainEqual({ chain1: 'MASTAND', chain2: 'SPEEDGEAR' });
      expect(solutionChains).toContainEqual({ chain1: 'MASTAND', chain2: 'STEEDGEAR' });
      expect(solutionChains).toContainEqual({ chain1: 'CASTEED', chain2: 'SPEEDGEAR' });
      expect(solutionChains).toContainEqual({ chain1: 'CASTEED', chain2: 'STEEDGEAR' });
    });
  });

});
