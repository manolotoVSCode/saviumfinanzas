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
import { useLanguage } from '@/contexts/LanguageContext';

export const WelcomeGuide = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { hasSampleData } = useSampleData();
  const { t } = useLanguage();

  if (!isVisible || !hasSampleData) return null;

  const guideSteps = [
    {
      title: t('guide.step1.title'),
      description: t('guide.step1.description'),
      icon: CreditCard,
      action: t('guide.step1.action')
    },
    {
      title: t('guide.step2.title'),
      description: t('guide.step2.description'),
      icon: PlusCircle,
      action: t('guide.step2.action')
    },
    {
      title: t('guide.step3.title'),
      description: t('guide.step3.description'),
      icon: ArrowUpDown,
      action: t('guide.step3.action')
    },
    {
      title: t('guide.step4.title'),
      description: t('guide.step4.description'),
      icon: TrendingUp,
      action: t('guide.step4.action')
    },
    {
      title: t('guide.step5.title'),
      description: t('guide.step5.description'),
      icon: Coins,
      action: t('guide.step5.action')
    },
    {
      title: t('guide.step6.title'),
      description: t('guide.step6.description'),
      icon: Upload,
      action: t('guide.step6.action')
    }
  ];

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
                {t('dashboard.quick_start')}
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                {t('dashboard.quick_start_description')}
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
            {t('guide.previous')}
          </Button>
          
          <span className="text-sm text-blue-600 dark:text-blue-400">
            {t('guide.step_count', { current: currentStep + 1, total: guideSteps.length })}
          </span>
          
          <Button
            onClick={nextStep}
            disabled={currentStep === guideSteps.length - 1}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {t('guide.next')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};