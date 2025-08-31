
"use client";

import { useState, useEffect, useRef, type MouseEvent, type ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, X, Undo2, BookText, Save, FolderOpen, Wand2, Plus, Trash2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


type Circle = {
  x: number; // percentage
  y: number; // percentage
  char?: string;
};

type Circles = Record<string, Circle>;

type ImageState = {
  src: string;
  width: number;
  height: number;
}

type Mode = "single" | "multi";

type Queues = Record<string, string[]>; // Chain ID -> array of circle IDs

type AppState = {
    image: ImageState | null;
    circles: Circles;
    queues: Queues;
    activeChainId: string | null;
    mode: Mode;
    markerSize: number;
    wordList: string;
    wordConnections: Record<string, string[]>;
}

const SINGLE_CHAIN_ID = "main";

export default function WordChainSolver() {
  const [image, setImage] = useState<ImageState | null>(null);
  const [circles, setCircles] = useState<Circles>({});
  const [queues, setQueues] = useState<Queues>({ [SINGLE_CHAIN_ID]: [] });
  const [activeChainId, setActiveChainId] = useState<string | null>(SINGLE_CHAIN_ID);
  const [mode, setMode] = useState<Mode>("single");
  const [markerSize, setMarkerSize] = useState<number>(16);
  const [wordList, setWordList] = useState<string>("");
  const [wordConnections, setWordConnections] = useState<Record<string, string[]>>({});
  const [isClient, setIsClient] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveFilename, setSaveFilename] = useState("word-chain-solver-state.json");
  
  const { toast } = useToast();
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadStateInputRef = useRef<HTMLInputElement>(null);

  const activeQueue = activeChainId ? queues[activeChainId] ?? [] : [];

  useEffect(() => {
    setIsClient(true);
    try {
      const savedState = localStorage.getItem("wordChainSolverState");
      if (savedState) {
          const state: AppState = JSON.parse(savedState);
          setImage(state.image);
          setCircles(state.circles);
          setQueues(state.queues || { [SINGLE_CHAIN_ID]: [] });
          setMode(state.mode || 'single');
          setActiveChainId(state.activeChainId || SINGLE_CHAIN_ID);
          setMarkerSize(state.markerSize);
          setWordList(state.wordList);
          setWordConnections(state.wordConnections);
      }
    } catch (error) {
        console.error("Failed to load data from localStorage", error);
        localStorage.removeItem("wordChainSolverState");
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        const stateToSave: AppState = {
            image,
            circles,
            queues,
            activeChainId,
            mode,
            markerSize,
            wordList,
            wordConnections
        };
        localStorage.setItem("wordChainSolverState", JSON.stringify(stateToSave));
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [image, circles, queues, activeChainId, mode, markerSize, wordList, wordConnections, isClient]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const img = new window.Image();
        img.onload = () => {
            setImage({
                src: dataUrl,
                width: img.naturalWidth,
                height: img.naturalHeight,
            });
            handleClear(false);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-circle-id]')) {
      return;
    }

    if (!imageRef.current || !activeChainId) return;

    const img = imageRef.current;
    const rect = img.getBoundingClientRect();

    const clickX = e.clientX;
    const clickY = e.clientY;

    if (
      clickX < rect.left || clickX > rect.right ||
      clickY < rect.top || clickY > rect.bottom
    ) {
      return;
    }

    const relativeX = clickX - rect.left;
    const relativeY = clickY - rect.top;

    const xPercent = relativeX / rect.width;
    const yPercent = relativeY / rect.height;

    const newCircleId = crypto.randomUUID();

    setCircles(prevCircles => ({
      ...prevCircles,
      [newCircleId]: { x: xPercent, y: yPercent }
    }));
    
    setQueues(prevQueues => ({
        ...prevQueues,
        [activeChainId]: [...(prevQueues[activeChainId] ?? []), newCircleId]
    }));
  };
  
  const handleCircleClick = (clickedCircleId: string) => {
    if (!activeChainId) return;

    const clickCountInActiveQueue = (queues[activeChainId] ?? []).filter(id => id === clickedCircleId).length;
    if (clickCountInActiveQueue < 2) {
        setQueues(prevQueues => ({
            ...prevQueues,
            [activeChainId]: [...(prevQueues[activeChainId] ?? []), clickedCircleId]
        }));
    }
  };

  const handleClear = (clearImage: boolean = true) => {
    if(clearImage) setImage(null);
    setCircles({});
    setQueues({ [SINGLE_CHAIN_ID]: [] });
    setActiveChainId(SINGLE_CHAIN_ID);
    setMode("single");
    setWordList("");
    setWordConnections({});
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleMarkerSizeChange = (value: number[]) => {
    setMarkerSize(value[0]);
  };

  const handleCharChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (activeQueue.length === 0) return;

    const lastClickedId = activeQueue[activeQueue.length - 1];
    const newChar = e.target.value.toUpperCase().slice(0, 1);

    setCircles(prev => ({
        ...prev,
        [lastClickedId]: {
            ...prev[lastClickedId],
            char: newChar
        }
    }))
  }

  const handleUndoClick = () => {
    if (!activeChainId || activeQueue.length === 0) return;

    const lastClickedId = activeQueue[activeQueue.length - 1];
    const newActiveQueue = activeQueue.slice(0, -1);
    
    setQueues(prevQueues => ({
        ...prevQueues,
        [activeChainId]: newActiveQueue
    }));

    // Check if the removed circle is part of any other queue
    const isCircleUsedElsewhere = Object.values(queues).some(q => q.includes(lastClickedId));
    
    if (!isCircleUsedElsewhere) {
      // If it's not used anywhere else, remove the circle itself.
      setCircles(prevCircles => {
        const newCircles = { ...prevCircles };
        delete newCircles[lastClickedId];
        return newCircles;
      });
    }
  };

  const processWordList = () => {
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
    setWordConnections(newConnections);
    console.log("Word Connections:", newConnections);
  }

  const getSortedCirclesForActiveChain = () => {
    if (!activeChainId) return [];
    const orderedUniqueIds = [...new Set(activeQueue)];
  
    return orderedUniqueIds.map(id => ({
      id,
      ...circles[id]
    })).filter(c => c.x !== undefined); // Ensure circle exists
  }

  const handleSaveState = () => {
    const filename = saveFilename;
    if (!filename) {
      return;
    }

    const stateToSave: AppState = {
      image,
      circles,
      queues,
      activeChainId,
      mode,
      markerSize,
      wordList,
      wordConnections
    };

    const blob = new Blob([JSON.stringify(stateToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsSaveDialogOpen(false);
  };

  const handleLoadState = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loadedState: AppState = JSON.parse(event.target?.result as string);
          if (
            'image' in loadedState &&
            'circles' in loadedState &&
            'queues' in loadedState &&
            'activeChainId' in loadedState &&
            'mode' in loadedState &&
            'markerSize' in loadedState &&
            'wordList' in loadedState &&
            'wordConnections' in loadedState
          ) {
            setImage(loadedState.image);
            setCircles(loadedState.circles);
            setQueues(loadedState.queues);
            setActiveChainId(loadedState.activeChainId);
            setMode(loadedState.mode);
            setMarkerSize(loadedState.markerSize);
            setWordList(loadedState.wordList);
            setWordConnections(loadedState.wordConnections);
          } else {
            console.error("Invalid state file format.");
            alert("Invalid state file format.");
          }
        } catch (error) {
          console.error("Failed to parse state file.", error);
          alert("Failed to read or parse the state file.");
        }
      };
      reader.readAsText(file);
      if (loadStateInputRef.current) {
        loadStateInputRef.current.value = "";
      }
    }
  };

  const solveLocally = (
    queue: string[],
    allCircles: Circles,
    words: string[],
    connections: Record<string, string[]>
  ): { solution: string[], reasoning: string } => {
    const totalLength = queue.length;
    
    const circleIdToIndices: Record<string, number[]> = {};
    queue.forEach((id, index) => {
      if (!circleIdToIndices[id]) {
        circleIdToIndices[id] = [];
      }
      circleIdToIndices[id].push(index);
    });

    const knownChars = queue.map((id, index) => ({
      char: allCircles[id]?.char,
      index
    })).filter(item => item.char);

    const findSolutions = (
      currentChain: string,
      usedWords: string[],
      lastWord: string | null
    ): string[][] => {
      if (currentChain.length > totalLength) {
        return [];
      }
      
      if (currentChain.length === totalLength) {
        for (const { char, index } of knownChars) {
          if (currentChain[index] !== char) {
            return [];
          }
        }
        
        for (const id in circleIdToIndices) {
          const indices = circleIdToIndices[id];
          if (indices.length > 1) {
            const firstChar = currentChain[indices[0]];
            for (let i = 1; i < indices.length; i++) {
              if (currentChain[indices[i]] !== firstChar) {
                return [];
              }
            }
          }
        }
        return [usedWords];
      }

      let solutions: string[][] = [];
      
      const possibleNextWords = lastWord ? connections[lastWord] || [] : words;

      for (const word of possibleNextWords) {
        if (usedWords.includes(word)) continue;

        const newChain = lastWord ? currentChain + word.slice(2) : word;
        
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
        
        const results = findSolutions(newChain, [...usedWords, word], word);
        solutions = solutions.concat(results);
      }

      return solutions;
    };
    
    const solutions = findSolutions("", [], null);
    
    if (solutions.length > 0) {
      return {
        solution: solutions[0],
        reasoning: `Found a solution with the word chain: ${solutions[0].join(" -> ")}`,
      };
    } else {
      return {
        solution: [],
        reasoning: "No valid word chain could be found to fit the puzzle constraints.",
      };
    }
  };

  const handleFindSolution = async () => {
    if (!activeChainId) {
        toast({ variant: "destructive", title: "No active chain selected." });
        return;
    }
    const words = wordList.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase());

    if (activeQueue.length === 0 || words.length === 0 || Object.keys(wordConnections).length === 0) {
      toast({
        variant: "destructive",
        title: "Cannot Find Solution",
        description: "Please add markers to the active chain, add a word list, and process the list before finding a solution.",
      });
      return;
    }
    
    setIsSolving(true);
    try {
      const result = solveLocally(activeQueue, circles, words, wordConnections);
      
      if (result.solution.length > 0) {
        let solutionString = "";
        if (result.solution.length > 0) {
          solutionString = result.solution[0];
          for (let i = 1; i < result.solution.length; i++) {
            solutionString += result.solution[i].slice(2);
          }
        }

        const updatedCircles = { ...circles };
        
        activeQueue.forEach((circleId, index) => {
            if(index < solutionString.length) {
                if (updatedCircles[circleId]) {
                    updatedCircles[circleId] = {
                        ...updatedCircles[circleId],
                        char: solutionString[index]
                    };
                }
            }
        });

        setCircles(updatedCircles);

        toast({
            title: "Solution Found!",
            description: result.reasoning,
        });

      } else {
        toast({
            variant: "destructive",
            title: "No Solution Found",
            description: result.reasoning,
        });
      }

    } catch (error) {
      console.error("Failed to find solution:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while trying to find a solution.",
      });
    } finally {
      setIsSolving(false);
    }
  };

  const handleModeChange = (isMulti: boolean) => {
      const newMode = isMulti ? "multi" : "single";
      setMode(newMode);
      if (newMode === 'single') {
          setActiveChainId(SINGLE_CHAIN_ID);
      } else {
          // If switching to multi and only the single chain exists, keep it active.
          if (Object.keys(queues).length === 1 && queues[SINGLE_CHAIN_ID]) {
              setActiveChainId(SINGLE_CHAIN_ID);
          } else if (Object.keys(queues).length > 0) {
              setActiveChainId(Object.keys(queues)[0]);
          } else {
              // No chains exist, create one
              const newChainId = `chain-${Date.now()}`;
              setQueues({ [newChainId]: [] });
              setActiveChainId(newChainId);
          }
      }
  }

  const handleAddChain = () => {
    const newChainId = `chain-${Date.now()}`;
    setQueues(prev => ({...prev, [newChainId]: [] }));
    setActiveChainId(newChainId);
  }

  const handleDeleteChain = () => {
    if (!activeChainId || Object.keys(queues).length <= 1) return;
    
    // Create copies to modify
    const newQueues = { ...queues };
    const queueToDelete = newQueues[activeChainId];
    delete newQueues[activeChainId];
    
    const newCircles = { ...circles };
    // Check which circles can be deleted
    queueToDelete.forEach(circleId => {
      const isUsedElsewhere = Object.values(newQueues).some(q => q.includes(circleId));
      if (!isUsedElsewhere) {
        delete newCircles[circleId];
      }
    });

    setQueues(newQueues);
    setCircles(newCircles);
    
    // Set a new active chain
    setActiveChainId(Object.keys(newQueues)[0] ?? null);
  }

  const lastClickedId = activeQueue.length > 0 ? activeQueue[activeQueue.length - 1] : null;
  const lastCircleChar = lastClickedId ? circles[lastClickedId]?.char : '';

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 shadow-sm md:px-6 z-[101]">
        <h1 className="text-xl font-semibold font-headline">Word Chain Solver</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center space-x-2">
                <Label htmlFor="mode-switch">Single Chain</Label>
                <Switch 
                    id="mode-switch" 
                    checked={mode === 'multi'} 
                    onCheckedChange={handleModeChange}
                />
                <Label htmlFor="mode-switch">Multi Chain</Label>
            </div>
             {mode === 'multi' && (
                <div className="flex items-center gap-2">
                    <Select value={activeChainId ?? ""} onValueChange={setActiveChainId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a chain" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(queues).map(id => (
                                <SelectItem key={id} value={id}>
                                    {id === SINGLE_CHAIN_ID ? 'Main Chain' : id}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={handleAddChain}>
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={handleDeleteChain} disabled={Object.keys(queues).length <= 1}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}
            <div className="h-6 border-l mx-2"></div>
            <Button onClick={handleFindSolution} variant="default" size="sm" disabled={isSolving || !image || !activeChainId}>
                <Wand2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{isSolving ? "Solving..." : "Find Solution"}</span>
            </Button>
            <Button onClick={() => setIsSaveDialogOpen(true)} variant="outline" size="sm" disabled={!image}>
                <Save className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Save</span>
            </Button>
            <Label htmlFor="load-state-input" className="cursor-pointer">
                <Button asChild variant="outline" size="sm">
                    <div className="flex items-center">
                        <FolderOpen className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Load</span>
                    </div>
                </Button>
            </Label>
            <Input id="load-state-input" type="file" accept=".json" className="hidden" onChange={handleLoadState} ref={loadStateInputRef} />
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                        <BookText className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 z-[102]" align="end">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Word List</h4>
                            <p className="text-sm text-muted-foreground">
                                Enter a list of words, one per line.
                            </p>
                        </div>
                        <Textarea
                            placeholder="Type your words here."
                            className="w-full resize-y bg-background"
                            rows={10}
                            value={wordList}
                            onChange={(e) => setWordList(e.target.value)}
                        />
                         <Button onClick={processWordList} disabled={!wordList.trim()}>Process Word List</Button>
                    </div>
                </PopoverContent>
            </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" disabled={!image}>
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 z-[102]" align="end">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Controls</h4>
                  <p className="text-sm text-muted-foreground">
                    Adjust marker settings.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="marker-size">Marker Size ({markerSize}px)</Label>
                  <Slider
                    id="marker-size"
                    min={4}
                    max={64}
                    step={2}
                    value={[markerSize]}
                    onValueChange={handleMarkerSizeChange}
                  />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="marker-char">Marker Character</Label>
                    <Input id="marker-char" 
                        maxLength={1}
                        value={lastCircleChar || ''}
                        onChange={handleCharChange}
                        disabled={activeQueue.length === 0}
                        placeholder="Set for last marker"
                    />
                </div>
                <Button onClick={handleUndoClick} variant="outline" size="sm" disabled={activeQueue.length === 0}>
                    <Undo2 className="h-4 w-4 mr-2" />
                    Undo
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={() => handleClear(true)} variant="ghost" size="sm" disabled={!image}>
            <X className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
          <Label htmlFor="image-upload" className="cursor-pointer">
            <Button asChild variant="default">
              <div className="flex items-center">
                <UploadCloud className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Upload</span>
              </div>
            </Button>
          </Label>
          <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} ref={fileInputRef} />
        </div>
      </header>
      <main className="relative flex-grow" onClick={handleContainerClick}>
        {isClient && image ? (
          <div className="absolute inset-0 p-2 sm:p-4">
            <div className="relative h-full w-full">
              <Image
                ref={imageRef}
                src={image.src}
                width={image.width}
                height={image.height}
                alt="Uploaded content for marking"
                className="h-full w-full select-none object-contain drop-shadow-lg"
                priority
              />
              {Object.entries(circles).map(([id, circle]) => {
                const isInActiveQueue = activeQueue.includes(id);
                const clickCountInActiveQueue = activeQueue.filter(qId => qId === id).length;

                return (
                <div
                  key={id}
                  data-circle-id={id}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 flex items-center justify-center text-white font-bold",
                    isInActiveQueue ? "border-primary ring-2 ring-white" : "border-gray-400 opacity-60",
                    isInActiveQueue && (clickCountInActiveQueue > 1 ? "bg-accent" : "bg-primary/30")
                  )}
                  style={{
                    left: `${circle.x * 100}%`,
                    top: `${circle.y * 100}%`,
                    width: `${markerSize}px`,
                    height: `${markerSize}px`,
                    fontSize: `${markerSize * 0.6}px`,
                    zIndex: 10 + (activeQueue.indexOf(id) ?? -1)
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCircleClick(id);
                  }}
                  aria-hidden="true"
                >
                  {circle.char}
                </div>
              )})}
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <UploadCloud className="mx-auto h-12 w-12" />
              <p className="mt-4 text-lg font-medium">Upload an image to start marking</p>
            </div>
          </div>
        )}
      </main>
      <AlertDialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <AlertDialogContent className="z-[201]">
          <AlertDialogHeader>
            <AlertDialogTitle>Save Current State</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a filename for your save state. It will be saved as a JSON file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={saveFilename}
              onChange={(e) => setSaveFilename(e.target.value)}
              placeholder="word-chain-solver-state.json"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveState}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    