import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  PlusCircle, 
  TrendingUp, 
  ArrowUpDown, 
  Coins, 
  Upload,
  ChevronRight,
  ChevronLeft,
  X,
  BookOpen
} from 'lucide-react';
import { useSampleData } from '@/hooks/useSampleData';

const guideSteps = [
  {
    title: '1. Cuentas',
    description: 'Gestiona tus cuentas bancarias, tarjetas e inversiones',
    icon: CreditCard,
    content: [
      '💰 Líquido: Cuentas bancarias, efectivo',
      '💳 Pasivo: Tarjetas de crédito, deudas',
      '📈 Inversiones: ETFs, acciones, fondos',
      '🏢 Empresa Propia: Activos empresariales',
      '🏠 Inmuebles: Propiedades, bienes raíces'
    ],
    action: 'Crea tus cuentas en la sección principal'
  },
  {
    title: '2. Categorías',
    description: 'Organiza tus ingresos y gastos',
    icon: PlusCircle,
    content: [
      '💵 Ingresos: Salario, freelance, inversiones',
      '🛒 Gastos: Alimentación, transporte, hogar',
      '📊 Subcategorías: Detalla cada categoría',
      '🔄 Personalizable: Adapta a tu estilo de vida'
    ],
    action: 'Configura categorías en Configuración'
  },
  {
    title: '3. Transacciones',
    description: 'Registra tus movimientos financieros',
    icon: ArrowUpDown,
    content: [
      '📝 Manual: Agrega transacciones una por una',
      '📁 CSV: Importa desde archivo',
      '🔄 Transferencias: Entre tus cuentas',
      '📅 Histórico: Consulta movimientos pasados'
    ],
    action: 'Ve a Transacciones para empezar'
  },
  {
    title: '4. Inversiones',
    description: 'Monitorea tu portafolio de inversión',
    icon: TrendingUp,
    content: [
      '📈 ETFs y Fondos: Diversificación',
      '🏢 Acciones: Empresas individuales',
      '💰 Rendimientos: Calcula ganancias',
      '📊 Analytics: Métricas de performance'
    ],
    action: 'Administra en sección Inversiones'
  },
  {
    title: '5. Criptomonedas',
    description: 'Gestiona tus activos digitales',
    icon: Coins,
    content: [
      '₿ Bitcoin, Ethereum y más',
      '💱 Precios en tiempo real',
      '📊 Portfolio tracking',
      '💰 ROI automático'
    ],
    action: 'Configura en Inversiones > Criptomonedas'
  },
  {
    title: '6. Importación',
    description: 'Acelera con datos existentes',
    icon: Upload,
    content: [
      '📄 Formato CSV estándar',
      '🔄 Mapeo automático de campos',
      '✅ Validación de datos',
      '⚡ Procesamiento masivo'
    ],
    action: 'Usa el importador en Transacciones'
  }
];

export const WelcomeGuide = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { hasSampleData } = useSampleData();

  if (!isVisible || !hasSampleData) return null;

  const currentGuide = guideSteps[currentStep];
  const Icon = currentGuide.icon;

  const nextStep = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950">
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-blue-900 dark:text-blue-100">
                Guía de Inicio Rápido
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Aprende a usar todas las funciones de tu gestor financiero
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          {guideSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'w-8 bg-blue-500' 
                  : index < currentStep 
                    ? 'w-4 bg-blue-300' 
                    : 'w-4 bg-blue-100 dark:bg-blue-800'
              }`}
            />
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              {currentGuide.title}
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              {currentGuide.description}
            </p>
            
            <div className="space-y-2 mb-4">
              {currentGuide.content.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <span>{item}</span>
                </div>
              ))}
            </div>
            
            <Badge variant="secondary" className="bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
              {currentGuide.action}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <span className="text-sm text-blue-600 dark:text-blue-400">
            {currentStep + 1} de {guideSteps.length}
          </span>
          
          <Button
            onClick={nextStep}
            disabled={currentStep === guideSteps.length - 1}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};