
import { generateConnections, solveMultiChain } from './solver';
import type { Circles, Queues, MultiSolution } from '@/components/word-chain-solver';

describe('solveMultiChain', () => {
  let words: string[];
  let connections: Record<string, string[]>;

  beforeEach(() => {
    const wordLists = ['MAST STAND SPEED EDGE GEAR'];
    words = wordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
    connections = generateConnections(wordLists);
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
        const { solutions } = result;

        expect(solutions).toHaveLength(1);
        const solution = solutions[0];
        
        expect(solution.chain1.solution).toEqual(['MAST', 'STAND']);
        expect(solution.chain1.chain).toEqual('MASTAND');
        
        expect(solution.chain2.solution).toEqual(['SPEED', 'EDGE', 'GEAR']);
        expect(solution.chain2.chain).toEqual('SPEEDGEAR');

        expect(result.reasoning).toContain('Successfully found 1 solution(s)');
    });
    
    it('should find all possible solutions when multiple words are valid', () => {
      const extraWords = 'POST CAST GEMS GERM';
      const extendedWordLists = [...words.join(' ').split(' '), ...extraWords.toUpperCase().split(' ')].join(' ').split('\n');
      const extendedWords = extendedWordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
      const extendedConnections = generateConnections(extendedWordLists);
      
      const result = solveMultiChain(queues, circles, extendedWords, extendedConnections);
      
      expect(result.solutions).toHaveLength(9);
    });

    it('should return no solutions if one chain is unsolvable', () => {
        const unsolvableQueues = { ...queues, chain1: ['c0', 'c1'] }; // Length 2 is impossible
        const result = solveMultiChain(unsolvableQueues, circles, words, connections);
        expect(result.solutions).toHaveLength(0);
        expect(result.reasoning).toContain('Could not find a valid solution');
    });

    it('should respect pre-filled character constraints', () => {
        circles['c0'] = { ...circles['c0'], char: 'M' }; // First char of chain1 must be 'M'
        
        const extraWords = 'POST CAST GEMS GERM';
        const extendedWordLists = [...words.join(' ').split(' '), ...extraWords.toUpperCase().split(' ')].join(' ').split('\n');
        const extendedWords = extendedWordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
        const extendedConnections = generateConnections(extendedWordLists);
        
        const result = solveMultiChain(queues, circles, extendedWords, extendedConnections);
        
        expect(result.solutions).toHaveLength(3);
        result.solutions.forEach(solutionSet => {
            expect(solutionSet.chain1.chain.startsWith('M')).toBe(true);
        });
    });

    it('should handle an empty chain gracefully', () => {
        const queuesWithEmpty = { ...queues, chain3: [] };
        const result = solveMultiChain(queuesWithEmpty, circles, words, connections);

        // Should still find the one solution for chain1 and chain2
        expect(result.solutions).toHaveLength(1);
        expect(result.solutions[0].chain1.chain).toEqual('MASTAND');
        expect(result.solutions[0].chain2.chain).toEqual('SPEEDGEAR');
        // Ensure chain3 is not in the solution
        expect(result.solutions[0].chain3).toBeUndefined();
    });
  });

});
