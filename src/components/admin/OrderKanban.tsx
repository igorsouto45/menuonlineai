import { useState } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  Truck, 
  XCircle,
  Phone,
  MapPin,
  Printer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { printOrder } from '@/lib/thermalPrinter';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderStatus = Database['public']['Enums']['order_status'];

const columns: { id: OrderStatus; title: string; icon: React.ElementType; color: string }[] = [
  { id: 'pending', title: 'Pendentes', icon: Clock, color: 'bg-warning/20 text-warning border-warning/30' },
  { id: 'confirmed', title: 'Confirmados', icon: CheckCircle2, color: 'bg-primary/20 text-primary border-primary/30' },
  { id: 'preparing', title: 'Preparando', icon: ChefHat, color: 'bg-accent/20 text-accent border-accent/30' },
  { id: 'ready', title: 'Prontos', icon: CheckCircle2, color: 'bg-success/20 text-success border-success/30' },
  { id: 'delivered', title: 'Entregues', icon: Truck, color: 'bg-success/20 text-success border-success/30' },
];

interface OrderKanbanProps {
  orders: Order[];
  restaurantName?: string;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
}

function OrderCard({ order, isDragging, restaurantName }: { order: Order; isDragging?: boolean; restaurantName?: string }) {
  const items = (order.items as Array<{ name: string; quantity: number; price: number }>) || [];

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    printOrder(order, restaurantName);
  };

  return (
    <div 
      className={`bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : 'hover:border-primary/30'}
        transition-all duration-200`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
          {order.table_number && (
            <Badge className="bg-primary hover:bg-primary/90 text-[10px] h-5 px-1.5 uppercase font-bold">
              Mesa {order.table_number}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handlePrint}>
          <Printer className="w-3 h-3" />
        </Button>
      </div>

      {order.customer_name && (
        <p className="text-sm font-medium text-foreground mb-1">{order.customer_name}</p>
      )}

      {order.customer_phone && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Phone className="w-3 h-3" />
          {order.customer_phone}
        </div>
      )}

      {order.customer_address && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="w-3 h-3" />
          <span className="line-clamp-1">{order.customer_address}</span>
        </div>
      )}

      <div className="space-y-1 mb-2">
        {items.slice(0, 3).map((item, i) => (
          <p key={i} className="text-xs text-muted-foreground">
            {item.quantity}x {item.name}
          </p>
        ))}
        {items.length > 3 && (
          <p className="text-xs text-muted-foreground">+{items.length - 3} itens</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-primary">
          R$ {Number(order.total).toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function DroppableColumn({ 
  column, 
  orders 
}: { 
  column: typeof columns[0]; 
  orders: Order[];
}) {
  const Icon = column.icon;

  return (
    <div 
      data-status={column.id}
      className={`flex-1 min-w-[250px] bg-secondary/30 rounded-xl p-3 border-2 border-dashed ${column.color.split(' ')[2] || 'border-border'}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${column.color.split(' ').slice(0, 2).join(' ')}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-foreground">{column.title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {orders.length}
        </Badge>
      </div>

      <div className="space-y-2 min-h-[200px]">
        {orders.map((order) => (
          <div key={order.id} data-order-id={order.id}>
            <OrderCard order={order} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderKanban({ orders, restaurantName, onStatusChange }: OrderKanbanProps) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const orderId = event.active.id as string;
    const order = orders.find(o => o.id === orderId);
    setActiveOrder(order || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as OrderStatus;
    const order = orders.find(o => o.id === orderId);

    if (!order || order.status === newStatus) return;

    // Update in database
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Status atualizado',
        description: `Pedido movido para ${columns.find(c => c.id === newStatus)?.title.toLowerCase()}.`,
      });
      onStatusChange?.(orderId, newStatus);
    }
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter(o => o.status === status);
  };

  // Filter out cancelled orders from kanban
  const activeOrders = orders.filter(o => o.status !== 'cancelled');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  return (
    <div className="space-y-6">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div key={column.id} id={column.id}>
              <DroppableColumn
                column={column}
                orders={getOrdersByStatus(column.id)}
              />
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeOrder && <OrderCard order={activeOrder} isDragging restaurantName={restaurantName} />}
        </DragOverlay>
      </DndContext>

      {/* Cancelled Orders */}
      {cancelledOrders.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-destructive flex items-center gap-2 text-lg">
              <XCircle className="w-5 h-5" />
              Pedidos Cancelados ({cancelledOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cancelledOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="opacity-60">
                  <OrderCard order={order} restaurantName={restaurantName} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
