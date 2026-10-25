import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Chess } from "npm:chess.js@1.4.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  try {
    const url = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!url || !anonKey || !serviceKey) return json({ error: "Supabase function secrets are incomplete" }, 500)
    const authorization = req.headers.get("Authorization")
    if (!authorization) return json({ error: "Authentication required" }, 401)
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: "Invalid authentication" }, 401)

    const body = await req.json()
    const roomId = typeof body.room_id === "string" ? body.room_id : ""
    const action = body.action === "legal_moves" ? "legal_moves" : body.action === "move" ? "move" : ""
    if (!/^[0-9a-f-]{36}$/i.test(roomId) || !action) return json({ error: "A valid room and action are required" }, 400)

    const admin = createClient(url, serviceKey)
    const [{ data: profile }, { data: room, error: roomError }] = await Promise.all([
      admin.from("profiles").select("role,is_approved").eq("id", user.id).maybeSingle(),
      admin.from("game_duel_rooms").select("id,game_key,status,host_id,guest_id,turn_user_id,winner_id,expires_at,board_state").eq("id", roomId).maybeSingle(),
    ])
    if (!profile || profile.role !== "student" || profile.is_approved === false) return json({ error: "Approved students only" }, 403)
    if (roomError) throw roomError
    if (!room || room.game_key !== "chess" || ![room.host_id, room.guest_id].includes(user.id)) return json({ error: "This chess room is unavailable" }, 404)
    if (room.status !== "active" || new Date(room.expires_at).getTime() <= Date.now()) return json({ error: "This match has ended or expired" }, 409)

    const history = Array.isArray(room.board_state?.history) ? room.board_state.history : []
    if (history.length > 300) return json({ error: "This match has reached its move limit" }, 409)
    const chess = new Chess()
    try {
      for (const entry of history) {
        if (!entry || typeof entry.from !== "string" || typeof entry.to !== "string") throw new Error("Invalid move history")
        chess.move({ from: entry.from, to: entry.to, ...(entry.promotion ? { promotion: entry.promotion } : {}) })
      }
    } catch {
      return json({ error: "The saved chess position is invalid. Please leave and rejoin the match." }, 409)
    }
    if (room.board_state?.fen && room.board_state.fen !== chess.fen()) return json({ error: "The saved chess position failed verification" }, 409)
    const expectedUser = chess.turn() === "w" ? room.host_id : room.guest_id
    if (room.turn_user_id !== expectedUser) return json({ error: "The saved turn failed verification" }, 409)
    if (action === "legal_moves") {
      if (room.turn_user_id !== user.id) return json({ error: "Wait for your turn" }, 409)
      const from = typeof body.from === "string" ? body.from : ""
      const legal = chess.moves({ square: from as never, verbose: true }).map((move) => ({ from: move.from, to: move.to, promotion: move.promotion }))
      return json({ moves: legal, fen: chess.fen() })
    }
    if (room.turn_user_id !== user.id) return json({ error: "Wait for your turn" }, 409)
    const from = typeof body.from === "string" ? body.from : ""
    const to = typeof body.to === "string" ? body.to : ""
    const promotion = typeof body.promotion === "string" ? body.promotion : undefined
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to) || (promotion && !["q", "r", "b", "n"].includes(promotion))) return json({ error: "Choose a valid chess move" }, 400)
    let played
    try { played = chess.move({ from, to, ...(promotion ? { promotion } : {}) }) } catch { played = null }
    if (!played) return json({ error: "That move is not legal" }, 400)
    const nextHistory = [...history, { from: played.from, to: played.to, ...(played.promotion ? { promotion: played.promotion } : {}) }]
    const isOver = chess.isGameOver()
    const winner = chess.isCheckmate() ? chess.turn() === "w" ? room.guest_id : room.host_id : null
    const nextState = { fen: chess.fen(), history: nextHistory, last_move: { from: played.from, to: played.to, san: played.san }, reason: chess.isCheckmate() ? "checkmate" : chess.isStalemate() ? "stalemate" : chess.isThreefoldRepetition() ? "threefold repetition" : chess.isDraw() ? "draw" : null }
    const { error: persistError } = await admin.rpc("persist_verified_chess_state", {
      p_room_id: room.id, p_expected_history: history, p_board_state: nextState,
      p_status: isOver ? "completed" : "active",
      p_turn_user_id: isOver ? null : chess.turn() === "w" ? room.host_id : room.guest_id,
      p_winner_id: winner,
    })
    if (persistError) return json({ error: persistError.message }, 409)
    return json({ board_state: nextState, status: isOver ? "completed" : "active", turn_user_id: isOver ? null : chess.turn() === "w" ? room.host_id : room.guest_id, winner_id: winner })
  } catch (error) {
    console.error("chess-duel failed:", error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
