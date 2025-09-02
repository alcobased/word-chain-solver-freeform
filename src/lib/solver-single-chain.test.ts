

import { generateConnections, solveSingleChain } from './solver';
import type { Circles } from '@/components/word-chain-solver';

describe('generateConnections', () => {
    it('should generate correct connections from a word list', () => {
      const wordLists = ['TOAST STAND STOP OPEN ENTER'];
      const expectedConnections = {
        TOAST: ['STAND', 'STOP'],
        STAND: [],
        STOP: ['OPEN'],
        OPEN: ['ENTER'],
        ENTER: [],
      };
  
      const result = generateConnections(wordLists);
  
      // Sort arrays for consistent comparison
      Object.values(result).forEach(arr => arr.sort());
      Object.values(expectedConnections).forEach(arr => arr.sort());
  
      expect(result).toEqual(expectedConnections);
    });

    it('should not connect words from different lists', () => {
        const wordLists = ['CAST MAST', 'STEP MIST']; // CAST and STEP should not connect
        const result = generateConnections(wordLists);

        expect(result['CAST']).not.toContain('STEP');
        expect(result['MAST']).not.toContain('MIST');
    });
});

describe('solveSingleChain', () => {
    describe('with unrestricted queue', () => {
        let circles: Circles;
        let queue: string[];

        beforeEach(() => {
            circles = {};
            queue = Array.from({ length: 12 }, (_, i) => `c${i}`);
            queue.forEach(id => {
                circles[id] = { x: 0, y: 0 };
            });
        });

        it('should find a valid 12-letter chain and only one', () => {
            const wordLists = ['TOAST STOP OPEN ENTER'];
            const words = wordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
            const connections = generateConnections(wordLists);

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
            const wordLists = ['TOAST STOP OPEN ENTER COAST'];
            const words = wordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
            const connections = generateConnections(wordLists);

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

        it('should return no solutions for invalid chain lengths', () => {
            const wordLists = ['TOAST STOP OPEN ENTER'];
            const words = wordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
            const connections = generateConnections(wordLists);
            const circles: Circles = {};
            
            // Test with a length that is too long
            const longQueue = Array.from({ length: 14 }, (_, i) => `c${i}`);
            longQueue.forEach(id => { circles[id] = { x: 0, y: 0 }; });
            const longResult = solveSingleChain(longQueue, circles, words, connections);
            expect(longResult).toHaveLength(0);

            // Test with a length that is too short
            const shortQueue = Array.from({ length: 3 }, (_, i) => `c${i}`);
            shortQueue.forEach(id => { circles[id] = { x: 0, y: 0 }; });
            const shortResult = solveSingleChain(shortQueue, circles, words, connections);
            expect(shortResult).toHaveLength(0);
        });
    });

    describe('with repeating ids (chain crosses itself)', () => {
        let circles: Circles;

        beforeEach(() => {
            circles = {};
        });

        it('should find a solution that respects the crossover character constraint', () => {
            // "LEADER" -> "ERASER" = LEADERASER (10 letters)
            // 'E' is at indices 1 and 8. 'R' is at indices 5 and 9.
            // c1 corresponds to 'E', c5 corresponds to 'R'.
            const queue = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c1', 'c5'];
            queue.forEach(id => { if(!circles[id]) circles[id] = { x: 0, y: 0 }; });

            const wordLists = ['LEADER ERASER'];
            const words = wordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
            const connections = generateConnections(wordLists);
            
            const results = solveSingleChain(queue, circles, words, connections);

            expect(results).toHaveLength(1);
            expect(results[0].solution).toEqual(['LEADER', 'ERASER']);
        });

        it('should not find a solution if the crossover characters do not match', () => {
            // "LEADER" -> "ERASER" = LEADERASER (10 letters)
            // Crossover point 'c1' is at index 1 ('E') and index 5 ('R'). This should fail.
            const queue = ['c0', 'c1', 'c2', 'c3', 'c4', 'c1', 'c6', 'c7', 'c8', 'c9'];
             queue.forEach(id => { if(!circles[id]) circles[id] = { x: 0, y: 0 }; });

            const wordLists = ['LEADER ERASER'];
            const words = wordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
            const connections = generateConnections(wordLists);
            
            const results = solveSingleChain(queue, circles, words, connections);

            expect(results).toHaveLength(0);
        });
    });
    
    describe('with pre-filled character constraints', () => {
        let circles: Circles;
        let queue: string[];

        beforeEach(() => {
            circles = {};
            queue = Array.from({ length: 12 }, (_, i) => `c${i}`);
            queue.forEach(id => {
                circles[id] = { x: 0, y: 0 };
            });
        });

        it('should find a solution that respects a valid pre-filled character', () => {
            // Chain is TOASTOPENTER. Character at index 2 is 'A'.
            circles['c2'].char = 'A';

            const wordLists = ['TOAST STOP OPEN ENTER'];
            const words = wordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
            const connections = generateConnections(wordLists);

            const result = solveSingleChain(queue, circles, words, connections);
            expect(result).toHaveLength(1);
            expect(result[0].solution).toEqual(['TOAST', 'STOP', 'OPEN', 'ENTER']);
        });

        it('should not find a solution if a pre-filled character is invalid', () => {
            // Chain is TOASTOPENTER. Character at index 2 is 'A', not 'X'.
            circles['c2'].char = 'X';

            const wordLists = ['TOAST STOP OPEN ENTER'];
            const words = wordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
            const connections = generateConnections(wordLists);

            const result = solveSingleChain(queue, circles, words, connections);
            expect(result).toHaveLength(0);
        });

        it('should use a pre-filled character to select the correct solution from multiple possibilities', () => {
            // Possible chains: TOASTOPENTER, COASTOPENTER.
            // Clue at index 0 is 'T', so only TOAST... is valid.
            circles['c0'].char = 'T';

            const wordLists = ['TOAST STOP OPEN ENTER COAST'];
            const words = wordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
            const connections = generateConnections(wordLists);

            const result = solveSingleChain(queue, circles, words, connections);
            expect(result).toHaveLength(1);
            expect(result[0].solution).toEqual(['TOAST', 'STOP', 'OPEN', 'ENTER']);
        });
    });
    
    describe('with crossovers and pre-filled characters', () => {
        let circles: Circles;
        let queue: string[];
        let words: string[];
        let connections: Record<string, string[]>;

        beforeEach(() => {
            circles = {};
            // "LEADER" -> "ERASER" = LEADERASER (10 letters)
            queue = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c1', 'c5'];
            queue.forEach(id => { if(!circles[id]) circles[id] = { x: 0, y: 0 }; });

            const wordLists = ['LEADER ERASER'];
            words = wordLists.flatMap(list => list.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase()));
            connections = generateConnections(wordLists);
        });

        it('should find a solution with a valid pre-filled crossover character', () => {
            // c1 is at indices 1 and 8. In 'LEADERASER', this is 'E'.
            circles['c1'].char = 'E';

            const results = solveSingleChain(queue, circles, words, connections);

            expect(results).toHaveLength(1);
            expect(results[0].solution).toEqual(['LEADER', 'ERASER']);
        });

        it('should not find a solution with an invalid pre-filled crossover character', () => {
            // c1 is at indices 1 and 8, which should be 'E'.
            circles['c1'].char = 'X';

            const results = solveSingleChain(queue, circles, words, connections);

            expect(results).toHaveLength(0);
        });
    });

    describe('with edge cases', () => {
        it('should return no solutions for an empty queue', () => {
            const circles: Circles = { 'c0': { x: 0, y: 0 }};
            const words: string[] = ['TEST'];
            const connections: Record<string, string[]> = { 'TEST': [] };
            const emptyQueue: string[] = [];
            const results = solveSingleChain(emptyQueue, circles, words, connections);
            expect(results).toHaveLength(0);
        });

        it('should return no solutions for an empty word list', () => {
            const circles: Circles = { 'c0': { x: 0, y: 0 }};
            const queue = ['c0'];
            const emptyWords: string[] = [];
            const emptyConnections = generateConnections([]);
            const results = solveSingleChain(queue, circles, emptyWords, emptyConnections);
            expect(results).toHaveLength(0);
        });

        it('should return no solutions when no words can be connected', () => {
            const circles: Circles = {};
            const wordLists = ['HELLO WORLD'];
            const unconnectedWords = wordLists.flatMap(list => list.split(' '));
            const unconnectedConnections = generateConnections(wordLists);
            const longQueue = Array.from({ length: 10 }, (_, i) => `c${i}`);
            longQueue.forEach(id => { circles[id] = { x: 0, y: 0 }; });

            const results = solveSingleChain(longQueue, circles, unconnectedWords, unconnectedConnections);
            expect(results).toHaveLength(0);
        });
    });

    describe('with looped chains', () => {
        it('should find a solution for a looped chain', () => {
            const circles: Circles = {};
            const wordLists = ['STOP OPEN ENCASE SEREST'];
            const words = wordLists.flatMap(list => list.split(' ').map(w => w.toUpperCase()));
            const connections = generateConnections(wordLists); 
            
            const queue = Array.from({ length: 14 }, (_, i) => `c${i}`);
            // change queue so first id is same as 2nd to last id
            // and 2nd id is same as last
            queue[0] = queue[queue.length - 2];
            queue[1] = queue[queue.length - 1];

            queue.forEach(id => { circles[id] = { x: 0, y: 0 }; });
            
            const results = solveSingleChain(queue, circles, words, connections);

            expect(results).toHaveLength(4);
            
            const expectedSolutions = [
                ['STOP', 'OPEN', 'ENCASE', 'SEREST'],
                ['OPEN', 'ENCASE', 'SEREST', 'STOP'],
                ['ENCASE', 'SEREST', 'STOP', 'OPEN'],
                ['SEREST', 'STOP', 'OPEN', 'ENCASE'],
            ];

            const actualSolutions = results.map(r => r.solution);

            expect(actualSolutions).toHaveLength(expectedSolutions.length);
            expect(actualSolutions).toEqual(expect.arrayContaining(expectedSolutions));
        });
    });
});
