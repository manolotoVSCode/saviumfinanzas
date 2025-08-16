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
    const { email, password, nombre, apellidos } = await req.json()

    if (!email || !password || !nombre || !apellidos) {
      throw new Error('Missing required fields: email, password, nombre, apellidos')
    }

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
            <h3 style="color: #333; margin-top: 0;">Datos de acceso:</h3>
            <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 10px 0;"><strong>Contraseña temporal:</strong> ${password}</p>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>⚠️ Importante:</strong> Por tu seguridad, te recomendamos cambiar tu contraseña la primera vez que inicies sesión.
            </p>
          </div>
          
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
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666;">¡Comienza a tomar control de tus finanzas hoy mismo!</p>
          </div>
          
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