import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '' // requires service role key for write bypass
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const rawBody = await req.text(); // Parse raw body for signature verification
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout session completions
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, type, targetMatchId } = session.metadata;

    console.log(`💳 Payment checkout session completed for user: ${userId}`);

    try {
      if (type === 'subscription') {
        // Upgrade user profile to premium membership
        const { error } = await supabase
          .from('profiles')
          .update({
            is_premium: true,
            premium_since: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) throw error;
        console.log(`👑 Successfully upgraded user ${userId} to Premium Membership!`);

      } else if (type === 'one-off') {
        // Record single date unlock in dates_and_meetings table
        const { error } = await supabase
          .from('dates_and_meetings')
          .insert({
            sender_id: userId,
            recipient_id: targetMatchId,
            status: 'paid',
            payment_type: 'single_charge',
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        console.log(`🎟️ Successfully unlocked one-off date ticket for user ${userId} with match ${targetMatchId}!`);
      }
    } catch (dbErr) {
      console.error("❌ Database update failed inside Stripe Webhook:", dbErr.message);
      return res.status(500).json({ error: "Database update transaction failed." });
    }
  }

  // Handle successful Identity verification session verified event
  if (event.type === 'identity.verification_session.verified') {
    const session = event.data.object;
    console.log(`🛡️ Webhook: Identity verification session verified for session: ${session.id}`);

    try {
      // Find the pending verification booking for this user/session as sender
      const { data: booking, error: findError } = await supabase
        .from('dates_and_meetings')
        .select('*')
        .eq('verification_session_sender', session.id)
        .eq('status', 'pending_verification')
        .single();

      if (booking) {
        const { error: updateError } = await supabase
          .from('dates_and_meetings')
          .update({
            sender_verified: true,
            status: booking.recipient_verified ? 'confirmed' : 'pending_verification'
          })
          .eq('id', booking.id);

        if (updateError) throw updateError;
        console.log(`🟢 Successfully updated host verification status to verified for booking: ${booking.id}`);
      } else {
        // Try recipient verification session matching
        const { data: guestBooking, error: guestError } = await supabase
          .from('dates_and_meetings')
          .select('*')
          .eq('verification_session_recipient', session.id)
          .eq('status', 'pending_verification')
          .single();

        if (guestBooking) {
          const { error: updateError } = await supabase
            .from('dates_and_meetings')
            .update({
              recipient_verified: true,
              status: guestBooking.sender_verified ? 'confirmed' : 'pending_verification'
            })
            .eq('id', guestBooking.id);

          if (updateError) throw updateError;
          console.log(`🟢 Successfully updated guest verification status to verified for booking: ${guestBooking.id}`);
        }
      }
    } catch (dbErr) {
      console.error("❌ Supabase Identity Webhook update failed:", dbErr.message);
      return res.status(500).json({ error: "Supabase update transaction failed." });
    }
  }

  res.status(200).json({ received: true });
}
