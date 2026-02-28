/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Plus, 
  MapPin, 
  Search,
  Sparkles,
  Loader2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants & Types ---

const GRID_SIZE = 5;
const IMAGES = [
  { name: 'Robot', url: 'https://api.iconify.design/lucide:bot.svg?color=%23059669' },
  { name: 'Tree', url: 'https://api.iconify.design/lucide:tree-pine.svg?color=%23059669' },
  { name: 'Mountain', url: 'https://api.iconify.design/lucide:mountain.svg?color=%23059669' },
  { name: 'Cat', url: 'https://api.iconify.design/lucide:cat.svg?color=%23059669' },
  { name: 'House', url: 'https://api.iconify.design/lucide:house.svg?color=%23059669' },
  { name: 'Star', url: 'https://api.iconify.design/lucide:star.svg?color=%23059669' },
  { name: 'Rocket', url: 'https://api.iconify.design/lucide:rocket.svg?color=%23059669' },
  { name: 'Pizza', url: 'https://api.iconify.design/lucide:pizza.svg?color=%23059669' },
  { name: 'Bicycle', url: 'https://api.iconify.design/lucide:bike.svg?color=%23059669' },
  { name: 'Book', url: 'https://api.iconify.design/lucide:book.svg?color=%23059669' },
];

interface GridItem {
  id: string;
  name: string;
  url: string;
  x: number;
  y: number;
}

interface Question {
  id: string;
  type: 'where' | 'what' | 'ai';
  targetItem?: GridItem;
  targetCoord?: { x: number, y: number };
  aiPrompt?: string;
  options?: string[]; // For multiple choice
  correctAnswer: string;
  userAnswer: string;
  status: 'pending' | 'correct' | 'incorrect';
}

// --- App Component ---

