import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')
    if (!url || !anonKey || !serviceRoleKey) return json({ error: 'Supabase function secrets are incomplete' }, 500)
    if (!vapidPublic || !vapidPrivate || !vapidSubject) return json({ error: 'VAPID keys are not configured' }, 503)

    const authorization = req.headers.get('Authorization')
    if (!authorization) return json({ error: 'Authentication required' }, 401)
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Invalid authentication' }, 401)
    const adminClient = createClient(url, serviceRoleKey)
    const { data: profile, error: profileError } = await adminClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileError) throw profileError
    if (profile?.role !== 'admin') return json({ error: 'Only admins can dispatch push notifications' }, 403)

    const body = await req.json()
    const records = Array.isArray(body.records) ? body.records : body.record ? [body.record] : []
    const ids = [...new Set(records.map((record: { id?: string }) => record?.id).filter((id: unknown): id is string => typeof id === 'string'))]
    if (!ids.length) return json({ error: 'No notification records supplied' }, 400)

    // Resolve records from the database and ensure they were created by this admin.
    const { data: notifications, error: notificationError } = await adminClient.from('notifications')
      .select('id,title,message,image_url,action_link,target_user_id,sent_by')
      .in('id', ids).eq('sent_by', user.id)
    if (notificationError) throw notificationError
    if (!notifications?.length) return json({ error: 'No authorized notifications found' }, 403)

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
    const results = await Promise.all(notifications.map(async (notification) => {
      let query = adminClient.from('push_subscriptions').select('id,user_id,subscription_object')
      if (notification.target_user_id) query = query.eq('user_id', notification.target_user_id)
      const { data: subscriptions, error } = await query
      if (error) return { notificationId: notification.id, sent: 0, failed: 1, error: error.message }
      const webSubscriptions = (subscriptions || []).filter((sub) => sub.subscription_object?.endpoint && sub.subscription_object?.type !== 'capacitor')
      const outcomes = await Promise.all(webSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription_object, JSON.stringify({
            title: notification.title,
            body: notification.message,
            icon: notification.image_url || '/pwa-192x192.png',
            data: { url: notification.action_link || '/' },
          }))
          return { ok: true }
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode
          if (statusCode === 404 || statusCode === 410) {
            await adminClient.from('push_subscriptions').delete().eq('id', sub.id)
          }
          return { ok: false, error: error instanceof Error ? error.message : String(error), statusCode }
        }
      }))
      return {
        notificationId: notification.id,
        subscriptions: webSubscriptions.length,
        sent: outcomes.filter((result) => result.ok).length,
        failed: outcomes.filter((result) => !result.ok).length,
        errors: outcomes.filter((result) => !result.ok).map(({ error, statusCode }) => ({ error, statusCode })),
      }
    }))
    const sent = results.reduce((sum, result) => sum + result.sent, 0)
    const failed = results.reduce((sum, result) => sum + result.failed, 0)
    return json({ processed: notifications.length, sent, failed, results })
  } catch (error) {
    console.error('push-notification failed:', error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
