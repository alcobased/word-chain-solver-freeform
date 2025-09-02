
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
    const currentLength = currentChain.length;

    // Base case: If we have a potential full chain
    if (currentLength === totalLength) {
        // Check for loop condition
        const firstWord = usedWords[0];
        const currentLastWord = usedWords[usedWords.length - 1];
        if(connections[currentLastWord]?.includes(firstWord)){
            solutions.push({
                solution: usedWords,
                reasoning: `Found a looped solution with the word chain: ${usedWords.join(" -> ")}`
            });
        } else {
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
    }
  };
  
  findSolutions("", [], null);
  
  // Post-filter solutions to ensure all constraints are met on the final chain
  return solutions.filter(s => {
      let solutionChain = "";
      if(s.solution.length > 0) {
          solutionChain = s.solution[0];
          for(let i = 1; i < s.solution.length; i++) {
              solutionChain += s.solution[i].slice(2);
          }
      }

      if (solutionChain.length !== totalLength) return false;

      for (const { char, index } of knownChars) {
          if (solutionChain[index] !== char) return false;
      }

      for (const id in circleIdToIndices) {
          const indices = circleIdToIndices[id];
          if (indices.length > 1) {
              const firstChar = solutionChain[indices[0]];
              for (let i = 1; i < indices.length; i++) {
                  if (solutionChain[indices[i]] !== firstChar) return false;
              }
          }
      }
      return true;
  });
};

export type MultiSolution = Record<string, {solution: string[], chain: string}>;

export const solveMultiChain = (
  allQueues: Queues,
  allCircles: Circles,
  words: string[],
  connections: Record<string, string[]>
): { solutions: MultiSolution[], reasoning: string } => {
  
  const chainEntries = Object.entries(allQueues).filter(([,q]) => q.length > 0);
  let allSolutions: MultiSolution[] = [];

  const findMultiSolutions = (
    chainIndex: number,
    currentSolutions: MultiSolution,
    usedWords: Set<string>
  ) => {
    if (chainIndex >= chainEntries.length) {
      allSolutions.push(currentSolutions);
      return;
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
          
          findMultiSolutions(chainIndex + 1, newSolutions, newUsedWords);
      }
    }
  };
  
  findMultiSolutions(0, {}, new Set());

  if (allSolutions.length > 0) {
      return {
          solutions: allSolutions,
          reasoning: `Successfully found ${allSolutions.length} solution(s).`
      };
  } else {
      return {
          solutions: [],
          reasoning: "Could not find a valid solution that satisfies all chain constraints."
      };
  }
};
