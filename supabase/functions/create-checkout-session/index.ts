// O mesmo código da função que te passei ontem.
// Cole o código da função create-checkout-session aqui.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@10.17.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY' ) as string, {
  apiVersion: '2022-08-01',
  httpClient: Stripe.createFetchHttpClient( )
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { priceId } = await req.json();
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not found.');
    const { data: profile, error } = await supabaseClient.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
    if (error) throw error;
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_id: user.id } });
      customerId = customer.id;
      await supabaseClient.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${Deno.env.get('SITE_URL') || 'https://' + req.headers.get('host' )}/dashboard.html?payment=success`,
      cancel_url: `${Deno.env.get('SITE_URL') || 'https://' + req.headers.get('host' )}/pagamento.html`,
    });
    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
