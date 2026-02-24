import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Restrict to service role calls only (from admin-create-user edge function)
    const authHeader = req.headers.get('Authorization')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!authHeader || !authHeader.includes(serviceKey || '')) {
      throw new Error('Unauthorized: Service role required')
    }

    const { email, setupLink, nombre, apellidos } = await req.json()

    if (!email || !nombre || !apellidos) {
      throw new Error('Missing required fields: email, nombre, apellidos')
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format')
    }

    // Validate input lengths
    if (nombre.length > 100 || apellidos.length > 100) {
      throw new Error('Name fields too long')
    }

    const setupSection = setupLink 
      ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setupLink}" style="background-color: #333; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px;">
            Configurar mi cuenta
          </a>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center;">
          Este enlace expirará en 24 horas.
        </p>
      `
      : `
        <p style="color: #666; font-size: 16px;">
          Inicia sesión con tu email para acceder al sistema.
        </p>
      `

    const { error } = await resend.emails.send({
      from: 'Sistema Financiero <onboarding@resend.dev>',
      to: [email],
      subject: '¡Bienvenido a tu Sistema de Gestión Financiera!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">¡Bienvenido ${nombre} ${apellidos}!</h1>
          
          <p style="color: #666; font-size: 16px;">
            Tu cuenta ha sido creada exitosamente en el Sistema de Gestión Financiera.
          </p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Tu email de acceso:</h3>
            <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
          </div>

          ${setupSection}
          
          <p style="color: #666; font-size: 16px;">
            Ya puedes acceder al sistema y comenzar a gestionar tus finanzas personales:
          </p>
          
          <ul style="color: #666; font-size: 14px;">
            <li>Registra tus transacciones</li>
            <li>Organiza tus categorías de gastos e ingresos</li>
            <li>Gestiona tus cuentas bancarias</li>
            <li>Controla tus inversiones y criptomonedas</li>
            <li>Genera informes financieros detallados</li>
          </ul>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            Este es un mensaje automático, por favor no respondas a este email.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending welcome email:', error)
      throw error
    }

    console.log('Welcome email sent successfully to:', email)

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome email sent successfully' }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in send-welcome-email function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred sending the welcome email' 
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
