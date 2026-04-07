
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "mdshare_display_name";

export function useDisplayName() {
  const [name, setNameState] = useState("Anonymous");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setNameState(stored);
    setLoaded(true);
  }, []);

  const setName = useCallback((newName: string) => {
    const trimmed = newName.trim() || "Anonymous";
    setNameState(trimmed);
    if (trimmed === "Anonymous") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, trimmed);
    }
  }, []);

  return { name, setName, loaded };
}
