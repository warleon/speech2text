import { useEffect, useState } from "react";

export function usePersistentId(key: string) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    let storedId = localStorage.getItem(key);
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem(key, storedId);
    }
    setId(storedId);
  }, [key]);

  return id;
}
