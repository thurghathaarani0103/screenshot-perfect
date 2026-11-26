DROP POLICY IF EXISTS "public_photos" ON public.invitation_photos;
CREATE POLICY "public_photos"
ON public.invitation_photos
FOR SELECT
TO anon, authenticated
USING (slot IN ('hero', 'moment1', 'moment2', 'moment3'));

DROP POLICY IF EXISTS "guest_submit" ON public.rsvps;
CREATE POLICY "guest_submit"
ON public.rsvps
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(btrim(full_name)) BETWEEN 2 AND 150
  AND char_length(btrim(phone)) BETWEEN 7 AND 30
  AND btrim(phone) ~ '^[+0-9[:space:]()-]+$'
  AND char_length(btrim(email)) BETWEEN 3 AND 254
  AND btrim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  AND attending IN ('Yes', 'No', 'Maybe')
  AND guests BETWEEN 1 AND 50
  AND char_length(dietary) <= 2000
  AND char_length(song) <= 500
  AND char_length(message) <= 3000
);