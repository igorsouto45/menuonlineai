import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Search, 
  Download, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  Loader2,
  FileSpreadsheet,
  Send,
  ShoppingBag,
  Filter,
  X,
  Sparkles,
  UserPlus,
  Repeat,
  UserMinus,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, subMonths, isAfter, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface Customer {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  created_at: string;
  order_count?: number;
  last_order_date?: string | null;
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';
type OrderFilter = 'all' | 'with_orders' | 'no_orders' | 'recent_orders';
type SegmentFilter = 'all' | 'new' | 'recurring' | 'inactive';

const PROMO_TEMPLATES = [
  {
    id: 'discount',
    name: '🎉 Desconto Especial',
    message: '🎉 Olá {nome}! Temos uma oferta especial para você!\n\n🔥 Use o cupom PROMO10 e ganhe 10% de desconto no seu próximo pedido!\n\n📱 Acesse nosso cardápio e peça agora!'
  },
  {
    id: 'freedelivery',
    name: '🚚 Frete Grátis',
    message: '🚚 Olá {nome}! Hoje é dia de FRETE GRÁTIS!\n\nFaça seu pedido agora e não pague taxa de entrega.\n\n⏰ Promoção válida apenas hoje!'
  },
  {
    id: 'comeback',
    name: '💜 Sentimos sua falta',
    message: '💜 Olá {nome}, sentimos sua falta!\n\nFaz tempo que você não nos visita. Que tal voltar com um desconto especial?\n\n🎁 Use VOLTEI15 e ganhe 15% OFF!'
  },
  {
    id: 'newproduct',
    name: '✨ Novidade no Cardápio',
    message: '✨ Novidade no cardápio, {nome}!\n\nAcabamos de lançar novos produtos incríveis. Venha conferir!\n\n🍕 Acesse agora e experimente!'
  },
  {
    id: 'weekend',
    name: '🎊 Promoção de Fim de Semana',
    message: '🎊 {nome}, o fim de semana chegou!\n\nE com ele, promoções especiais para você.\n\n🔥 Peça agora e aproveite!'
  },
];

export default function LeadsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [sendingPromo, setSendingPromo] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { restaurant } = useRestaurant();
  const { toast } = useToast();

  useEffect(() => {
    if (restaurant?.id) {
      loadCustomers();
    }
  }, [restaurant?.id]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, customers, dateFilter, orderFilter, startDate, endDate, segmentFilter]);

  const applyFilters = () => {
    let filtered = [...customers];

    // Text search filter
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.whatsapp.includes(searchTerm)
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(c => {
        const createdAt = parseISO(c.created_at);
        switch (dateFilter) {
          case 'today':
            return format(createdAt, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
          case 'week':
            return isAfter(createdAt, subDays(now, 7));
          case 'month':
            return isAfter(createdAt, subMonths(now, 1));
          case 'custom':
            if (startDate && endDate) {
              return isAfter(createdAt, parseISO(startDate)) && 
                     isBefore(createdAt, parseISO(endDate + 'T23:59:59'));
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Order filter
    if (orderFilter !== 'all') {
      filtered = filtered.filter(c => {
        switch (orderFilter) {
          case 'with_orders':
            return (c.order_count || 0) > 0;
          case 'no_orders':
            return (c.order_count || 0) === 0;
          case 'recent_orders':
            if (c.last_order_date) {
              return isAfter(parseISO(c.last_order_date), subDays(new Date(), 30));
            }
            return false;
          default:
            return true;
        }
      });
    }

    // Segment filter (automatic segmentation)
    if (segmentFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(c => {
        const createdAt = parseISO(c.created_at);
        const isNew = isAfter(createdAt, subDays(now, 7));
        const isRecurring = (c.order_count || 0) >= 2;
        const isInactive = c.last_order_date 
          ? isBefore(parseISO(c.last_order_date), subDays(now, 30))
          : (c.order_count || 0) === 0;
        
        switch (segmentFilter) {
          case 'new':
            return isNew;
          case 'recurring':
            return isRecurring;
          case 'inactive':
            return isInactive;
          default:
            return true;
        }
      });
    }

    setFilteredCustomers(filtered);
  };

  const loadCustomers = async () => {
    if (!restaurant?.id) return;
    
    setLoading(true);
    
    // Load customers
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (customersError) {
      toast({
        title: 'Erro ao carregar leads',
        description: customersError.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Load orders to get order counts per customer phone
    const { data: ordersData } = await supabase
      .from('orders')
      .select('customer_phone, created_at')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    // Calculate order counts and last order date per customer
    const orderStats: Record<string, { count: number; lastDate: string | null }> = {};
    ordersData?.forEach(order => {
      const phone = order.customer_phone?.replace(/\D/g, '');
      if (phone) {
        if (!orderStats[phone]) {
          orderStats[phone] = { count: 0, lastDate: null };
        }
        orderStats[phone].count++;
        if (!orderStats[phone].lastDate) {
          orderStats[phone].lastDate = order.created_at;
        }
      }
    });

    // Enrich customers with order data
    const enrichedCustomers = (customersData || []).map(c => {
      const phone = c.whatsapp?.replace(/\D/g, '');
      const stats = orderStats[phone] || { count: 0, lastDate: null };
      return {
        ...c,
        order_count: stats.count,
        last_order_date: stats.lastDate,
      };
    });

    setCustomers(enrichedCustomers);
    setFilteredCustomers(enrichedCustomers);
    setLoading(false);
  };

  const exportToExcel = () => {
    const data = filteredCustomers.map(c => ({
      Nome: c.name,
      Email: c.email,
      WhatsApp: c.whatsapp,
      Endereço: c.address || '',
      Bairro: c.neighborhood || '',
      Cidade: c.city || '',
      'Qtd Pedidos': c.order_count || 0,
      'Último Pedido': c.last_order_date 
        ? format(new Date(c.last_order_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
        : '-',
      'Data de Cadastro': format(new Date(c.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `leads_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: 'Exportação concluída',
      description: `${filteredCustomers.length} leads exportados com sucesso.`,
    });
  };

  const openWhatsApp = (whatsapp: string) => {
    const formattedNumber = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${formattedNumber}`, '_blank');
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev =>
      prev.includes(id)
        ? prev.filter(l => l !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredCustomers.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredCustomers.map(c => c.id));
    }
  };

  const clearFilters = () => {
    setDateFilter('all');
    setOrderFilter('all');
    setSegmentFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const hasActiveFilters = dateFilter !== 'all' || orderFilter !== 'all' || segmentFilter !== 'all' || searchTerm;

  const selectTemplate = (templateId: string) => {
    const template = PROMO_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setPromoMessage(template.message);
    }
  };

  // Get segment counts
  const segmentCounts = {
    new: customers.filter(c => isAfter(parseISO(c.created_at), subDays(new Date(), 7))).length,
    recurring: customers.filter(c => (c.order_count || 0) >= 2).length,
    inactive: customers.filter(c => {
      if (c.last_order_date) {
        return isBefore(parseISO(c.last_order_date), subDays(new Date(), 30));
      }
      return (c.order_count || 0) === 0;
    }).length,
  };

  const sendBulkPromotion = async () => {
    if (!promoMessage.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite uma mensagem para enviar.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedLeads.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um lead.',
        variant: 'destructive',
      });
      return;
    }

    setSendingPromo(true);

    const selectedCustomers = customers.filter(c => selectedLeads.includes(c.id));
    let successCount = 0;
    let errorCount = 0;

    for (const customer of selectedCustomers) {
      try {
        const response = await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            customerPhone: customer.whatsapp,
            status: 'promotion',
            customMessage: promoMessage,
            customerName: customer.name,
            evolutionApiUrl: restaurant?.evolution_api_url,
            evolutionApiKey: restaurant?.evolution_api_key,
            evolutionInstanceName: restaurant?.evolution_instance_name,
          },
        });

        if (response.error) {
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    setSendingPromo(false);
    setShowPromoModal(false);
    setPromoMessage('');
    setSelectedLeads([]);

    toast({
      title: 'Envio concluído',
      description: `${successCount} mensagens enviadas com sucesso${errorCount > 0 ? `, ${errorCount} falharam` : ''}.`,
      variant: errorCount > 0 ? 'default' : 'default',
    });
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
          <h1 className="text-2xl font-bold text-foreground">Lista de Leads</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes cadastrados para enviar promoções
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowPromoModal(true)} 
            disabled={selectedLeads.length === 0}
            variant="default"
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar Promoção ({selectedLeads.length})
          </Button>
          <Button onClick={exportToExcel} variant="outline" disabled={filteredCustomers.length === 0}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Pedidos</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => (c.order_count || 0) > 0).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com WhatsApp</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.whatsapp).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Endereço</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.address).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automatic Segmentation */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={segmentFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSegmentFilter('all')}
        >
          Todos
        </Button>
        <Button
          variant={segmentFilter === 'new' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSegmentFilter('new')}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Novos ({segmentCounts.new})
        </Button>
        <Button
          variant={segmentFilter === 'recurring' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSegmentFilter('recurring')}
          className="gap-2"
        >
          <Repeat className="w-4 h-4" />
          Recorrentes ({segmentCounts.recurring})
        </Button>
        <Button
          variant={segmentFilter === 'inactive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSegmentFilter('inactive')}
          className="gap-2"
        >
          <UserMinus className="w-4 h-4" />
          Inativos ({segmentCounts.inactive})
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Data de cadastro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Últimos 7 dias</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>

              {/* Order Filter */}
              <Select value={orderFilter} onValueChange={(v) => setOrderFilter(v as OrderFilter)}>
                <SelectTrigger className="w-[180px]">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Histórico de pedidos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os leads</SelectItem>
                  <SelectItem value="with_orders">Com pedidos</SelectItem>
                  <SelectItem value="no_orders">Sem pedidos</SelectItem>
                  <SelectItem value="recent_orders">Pediu recentemente</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Limpar filtros
                </Button>
              )}
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">De:</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Até:</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          Mostrando {filteredCustomers.length} de {customers.length} leads
        </div>
      )}

      {/* Table */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {hasActiveFilters ? 'Nenhum lead encontrado' : 'Nenhum lead ainda'}
            </h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {hasActiveFilters 
                ? 'Tente ajustar os filtros para encontrar leads.'
                : 'Quando clientes se cadastrarem no seu cardápio, eles aparecerão aqui.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedLeads.length === filteredCustomers.length && filteredCustomers.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Data Cadastro</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer, index) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.includes(customer.id)}
                        onCheckedChange={() => toggleSelectLead(customer.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{customer.name}</div>
                      {customer.address && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {customer.neighborhood}{customer.city && `, ${customer.city}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {customer.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {customer.whatsapp}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={(customer.order_count || 0) > 0 ? "default" : "secondary"}>
                          {customer.order_count || 0} pedidos
                        </Badge>
                        {customer.last_order_date && (
                          <div className="text-xs text-muted-foreground">
                            Último: {format(new Date(customer.last_order_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openWhatsApp(customer.whatsapp)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bulk Promotion Modal */}
      <Dialog open={showPromoModal} onOpenChange={setShowPromoModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enviar Promoção em Massa</DialogTitle>
            <DialogDescription>
              Envie uma mensagem promocional para {selectedLeads.length} leads selecionados via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Templates prontos
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROMO_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant={selectedTemplate === template.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => selectTemplate(template.id)}
                    className="justify-start text-left h-auto py-2"
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem da promoção</label>
              <Textarea
                placeholder="Ex: 🎉 Promoção especial! Ganhe 10% de desconto em todos os produtos hoje. Use o código PROMO10 no seu pedido!"
                value={promoMessage}
                onChange={(e) => {
                  setPromoMessage(e.target.value);
                  setSelectedTemplate('');
                }}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{nome}'} para personalizar com o nome do cliente
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>A mensagem será enviada para:</p>
              <ul className="mt-2 space-y-1">
                {customers
                  .filter(c => selectedLeads.includes(c.id))
                  .slice(0, 3)
                  .map(c => (
                    <li key={c.id} className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {c.name} ({c.whatsapp})
                    </li>
                  ))}
                {selectedLeads.length > 3 && (
                  <li className="text-muted-foreground">
                    ... e mais {selectedLeads.length - 3} leads
                  </li>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={sendBulkPromotion} disabled={sendingPromo || !promoMessage.trim()}>
              {sendingPromo ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar para {selectedLeads.length} leads
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
