import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

interface DateFilterProps {
  dateFilter: { start: Date; end: Date };
  onDateFilterChange: (filter: { start: Date; end: Date }) => void;
}

export const DateFilter = ({ dateFilter, onDateFilterChange }: DateFilterProps) => {
  const [startDate, setStartDate] = useState(dateFilter.start.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(dateFilter.end.toISOString().split('T')[0]);

  const handleApplyFilter = () => {
    onDateFilterChange({
      start: new Date(startDate),
      end: new Date(endDate)
    });
  };

  const setPresetFilter = (preset: 'thisMonth' | 'lastMonth' | 'thisYear' | 'last3Months') => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date();

    switch (preset) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last3Months':
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    onDateFilterChange({ start, end });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Filtro de Fechas</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => setPresetFilter('thisMonth')}>
              Este Mes
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPresetFilter('lastMonth')}>
              Mes Pasado
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPresetFilter('last3Months')}>
              3 Meses
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPresetFilter('thisYear')}>
              Este Año
            </Button>
          </div>

          <Button onClick={handleApplyFilter} className="w-full">
            Aplicar Filtro
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};