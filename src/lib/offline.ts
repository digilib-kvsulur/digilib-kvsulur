import { supabase } from "@/integrations/supabase/client";
import { idbAdd, idbGetAll, idbDelete, idbPutMap, idbGetMap, idbUpdate } from "@/lib/idb-queue";

type QueueEvent = {
  _id?: number; // idb key
  type: "start" | "complete" | "game_play";
  payload: any;
  created_at?: string;
};

function genLocalId() {
  return `local-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

export async function enqueueEvent(type: QueueEvent["type"], payload: any) {
  const ev: QueueEvent = { type, payload };
  try {
    const key = await idbAdd(ev);
    void processQueue();
    return `idb-${key}`;
  } catch (e) {
    const localId = genLocalId();
    const q = JSON.parse(localStorage.getItem("study_event_queue_v1") || "[]");
    q.push({ id: localId, type, payload, created_at: new Date().toISOString() });
    localStorage.setItem("study_event_queue_v1", JSON.stringify(q));
    void processQueue();
    return localId;
  }
}

export async function processQueue() {
  if (!navigator.onLine) return;
  const BASE_MS = 2000; // base backoff
  const MAX_BACKOFF = 5 * 60 * 1000; // 5 minutes
  const MAX_RETRIES = 8;

  try {
    const items = await idbGetAll();
    if (items.length === 0) return;
    for (const it of items) {
      const now = Date.now();
      // skip if scheduled for later
      if (it.retry_after && typeof it.retry_after === 'number' && now < it.retry_after) continue;

      const ev: QueueEvent = { type: it.type, payload: it.payload, created_at: it.created_at };
      try {
        if (ev.type === "start") {
          const { data, error } = await supabase.from("study_sessions").insert(ev.payload).select("id").single();
          if (error) throw error;
          await idbPutMap(String(it._id), data.id);
        } else if (ev.type === "complete") {
          const pid = ev.payload.p_session_id;
          if (typeof pid === 'string' && pid.startsWith('idb-')) {
            const parts = pid.split('-');
            const localKey = parts[1];
            const mapped = await idbGetMap(localKey);
            if (mapped) ev.payload.p_session_id = mapped;
            else {
              // can't resolve yet; keep this event for later
              continue;
            }
          }

          const { data: pts, error } = await supabase.rpc("complete_study_session", ev.payload as any);
          if (error) {
            const { p_session_id, p_duration_seconds, p_material_id, p_material_title, p_notes } = ev.payload;
            const { error: updErr } = await supabase.from("study_sessions").update({
              duration_seconds: p_duration_seconds,
              material_id: p_material_id,
              material_title: p_material_title,
              notes: p_notes,
              ended_at: new Date().toISOString(),
            }).eq("id", p_session_id);
            if (updErr) throw updErr;
          }
        } else if (ev.type === "game_play") {
          const { data, error } = await supabase.rpc("record_game_play_v2", { ...ev.payload, p_offline: true } as any);
          if (error) throw error;
        }

        // success -> remove
        await idbDelete(it._id);
      } catch (err) {
        // schedule retry with exponential backoff + jitter
        const prevRetries = it.retries || 0;
        const retries = prevRetries + 1;
        const backoff = Math.min(MAX_BACKOFF, BASE_MS * Math.pow(2, retries - 1));
        const jitter = Math.floor(Math.random() * BASE_MS);
        const retry_after = Date.now() + backoff + jitter;
        try {
          await idbUpdate(it._id, { retries, retry_after, last_error: String(err) });
        } catch (e) {
          // if updating metadata fails, leave as-is; inspector can show it
        }
        // if retries exceed max, leave it for manual inspection
      }
    }
  } catch (e) {
    // fallback to localStorage queue
    const q = JSON.parse(localStorage.getItem("study_event_queue_v1") || "[]");
    if (q.length === 0) return;
    const remaining = [] as any[];
    for (const ev of q) {
      try {
        if (ev.type === "start") {
          const { data, error } = await supabase.from("study_sessions").insert(ev.payload).select("id").single();
          if (error) throw error;
        } else if (ev.type === "complete") {
          const { data: pts, error } = await supabase.rpc("complete_study_session", ev.payload as any);
          if (error) {
            const { p_session_id, p_duration_seconds, p_material_id, p_material_title, p_notes } = ev.payload;
            const { error: updErr } = await supabase.from("study_sessions").update({
              duration_seconds: p_duration_seconds,
              material_id: p_material_id,
              material_title: p_material_title,
              notes: p_notes,
              ended_at: new Date().toISOString(),
            }).eq("id", p_session_id);
            if (updErr) throw updErr;
          }
        }
      } catch (err) {
        remaining.push(ev);
      }
    }
    localStorage.setItem("study_event_queue_v1", JSON.stringify(remaining));
  }
}

// Periodically attempt to flush queue
setInterval(() => {
  void processQueue();
}, 30 * 1000);

window.addEventListener("online", () => {
  void processQueue();
});

export async function startSessionLocal(payload: any) {
  // Try online first
  if (navigator.onLine) {
    try {
      const { data, error } = await supabase.from("study_sessions").insert(payload).select("id").single();
      if (!error && data?.id) return { success: true, id: data.id };
    } catch (e) {
      // fall through to enqueue
    }
  }
  // enqueue and return a local id
  const localId = await enqueueEvent("start", payload);
  return { success: false, id: localId };
}

export async function completeSessionLocal(payload: any) {
  // payload matches RPC params used in StudyTracker
  if (navigator.onLine) {
    try {
      const { data: pts, error } = await supabase.rpc("complete_study_session", payload as any);
      if (!error) return { success: true, pts };
      // fallback to update
      const { p_session_id, p_duration_seconds, p_material_id, p_material_title, p_notes } = payload;
      const { error: updErr } = await supabase.from("study_sessions").update({
        duration_seconds: p_duration_seconds,
        material_id: p_material_id,
        material_title: p_material_title,
        notes: p_notes,
        ended_at: new Date().toISOString(),
      }).eq("id", p_session_id);
      if (!updErr) return { success: true };
    } catch (e) {
      // fall through
    }
  }
  // enqueue
  const localId = await enqueueEvent("complete", payload);
  return { success: false, id: localId };
}

export async function recordGamePlayLocal(payload: any) {
  if (navigator.onLine) {
    try {
      const { data, error } = await supabase.rpc("record_game_play_v2", { ...payload, p_offline: false } as any);
      if (!error) return { success: true, data };
    } catch (e) {
      // fallthrough to enqueue
    }
  }
  const localId = await enqueueEvent("game_play", payload);
  return { success: false, id: localId };
}

