import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bike, CheckCircle2, Loader2, MapPin, Search, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryOrder {
  id: string;
  restaurant_id: string;
  customer_name: string | null;
  customer_address: string | null;
  total: number;
  status: string;
  created_at: string;
  restaurant_name: string | null;
}

export default function DeliveryConfirmPage() {
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const cleanCode = code.replace(/\D/g, '').slice(0, 4);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cleanCode.length !== 4) {
      toast.error('Digite o código de 4 dígitos do pedido.');
      return;
    }

    setLoading(true);
    setNotFound(false);
    setOrder(null);

    try {
      const { data, error } = await supabase.rpc('get_order_by_delivery_code', { _code: cleanCode });
      if (error) throw error;

      const found = Array.isArray(data) ? data[0] : data;
      if (!found) {
        setNotFound(true);
        return;
      }
      setOrder(found as DeliveryOrder);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível buscar o pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const { data, error } = await supabase.rpc('confirm_delivery_by_code', { _code: cleanCode });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      if (result?.success) {
        setDone(true);
        toast.success('Entrega confirmada! O restaurante já foi avisado.');
      } else {
        toast.error(result?.message || 'Não foi possível confirmar a entrega.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao confirmar a entrega. Tente novamente.');
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setCode('');
    setOrder(null);
    setDone(false);
    setNotFound(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bike className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Confirmar entrega</h1>
          <p className="mt-1 text-muted-foreground">
            Digite o código de 4 dígitos que está no pedido
          </p>
        </div>

        {done ? (
          <Card>
            <CardContent className="space-y-4 pt-6 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
              <p className="text-lg font-semibold">Entrega confirmada!</p>
              <p className="text-sm text-muted-foreground">
                O pedido foi marcado como entregue no painel do restaurante.
              </p>
              <Button onClick={reset} className="w-full gap-2">
                <RotateCcw className="h-4 w-4" />
                Confirmar outra entrega
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSearch} className="space-y-4">
                  <Input
                    inputMode="numeric"
                    autoFocus
                    placeholder="0000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="h-16 text-center text-3xl font-bold tracking-[0.5em]"
                  />
                  <Button type="submit" className="w-full gap-2" disabled={loading || cleanCode.length !== 4}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Buscar pedido
                  </Button>
                </form>
              </CardContent>
            </Card>

            {notFound && (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardContent className="pt-6 text-center text-sm text-destructive">
                  Código inválido, ou o pedido ainda não está pronto / já foi finalizado.
                </CardContent>
              </Card>
            )}

            {order && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>#{order.id.slice(0, 8).toUpperCase()}</span>
                    <Badge variant="outline">
                      {order.status === 'out_for_delivery' ? 'Saiu para entrega' : 'Pronto'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.restaurant_name && (
                    <p className="text-sm text-muted-foreground">{order.restaurant_name}</p>
                  )}
                  {order.customer_name && <p className="font-medium">{order.customer_name}</p>}
                  {order.customer_address && (
                    <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {order.customer_address}
                    </p>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-bold text-primary">
                      R$ {Number(order.total).toFixed(2)}
                    </span>
                  </div>
                  <Button onClick={handleConfirm} disabled={confirming} className="w-full gap-2" size="lg">
                    {confirming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Dar baixa como entregue
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
