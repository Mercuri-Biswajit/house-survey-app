import { useState, useEffect } from "react";

/**
 * useDebounce – Delays updating a value until after a specified delay.
 * Improves performance for search inputs that trigger expensive filtering.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;