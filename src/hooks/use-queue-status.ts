import { useEffect, useState } from "react";
import { idbGetAll } from "@/lib/idb-queue";

export default function useQueueStatus(pollMs = 10000) {
  const [count, setCount] = useState(0);

  const load = async () => {
    try {
      const items = await idbGetAll();
      setCount(items.length || 0);
    } catch (e) {
      setCount(0);
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => { void load(); }, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return { count, refresh: load };
}
