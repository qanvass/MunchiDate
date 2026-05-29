-- ============================================================================
-- Supabase PostgreSQL Trigger Migration: Auto-Sync User Profiles
-- Automatically handles new user signups from auth.users to public.profiles.
-- Safely extracts metadata, roles, and sets up sensible visual assets.
-- ============================================================================

-- 1. Extend the public.profiles table to fully support all dater/retailer properties
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'foodie';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '/portraits/profile_1.png';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS archetype TEXT DEFAULT 'Midnight Street Food Rebel';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_meetings_left INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_since TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_retailer_premium BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posted_deals_count_this_month INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posted_deals_count_this_week INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_slot_placement_used_this_month BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slot_deal_placement TEXT;

-- Add comments for extended columns to preserve documentation integrity
COMMENT ON COLUMN public.profiles.role IS 'User permission group: foodie (dater) or retailer (restaurant partner).';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URI path to selected portrait image or store favicon.';
COMMENT ON COLUMN public.profiles.archetype IS 'Dater foodie archetype personality badge.';

-- 2. Create the trigger handler function to synchronize registrations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    parsed_role TEXT;
    parsed_name TEXT;
    parsed_avatar TEXT;
    parsed_archetype TEXT;
BEGIN
    -- A. Safely extract role, defaulting to 'foodie' if null or invalid
    parsed_role := COALESCE(new.raw_user_meta_data->>'role', 'foodie');
    IF parsed_role NOT IN ('foodie', 'retailer') THEN
        parsed_role := 'foodie';
    END IF;

    -- B. Safely extract display name, with progressive fallbacks
    parsed_name := COALESCE(
        new.raw_user_meta_data->>'display_name', 
        new.raw_user_meta_data->>'name', 
        split_part(new.email, '@', 1)
    );
    parsed_name := NULLIF(TRIM(parsed_name), '');
    IF parsed_name IS NULL THEN
        parsed_name := 'New Foodie Explorer';
    END IF;

    -- C. Initialize visual assets based on the account type
    IF parsed_role = 'retailer' THEN
        parsed_avatar := '/favicon.ico';
        parsed_archetype := 'Verified Food Partner';
    ELSE
        parsed_avatar := COALESCE(
            new.raw_user_meta_data->>'avatar_url', 
            '/portraits/profile_' || floor(random() * 30 + 1)::text || '.png'
        );
        parsed_archetype := COALESCE(
            new.raw_user_meta_data->>'archetype', 
            'Midnight Street Food Rebel'
        );
    END IF;

    -- D. Insert the synchronized profile row
    INSERT INTO public.profiles (
        id,
        user_id,
        display_name,
        email,
        phone,
        identity_status,
        role,
        avatar_url,
        archetype,
        free_meetings_left,
        is_premium,
        is_retailer_premium,
        posted_deals_count_this_month,
        posted_deals_count_this_week,
        has_slot_placement_used_this_month
    ) VALUES (
        new.id,
        new.id::text,
        parsed_name,
        new.email,
        new.phone,
        'requires_input',
        parsed_role,
        parsed_avatar,
        parsed_archetype,
        CASE WHEN parsed_role = 'retailer' THEN 0 ELSE 1 END,
        false,
        false,
        0,
        0,
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the trigger to run automatically after auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