export default function App() {
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Helper to generate multiple choice options
  const generateOptions = (correctAnswer: string) => {
    const allNames = IMAGES.map(img => img.name);
    const others = allNames.filter(n => n.toLowerCase() !== correctAnswer.toLowerCase());
    const shuffledOthers = others.sort(() => Math.random() - 0.5).slice(0, 3);
    return [correctAnswer, ...shuffledOthers].sort(() => Math.random() - 0.5);
  };

  // Initialize or Generate New Setup
  const generateNewSetup = () => {
    const newItems: GridItem[] = [];
    const usedPositions = new Set<string>();
    const shuffledImages = [...IMAGES].sort(() => Math.random() - 0.5);
    
    // Place 6-8 items randomly
    const itemCount = 6 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < itemCount; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * GRID_SIZE) + 1;
        y = Math.floor(Math.random() * GRID_SIZE) + 1;
      } while (usedPositions.has(`${x},${y}`));
      
      usedPositions.add(`${x},${y}`);
      const img = shuffledImages[i % shuffledImages.length];
      newItems.push({
        id: Math.random().toString(36).substr(2, 9),
        name: img.name,
        url: img.url,
        x,
        y
      });
    }
    
    setGridItems(newItems);
    
    // Generate initial 2 questions
    const itemForWhere = newItems[Math.floor(Math.random() * newItems.length)];
    const itemForWhat = newItems[(newItems.indexOf(itemForWhere) + 1) % newItems.length];
    
    const initialQuestions: Question[] = [
      {
        id: 'q1',
        type: 'where',
        targetItem: itemForWhere,
        correctAnswer: `${itemForWhere.x},${itemForWhere.y}`,
        userAnswer: '',
        status: 'pending'
      },
      {
        id: 'q2',
        type: 'what',
        targetCoord: { x: itemForWhat.x, y: itemForWhat.y },
        correctAnswer: itemForWhat.name,
        options: generateOptions(itemForWhat.name),
        userAnswer: '',
        status: 'pending'
      }
    ];
    
    setQuestions(initialQuestions);
  };

  useEffect(() => {
    generateNewSetup();
  }, []);

  const handleAnswerChange = (id: string, value: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, userAnswer: value } : q));
  };

  const checkAnswer = (id: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q;
      
      const isCorrect = q.userAnswer.trim().toLowerCase() === q.correctAnswer.toLowerCase();
      return { ...q, status: isCorrect ? 'correct' : 'incorrect' };
    }));
  };

  const askAIQuestion = async () => {
    if (isGeneratingAI) return;
    setIsGeneratingAI(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const gridDescription = gridItems.map(item => `${item.name} is at (${item.x}, ${item.y})`).join(', ');
      
      const prompt = `
        I have a ${GRID_SIZE}x${GRID_SIZE} grid coordinate system (x from 1 to ${GRID_SIZE}, y from 1 to ${GRID_SIZE}).
        The current items on the grid are: ${gridDescription}.
        
        Create a new, interesting question based on this layout. 
        It could be about relative positions (e.g., "What is directly above the Cat?"), 
        distances, or patterns.
        
        Return ONLY a JSON object with this structure:
        {
          "question": "The question text",
          "answer": "The single word or coordinate answer"
        }
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}');
      
      if (data.question && data.answer) {
        const newQ: Question = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'ai',
          aiPrompt: data.question,
          correctAnswer: data.answer.toString(),
          userAnswer: '',
          status: 'pending'
        };
        setQuestions(prev => [...prev, newQ]);
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
      // Fallback to a simple logic question if AI fails
      const item = gridItems[Math.floor(Math.random() * gridItems.length)];
      const newQ: Question = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'where',
        targetItem: item,
        correctAnswer: `${item.x},${item.y}`,
        userAnswer: '',
        status: 'pending'
      };
      setQuestions(prev => [...prev, newQ]);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/10 pb-6">
          <div>
            <h1 className="text-4xl font-light tracking-tight flex items-center gap-3">
              <MapPin className="w-8 h-8 text-emerald-600" />
              Grid Quest
            </h1>
            <p className="text-sm text-black/50 mt-1 uppercase tracking-widest font-medium">Coordinate Explorer System v1.0</p>
          </div>
          <button 
            onClick={generateNewSetup}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-full hover:bg-black hover:text-white transition-all text-sm font-medium shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            New Setup
          </button>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Grid Section */}
          <section className="lg:col-span-7 bg-white p-8 rounded-3xl shadow-sm border border-black/5 flex flex-col items-center justify-center min-h-[500px]">
            <div className="relative">
              {/* Y-Axis Labels */}
              <div className="absolute -left-8 top-0 bottom-0 flex flex-col-reverse justify-between py-6 h-full">
                {[...Array(GRID_SIZE)].map((_, i) => (
                  <span key={i} className="text-xs font-mono text-black/40">{i + 1}</span>
                ))}
              </div>
              
              {/* X-Axis Labels */}
              <div className="absolute -bottom-8 left-0 right-0 flex justify-between px-6 w-full">
                {[...Array(GRID_SIZE)].map((_, i) => (
                  <span key={i} className="text-xs font-mono text-black/40">{i + 1}</span>
                ))}
              </div>

              {/* The Grid */}
              <div 
                className="grid border border-black/10 bg-[#FAFAFA]"
                style={{ 
                  gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                  gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                  width: 'min(80vw, 450px)',
                  height: 'min(80vw, 450px)'
                }}
              >
                {[...Array(GRID_SIZE * GRID_SIZE)].map((_, i) => {
                  const x = (i % GRID_SIZE) + 1;
                  const y = GRID_SIZE - Math.floor(i / GRID_SIZE);
                  const item = gridItems.find(it => it.x === x && it.y === y);
                  
                  return (
                    <div 
                      key={i} 
                      className="border border-black/5 relative flex items-center justify-center group hover:bg-white transition-colors"
                    >
                      {item && (
                        <div className="p-2 w-full h-full animate-in fade-in zoom-in duration-500">
                          <img 
                            src={item.url} 
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg">
                            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.name}</span>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-20 text-[8px] font-mono">
                        {x},{y}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Questions Section */}
          <section className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Search className="w-6 h-6 text-emerald-600" />
                  Challenges
                </h2>
                <span className="text-xs font-medium bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                  {questions.filter(q => q.status === 'correct').length}/{questions.length} Solved
                </span>
              </div>

              <div className="space-y-6 flex-grow overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {questions.map((q, idx) => (
                  <div 
                    key={q.id} 
                    className={cn(
                      "p-5 rounded-2xl border transition-all duration-300",
                      q.status === 'correct' ? "bg-emerald-50 border-emerald-200" : 
                      q.status === 'incorrect' ? "bg-red-50 border-red-200" : 
                      q.type === 'ai' ? "bg-[#E6F7F1] border-emerald-100" :
                      "bg-[#F9F9F9] border-black/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex gap-4">
                        <span className="w-8 h-8 rounded-full bg-black text-white text-xs flex items-center justify-center shrink-0 font-bold">
                          {idx + 1}
                        </span>
                        <div className="space-y-1">
                          <p className="text-base font-medium leading-tight">
                            {q.type === 'where' && (
                              <>Where is the <span className="text-emerald-600 font-bold underline decoration-2 underline-offset-4">{q.targetItem?.name}</span>?</>
                            )}
                            {q.type === 'what' && (
                              <>What can you find at <span className="text-emerald-600 font-bold">({q.targetCoord?.x}, {q.targetCoord?.y})</span>?</>
                            )}
                            {q.type === 'ai' && q.aiPrompt}
                          </p>
                          {q.type === 'where' && (
                            <p className="text-[10px] text-gray-400 font-medium">(Enter as x,y)</p>
                          )}
                        </div>
                      </div>
                      {q.status === 'correct' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
                      {q.status === 'incorrect' && <XCircle className="w-6 h-6 text-red-600 shrink-0" />}
                    </div>

                    <div className="flex flex-col gap-3">
                      {q.options ? (
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map(option => (
                            <button
                              key={option}
                              onClick={() => {
                                handleAnswerChange(q.id, option);
                                // Auto check for multiple choice
                                setQuestions(prev => prev.map(curr => {
                                  if (curr.id !== q.id) return curr;
                                  const isCorrect = option.toLowerCase() === curr.correctAnswer.toLowerCase();
                                  return { ...curr, userAnswer: option, status: isCorrect ? 'correct' : 'incorrect' };
                                }));
                              }}
                              disabled={q.status === 'correct'}
                              className={cn(
                                "px-3 py-2 text-xs rounded-xl border transition-all text-left",
                                q.userAnswer === option 
                                  ? "bg-black text-white border-black" 
                                  : "bg-white border-black/10 hover:border-black/30"
                              )}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={q.userAnswer}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            disabled={q.status === 'correct'}
                            placeholder={q.type === 'where' ? "e.g. 3,2" : "Type name..."}
                            className="flex-grow bg-white border border-black/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                            onKeyDown={(e) => e.key === 'Enter' && checkAnswer(q.id)}
                          />
                          <button 
                            onClick={() => checkAnswer(q.id)}
                            disabled={q.status === 'correct' || !q.userAnswer.trim()}
                            className="px-6 py-2 bg-gray-400 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:hover:bg-gray-400"
                          >
                            Check
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-black/5 flex gap-3">
                <button 
                  onClick={askAIQuestion}
                  disabled={isGeneratingAI}
                  className="flex-grow flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-bold text-sm shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isGeneratingAI ? "Thinking..." : "Ask AI Question"}
                </button>
                <button 
                  onClick={() => {
                    const item = gridItems[Math.floor(Math.random() * gridItems.length)];
                    const isWhat = Math.random() > 0.5;
                    const newQ: Question = {
                      id: Math.random().toString(36).substr(2, 9),
                      type: isWhat ? 'what' : 'where',
                      targetItem: item,
                      targetCoord: { x: item.x, y: item.y },
                      correctAnswer: isWhat ? item.name : `${item.x},${item.y}`,
                      options: isWhat ? generateOptions(item.name) : undefined,
                      userAnswer: '',
                      status: 'pending'
                    };
                    setQuestions(prev => [...prev, newQ]);
                  }}
                  className="p-3 bg-white border border-black/10 rounded-2xl hover:bg-black hover:text-white transition-all shadow-sm"
                  title="Add Random Question"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>
        </main>

        {/* Footer Info */}
        <footer className="flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-black/30 font-mono uppercase tracking-widest pt-8">
          <div className="flex items-center gap-4">
            <span>Grid: {GRID_SIZE}x{GRID_SIZE}</span>
            <span>Items: {gridItems.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-3 h-3" />
            <span>Coordinates are (x, y) starting from bottom-left (1, 1)</span>
          </div>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
