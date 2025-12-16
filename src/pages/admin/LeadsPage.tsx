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
import { 
  Users, 
  Search, 
  Download, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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
}

export default function LeadsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { restaurant } = useRestaurant();
  const { toast } = useToast();

  useEffect(() => {
    if (restaurant?.id) {
      loadCustomers();
    }
  }, [restaurant?.id]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.whatsapp.includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const loadCustomers = async () => {
    if (!restaurant?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar leads',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    }
    setLoading(false);
  };

  const exportToExcel = () => {
    const data = customers.map(c => ({
      Nome: c.name,
      Email: c.email,
      WhatsApp: c.whatsapp,
      Endereço: c.address || '',
      Bairro: c.neighborhood || '',
      Cidade: c.city || '',
      'Data de Cadastro': format(new Date(c.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `leads_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: 'Exportação concluída',
      description: `${customers.length} leads exportados com sucesso.`,
    });
  };

  const openWhatsApp = (whatsapp: string) => {
    const formattedNumber = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${formattedNumber}`, '_blank');
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
        <Button onClick={exportToExcel} disabled={customers.length === 0}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? 'Nenhum lead encontrado' : 'Nenhum lead ainda'}
            </h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {searchTerm 
                ? 'Tente buscar com outros termos.'
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Data</TableHead>
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
                      <div className="font-medium text-foreground">{customer.name}</div>
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
                      {customer.address ? (
                        <div className="text-sm text-muted-foreground">
                          <div>{customer.address}</div>
                          {customer.neighborhood && (
                            <div>{customer.neighborhood}{customer.city && `, ${customer.city}`}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
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
    </div>
  );
}
