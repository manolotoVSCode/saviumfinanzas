import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExchangeRate {
  currency: string;
  rate: number;
  date: string;
  change?: number;
  symbol: string;
  name: string;
}

export const ExchangeRates = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchExchangeRates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Usaremos una API gratuita de tasas de cambio ya que Banxico requiere token
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/MXN');
      
      if (!response.ok) {
        throw new Error('Error al obtener las tasas de cambio');
      }
      
      const data = await response.json();
      
      // Convertir las tasas para mostrar cuántos pesos mexicanos equivalen a 1 USD y 1 EUR
      const exchangeRates: ExchangeRate[] = [
        {
          currency: 'MXN',
          rate: 1,
          date: data.date,
          symbol: '$',
          name: 'Peso Mexicano'
        },
        {
          currency: 'USD',
          rate: 1 / data.rates.USD, // Cuántos pesos por 1 dólar
          date: data.date,
          symbol: '$',
          name: 'Dólar Estadounidense'
        },
        {
          currency: 'EUR',
          rate: 1 / data.rates.EUR, // Cuántos pesos por 1 euro
          date: data.date,
          symbol: '€',
          name: 'Euro'
        }
      ];
      
      setRates(exchangeRates);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching exchange rates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  const formatRate = (rate: number, currency: string) => {
    if (currency === 'MXN') {
      return '1.00';
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(rate);
  };

  const formatLastUpdate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <Card className="border-success/20 hover:border-success/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Tasas de Cambio Actuales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 hover:border-destructive/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error en Tasas de Cambio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchExchangeRates}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-success/20 hover:border-success/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            Tasas de Cambio Actuales
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchExchangeRates}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Valores de mercado en tiempo real
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rates.map((rate) => (
            <div 
              key={rate.currency} 
              className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {rate.currency}
                  </Badge>
                  <span className="text-lg">{rate.symbol}</span>
                </div>
                {rate.change && (
                  <div className={`flex items-center gap-1 text-xs ${
                    rate.change > 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {rate.change > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(rate.change).toFixed(2)}%
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {rate.currency === 'MXN' ? (
                    'MXN 1.00'
                  ) : (
                    `MXN ${formatRate(rate.rate, rate.currency)}`
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {rate.currency === 'MXN' ? (
                    'Moneda base'
                  ) : (
                    `1 ${rate.currency} = ${formatRate(rate.rate, rate.currency)} MXN`
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {rate.name}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {lastUpdate && (
          <div className="pt-4 border-t text-xs text-muted-foreground text-center">
            Última actualización: {formatLastUpdate(lastUpdate)}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground text-center">
          Fuente: ExchangeRate-API • Datos de mercado en tiempo real
        </div>
      </CardContent>
    </Card>
  );
};