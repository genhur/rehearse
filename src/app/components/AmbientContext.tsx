import { createContext, useContext, useState, ReactNode } from 'react';

interface AmbientState {
  /** 0 = idle, 1 = someone is speaking */
  intensity: number;
  setIntensity: (v: number) => void;
}

const AmbientCtx = createContext<AmbientState>({ intensity: 0, setIntensity: () => {} });

export function AmbientProvider({ children }: { children: ReactNode }) {
  const [intensity, setIntensity] = useState(0);
  return (
    <AmbientCtx.Provider value={{ intensity, setIntensity }}>
      {children}
    </AmbientCtx.Provider>
  );
}

export function useAmbient() {
  return useContext(AmbientCtx);
}
