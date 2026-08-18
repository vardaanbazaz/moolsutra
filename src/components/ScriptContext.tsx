"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type ScriptMode = "roman" | "indic";

interface ScriptContextType {
  scriptMode: ScriptMode;
  setScriptMode: (mode: ScriptMode) => void;
  toggleScriptMode: () => void;
}

const ScriptContext = createContext<ScriptContextType | undefined>(undefined);

export function ScriptProvider({ children }: { children: ReactNode }) {
  const [scriptMode, setScriptMode] = useState<ScriptMode>("roman");

  const toggleScriptMode = () => {
    setScriptMode((prevMode) => (prevMode === "roman" ? "indic" : "roman"));
  };

  return (
    <ScriptContext.Provider value={{ scriptMode, setScriptMode, toggleScriptMode }}>
      {children}
    </ScriptContext.Provider>
  );
}

export function useScript(): ScriptContextType {
  const context = useContext(ScriptContext);
  if (!context) {
    throw new Error("useScript must be used within a ScriptProvider");
  }
  return context;
}
