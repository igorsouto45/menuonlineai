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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Palette, Type, Image as ImageIcon } from 'lucide-react';
import ImageUpload from '@/components/admin/ImageUpload';

const FONT_OPTIONS = [
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Lato', label: 'Lato' },
];

const appearanceSchema = z.object({
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  font_family: z.string().min(1, 'Selecione uma fonte'),
});

type AppearanceFormData = z.infer<typeof appearanceSchema>;

export default function AppearancePage() {
  const { restaurant, loading: loadingRestaurant, refetch } = useRestaurant();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const form = useForm<AppearanceFormData>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      primary_color: '#f97316',
      secondary_color: '#ea580c',
      font_family: 'Plus Jakarta Sans',
    },
  });

  const watchPrimary = form.watch('primary_color');
  const watchSecondary = form.watch('secondary_color');
  const watchFont = form.watch('font_family');

  useEffect(() => {
    if (restaurant) {
      form.reset({
        primary_color: restaurant.primary_color || '#f97316',
        secondary_color: restaurant.secondary_color || '#ea580c',
        font_family: restaurant.font_family || 'Plus Jakarta Sans',
      });
      setCoverUrl(restaurant.cover_url);
    }
  }, [restaurant, form]);

  const onSubmit = async (data: AppearanceFormData) => {
    if (!restaurant) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          ...data,
          cover_url: coverUrl,
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      toast({
        title: 'Aparência salva!',
        description: 'As alterações visuais foram aplicadas.',
      });
      refetch();
    } catch (error) {
      console.error('Error saving appearance:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a aparência.',
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
        <h1 className="text-3xl font-bold text-foreground">Aparência</h1>
        <p className="text-muted-foreground mt-1">Personalize as cores e estilo do seu cardápio</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Cover Image */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Imagem de Capa
                </CardTitle>
                <CardDescription>Aparece no topo do seu cardápio digital</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  value={coverUrl}
                  onChange={setCoverUrl}
                  folder="covers"
                  aspectRatio="wide"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Colors */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Cores
                </CardTitle>
                <CardDescription>Defina as cores do seu cardápio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor Primária</FormLabel>
                        <FormControl>
                          <div className="flex gap-3">
                            <input
                              type="color"
                              value={field.value}
                              onChange={field.onChange}
                              className="w-12 h-10 rounded-lg cursor-pointer border border-border"
                            />
                            <Input
                              {...field}
                              placeholder="#f97316"
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>Botões, links e destaques</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor Secundária</FormLabel>
                        <FormControl>
                          <div className="flex gap-3">
                            <input
                              type="color"
                              value={field.value}
                              onChange={field.onChange}
                              className="w-12 h-10 rounded-lg cursor-pointer border border-border"
                            />
                            <Input
                              {...field}
                              placeholder="#ea580c"
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>Gradientes e acentos</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Preview */}
                <div className="p-4 rounded-xl border border-border bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-3">Prévia:</p>
                  <div className="flex items-center gap-4">
                    <div
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: watchPrimary }}
                    >
                      Botão Primário
                    </div>
                    <div
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ 
                        background: `linear-gradient(135deg, ${watchPrimary}, ${watchSecondary})` 
                      }}
                    >
                      Gradiente
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Typography */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-5 h-5 text-primary" />
                  Tipografia
                </CardTitle>
                <CardDescription>Escolha a fonte do seu cardápio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="font_family"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fonte</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma fonte" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FONT_OPTIONS.map(font => (
                            <SelectItem key={font.value} value={font.value}>
                              <span style={{ fontFamily: font.value }}>{font.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Font Preview */}
                <div className="p-4 rounded-xl border border-border bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-3">Prévia:</p>
                  <div style={{ fontFamily: watchFont }}>
                    <h3 className="text-2xl font-bold mb-2">Nome do Restaurante</h3>
                    <p className="text-muted-foreground">
                      Descrição de um produto delicioso com ingredientes frescos.
                    </p>
                  </div>
                </div>
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
              Salvar Aparência
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
