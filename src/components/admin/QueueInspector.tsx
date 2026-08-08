import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { idbGetAll, idbDelete } from "@/lib/idb-queue";
import { processQueue } from "@/lib/offline";

export default function QueueInspector() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const all = await idbGetAll();
      setItems(all || []);
    } catch (e) {
      // ignore
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleDelete = async (key?: number) => {
    if (!key) return;
    try {
      await idbDelete(key);
      await load();
    } catch (e) {
      // ignore
    }
  };

  const handleRetry = async () => {
    await processQueue();
    // small delay before reload
    setTimeout(() => { void load(); }, 500);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Offline Queue Inspector</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button onClick={() => void load()} disabled={loading}>Refresh</Button>
            <Button variant="secondary" onClick={handleRetry}>Attempt Sync Now</Button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No queued items in IndexedDB.</p>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it._id} className="p-3 border rounded-md flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{it.type} <span className="text-xs text-muted-foreground ml-2">#{it._id}</span></div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Retries: {it.retries || 0} · Next attempt: {it.retry_after ? new Date(it.retry_after).toLocaleString() : 'now'}
                    </div>
                    {it.last_error && (
                      <div className="text-xs text-rose-600 mt-1">Error: {String(it.last_error).slice(0, 200)}</div>
                    )}
                    <pre className="text-xs text-muted-foreground mt-2 max-h-40 overflow-auto">{JSON.stringify(it.payload, null, 2)}</pre>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Button size="sm" onClick={() => handleDelete(it._id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
