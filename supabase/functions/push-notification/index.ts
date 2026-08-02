import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Ensure these secrets are set in your Supabase project:
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:your_email@example.com)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const payload = await req.json()
    const notification = payload.record // Triggered by a webhook on `notifications` table insert

    if (!notification) {
      return new Response(JSON.stringify({ error: 'No notification data' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')

    if (!vapidPublic || !vapidPrivate || !vapidSubject) {
      console.warn("VAPID keys not configured.")
      return new Response(JSON.stringify({ error: 'VAPID keys not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    // Fetch subscriptions
    let query = supabaseClient.from('push_subscriptions').select('*')
    if (notification.target_user_id) {
      query = query.eq('user_id', notification.target_user_id)
    }
    
    const { data: subscriptions, error: subError } = await query

    if (subError) throw subError
    
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No active subscriptions found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const pushPayload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: notification.image_url || '/pwa-192x192.png',
      data: {
        url: notification.action_link || '/'
      }
    })

    const results = await Promise.allSettled(
      subscriptions.map(sub => 
        webpush.sendNotification(sub.subscription_object, pushPayload)
      )
    )

    return new Response(
      JSON.stringify({ message: 'Push notifications processed', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
