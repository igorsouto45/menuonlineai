import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChefHat,
  Truck,
  Phone,
  MapPin,
  MessageSquare,
  Loader2,
  Filter,
  LayoutGrid,
  List,
  Printer
} from 'lucide-react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { printOrder } from '@/lib/thermalPrinter';
import type { Database } from '@/integrations/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderStatus = Database['public']['Enums']['order_status'];

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-warning/20 text-warning' },
  confirmed: { label: 'Confirmado', icon: CheckCircle2, color: 'bg-primary/20 text-primary' },
  preparing: { label: 'Preparando', icon: ChefHat, color: 'bg-accent/20 text-accent' },
  ready: { label: 'Pronto', icon: CheckCircle2, color: 'bg-success/20 text-success' },
  out_for_delivery: { label: 'Saiu p/ Entrega', icon: Truck, color: 'bg-info/20 text-info' },
  delivered: { label: 'Entregue', icon: CheckCircle2, color: 'bg-success/20 text-success' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'bg-destructive/20 text-destructive' },
};

const kanbanColumns: { id: OrderStatus; title: string; color: string }[] = [
  { id: 'pending', title: 'Pendentes', color: 'border-warning/50 bg-warning/5' },
  { id: 'confirmed', title: 'Confirmados', color: 'border-primary/50 bg-primary/5' },
  { id: 'preparing', title: 'Preparando', color: 'border-accent/50 bg-accent/5' },
  { id: 'ready', title: 'Prontos', color: 'border-success/50 bg-success/5' },
  { id: 'out_for_delivery', title: 'Saiu p/ Entrega', color: 'border-info/50 bg-info/5' },
  { id: 'delivered', title: 'Entregues', color: 'border-success/50 bg-success/5' },
];

const filterOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Prontos' },
  { value: 'out_for_delivery', label: 'Saiu p/ Entrega' },
  { value: 'delivered', label: 'Entregues' },
  { value: 'cancelled', label: 'Cancelados' },
];

