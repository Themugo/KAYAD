-- KAYAD Slate Teal theme convergence.
-- Intentionally additive and idempotent: preserve historical migrations and
-- only converge the canonical/default site theme, not dealer white-label data.

DO $$
BEGIN
  IF to_regclass('public.cms_theme_configs') IS NOT NULL THEN
    UPDATE public.cms_theme_configs
    SET colors = COALESCE(colors, '{}'::jsonb) || jsonb_build_object(
          'primary', '#176B87',
          'secondary', '#12576D',
          'accent', '#13B8A6',
          'warning', '#176B87',
          'info', '#13B8A6',
          'background', '#F6FAF9',
          'surface', '#FFFFFF',
          'text', '#1E293B',
          'textMuted', '#64748B',
          'border', '#D7E7E4'
        ),
        buttons = COALESCE(buttons, '{}'::jsonb) || jsonb_build_object(
          'primary', jsonb_build_object('background', '#176B87', 'color', '#FFFFFF', 'radius', 'lg'),
          'secondary', jsonb_build_object('background', '#EEF7F5', 'color', '#0A3340', 'radius', 'lg')
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE is_default IS TRUE;
  END IF;

  IF to_regclass('public.website_settings') IS NOT NULL THEN
    UPDATE public.website_settings
    SET primary_color = '#176B87',
        secondary_color = '#12576D',
        accent_color = '#13B8A6',
        warning_color = '#176B87',
        background_color = '#F6FAF9',
        surface_color = '#FFFFFF',
        updated_at = CURRENT_TIMESTAMP
    WHERE is_active IS TRUE;
  END IF;

  IF to_regclass('public.cms_website_settings') IS NOT NULL THEN
    UPDATE public.cms_website_settings
    SET setting_value = CASE lower(setting_key)
          WHEN 'primary_color' THEN '#176B87'
          WHEN 'secondary_color' THEN '#12576D'
          WHEN 'accent_color' THEN '#13B8A6'
          WHEN 'warning_color' THEN '#176B87'
          WHEN 'background_color' THEN '#F6FAF9'
          WHEN 'surface_color' THEN '#FFFFFF'
          WHEN 'border_color' THEN '#D7E7E4'
          ELSE setting_value
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE lower(setting_key) IN (
      'primary_color', 'secondary_color', 'accent_color', 'warning_color',
      'background_color', 'surface_color', 'border_color'
    );
  END IF;
END $$;
