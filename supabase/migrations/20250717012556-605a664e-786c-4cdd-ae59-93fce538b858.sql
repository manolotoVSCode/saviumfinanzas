-- Add divisa_preferida column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN divisa_preferida text NOT NULL DEFAULT 'MXN';

-- Add constraint to only allow valid currencies
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_divisa CHECK (divisa_preferida IN ('MXN', 'USD', 'EUR'));

-- Update the existing trigger function to handle the new field
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, nombre, apellidos, edad, divisa_preferida)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''), 
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'edad' IS NOT NULL THEN 
        (NEW.raw_user_meta_data->>'edad')::INTEGER 
      ELSE NULL 
    END,
    COALESCE(NEW.raw_user_meta_data->>'divisa_preferida', 'MXN')
  );
  RETURN NEW;
END;
$function$;