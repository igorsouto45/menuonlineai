import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/hooks/useRestaurant';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Store, Sparkles, ArrowRight, Upload, X, Loader2 } from 'lucide-react';

const onboardingSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  slug: z.string()
    .min(3, 'Slug deve ter pelo menos 3 caracteres')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  whatsapp: z.string()
    .min(10, 'WhatsApp inválido')
    .max(20)
    .regex(/^[0-9]+$/, 'Apenas números'),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { user } = useAuth();
  const { hasRestaurant, loading: restaurantLoading } = useRestaurant();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect to admin if user already has a restaurant
  useEffect(() => {
    if (!restaurantLoading && hasRestaurant) {
      navigate('/admin', { replace: true });
    }
  }, [hasRestaurant, restaurantLoading, navigate]);

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      slug: '',
      whatsapp: '',
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'A logo deve ter no máximo 2MB.',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const onSubmit = async (data: OnboardingForm) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Check if slug is available
      const { data: existingSlug } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', data.slug)
        .maybeSingle();

      if (existingSlug) {
        form.setError('slug', { message: 'Este slug já está em uso' });
        setLoading(false);
        return;
      }

      let logoUrl: string | null = null;

      // Upload logo if exists
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${user.id}/logo.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('restaurant-images')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('restaurant-images')
          .getPublicUrl(fileName);

        logoUrl = publicUrl.publicUrl;
      }

      // Create restaurant
      const { error } = await supabase.from('restaurants').insert({
        owner_id: user.id,
        name: data.name,
        slug: data.slug,
        whatsapp: data.whatsapp,
        logo_url: logoUrl,
      });

      if (error) throw error;

      toast({
        title: '🎉 Restaurante criado!',
        description: 'Agora você pode começar a montar seu cardápio.',
      });

      navigate('/admin');
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível criar o restaurante.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    const name = form.getValues('name');
    if (name) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      form.setValue('slug', slug);
    }
  };

  // Show loading while checking restaurant status
  if (restaurantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-lg border-border">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Vamos criar seu restaurante!
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure as informações básicas para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Logo (opcional)</label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-20 h-20 rounded-xl object-cover border border-border"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Formatos: JPG, PNG. Máximo: 2MB
                    </p>
                  </div>
                </div>

                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do restaurante</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            placeholder="Pizzaria do João"
                            className="pl-10"
                            {...field}
                            onBlur={() => {
                              field.onBlur();
                              if (!form.getValues('slug')) {
                                generateSlug();
                              }
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Slug Field */}
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link do cardápio</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <span className="px-3 py-2 bg-muted text-muted-foreground text-sm rounded-l-md border border-r-0 border-input">
                            menuai.app/r/
                          </span>
                          <Input
                            placeholder="pizzaria-do-joao"
                            className="rounded-l-none"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Apenas letras minúsculas, números e hífens
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* WhatsApp Field */}
                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="11999999999"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Número com DDD, sem espaços ou traços
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  variant="hero" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
                  ) : (
                    <>
                      Criar restaurante
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
