-- Fix infinite recursion in users RLS policy
-- The "Admins can read all users" policy queries the users table itself,
-- which triggers the same RLS policy, causing infinite recursion.
-- This breaks any query that joins through providers → users.

-- Step 1: Create a SECURITY DEFINER function that bypasses RLS to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Step 2: Drop the recursive policy
DROP POLICY IF EXISTS "Admins can read all users" ON users;

-- Step 3: Recreate it using the non-recursive helper function
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (public.is_admin());

-- Step 4: Add a public read policy for basic user info
-- This allows listing pages to display provider names/avatars without auth.
DROP POLICY IF EXISTS "Public can read basic user profiles" ON users;
CREATE POLICY "Public can read basic user profiles" ON users
  FOR SELECT USING (true);

-- Step 5: Fix the same recursive pattern in other tables' admin policies
-- These all use EXISTS (SELECT 1 FROM users WHERE ...) which triggers the
-- same recursion when the users table RLS is evaluated.

DROP POLICY IF EXISTS "Admins can manage all providers" ON providers;
CREATE POLICY "Admins can manage all providers" ON providers
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all listings" ON listings;
CREATE POLICY "Admins can manage all listings" ON listings
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all bookings" ON bookings;
CREATE POLICY "Admins can manage all bookings" ON bookings
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all reviews" ON reviews;
CREATE POLICY "Admins can manage all reviews" ON reviews
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage safety zones" ON safety_zones;
CREATE POLICY "Admins can manage safety zones" ON safety_zones
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage mentions" ON ig_mentions;
CREATE POLICY "Admins can manage mentions" ON ig_mentions
  FOR ALL USING (public.is_admin());
