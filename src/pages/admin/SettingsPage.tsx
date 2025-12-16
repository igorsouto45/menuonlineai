import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Store, Clock, MapPin, Phone, MessageSquare } from 'lucide-react';
import ImageUpload from '@/components/admin/ImageUpload';

const settingsSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  whatsapp: z.string().min(10, 'WhatsApp inválido').max(15, 'WhatsApp inválido'),
  address: z.string().optional(),
  opening_hours: z.string().optional(),
  is_open: z.boolean(),
  evolution_api_url: z.string().optional(),
  evolution_api_key: z.string().optional(),
  evolution_instance_name: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { restaurant, loading: loadingRestaurant, refetch } = useRestaurant();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      description: '',
      whatsapp: '',
      address: '',
      opening_hours: '',
      is_open: true,
      evolution_api_url: '',
      evolution_api_key: '',
      evolution_instance_name: '',
    },
  });

  useEffect(() => {
    if (restaurant) {
      form.reset({
        name: restaurant.name,
        description: restaurant.description || '',
        whatsapp: restaurant.whatsapp,
        address: restaurant.address || '',
        opening_hours: restaurant.opening_hours || '',
        is_open: restaurant.is_open ?? true,
        evolution_api_url: (restaurant as any).evolution_api_url || '',
        evolution_api_key: (restaurant as any).evolution_api_key || '',
        evolution_instance_name: (restaurant as any).evolution_instance_name || '',
      });
      setLogoUrl(restaurant.logo_url);
    }
  }, [restaurant, form]);

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

          {/* Evolution API */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
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
    </div>
  );
}
