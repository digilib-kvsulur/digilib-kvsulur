import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
})

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const url = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")
    const vapidSubject = Deno.env.get("VAPID_SUBJECT")
    if (!url || !anonKey || !serviceRoleKey) return json({ error: "Supabase function secrets are incomplete" }, 500)
    if (!vapidPublic || !vapidPrivate || !vapidSubject) return json({ error: "Push notifications are not configured" }, 503)

    const authorization = req.headers.get("Authorization")
    if (!authorization) return json({ error: "Authentication required" }, 401)
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: "Invalid authentication" }, 401)

    const body = await req.json()
    const roomCode = typeof body.room_code === "string" ? body.room_code.trim().toUpperCase() : ""
    const recipientId = typeof body.recipient_id === "string" ? body.recipient_id : ""
    if (!/^[A-Z0-9]{6}$/.test(roomCode) || !/^[0-9a-f-]{36}$/i.test(recipientId)) {
      return json({ error: "A valid room and recipient are required" }, 400)
    }
    if (recipientId === user.id) return json({ error: "You cannot invite yourself" }, 400)

    const adminClient = createClient(url, serviceRoleKey)
    const [{ data: room, error: roomError }, { data: profiles, error: profilesError }] = await Promise.all([
      adminClient.from("game_duel_rooms").select("id,game_key,host_id,status,expires_at").eq("room_code", roomCode).maybeSingle(),
      adminClient.from("profiles").select("id,first_name,last_name,role,is_approved").in("id", [user.id, recipientId]),
    ])
    if (roomError) throw roomError
    if (profilesError) throw profilesError
    const inviter = profiles?.find((profile) => profile.id === user.id)
    const recipient = profiles?.find((profile) => profile.id === recipientId)
    if (!inviter || inviter.role !== "student" || inviter.is_approved === false) return json({ error: "Approved students only" }, 403)
    if (!recipient || recipient.role !== "student" || recipient.is_approved === false) return json({ error: "That student cannot receive game invites" }, 404)
    if (!room || room.host_id !== user.id || room.status !== "waiting" || new Date(room.expires_at).getTime() <= Date.now()) {
      return json({ error: "This duel room is no longer available" }, 409)
    }

    const { data: game, error: gameError } = await adminClient.from("games").select("name").eq("key", room.game_key).maybeSingle()
    if (gameError) throw gameError
    const { data: subscriptions, error: subscriptionsError } = await adminClient.from("push_subscriptions")
      .select("id,subscription_object").eq("user_id", recipientId)
    if (subscriptionsError) throw subscriptionsError
    const webSubscriptions = (subscriptions || []).filter((subscription) =>
      subscription.subscription_object?.endpoint && subscription.subscription_object?.type !== "capacitor"
    )
    if (!webSubscriptions.length) return json({ sent: 0, registered: false })

    const inviterName = `${inviter.first_name || ""} ${inviter.last_name || ""}`.trim() || "A student"
    const gameName = game?.name || "Head-to-head"
    const actionUrl = `/student-dashboard?tab=games&duel_invite=${encodeURIComponent(roomCode)}`
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
    const outcomes = await Promise.all(webSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription.subscription_object, JSON.stringify({
          title: "Game invite!",
          body: `${inviterName} invited you to a ${gameName} duel. Tap to join.`,
          icon: "/pwa-192x192.png",
          tag: `game-duel-${room.id}`,
          data: { url: actionUrl },
        }))
        return true
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await adminClient.from("push_subscriptions").delete().eq("id", subscription.id)
        }
        console.warn("Game invite push delivery failed:", statusCode, error)
        return false
      }
    }))
    return json({ sent: outcomes.filter(Boolean).length, registered: true })
  } catch (error) {
    console.error("send-game-duel-invite failed:", error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
