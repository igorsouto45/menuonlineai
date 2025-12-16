import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, GripVertical } from 'lucide-react';

interface DeliveryArea {
  id: string;
  name: string;
  fee: number;
  is_active: boolean;
  display_order: number;
}

interface DeliveryAreasManagerProps {
  restaurantId: string;
}

export function DeliveryAreasManager({ restaurantId }: DeliveryAreasManagerProps) {
  const { toast } = useToast();
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newArea, setNewArea] = useState({ name: '', fee: '' });

  useEffect(() => {
    fetchAreas();
  }, [restaurantId]);

  const fetchAreas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('delivery_areas')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching delivery areas:', error);
      toast({
        title: 'Erro ao carregar áreas',
        description: 'Não foi possível carregar as áreas de entrega.',
        variant: 'destructive',
      });
    } else {
      setAreas(data || []);
    }
    setLoading(false);
  };

  const addArea = async () => {
    if (!newArea.name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite o nome da área de entrega.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('delivery_areas')
      .insert({
        restaurant_id: restaurantId,
        name: newArea.name.trim(),
        fee: parseFloat(newArea.fee) || 0,
        display_order: areas.length,
      });

    if (error) {
      console.error('Error adding delivery area:', error);
      toast({
        title: 'Erro ao adicionar',
        description: 'Não foi possível adicionar a área de entrega.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Área adicionada!',
        description: `${newArea.name} foi adicionada com sucesso.`,
      });
      setNewArea({ name: '', fee: '' });
      fetchAreas();
    }
    setSaving(false);
  };

  const updateArea = async (id: string, updates: Partial<DeliveryArea>) => {
    const { error } = await supabase
      .from('delivery_areas')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating delivery area:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar a área de entrega.',
        variant: 'destructive',
      });
    } else {
      setAreas(areas.map(a => a.id === id ? { ...a, ...updates } : a));
    }
  };

  const deleteArea = async (id: string) => {
    const { error } = await supabase
      .from('delivery_areas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting delivery area:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a área de entrega.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Área excluída!',
        description: 'A área de entrega foi removida.',
      });
      fetchAreas();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add new area */}
      <div className="flex gap-2">
        <Input
          placeholder="Nome da área (ex: Centro)"
          value={newArea.name}
          onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
          className="flex-1"
        />
        <Input
          type="number"
          placeholder="Taxa (R$)"
          value={newArea.fee}
          onChange={(e) => setNewArea({ ...newArea, fee: e.target.value })}
          className="w-28"
          min="0"
          step="0.01"
        />
        <Button onClick={addArea} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      {/* Areas list */}
      {areas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma área de entrega cadastrada. Adicione áreas acima.
        </p>
      ) : (
        <div className="space-y-2">
          {areas.map((area) => (
            <Card key={area.id} className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  
                  <Input
                    value={area.name}
                    onChange={(e) => updateArea(area.id, { name: e.target.value })}
                    className="flex-1 h-8"
                  />
                  
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      value={area.fee}
                      onChange={(e) => updateArea(area.id, { fee: parseFloat(e.target.value) || 0 })}
                      className="w-20 h-8"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <Switch
                    checked={area.is_active}
                    onCheckedChange={(checked) => updateArea(area.id, { is_active: checked })}
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteArea(area.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
