import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Store, Clock, MapPin, Phone, MessageSquare, Bot, Copy, Check, Wifi, WifiOff, Truck, Link, ExternalLink, Package, CreditCard, Table as TableIcon } from 'lucide-react';
import ImageUpload from '@/components/admin/ImageUpload';
import { DeliveryAreasManager } from '@/components/admin/DeliveryAreasManager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TablesManager } from '@/components/admin/TablesManager';

const settingsSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  slug: z.string().min(2, 'Link deve ter pelo menos 2 caracteres').regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  description: z.string().optional(),
  whatsapp: z.string().min(10, 'WhatsApp inválido').max(15, 'WhatsApp inválido'),
  address: z.string().optional(),
  opening_hours: z.string().optional(),
  is_open: z.boolean(),
  pickup_enabled: z.boolean(),
  dine_in_enabled: z.boolean(),
  delivery_fee: z.coerce.number().min(0, 'Taxa não pode ser negativa').optional(),
  free_delivery_minimum: z.coerce.number().min(0, 'Valor não pode ser negativo').nullable().optional(),
  evolution_api_url: z.string().optional(),
  evolution_api_key: z.string().optional(),
  evolution_instance_name: z.string().optional(),
  order_welcome_message: z.string().optional(),
  mercado_pago_enabled: z.boolean(),
  mercado_pago_access_token: z.string().optional(),
  mercado_pago_public_key: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { restaurant, loading: loadingRestaurant, refetch } = useRestaurant();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: 'URL copiada!',
      description: 'Cole no campo de webhook da Evolution API.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const testEvolutionConnection = async () => {
    const values = form.getValues();
    
    if (!values.evolution_api_url || !values.evolution_api_key || !values.evolution_instance_name) {
      toast({
        title: 'Campos incompletos',
        description: 'Preencha todos os campos da Evolution API antes de testar.',
        variant: 'destructive',
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('test-evolution-connection', {
        body: {
          evolutionApiUrl: values.evolution_api_url,
          evolutionApiKey: values.evolution_api_key,
          evolutionInstanceName: values.evolution_instance_name,
        },
      });

      if (error) throw error;

      if (data.success) {
        setConnectionStatus('success');
        toast({
          title: data.connected ? 'Conexão estabelecida!' : 'Instância encontrada',
          description: data.message,
          variant: data.connected ? 'default' : 'default',
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: 'Falha na conexão',
          description: data.error || 'Não foi possível conectar à Evolution API.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      setConnectionStatus('error');

      let description = 'Verifique as credenciais e tente novamente.';

      // If the backend returned a JSON error, surface it instead of the generic FunctionsHttpError
      if (err instanceof FunctionsHttpError && err.context instanceof Response) {
        try {
          const contentType = err.context.headers.get('content-type') || '';

          if (contentType.includes('application/json')) {
            const payload = await err.context.clone().json();
            const payloadError = payload?.error || payload?.message;
            const payloadDetails = payload?.details;
            if (payloadError && payloadDetails) description = `${payloadError} — ${payloadDetails}`;
            else if (payloadError) description = payloadError;
            else if (payloadDetails) description = payloadDetails;
          } else {
            const text = await err.context.clone().text();
            if (text?.trim()) description = text.trim().slice(0, 200);
          }
        } catch {
          // keep fallback
        }
      }

      toast({
        title: 'Erro ao testar conexão',
        description,
        variant: 'destructive',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      whatsapp: '',
      address: '',
      opening_hours: '',
      is_open: true,
      pickup_enabled: true,
      dine_in_enabled: false,
      delivery_fee: 0,
      free_delivery_minimum: null,
      evolution_api_url: '',
      evolution_api_key: '',
      evolution_instance_name: '',
      order_welcome_message: '',
      mercado_pago_enabled: false,
      mercado_pago_access_token: '',
      mercado_pago_public_key: '',
    },
  });

  useEffect(() => {
    if (restaurant) {
      form.reset({
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description || '',
        whatsapp: restaurant.whatsapp,
        address: restaurant.address || '',
        opening_hours: restaurant.opening_hours || '',
        is_open: restaurant.is_open ?? true,
        pickup_enabled: (restaurant as any).pickup_enabled ?? true,
        dine_in_enabled: (restaurant as any).dine_in_enabled ?? false,
        delivery_fee: (restaurant as any).delivery_fee || 0,
        free_delivery_minimum: (restaurant as any).free_delivery_minimum || null,
        evolution_api_url: (restaurant as any).evolution_api_url || '',
        evolution_api_key: (restaurant as any).evolution_api_key || '',
        evolution_instance_name: (restaurant as any).evolution_instance_name || '',
        order_welcome_message: (restaurant as any).order_welcome_message || '',
        mercado_pago_enabled: (restaurant as any).mercado_pago_enabled ?? false,
        mercado_pago_access_token: (restaurant as any).mercado_pago_access_token || '',
        mercado_pago_public_key: (restaurant as any).mercado_pago_public_key || '',
      });
      setLogoUrl(restaurant.logo_url);
    }
  }, [restaurant, form]);

  const menuUrl = restaurant ? `${window.location.origin}/${restaurant.slug}` : '';

  const copyMenuUrl = async () => {
    await navigator.clipboard.writeText(menuUrl);
    setSlugCopied(true);
    toast({
      title: 'Link copiado!',
      description: 'Compartilhe o link do seu cardápio.',
    });
    setTimeout(() => setSlugCopied(false), 2000);
  };

  const onSubmit = async (data: SettingsFormData) => {
    if (!restaurant) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          ...data,
          logo_url: logoUrl,
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      toast({
        title: 'Configurações salvas!',
        description: 'As alterações foram aplicadas com sucesso.',
      });
      refetch();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingRestaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as informações do seu restaurante</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  Informações Gerais
                </CardTitle>
                <CardDescription>Dados básicos do seu restaurante</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Logo</label>
                  <ImageUpload
                    value={logoUrl}
                    onChange={setLogoUrl}
                    folder="logos"
                    aspectRatio="square"
                    className="max-w-[200px]"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do restaurante</FormLabel>
                      <FormControl>
                        <Input placeholder="Meu Restaurante" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Uma breve descrição do seu restaurante..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Aparece no cardápio público</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_open"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Restaurante aberto</FormLabel>
                        <FormDescription>
                          Quando desativado, clientes não poderão fazer pedidos
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  Contato
                </CardTitle>
                <CardDescription>Informações de contato e WhatsApp</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="11999999999" {...field} />
                      </FormControl>
                      <FormDescription>Número para receber pedidos (apenas números)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Address */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Endereço
                </CardTitle>
                <CardDescription>Localização do seu estabelecimento</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço completo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Rua das Flores, 123 - Centro, São Paulo - SP"
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Opening Hours */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Horário de Funcionamento
                </CardTitle>
                <CardDescription>Informe o horário de atendimento</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="opening_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horários</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Seg-Sex: 11h às 23h&#10;Sáb-Dom: 11h às 00h"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Aparece no cardápio público</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Delivery */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  Entrega e Retirada
                </CardTitle>
                <CardDescription>Configure as opções de entrega e retirada no local</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pickup option */}
                <FormField
                  control={form.control}
                  name="pickup_enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Retirada no local
                        </FormLabel>
                        <FormDescription>
                          Permite que clientes retirem o pedido no estabelecimento (sem taxa)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {/* Dine-in option */}
                <FormField
                  control={form.control}
                  name="dine_in_enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <TableIcon className="w-4 h-4" />
                          Consumo no Local (Mesas)
                        </FormLabel>
                        <FormDescription>
                          Permite que clientes façam pedidos das mesas via QR Code
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />


                {/* Default delivery fee */}
                <FormField
                  control={form.control}
                  name="delivery_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxa de Entrega Padrão (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Usada quando não há áreas de entrega configuradas. Digite 0 para entrega grátis.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="free_delivery_minimum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frete Grátis acima de (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Deixe vazio para desativar"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Pedidos acima deste valor terão frete grátis. Deixe vazio para desativar.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Delivery areas */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div>
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Áreas de Entrega
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Configure taxas diferentes por bairro ou região
                    </p>
                  </div>
                  
                  {restaurant && (
                    <DeliveryAreasManager restaurantId={restaurant.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Menu Link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.38 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5 text-primary" />
                  Link do Cardápio
                </CardTitle>
                <CardDescription>Configure e compartilhe o link do seu cardápio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identificador (slug)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="meu-restaurante"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Apenas letras minúsculas, números e hífens. Ex: pizzaria-do-joao
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {restaurant && (
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground mb-2">Link do seu cardápio:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-background rounded text-sm text-foreground truncate">
                        {menuUrl}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copyMenuUrl}
                      >
                        {slugCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(menuUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Mercado Pago */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Gateway de Pagamentos
                </CardTitle>
                <CardDescription>
                  Configure a integração com Mercado Pago para receber pagamentos online
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="mercado_pago_enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Ativar Mercado Pago</FormLabel>
                        <FormDescription>
                          Permite que clientes paguem online via Pix, cartão ou boleto
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mercado_pago_access_token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Token</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="APP_USR-..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Token de acesso do Mercado Pago (encontre em Configurações → Credenciais)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mercado_pago_public_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Public Key</FormLabel>
                      <FormControl>
                        <Input placeholder="APP_USR-..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Chave pública do Mercado Pago (encontre em Configurações → Credenciais)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert className="bg-muted/50 border-primary/20">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <AlertTitle className="text-primary">Como obter as credenciais</AlertTitle>
                  <AlertDescription className="space-y-2 mt-2">
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Acesse sua conta no Mercado Pago</li>
                      <li>Vá em Seu negócio → Configurações → Gestão e administração → Credenciais</li>
                      <li>Copie o Access Token e a Public Key de produção</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>

          {/* Evolution API */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.45 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Evolution API (WhatsApp)
                </CardTitle>
                <CardDescription>
                  Configure a API para notificações automáticas de pedidos via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="evolution_api_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da API</FormLabel>
                      <FormControl>
                        <Input placeholder="https://sua-api.com" {...field} />
                      </FormControl>
                      <FormDescription>Endereço da sua instância Evolution API</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="evolution_api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Sua chave de API" {...field} />
                      </FormControl>
                      <FormDescription>Chave de autenticação da Evolution API</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="evolution_instance_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Instância</FormLabel>
                      <FormControl>
                        <Input placeholder="minha-instancia" {...field} />
                      </FormControl>
                      <FormDescription>Nome da instância conectada ao WhatsApp</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Test Connection Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={testEvolutionConnection}
                  disabled={testingConnection}
                  className="w-full"
                >
                  {testingConnection ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : connectionStatus === 'success' ? (
                    <Wifi className="w-4 h-4 mr-2 text-green-500" />
                  ) : connectionStatus === 'error' ? (
                    <WifiOff className="w-4 h-4 mr-2 text-destructive" />
                  ) : (
                    <Wifi className="w-4 h-4 mr-2" />
                  )}
                  {testingConnection ? 'Testando...' : 'Testar Conexão'}
                </Button>

                {/* Custom Order Welcome Message */}
                <FormField
                  control={form.control}
                  name="order_welcome_message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem de Boas-Vindas de Pedidos</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="🎉 *Pedido recebido com sucesso!*

Olá {nome}! Obrigado por pedir no {restaurante}!

Seu pedido já foi registrado e nossa equipe já está preparando com todo carinho! 👨‍🍳

⏱️ Em breve você receberá atualizações sobre o status.

Agradecemos a preferência! Bom apetite! 😋"
                          className="resize-none min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Mensagem enviada quando o cliente faz um pedido via WhatsApp. Use {'{nome}'} para o nome do cliente e {'{restaurante}'} para o nome do restaurante.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Webhook URL for AI Agent */}
                <Alert className="bg-muted/50 border-primary/20">
                  <Bot className="w-4 h-4 text-primary" />
                  <AlertTitle className="text-primary">Agente de IA (Chatbot)</AlertTitle>
                  <AlertDescription className="space-y-3 mt-2">
                    <p className="text-sm text-muted-foreground">
                      Para ativar o atendente virtual com IA, configure este webhook na sua Evolution API:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-background rounded-md text-xs break-all border">
                        {webhookUrl}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copyWebhookUrl}
                        className="shrink-0"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Configure como webhook de mensagens recebidas (messages.upsert) na Evolution API.
                    </p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" variant="hero" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Form>

      {restaurant && (form.watch('dine_in_enabled') || (restaurant as any).dine_in_enabled) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <TablesManager 
            restaurantId={restaurant.id} 
            restaurantSlug={restaurant.slug} 
          />
        </motion.div>
      )}
    </div>
  );
}
