
'use server';
/**
 * @fileOverview A Genkit flow for solving the word chain puzzle.
 *
 * - solveWordChain - A function that finds a valid chain of words.
 * - SolveChainInput - The input type for the solveWordChain function.
 * - SolveChainOutput - The return type for the solveWordChain function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CircleSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  char: z.string().optional(),
});

const SolveChainInputSchema = z.object({
  circles: z.array(CircleSchema).describe('An ordered array of circles representing the puzzle structure.'),
  words: z.array(z.string()).describe('The list of available words.'),
  connections: z.record(z.array(z.string())).describe('A map of which words can follow other words.'),
});
export type SolveChainInput = z.infer<typeof SolveChainInputSchema>;

const SolveChainOutputSchema = z.object({
  solution: z.array(z.string()).describe('The sequence of words that solves the puzzle. Empty if no solution is found.'),
  reasoning: z.string().describe('An explanation of the solution or why one could not be found.'),
});
export type SolveChainOutput = z.infer<typeof SolveChainOutputSchema>;

export async function solveWordChain(input: SolveChainInput): Promise<SolveChainOutput> {
  return solveWordChainFlow(input);
}

const solvePrompt = ai.definePrompt({
  name: 'solveWordChainPrompt',
  input: { schema: SolveChainInputSchema },
  output: { schema: SolveChainOutputSchema },
  prompt: `You are a puzzle-solving assistant. Your task is to solve a word chain puzzle.

You will be given:
1.  An ordered list of circles (markers), some of which may already contain a character.
2.  A list of valid words.
3.  A connection map that shows which words can follow another (e.g., if 'CAT' can be followed by 'TABLE', the connection map will have an entry like {'CAT': ['TABLE', ...]}). A connection is valid if the last two letters of a word match the first two letters of the next word.

Your goal is to find a sequence of words from the list that can be chained together according to the connection map, and whose combined characters exactly fill the circles in order.

The total length of all characters in the solution word chain must equal the total number of circles.

Constraints:
- You must use the provided connection map.
- The solution must respect any pre-filled characters in the circles.
- The words in the solution must come from the provided word list.

Analyze the provided data and find a valid word chain.

If a solution is found, provide the sequence of words in the 'solution' field and a brief explanation in the 'reasoning' field.

If no solution is possible, return an empty array for the 'solution' and explain why in the 'reasoning' field.

Here is the puzzle data:
- Circles (in order): {{{json circles}}}
- Word List: {{{json words}}}
- Word Connections: {{{json connections}}}
`,
});

const solveWordChainFlow = ai.defineFlow(
  {
    name: 'solveWordChainFlow',
    inputSchema: SolveChainInputSchema,
    outputSchema: SolveChainOutputSchema,
  },
  async (input) => {
    const { output } = await solvePrompt(input);
    return output!;
  }
);
