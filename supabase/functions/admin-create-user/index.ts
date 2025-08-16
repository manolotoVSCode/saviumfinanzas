import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the JWT token from the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Initialize regular client to verify current user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Set the session from the auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid or expired token')
    }

    // Check if user is admin (only manoloto@hotmail.com can create users)
    if (user.email !== 'manoloto@hotmail.com') {
      throw new Error('Access denied: Admin only function')
    }

    const { email, password, nombre, apellidos, divisa_preferida } = await req.json()

    if (!email || !password || !nombre || !apellidos) {
      throw new Error('Missing required fields: email, password, nombre, apellidos')
    }

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellidos,
        divisa_preferida: divisa_preferida || 'MXN'
      }
    })

    if (createError) {
      throw createError
    }

    // Send welcome email
    try {
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-welcome-email', {
        body: {
          email,
          password,
          nombre,
          apellidos
        }
      });

      if (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't throw error here - user was created successfully, just email failed
      }
    } catch (emailError) {
      console.error('Error calling send-welcome-email function:', emailError);
      // Don't throw error here - user was created successfully, just email failed
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
        message: 'User created successfully and welcome email sent'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in admin-create-user function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred' 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})