// Draggable Order Card Component
function DraggableOrderCard({ order, restaurantName }: { order: Order; restaurantName?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
  } : undefined;

  const items = (order.items as Array<{ name: string; quantity: number; price: number }>) || [];

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    printOrder(order, restaurantName);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary z-50' : 'hover:border-primary/30'}
        transition-all duration-200`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">
          #{order.id.slice(0, 8).toUpperCase()}
        </span>
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

      <div className="space-y-1 mb-2">
        {items.slice(0, 2).map((item, i) => (
          <p key={i} className="text-xs text-muted-foreground">
            {item.quantity}x {item.name}
          </p>
        ))}
        {items.length > 2 && (
          <p className="text-xs text-muted-foreground">+{items.length - 2} itens</p>
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

// Droppable Column Component
function DroppableColumn({ 
  column, 
  orders,
  restaurantName 
}: { 
  column: typeof kanbanColumns[0]; 
  orders: Order[];
  restaurantName?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex-1 min-w-[220px] rounded-xl p-3 border-2 border-dashed transition-colors
        ${column.color} ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{column.title}</h3>
        <Badge variant="secondary">
          {orders.length}
        </Badge>
      </div>

      <div className="space-y-2 min-h-[200px]">
        {orders.map((order) => (
          <DraggableOrderCard key={order.id} order={order} restaurantName={restaurantName} />
        ))}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { restaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const { toast } = useToast();
  const { playNotification } = useNotificationSound();
  const { permission, requestPermission, showNotification, isSupported } = useBrowserNotification();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Request notification permission on mount
  useEffect(() => {
    if (isSupported && permission === 'default') {
      requestPermission();
    }
  }, [isSupported, permission, requestPermission]);

  useEffect(() => {
    if (!restaurant?.id) return;

    const fetchOrders = async () => {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Erro ao carregar pedidos', variant: 'destructive' });
      } else {
        setOrders(ordersData || []);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [restaurant?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            setOrders(prev => [newOrder, ...prev]);
            
            // Play notification sound
            playNotification();
            
            // Show toast notification
            toast({
              title: '🔔 Novo pedido!',
              description: `Pedido de ${newOrder.customer_name || 'Cliente'} - R$ ${Number(newOrder.total).toFixed(2)}`,
            });
            
            // Show browser push notification
            showNotification('🔔 Novo Pedido!', {
              body: `${newOrder.customer_name || 'Cliente'} - R$ ${Number(newOrder.total).toFixed(2)}`,
              tag: `order-${newOrder.id}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => 
              prev.map(o => o.id === payload.new.id ? payload.new as Order : o)
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, toast, playNotification, showNotification]);

  const sendWhatsAppNotification = async (order: Order, newStatus: OrderStatus) => {
    if (!order.customer_phone) return;

    // Get Evolution API credentials from restaurant
    const evolutionApiUrl = (restaurant as any)?.evolution_api_url;
    const evolutionApiKey = (restaurant as any)?.evolution_api_key;
    const evolutionInstanceName = (restaurant as any)?.evolution_instance_name;

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
      console.log('Evolution API not configured for this restaurant');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          orderId: order.id,
          customerPhone: order.customer_phone,
          customerName: order.customer_name,
          status: newStatus,
          restaurantName: restaurant?.name,
          orderTotal: order.total,
          evolutionApiUrl,
          evolutionApiKey,
          evolutionInstanceName,
        },
      });

      if (error) {
        throw error;
      }

      console.log('WhatsApp notification sent');
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    
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
        description: `Pedido marcado como ${statusConfig[newStatus].label.toLowerCase()}.`,
      });
      
      // Send WhatsApp notification
      if (order) {
        sendWhatsAppNotification(order, newStatus);
      }
    }
  };

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

    await updateOrderStatus(orderId, newStatus);
  };

  const getNextStatus = (currentStatus: OrderStatus | null): OrderStatus | null => {
    const statusFlow: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    if (!currentStatus) return 'confirmed';
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= statusFlow.length - 1) return null;
    return statusFlow[currentIndex + 1];
  };

  const formatItems = (items: unknown) => {
    if (!items || !Array.isArray(items)) return [];
    return items as Array<{ name: string; quantity: number; price: number }>;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const orderCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    out_for_delivery: orders.filter(o => o.status === 'out_for_delivery').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter(o => o.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground mt-1">Arraste os pedidos para atualizar o status</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            Kanban
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-1" />
            Lista
          </Button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        /* Kanban View */
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                orders={getOrdersByStatus(column.id)}
                restaurantName={restaurant?.name}
              />
            ))}
          </div>

          <DragOverlay>
            {activeOrder && (
              <div className="bg-card border-2 border-primary rounded-lg p-3 shadow-xl opacity-90">
                <span className="font-semibold text-sm">
                  #{activeOrder.id.slice(0, 8).toUpperCase()}
                </span>
                <p className="text-sm">{activeOrder.customer_name}</p>
                <p className="text-sm font-bold text-primary">
                  R$ {Number(activeOrder.total).toFixed(2)}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        /* List View */
        <>
          {/* Status Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(option.value)}
                className={statusFilter === option.value ? 'gradient-primary text-primary-foreground' : ''}
              >
                {option.label}
                {orderCounts[option.value as keyof typeof orderCounts] > 0 && (
                  <Badge 
                    variant="secondary" 
                    className={`ml-2 ${statusFilter === option.value ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted'}`}
                  >
                    {orderCounts[option.value as keyof typeof orderCounts]}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <Card className="border-dashed border-2 border-border">
              <CardContent className="p-12 text-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {statusFilter === 'all' ? 'Nenhum pedido ainda' : `Nenhum pedido ${filterOptions.find(f => f.value === statusFilter)?.label.toLowerCase()}`}
                </h3>
                <p className="text-muted-foreground">
                  Os pedidos dos seus clientes aparecerão aqui em tempo real.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredOrders.map((order, index) => {
                const status = order.status || 'pending';
                const StatusIcon = statusConfig[status].icon;
                const nextStatus = getNextStatus(status);
                const items = formatItems(order.items);

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                  >
                    <Card className="border-border hover:border-primary/20 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-lg">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </CardTitle>
                            <Badge className={`${statusConfig[status].color} border-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig[status].label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => printOrder(order, restaurant?.name)}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(order.created_at)}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Customer Info */}
                        <div className="grid sm:grid-cols-3 gap-3 text-sm">
                          {order.customer_name && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{order.customer_name}</span>
                            </div>
                          )}
                          {order.customer_phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-4 h-4" />
                              {order.customer_phone}
                            </div>
                          )}
                          {order.customer_address && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span className="line-clamp-1">{order.customer_address}</span>
                            </div>
                          )}
                        </div>

                        {/* Items */}
                        <div className="bg-secondary rounded-xl p-4">
                          <div className="space-y-2">
                            {items.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-foreground">{item.quantity}x {item.name}</span>
                                <span className="text-muted-foreground">
                                  R$ {(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-border mt-3 pt-3 flex justify-between font-semibold">
                            <span className="text-foreground">Total</span>
                            <span className="text-primary">R$ {Number(order.total).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{order.notes}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {nextStatus && status !== 'cancelled' && (
                            <Button 
                              variant="hero" 
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, nextStatus)}
                            >
                              Marcar como {statusConfig[nextStatus].label.toLowerCase()}
                            </Button>
                          )}
                          {status !== 'cancelled' && status !== 'delivered' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              className="text-destructive hover:text-destructive"
                            >
                              Cancelar pedido
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Cancelled Orders */}
      {viewMode === 'kanban' && orderCounts.cancelled > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-destructive flex items-center gap-2 text-lg">
              <XCircle className="w-5 h-5" />
              Pedidos Cancelados ({orderCounts.cancelled})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {orders.filter(o => o.status === 'cancelled').slice(0, 4).map((order) => (
                <div key={order.id} className="opacity-60 bg-card border border-border rounded-lg p-3">
                  <span className="font-semibold text-sm">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <p className="text-sm">{order.customer_name}</p>
                  <p className="text-sm font-bold">R$ {Number(order.total).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
