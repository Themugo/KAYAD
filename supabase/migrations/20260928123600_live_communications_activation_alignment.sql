-- KAYAD live communications activation alignment.
-- Canonical providers: Brevo email, Africa's Talking SMS, Twilio WhatsApp.
-- Phone verification supports SMS and WhatsApp; WhatsApp remains fail-closed
-- at the provider until the approved Twilio Content SID is configured.
update public.communication_channel_controls
set canonical_provider = case channel
  when 'email' then 'brevo'
  when 'sms' then 'africastalking'
  when 'whatsapp' then 'twilio_whatsapp'
end,
updated_at = now()
where channel in ('email','sms','whatsapp');

update public.communication_channel_controls
set enabled = true, updated_at = now()
where channel in ('email','sms','whatsapp');

insert into public.communication_channel_controls(channel, enabled, canonical_provider)
values
  ('email', true, 'brevo'),
  ('sms', true, 'africastalking'),
  ('whatsapp', true, 'twilio_whatsapp')
on conflict (channel) do update
set enabled = excluded.enabled,
    canonical_provider = excluded.canonical_provider,
    updated_at = now();

insert into public.communication_event_controls(event_type, channel, enabled)
values
  ('registration.completed', 'email', true),
  ('account.email_verification', 'email', true),
  ('account.phone_verification', 'sms', true),
  ('account.phone_verification', 'whatsapp', true)
on conflict (event_type, channel) do update
set enabled = excluded.enabled,
    updated_at = now();
