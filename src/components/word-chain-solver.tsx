
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
} from "@/components/ui/select";
import { solveSingleChain, solveMultiChain, generateConnections } from '@/lib/solver';


export type Circle = {
  x: number; // percentage
  y: number; // percentage
  char?: string;
};

export type Circles = Record<string, Circle>;

export type ImageState = {
  src: string;
  width: number;
  height: number;
}

export type Background = {
  type: 'grid';
} | {
  type: 'image';
  image: ImageState;
};


export type Mode = "single" | "multi";

export type Queues = Record<string, string[]>; // Chain ID -> array of circle IDs

export type AppState = {
    background: Background;
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
  const [background, setBackground] = useState<Background>({ type: 'grid' });
  const [circles, setCircles] = useState<Circles>({});
  const [queues, setQueues] = useState<Queues>({ [SINGLE_CHAIN_ID]: [] });
  const [activeChainId, setActiveChainId] = useState<string | null>(SINGLE_CHAIN_ID);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
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
          setBackground(state.background || { type: 'grid' });
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
            background,
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
  }, [background, circles, queues, activeChainId, mode, markerSize, wordList, wordConnections, isClient]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const img = new window.Image();
        img.onload = () => {
            setBackground({
                type: 'image',
                image: {
                    src: dataUrl,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                }
            });
            handleClear(false);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    // If the click is on an existing circle, the circle's own handler will stop propagation.
    // This handler only fires when clicking the background.
    
    // If a circle is selected, deselect it.
    if (selectedCircleId) {
        setSelectedCircleId(null);
        return;
    }

    const container = e.currentTarget;
    if (!container || !activeChainId) return;

    const rect = container.getBoundingClientRect();

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
    setSelectedCircleId(newCircleId);
  };
  
  const handleCircleClick = (e: MouseEvent, clickedCircleId: string) => {
    e.stopPropagation(); // Prevent handleContainerClick from firing.
    setSelectedCircleId(clickedCircleId);
  };

  const handleClear = (clearBackground: boolean = true) => {
    if(clearBackground) setBackground({ type: 'grid' });
    setCircles({});
    setQueues({ [SINGLE_CHAIN_ID]: [] });
    setActiveChainId(SINGLE_CHAIN_ID);
    setSelectedCircleId(null);
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
    if (!selectedCircleId) return;

    const newChar = e.target.value.toUpperCase().slice(0, 1);

    setCircles(prev => ({
        ...prev,
        [selectedCircleId]: {
            ...prev[selectedCircleId],
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
    
    // Deselect if we are removing the currently selected circle
    if (selectedCircleId === lastClickedId) {
        setSelectedCircleId(null);
    }
    
    // The circle was just created by a click, so we should remove it.
    // If we change the logic to allow adding existing circles to a queue, this needs adjustment.
    setCircles(prevCircles => {
        const newCircles = { ...prevCircles };
        delete newCircles[lastClickedId];
        return newCircles;
    });
  };

  const processWordList = () => {
    const newConnections = generateConnections(wordList);
    setWordConnections(newConnections);
    console.log("Word Connections:", newConnections);
  }

  const handleSaveState = () => {
    const filename = saveFilename;
    if (!filename) {
      return;
    }

    const stateToSave: AppState = {
      background,
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
            'background' in loadedState &&
            'circles' in loadedState &&
            'queues' in loadedState &&
            'activeChainId' in loadedState &&
            'mode' in loadedState &&
            'markerSize' in loadedState &&
            'wordList' in loadedState &&
            'wordConnections' in loadedState
          ) {
            setBackground(loadedState.background);
            setCircles(loadedState.circles);
            setQueues(loadedState.queues);
            setActiveChainId(loadedState.activeChainId);
            setMode(loadedState.mode);
            setMarkerSize(loadedState.markerSize);
            setWordList(loadedState.wordList);
            setWordConnections(loadedState.wordConnections);
            setSelectedCircleId(null);
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

  const handleFindSolution = async () => {
    const words = wordList.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase());
    if (words.length === 0 || Object.keys(wordConnections).length === 0) {
      toast({
        variant: "destructive",
        title: "Cannot Find Solution",
        description: "Please add a word list and process it before finding a solution.",
      });
      return;
    }

    setIsSolving(true);
    try {
      if (mode === 'single') {
        if (!activeChainId) {
          toast({ variant: "destructive", title: "No active chain selected." });
          setIsSolving(false);
          return;
        }
        if(activeQueue.length === 0) {
          toast({ variant: "destructive", title: "Active chain is empty." });
          setIsSolving(false);
          return;
        }

        const results = solveSingleChain(activeQueue, circles, words, wordConnections);
        
        if (results.length > 0) {
          const result = results[0];
          let solutionString = "";
          if (result.solution.length > 0) {
            solutionString = result.solution[0];
            for (let i = 1; i < result.solution.length; i++) {
              solutionString += result.solution[i].slice(2);
            }
          }
          const updatedCircles = { ...circles };
          activeQueue.forEach((circleId, index) => {
            if (index < solutionString.length && updatedCircles[circleId]) {
              updatedCircles[circleId] = { ...updatedCircles[circleId], char: solutionString[index] };
            }
          });
          setCircles(updatedCircles);
          toast({ title: "Solution Found!", description: result.reasoning });
        } else {
          toast({ variant: "destructive", title: "No Solution Found", description: "No valid word chain found." });
        }
      } else { // Multi-chain mode
        const result = solveMultiChain(queues, circles, words, wordConnections);
        if (result.solutions) {
          const updatedCircles = { ...circles };
          Object.values(result.solutions).forEach(({ chain: solutionString }, i) => {
            const chainId = Object.keys(result.solutions!)[i];
            const queue = queues[chainId];
            queue.forEach((circleId, index) => {
                if (index < solutionString.length && updatedCircles[circleId]) {
                  updatedCircles[circleId] = { ...updatedCircles[circleId], char: solutionString[index] };
                }
            });
          });
          setCircles(updatedCircles);
          toast({ title: "Solution Found!", description: result.reasoning });
        } else {
          toast({ variant: "destructive", title: "No Solution Found", description: result.reasoning });
        }
      }
    } catch (error) {
      console.error("Failed to find solution:", error);
      toast({ variant: "destructive", title: "Error", description: "An error occurred while trying to find a solution." });
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
          if (Object.keys(queues).length === 1 && queues[SINGLE_CHAIN_ID]) {
              setActiveChainId(SINGLE_CHAIN_ID);
          } else if (Object.keys(queues).length > 0) {
              setActiveChainId(Object.keys(queues)[0]);
          } else {
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
    
    const newQueues = { ...queues };
    const queueToDelete = newQueues[activeChainId];
    delete newQueues[activeChainId];
    
    const newCircles = { ...circles };
    queueToDelete.forEach(circleId => {
      const isUsedElsewhere = Object.values(newQueues).some(q => q.includes(circleId));
      if (!isUsedElsewhere) {
        delete newCircles[circleId];
      }
    });

    setQueues(newQueues);
    setCircles(newCircles);
    
    setActiveChainId(Object.keys(newQueues)[0] ?? null);
  }

  const selectedCircleChar = selectedCircleId ? circles[selectedCircleId]?.char : '';

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
            <Button onClick={handleFindSolution} variant="default" size="sm" disabled={isSolving}>
                <Wand2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{isSolving ? "Solving..." : "Find Solution"}</span>
            </Button>
            <Button onClick={() => setIsSaveDialogOpen(true)} variant="outline" size="sm">
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
              <Button variant="outline" size="icon">
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
                        value={selectedCircleChar || ''}
                        onChange={handleCharChange}
                        disabled={!selectedCircleId}
                        placeholder={selectedCircleId ? "Set character" : "Select marker"}
                    />
                </div>
                <Button onClick={handleUndoClick} variant="outline" size="sm" disabled={activeQueue.length === 0}>
                    <Undo2 className="h-4 w-4 mr-2" />
                    Undo
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={() => handleClear(true)} variant="ghost" size="sm">
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
        {isClient && background.type === 'image' ? (
          <div className="absolute inset-0 p-2 sm:p-4">
            <div className="relative h-full w-full">
              <Image
                ref={imageRef}
                src={background.image.src}
                width={background.image.width}
                height={background.image.height}
                alt="Uploaded content for marking"
                className="h-full w-full select-none object-contain drop-shadow-lg"
                priority
              />
              {Object.entries(circles).map(([id, circle]) => {
                const isInActiveQueue = activeQueue.includes(id);
                const clickCountInActiveQueue = activeQueue.filter(qId => qId === id).length;
                const isSelected = selectedCircleId === id;

                return (
                <div
                  key={id}
                  data-circle-id={id}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 flex items-center justify-center text-white font-bold",
                    isSelected ? "border-accent ring-2 ring-white bg-accent" :
                    isInActiveQueue ? "border-primary ring-2 ring-white" : "border-gray-400 opacity-60",
                    isInActiveQueue && !isSelected && (clickCountInActiveQueue > 1 ? "bg-accent/70" : "bg-primary/30")
                  )}
                  style={{
                    left: `${circle.x * 100}%`,
                    top: `${circle.y * 100}%`,
                    width: `${markerSize}px`,
                    height: `${markerSize}px`,
                    fontSize: `${markerSize * 0.6}px`,
                    zIndex: 10 + (activeQueue.indexOf(id) ?? -1)
                  }}
                  onClick={(e) => handleCircleClick(e, id)}
                  aria-hidden="true"
                >
                  {circle.char}
                </div>
              )})}
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full p-2 sm:p-4">
             <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(to_bottom,white,transparent)] dark:bg-grid-slate-700/60"></div>
             {Object.entries(circles).map(([id, circle]) => {
                const isInActiveQueue = activeQueue.includes(id);
                const clickCountInActiveQueue = activeQueue.filter(qId => qId === id).length;
                const isSelected = selectedCircleId === id;

                return (
                <div
                  key={id}
                  data-circle-id={id}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 flex items-center justify-center text-white font-bold",
                     isSelected ? "border-accent ring-2 ring-white bg-accent" :
                    isInActiveQueue ? "border-primary ring-2 ring-white" : "border-gray-400 opacity-60",
                    isInActiveQueue && !isSelected && (clickCountInActiveQueue > 1 ? "bg-accent/70" : "bg-primary/30")
                  )}
                  style={{
                    left: `${circle.x * 100}%`,
                    top: `${circle.y * 100}%`,
                    width: `${markerSize}px`,
                    height: `${markerSize}px`,
                    fontSize: `${markerSize * 0.6}px`,
                    zIndex: 10 + (activeQueue.indexOf(id) ?? -1)
                  }}
                  onClick={(e) => handleCircleClick(e, id)}
                  aria-hidden="true"
                >
                  {circle.char}
                </div>
              )})}
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
