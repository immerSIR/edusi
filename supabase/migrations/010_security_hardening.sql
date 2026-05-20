-- Security hardening for client-callable RPCs and public storage policies.

-- Restrict direct execution before replacing the function. Authenticated
-- browser clients may execute it, but the function itself now enforces
-- parent ownership and bounded positive point increments.
REVOKE EXECUTE ON FUNCTION increment_child_points(UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_child_points(UUID, INT) FROM anon;

CREATE OR REPLACE FUNCTION increment_child_points(child_id_param UUID, points_param INT)
RETURNS VOID AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF points_param < 0 OR points_param > 100 THEN
        RAISE EXCEPTION 'Invalid point increment';
    END IF;

    UPDATE children
    SET total_points = total_points + points_param
    WHERE id = child_id_param
      AND parent_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Child not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION increment_child_points(UUID, INT) TO authenticated;

DROP POLICY IF EXISTS "Authenticated upload to illustrations" ON storage.objects;

CREATE POLICY "Authenticated upload to illustrations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'illustrations'
    AND auth.role() = 'authenticated'
);
