import { useEffect, useState } from "react";

export function useWindow() {
  const [stateWindow, setWindow] = useState<Window | undefined>();
  useEffect(() => {
    setWindow(window);
  }, []);

  return stateWindow;
}
