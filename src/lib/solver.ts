
import type { Circles, Queues } from '@/components/word-chain-solver';

export const generateConnections = (wordList: string): Record<string, string[]> => {
  const words = wordList.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase());
  const newConnections: Record<string, string[]> = {};

  for (const keyWord of words) {
      newConnections[keyWord] = [];
      for (const otherWord of words) {
          if (keyWord === otherWord) continue;
          if (keyWord.slice(-2) === otherWord.slice(0, 2)) {
              newConnections[keyWord].push(otherWord);
          }
      }
  }
  return newConnections;
}

export const solveSingleChain = (
  queue: string[],
  allCircles: Circles,
  words: string[],
  connections: Record<string, string[]>,
  globallyUsedWords: Set<string> = new Set()
): { solution: string[], reasoning: string }[] => {
  const totalLength = queue.length;
  if (totalLength === 0) return [];

  const circleIdToIndices: Record<string, number[]> = {};
  queue.forEach((id, index) => {
    if (!circleIdToIndices[id]) circleIdToIndices[id] = [];
    circleIdToIndices[id].push(index);
  });

  const knownChars = queue.map((id, index) => ({
    char: allCircles[id]?.char,
    index
  })).filter(item => item.char);
  
  const solutions: { solution: string[], reasoning: string }[] = [];

  const findSolutions = (
    currentChain: string,
    usedWords: string[],
    lastWord: string | null
  ) => {
    if (solutions.length > 0) return; // Stop after finding one solution

    const currentLength = currentChain.length;

    // Base case: If we have a potential full chain
    if (currentLength === totalLength) {
        let possible = true;
        // Final check for all constraints
        for (const { char, index } of knownChars) {
            if (currentChain[index] !== char) {
                possible = false;
                break;
            }
        }
        if (!possible) return;

        for (const id in circleIdToIndices) {
            const indices = circleIdToIndices[id];
            if (indices.length > 1) {
                const firstChar = currentChain[indices[0]];
                for (let i = 1; i < indices.length; i++) {
                    if (currentChain[indices[i]] !== firstChar) {
                        possible = false;
                        break;
                    }
                }
            }
            if (!possible) break;
        }

        if (possible) {
            solutions.push({
                solution: usedWords,
                reasoning: `Found a solution with the word chain: ${usedWords.join(" -> ")}`
            });
        }
        return;
    }

    if (currentLength > totalLength) {
        return;
    }

    const possibleNextWords = lastWord ? (connections[lastWord] || []) : words;
    
    for (const word of possibleNextWords) {
        if (usedWords.includes(word) || globallyUsedWords.has(word)) continue;
        
        const nextPart = lastWord ? word.slice(2) : word;
        const newChain = currentChain + nextPart;
        
        if (newChain.length > totalLength) continue;
        
        // Pruning: Check constraints as we build the chain
        let possible = true;
        for (const { char, index } of knownChars) {
            if (index < newChain.length && newChain[index] !== char) {
                possible = false;
                break;
            }
        }
        if (!possible) continue;
        
        for (const id in circleIdToIndices) {
            const indices = circleIdToIndices[id];
            if (indices.length > 1) {
                let firstChar: string | null = null;
                for (const index of indices) {
                    if (index < newChain.length) {
                        if (firstChar === null) {
                            firstChar = newChain[index];
                        } else if (newChain[index] !== firstChar) {
                            possible = false;
                            break;
                        }
                    }
                }
            }
            if (!possible) break;
        }
        if (!possible) continue;
        
        findSolutions(newChain, [...usedWords, word], word);
        if (solutions.length > 0) return;
    }
  };
  
  findSolutions("", [], null);
  
  return solutions;
};

export type MultiSolution = Record<string, {solution: string[], chain: string}>;

export const solveMultiChain = (
  allQueues: Queues,
  allCircles: Circles,
  words: string[],
  connections: Record<string, string[]>
): { solution: MultiSolution | null, reasoning: string } => {
  
  const chainEntries = Object.entries(allQueues).filter(([,q]) => q.length > 0);

  const findMultiSolutions = (
    chainIndex: number,
    currentSolutions: MultiSolution,
    usedWords: Set<string>
  ): MultiSolution | null => {
    if (chainIndex >= chainEntries.length) {
      return currentSolutions; // All chains solved
    }

    const [chainId, queue] = chainEntries[chainIndex];

    const tempCircles: Circles = { ...allCircles };
    Object.entries(currentSolutions).forEach(([solvedChainId, sol]) => {
        const q = allQueues[solvedChainId];
        q.forEach((cId, idx) => {
          if (idx < sol.chain.length) {
            if (!tempCircles[cId]?.char) { // Don't override existing clues
              tempCircles[cId] = { ...tempCircles[cId], char: sol.chain[idx] };
            }
          }
        });
    });
    
    const singleChainResults = solveSingleChain(queue, tempCircles, words, connections, usedWords);

    for (const result of singleChainResults) {
      if (result.solution.length > 0) {
          const newUsedWords = new Set([...usedWords, ...result.solution]);
          
          let solutionString = "";
          if (result.solution.length > 0) {
              solutionString = result.solution[0];
              for (let i = 1; i < result.solution.length; i++) {
                  solutionString += result.solution[i].slice(2);
              }
          }

          const newSolutions: MultiSolution = {
              ...currentSolutions,
              [chainId]: {
                  solution: result.solution,
                  chain: solutionString,
              }
          };
          
          const finalSolution = findMultiSolutions(chainIndex + 1, newSolutions, newUsedWords);
          if (finalSolution) return finalSolution;
      }
    }
    return null;
  };
  
  const finalSolution = findMultiSolutions(0, {}, new Set());

  if (finalSolution) {
      return {
          solution: finalSolution,
          reasoning: "Successfully found a solution for all chains."
      };
  } else {
      return {
          solution: null,
          reasoning: "Could not find a valid solution that satisfies all chain constraints."
      };
  }
};
