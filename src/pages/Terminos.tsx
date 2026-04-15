import Layout from '@/components/Layout';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Terminos = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Términos y Condiciones</h1>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-muted-foreground">
          <p className="text-foreground font-medium">Última actualización: Abril 2026</p>

          <h2 className="text-lg font-semibold text-foreground">1. Naturaleza del servicio</h2>
          <p>
            Savium es una herramienta de finanzas personales de uso privado. No constituye asesoría financiera, 
            fiscal ni de inversión. Las decisiones financieras son responsabilidad exclusiva del usuario.
          </p>

          <h2 className="text-lg font-semibold text-foreground">2. Datos personales</h2>
          <p>
            Los datos financieros introducidos son almacenados de forma segura en servidores de Supabase con 
            cifrado en tránsito y en reposo. No compartimos, vendemos ni cedemos datos a terceros. 
            Cada usuario solo puede acceder a su propia información mediante Row Level Security (RLS).
          </p>

          <h2 className="text-lg font-semibold text-foreground">3. Uso aceptable</h2>
          <p>
            El acceso es por invitación. El usuario se compromete a no compartir sus credenciales, 
            no intentar acceder a datos de otros usuarios, y no utilizar la plataforma para fines ilícitos.
          </p>

          <h2 className="text-lg font-semibold text-foreground">4. Disponibilidad</h2>
          <p>
            El servicio se ofrece "tal cual" sin garantías de disponibilidad continua. 
            Se realizan esfuerzos razonables para mantener el servicio operativo, pero pueden ocurrir 
            interrupciones por mantenimiento o causas ajenas.
          </p>

          <h2 className="text-lg font-semibold text-foreground">5. Limitación de responsabilidad</h2>
          <p>
            Savium no se hace responsable de pérdidas financieras derivadas del uso o interpretación 
            de los datos mostrados en la plataforma. Los cálculos, gráficos y reportes son orientativos.
          </p>

          <h2 className="text-lg font-semibold text-foreground">6. Propiedad intelectual</h2>
          <p>
            Todo el código, diseño y contenido de Savium es propiedad de sus creadores. 
            Queda prohibida su reproducción o distribución sin autorización.
          </p>

          <h2 className="text-lg font-semibold text-foreground">7. Modificaciones</h2>
          <p>
            Estos términos pueden actualizarse en cualquier momento. El uso continuado de la plataforma 
            implica la aceptación de los términos vigentes.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Terminos;
