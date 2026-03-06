import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabase-admin.ts'
import { stripe } from '../_shared/stripe.ts'

// Plan limits mapping
const PLAN_LIMITS: Record<string, { plan: string; maxEmployees: number; maxAdmins: number; maxCampaigns: number; aiEnabled: boolean }> = {
  starter: { plan: 'starter', maxEmployees: 25, maxAdmins: 1, maxCampaigns: 2, aiEnabled: false },
  growth: { plan: 'growth', maxEmployees: 100, maxAdmins: 3, maxCampaigns: 10, aiEnabled: true },
  business: { plan: 'business', maxEmployees: 500, maxAdmins: 10, maxCampaigns: 50, aiEnabled: true },
  enterprise: { plan: 'enterprise', maxEmployees: 10000, maxAdmins: 50, maxCampaigns: 999, aiEnabled: true },
}

// Map price IDs to plan names — update these with your actual Stripe price IDs
const PRICE_TO_PLAN: Record<string, string> = {
  // Monthly
  price_starter_monthly: 'starter',
  price_growth_monthly: 'growth',
  price_business_monthly: 'business',
  // Annual
  price_starter_annual: 'starter',
  price_growth_annual: 'growth',
  price_business_annual: 'business',
}

function getPlanFromPriceId(priceId: string): string {
  return PRICE_TO_PLAN[priceId] || 'starter'
}

serve(async (req) => {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new Response('No signature', { status: 400 })
  }

  let event
  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const orgId = session.metadata?.orgId
        if (!orgId || !session.subscription) break

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const priceId = subscription.items.data[0].price.id
        const planName = getPlanFromPriceId(priceId)
        const limits = PLAN_LIMITS[planName] || PLAN_LIMITS.starter

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: 'active',
            subscription_plan: limits.plan,
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            max_employees: limits.maxEmployees,
            max_admins: limits.maxAdmins,
            max_campaigns_per_month: limits.maxCampaigns,
            ai_enabled: limits.aiEnabled,
          })
          .eq('id', orgId)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        if (!invoice.subscription) break

        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const customer = await stripe.customers.retrieve(invoice.customer as string)
        const orgId = (customer as any).metadata?.orgId
        if (!orgId) break

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: 'active',
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', orgId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customer = await stripe.customers.retrieve(invoice.customer as string)
        const orgId = (customer as any).metadata?.orgId
        if (!orgId) break

        await supabaseAdmin
          .from('organizations')
          .update({ subscription_status: 'past_due' })
          .eq('id', orgId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        const orgId = (customer as any).metadata?.orgId
        if (!orgId) break

        const starterLimits = PLAN_LIMITS.starter
        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: 'canceled',
            subscription_plan: 'starter',
            max_employees: starterLimits.maxEmployees,
            max_admins: starterLimits.maxAdmins,
            max_campaigns_per_month: starterLimits.maxCampaigns,
            ai_enabled: false,
          })
          .eq('id', orgId)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        const orgId = (customer as any).metadata?.orgId
        if (!orgId) break

        const priceId = subscription.items.data[0].price.id
        const planName = getPlanFromPriceId(priceId)
        const limits = PLAN_LIMITS[planName] || PLAN_LIMITS.starter

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_plan: limits.plan,
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            max_employees: limits.maxEmployees,
            max_admins: limits.maxAdmins,
            max_campaigns_per_month: limits.maxCampaigns,
            ai_enabled: limits.aiEnabled,
          })
          .eq('id', orgId)
        break
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
