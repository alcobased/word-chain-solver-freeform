
import { solveSingleChain, solveMultiChain } from './solver';
import type { Circles, Queues } from '@/components/word-chain-solver';

describe('solveSingleChain', () => {
    const words = ['CAST', 'STONE', 'NEST', 'STAND'];
    const connections = {
        'CAST': ['STONE', 'STAND'],
        'STONE': ['NEST'],
        'NEST': [],
        'STAND': [],
    };
    const circles: Circles = {
        '0': { x: 0, y: 0 }, '1': { x: 0, y: 0 }, '2': { x: 0, y: 0 }, '3': { x: 0, y: 0 },
        '4': { x: 0, y: 0 }, '5': { x: 0, y: 0 }, '6': { x: 0, y: 0 }, '7': { x: 0, y: 0 },
        '8': { x: 0, y: 0 }, '9': { x: 0, y: 0 }, '10': { x: 0, y: 0 },
    };

    it('should find a simple chain', () => {
        const queue = ['0', '1', '2', '3', '4', '5', '6', '7']; // CAST + ONE
        const result = solveSingleChain(queue, circles, words, connections);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].solution).toEqual(['CAST', 'STONE']);
    });

    it('should not find a solution if not possible', () => {
        const queue = ['0', '1', '2', '3']; // Needs a 4-letter word
        const result = solveSingleChain(queue, { ...circles, '0': { ...circles['0'], char: 'Z' } }, words, connections);
        expect(result.length).toBe(0);
    });

    it('should respect known characters', () => {
        const queue = ['0', '1', '2', '3', '4', '5', '6', '7'];
        const circlesWithHint: Circles = { ...circles, '4': { ...circles['4'], char: 'O' } };
        const result = solveSingleChain(queue, circlesWithHint, words, connections);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].solution).toEqual(['CAST', 'STONE']);

        const circlesWithWrongHint: Circles = { ...circles, '4': { ...circles['4'], char: 'X' } };
        const resultWrong = solveSingleChain(queue, circlesWithWrongHint, words, connections);
        expect(resultWrong.length).toBe(0);
    });

    it('should handle repeating circles correctly', () => {
        const queue = ['0', '1', '2', '3', '0']; // C,A,S,T,C
        const circlesWithRepeat: Circles = { ...circles, '0': { ...circles[0], char: 'C' } };
        const result = solveSingleChain(queue, circlesWithRepeat, ['CASTS'], { 'CASTS': [] });
        expect(result.length).toBe(0); // CASTS -> C,A,S,T,S not C

        const result2 = solveSingleChain(queue, circles, ['CACAC'], { 'CACAC': [] });
        expect(result2.length).toBeGreaterThan(0);
        expect(result2[0].solution).toEqual(['CACAC']);
    });
    
    it('should solve the user-provided example case', () => {
        const queue = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '1', '9', '10']; // chain: CASTONESTAND, words: CAST, STONE, NEST, STAND
        const localCircles = {...circles};
        const result = solveSingleChain(queue, localCircles, words, connections);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].solution).toEqual(['CAST', 'STONE', 'NEST', 'STAND']);
    });

});

describe('solveMultiChain', () => {
    const words = ['REACT', 'ACTOR', 'ROAST', 'STRAP'];
    const connections = {
        'REACT': ['ACTOR'],
        'ACTOR': ['ROAST'],
        'ROAST': [],
        'STRAP': [],
    };
    const circles: Circles = {
        'c1': { x: 0, y: 0 }, 'c2': { x: 0, y: 0 }, 'c3': { x: 0, y: 0 }, 'c4': { x: 0, y: 0 },
        'c5': { x: 0, y: 0 }, 'c6': { x: 0, y: 0 }, 'c7': { x: 0, y: 0 }, 'c8': { x: 0, y: 0 },
        'c9': { x: 0, y: 0 },
    };

    it('should solve multiple independent chains', () => {
        const queues: Queues = {
            'chain1': ['c1', 'c2', 'c3', 'c4', 'c5'], // REACT
            'chain2': ['c6', 'c7', 'c8', 'c9'], // No 4 letter words
        };
        const result = solveMultiChain(queues, circles, ['REACT', 'FOUR'], {'REACT': [], 'FOUR': []});
        expect(result.solution).not.toBeNull();
        if (result.solution) {
            expect(result.solution['chain1'].solution).toEqual(['REACT']);
            expect(result.solution['chain2'].solution).toEqual(['FOUR']);
        }
    });

    it('should not reuse words across chains', () => {
        const queues: Queues = {
            'chain1': ['c1', 'c2', 'c3', 'c4', 'c5'], // REACT
            'chain2': ['c6', 'c7', 'c8', 'c9', 'c1'], // STRAP, but fails because REACT is used
        };
        const result = solveMultiChain(queues, circles, ['REACT', 'STRAP'], {'REACT': [], 'STRAP': []});
        expect(result.solution).toBeNull();
    });

    it('should handle shared circles between chains', () => {
        // chain1: REACT -> R E A C T
        // chain2: ACTOR -> A C T O R
        // shared circle c3 on index 2 of chain1 (A) and index 0 of chain2 (A)
        const queues: Queues = {
            'chain1': ['c1', 'c2', 'c3', 'c4', 'c5'], 
            'chain2': ['c3', 'c4', 'c5', 'c6', 'c7'], 
        };
        const result = solveMultiChain(queues, circles, words, connections);
        expect(result.solution).not.toBeNull();
        if (result.solution) {
            expect(result.solution['chain1'].solution).toEqual(['REACT']);
            expect(result.solution['chain2'].solution).toEqual(['ACTOR']);
            expect(result.solution['chain1'].chain).toBe('REACT');
            expect(result.solution['chain2'].chain).toBe('ACTOR');
        }
    });
});
