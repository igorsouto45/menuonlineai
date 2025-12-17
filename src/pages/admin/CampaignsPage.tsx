import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
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
  BarChart3, 
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Send,
  Loader2,
  Eye,
  TrendingUp,
  MessageSquare,
  Filter,
  X,
  Ban,
  ShoppingCart,
  ArrowUpRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { format, isAfter, isBefore, parseISO, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Campaign {
  id: string;
  name: string;
  message: string;
  scheduled_at: string | null;
  sent_at: string | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  error_count: number;
  created_at: string;
  orders_after?: number;
  conversion_rate?: number;
}

interface CampaignSend {
  id: string;
  customer_phone: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

export default function CampaignsPage() {
  const { restaurant } = useRestaurant();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignSends, setCampaignSends] = useState<CampaignSend[]>([]);
  const [loadingSends, setLoadingSends] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant?.id) {
      loadCampaigns();
    }
  }, [restaurant?.id]);

  useEffect(() => {
    applyFilters();
  }, [campaigns, dateFilter, startDate, endDate]);

  const applyFilters = () => {
    let filtered = [...campaigns];

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(c => {
        const campaignDate = c.sent_at ? parseISO(c.sent_at) : parseISO(c.created_at);
        switch (dateFilter) {
          case 'today':
            return format(campaignDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
          case 'week':
            return isAfter(campaignDate, subDays(now, 7));
          case 'month':
            return isAfter(campaignDate, subMonths(now, 1));
          case 'custom':
            if (startDate && endDate) {
              return isAfter(campaignDate, startOfDay(parseISO(startDate))) && 
                     isBefore(campaignDate, endOfDay(parseISO(endDate)));
            }
            return true;
          default:
            return true;
        }
      });
    }

    setFilteredCampaigns(filtered);
  };

  const loadCampaigns = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load orders to calculate conversion rates
      const { data: ordersData } = await supabase
        .from('orders')
        .select('created_at, customer_phone')
        .eq('restaurant_id', restaurant.id);

      // Calculate conversion for each sent campaign
      const campaignsWithConversion = (data || []).map(campaign => {
        if (campaign.status === 'sent' && campaign.sent_at && campaign.sent_count > 0) {
          const sentDate = new Date(campaign.sent_at);
          const ordersAfter = (ordersData || []).filter(order => {
            const orderDate = new Date(order.created_at);
            // Orders within 48 hours after campaign sent
            return orderDate > sentDate && 
                   orderDate.getTime() - sentDate.getTime() < 48 * 60 * 60 * 1000;
          }).length;
          
          return {
            ...campaign,
            orders_after: ordersAfter,
            conversion_rate: (ordersAfter / campaign.sent_count) * 100
          };
        }
        return campaign;
      });

      setCampaigns(campaignsWithConversion);
      setFilteredCampaigns(campaignsWithConversion);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignSends = async (campaignId: string) => {
    setLoadingSends(true);
    try {
      const { data, error } = await supabase
        .from('promotion_sends')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaignSends(data || []);
    } catch (error) {
      console.error('Error loading campaign sends:', error);
    } finally {
      setLoadingSends(false);
    }
  };

  const handleViewDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    loadCampaignSends(campaign.id);
  };

  const cancelCampaign = async (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCancellingId(campaignId);
    
    try {
      const { error } = await supabase
        .from('promotion_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: 'Campanha cancelada',
        description: 'A campanha agendada foi cancelada com sucesso.',
      });

      // Update local state
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId ? { ...c, status: 'cancelled' } : c
      ));
      setFilteredCampaigns(prev => prev.map(c => 
        c.id === campaignId ? { ...c, status: 'cancelled' } : c
      ));
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar a campanha.',
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const clearFilters = () => {
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = dateFilter !== 'all';

  // Calculate metrics from filtered campaigns
  const totalCampaigns = filteredCampaigns.length;
  const totalSent = filteredCampaigns.reduce((acc, c) => acc + c.sent_count, 0);
  const totalErrors = filteredCampaigns.reduce((acc, c) => acc + c.error_count, 0);
  const successRate = totalSent > 0 ? ((totalSent - totalErrors) / totalSent * 100).toFixed(1) : '0';
  const totalConversions = filteredCampaigns.reduce((acc, c) => acc + (c.orders_after || 0), 0);
  const avgConversionRate = filteredCampaigns.filter(c => c.conversion_rate !== undefined).length > 0
    ? (filteredCampaigns.reduce((acc, c) => acc + (c.conversion_rate || 0), 0) / 
       filteredCampaigns.filter(c => c.conversion_rate !== undefined).length).toFixed(1)
    : '0';

  // Chart data for last 7 campaigns
  const chartData = filteredCampaigns.slice(0, 7).reverse().map(c => ({
    name: c.name.substring(0, 10) + (c.name.length > 10 ? '...' : ''),
    enviados: c.sent_count,
    erros: c.error_count,
    conversoes: c.orders_after || 0,
  }));

  // Pie chart data for selected campaign
  const getPieData = (campaign: Campaign) => [
    { name: 'Enviados', value: campaign.sent_count - campaign.error_count },
    { name: 'Erros', value: campaign.error_count },
    { name: 'Pendentes', value: campaign.total_recipients - campaign.sent_count },
  ].filter(d => d.value > 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-success/20 text-success border-success/30">Enviada</Badge>;
      case 'scheduled':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Agendada</Badge>;
      case 'sending':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Enviando</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Cancelada</Badge>;
      case 'draft':
        return <Badge variant="secondary">Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Histórico de Campanhas</h1>
        <p className="text-muted-foreground">Visualize métricas detalhadas das suas campanhas de WhatsApp</p>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar por período:</span>
            </div>
            
            <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === 'custom' && (
              <>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Data início</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Data fim</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
              </>
            )}

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Campanhas</p>
                  <p className="text-3xl font-bold text-foreground">{totalCampaigns}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                  <p className="text-3xl font-bold text-foreground">{totalSent}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Send className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                  <p className="text-3xl font-bold text-foreground">{successRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos Gerados</p>
                  <p className="text-3xl font-bold text-foreground">{totalConversions}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                  <p className="text-3xl font-bold text-foreground">{avgConversionRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Desempenho das Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="enviados" fill="hsl(var(--primary))" name="Enviados" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="conversoes" fill="hsl(var(--accent))" name="Conversões" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="erros" fill="hsl(var(--destructive))" name="Erros" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma campanha encontrada</p>
              <p className="text-sm">{campaigns.length > 0 ? 'Tente ajustar os filtros' : 'Crie sua primeira campanha na página de Leads'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Destinatários</TableHead>
                  <TableHead className="text-center">Enviados</TableHead>
                  <TableHead className="text-center">Conversões</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(campaign)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{campaign.message}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {campaign.total_recipients}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        {campaign.sent_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {campaign.conversion_rate !== undefined ? (
                        <div className="flex items-center justify-center gap-1 text-accent">
                          <ShoppingCart className="w-4 h-4" />
                          {campaign.orders_after} ({campaign.conversion_rate.toFixed(1)}%)
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {campaign.sent_at 
                          ? format(new Date(campaign.sent_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : campaign.scheduled_at
                            ? format(new Date(campaign.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : format(new Date(campaign.created_at), 'dd/MM/yyyy', { locale: ptBR })
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {campaign.status === 'scheduled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => cancelCampaign(campaign.id, e)}
                            disabled={cancellingId === campaign.id}
                            title="Cancelar campanha"
                          >
                            {cancellingId === campaign.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Ban className="w-4 h-4 text-destructive" />
                            )}
                          </Button>
                        )}
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Campaign Details Modal */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Detalhes da Campanha
            </DialogTitle>
          </DialogHeader>

          {selectedCampaign && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">{selectedCampaign.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedCampaign.message}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{selectedCampaign.total_recipients}</p>
                  <p className="text-xs text-muted-foreground">Destinatários</p>
                </div>
                <div className="text-center p-4 bg-success/10 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-success" />
                  <p className="text-2xl font-bold text-success">{selectedCampaign.sent_count}</p>
                  <p className="text-xs text-muted-foreground">Enviados</p>
                </div>
                <div className="text-center p-4 bg-accent/10 rounded-lg">
                  <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold text-accent">{selectedCampaign.orders_after || 0}</p>
                  <p className="text-xs text-muted-foreground">Pedidos Gerados</p>
                </div>
                <div className="text-center p-4 bg-warning/10 rounded-lg">
                  <ArrowUpRight className="w-6 h-6 mx-auto mb-2 text-warning" />
                  <p className="text-2xl font-bold text-warning">
                    {selectedCampaign.conversion_rate?.toFixed(1) || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                </div>
              </div>

              {/* Pie Chart */}
              {selectedCampaign.total_recipients > 0 && (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getPieData(selectedCampaign)}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {getPieData(selectedCampaign).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Sends List */}
              <div>
                <h4 className="font-semibold mb-3">Detalhes de Envio</h4>
                {loadingSends ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : campaignSends.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum envio registrado
                  </p>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {campaignSends.map((send) => (
                      <div key={send.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-mono">{send.customer_phone}</span>
                        {send.status === 'sent' ? (
                          <Badge className="bg-success/20 text-success border-success/30">Enviado</Badge>
                        ) : send.status === 'error' ? (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/30">Erro</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
