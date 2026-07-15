import { NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { config } from '@/lib/config'
import { freeTierReminderEmail } from '@/lib/email/free-tier-reminder'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${config.cron.secret}`) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(config.resend.api_key)

  // 1. Every user in the system
  const allUsers: { id: string; email?: string; created_at: string; user_metadata?: { full_name?: string } }[] = []
  let page = 1
  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    allUsers.push(...data.users)
    if (data.users.length < 1000) break
    page++
  }

  // 2. Anyone with an active paid subscription is NOT free tier — exclude them
  const { data: activeSubs, error: subsError } = await serviceClient
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active')
  if (subsError) return Response.json({ error: subsError.message }, { status: 500 })
  const paidUserIds = new Set((activeSubs ?? []).map(s => s.user_id))

  // 3. Reminder history — last sent time and opt-out status per user
  const { data: reminders, error: remindersError } = await serviceClient
    .from('user_email_reminders')
    .select('user_id, last_sent_at, opted_out, send_count')
  if (remindersError) return Response.json({ error: remindersError.message }, { status: 500 })
  const reminderMap = new Map((reminders ?? []).map(r => [r.user_id, r]))

  const now = Date.now()
  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const user of allUsers) {
    if (paidUserIds.has(user.id)) { skipped++; continue }
    if (!user.email) { skipped++; continue }

    const reminder = reminderMap.get(user.id)
    if (reminder?.opted_out) { skipped++; continue }

    const baseline = reminder?.last_sent_at ? new Date(reminder.last_sent_at).getTime() : new Date(user.created_at).getTime()
    if (now - baseline < SEVEN_DAYS_MS) { skipped++; continue }

    const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'there'
    const { subject, html } = freeTierReminderEmail({ firstName, userId: user.id })

    try {
      const result = await resend.emails.send({
        from: config.resend.from,
        to: user.email,
        subject,
        html,
      })
      if (result.error) {
        errors.push(`${user.email}: ${result.error.message}`)
        continue
      }
      await serviceClient
        .from('user_email_reminders')
        .upsert(
          {
            user_id: user.id,
            reminder_type: 'free_tier_weekly',
            last_sent_at: new Date().toISOString(),
            send_count: (reminder?.send_count ?? 0) + 1,
          },
          { onConflict: 'user_id' }
        )
      sent++
    } catch (err) {
      errors.push(`${user.email}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  return Response.json({ sent, skipped, errors })
}
