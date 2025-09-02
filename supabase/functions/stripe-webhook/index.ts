// O mesmo código da função que te passei ontem.
// Cole o código da função stripe-webhook aqui.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@10.17.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY' ) as string, {
  apiVersion: '2022-08-01',
  httpClient: Stripe.createFetchHttpClient( )
});
const adminSupabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Você precisará adicionar SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da Vercel
);
serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();
  try {
    const event = await stripe.webhooks.constructEventAsync(body, signature!, Deno.env.get('STRIPE_SIGNING_SECRET')!);
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = session.customer as string;
    if (event.type === 'checkout.session.completed') {
      const { data: profile } = await adminSupabase.from('profiles').select('id').eq('stripe_customer_id', customerId).single();
      if (profile) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await adminSupabase.from('profiles').update({
          subscription_status: 'active',
          subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString()
        }).eq('id', profile.id);
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
