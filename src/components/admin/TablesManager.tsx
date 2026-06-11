import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table as TableIcon,
  Plus,
  Trash2,
  QrCode,
  Download,
  Loader2,
  ExternalLink,
  FileText,
  Crown,
  Store
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QRCodeSVG } from 'qrcode.react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateTablesQrPdf, type QrLayout } from '@/lib/tableQrPdf';

interface RestaurantTable {
  id: string;
  table_number: string;
  is_active: boolean;
  status: 'free' | 'occupied' | 'reserved';
}

const layoutOptions: { value: QrLayout; label: string; description: string; icon: any }[] = [
  { value: 'standard', label: 'Padrão', description: 'Layout balanceado para a maioria das mesas', icon: TableIcon },
  { value: 'large', label: 'Grande', description: 'QR maior, ideal para mesas afastadas', icon: QrCode },
  { value: 'counter', label: 'Balcão', description: 'Foco em peça e retire', icon: Store },
  { value: 'vip', label: 'VIP', description: 'Acabamento dourado e decorativo', icon: Crown },
];

export function TablesManager({ restaurantId, restaurantSlug, restaurantName }: { restaurantId: string; restaurantSlug: string; restaurantName?: string }) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [qrLayout, setQrLayout] = useState<QrLayout>('standard');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTables();
  }, [restaurantId]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('table_number');

      if (error) throw error;
      setTables((data || []) as RestaurantTable[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar mesas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    if (!newTableNumber.trim()) return;

    try {
      setAdding(true);
      const { data, error } = await supabase
        .from('restaurant_tables')
        .insert([{ 
          restaurant_id: restaurantId, 
          table_number: newTableNumber.trim() 
        }])
        .select()
        .single();

      if (error) throw error;

      setTables([...tables, data as RestaurantTable].sort((a, b) => a.table_number.localeCompare(b.table_number)));
      setNewTableNumber('');
      toast({
        title: "Mesa adicionada",
        description: `Mesa ${newTableNumber} criada com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar mesa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleStatusChange = async (tableId: string, newStatus: 'free' | 'occupied' | 'reserved') => {
    try {
      setUpdating(tableId);
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ status: newStatus })
        .eq('id', tableId);

      if (error) throw error;

      setTables(tables.map(t => t.id === tableId ? { ...t, status: newStatus } : t));
      toast({
        title: "Status atualizado",
        description: `Mesa marcada como ${
          newStatus === 'free' ? 'livre' : newStatus === 'occupied' ? 'ocupada' : 'reservada'
        }.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteTable = async (id: string, number: string) => {
    if (!confirm(`Tem certeza que deseja excluir a mesa ${number}?`)) return;

    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTables(tables.filter(t => t.id !== id));
      toast({
        title: "Mesa excluída",
        description: `Mesa ${number} removida com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir mesa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTableUrl = (tableNumber: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/r/${restaurantSlug}?table=${encodeURIComponent(tableNumber)}`;
  };

  const handleGeneratePdf = async () => {
    if (tables.length === 0) {
      toast({ title: 'Nenhuma mesa', description: 'Adicione mesas para gerar o PDF.', variant: 'destructive' });
      return;
    }
    setGeneratingPdf(true);
    try {
      // Small wait so React renders the QR SVGs with current layout in the DOM
      await new Promise((r) => setTimeout(r, 50));
      await generateTablesQrPdf({
        restaurantName: restaurantName || 'Cardápio Digital',
        tables: tables.map(t => ({ tableNumber: t.table_number, url: getTableUrl(t.table_number) })),
        layout: qrLayout,
        getSvgElement: (n) => document.getElementById(`qr-${n}`) as unknown as SVGElement | null,
      });
      toast({ title: 'PDF gerado!', description: `${tables.length} mesa(s) prontas para impressão.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao gerar PDF', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setGeneratingPdf(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="w-5 h-5" />
            Gerenciar Mesas
          </CardTitle>
          <CardDescription>
            Adicione as mesas do seu estabelecimento para que os clientes possam fazer pedidos via QR Code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Número ou nome da mesa (ex: 01, VIP, Balcão)"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTable()}
            />
            <Button onClick={handleAddTable} disabled={adding || !newTableNumber.trim()}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Adicionar
            </Button>
          </div>

          {/* Layout selector + PDF button */}
          {tables.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 mb-6 p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">Layout do QR Code</label>
                <Select value={qrLayout} onValueChange={(v) => setQrLayout(v as QrLayout)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {layoutOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" />
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">— {opt.description}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleGeneratePdf}
                  disabled={generatingPdf}
                  className="w-full sm:w-auto"
                >
                  {generatingPdf
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <FileText className="w-4 h-4 mr-2" />}
                  Baixar PDF ({tables.length} mesa{tables.length === 1 ? '' : 's'})
                </Button>
              </div>
            </div>
          )}


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <div 
                key={table.id} 
                className="flex flex-col p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors gap-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-primary font-bold ${
                      table.status === 'free' ? 'bg-success/10 text-success' : 
                      table.status === 'occupied' ? 'bg-destructive/10 text-destructive' : 
                      'bg-warning/10 text-warning'
                    }`}>
                      {table.table_number}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-lg leading-none">Mesa {table.table_number}</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        {table.status === 'free' ? 'Livre' : table.status === 'occupied' ? 'Ocupada' : 'Reservada'}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteTable(table.id, table.table_number)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Select
                    value={table.status}
                    onValueChange={(value: any) => handleStatusChange(table.id, value)}
                    disabled={updating === table.id}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Livre</SelectItem>
                      <SelectItem value="occupied">Ocupada</SelectItem>
                      <SelectItem value="reserved">Reservada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div
                  className={`flex flex-col items-center p-4 rounded-lg ${
                    qrLayout === 'vip'
                      ? 'bg-white border-2 border-yellow-500/60 shadow-lg shadow-yellow-500/10'
                      : qrLayout === 'counter'
                      ? 'bg-white border-2 border-foreground/30'
                      : 'bg-white border border-border'
                  }`}
                >
                  {qrLayout === 'vip' && (
                    <Badge className="mb-2 bg-yellow-500 hover:bg-yellow-600 text-white text-[10px]">
                      <Crown className="w-3 h-3 mr-1" /> ÁREA VIP
                    </Badge>
                  )}
                  {qrLayout === 'counter' && (
                    <Badge variant="outline" className="mb-2 text-[10px] border-foreground/40">
                      PEÇA E RETIRE
                    </Badge>
                  )}
                  <div
                    className={`font-extrabold leading-none mb-2 ${
                      qrLayout === 'large' ? 'text-4xl' : qrLayout === 'vip' ? 'text-3xl text-yellow-600' : 'text-2xl'
                    } ${qrLayout !== 'vip' ? 'text-primary' : ''}`}
                  >
                    {qrLayout === 'vip' ? 'VIP' : qrLayout === 'counter' ? 'Balcão' : 'Mesa'} {table.table_number}
                  </div>
                  <QRCodeSVG
                    id={`qr-${table.table_number}`}
                    value={getTableUrl(table.table_number)}
                    size={qrLayout === 'large' ? 200 : 160}
                    level="H"
                    includeMargin={true}
                    fgColor={qrLayout === 'vip' ? '#a16207' : '#000000'}
                  />
                  <p className="text-[10px] text-muted-foreground mt-2 break-all text-center">
                    {getTableUrl(table.table_number)}
                  </p>
                </div>


                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-xs" 
                    onClick={() => window.open(getTableUrl(table.table_number), '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Testar
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 text-xs"
                    onClick={() => {
                      const svg = document.getElementById(`qr-${table.table_number}`);
                      if (svg) {
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        const img = new Image();
                        img.onload = () => {
                          canvas.width = 1000; // High res
                          canvas.height = 1000;
                          // Draw background
                          ctx!.fillStyle = "white";
                          ctx!.fillRect(0, 0, canvas.width, canvas.height);
                          // Scale image to fit
                          ctx?.drawImage(img, 0, 0, 1000, 1000);
                          const pngFile = canvas.toDataURL("image/png");
                          const downloadLink = document.createElement("a");
                          downloadLink.download = `mesa-${table.table_number}.png`;
                          downloadLink.href = `${pngFile}`;
                          downloadLink.click();
                        };
                        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                      }
                    }}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Baixar
                  </Button>
                </div>
              </div>
            ))}

            {tables.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <TableIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma mesa cadastrada.</p>
                <p className="text-sm">Adicione mesas acima para gerar os QR Codes.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
