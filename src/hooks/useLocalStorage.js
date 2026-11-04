import { useState } from "react";

export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return initialValue;
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch {
      return initialValue;
    }
  });

  const setStoredValue = (newValue) => {
    try {
      setValue(newValue);
      if (newValue === null || newValue === undefined) {
        window.localStorage.removeItem(key);
      } else if (typeof newValue === "string") {
        window.localStorage.setItem(key, newValue);
      } else {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      }
    } catch {
      // ignore write errors (e.g. private browsing)
    }
  };

  return [value, setStoredValue];
}
