import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCustomer } from '@/contexts/CustomerContext';
import { useToast } from '@/hooks/use-toast';
import { X, Eye, EyeOff, Loader2, User, Phone, MapPin, Mail, Lock } from 'lucide-react';
import { z } from 'zod';

const signUpSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  whatsapp: z.string().min(10, 'WhatsApp inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  onSuccess: () => void;
}

export function CustomerAuthModal({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  onSuccess,
}: CustomerAuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    password: '',
    address: '',
    neighborhood: '',
    city: '',
  });

  const { signIn, signUp } = useCustomer();
  const { toast } = useToast();

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    try {
      if (mode === 'signup') {
        signUpSchema.parse(formData);
      } else {
        signInSchema.parse({ email: formData.email, password: formData.password });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp({
          ...formData,
          restaurantId,
        });

        if (error) {
          if (error.message.includes('senha') && error.message.includes('incorreta')) {
            toast({
              title: 'Email já cadastrado',
              description: 'Você já possui conta. A senha informada está incorreta. Tente fazer login.',
              variant: 'destructive',
            });
          } else if (error.message.includes('already registered')) {
            toast({
              title: 'Conta criada!',
              description: 'Você foi conectado automaticamente ao restaurante.',
            });
            onSuccess();
            onClose();
            return;
          } else {
            toast({
              title: 'Erro ao cadastrar',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Cadastro realizado!',
            description: 'Bem-vindo ao nosso cardápio.',
          });
          onSuccess();
          onClose();
        }
      } else {
        const { error } = await signIn(formData.email, formData.password, restaurantId);

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Erro ao entrar',
              description: 'Email ou senha incorretos.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Erro ao entrar',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Bem-vindo de volta!',
          });
          onSuccess();
          onClose();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-foreground/60 backdrop-blur-md p-0 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-md max-h-[95vh] overflow-hidden bg-card rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {mode === 'signin' ? 'Entrar' : 'Criar Conta'}
            </h2>
            <p className="text-sm text-muted-foreground">{restaurantName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome completo
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Seu nome"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={errors.whatsapp ? 'border-destructive' : ''}
                />
                {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp}</p>}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="seu@email.com"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          {mode === 'signup' && (
            <>
              <div className="pt-2 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço de entrega (opcional)
                </p>
                
                <div className="space-y-3">
                  <Input
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Rua, número, complemento"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={formData.neighborhood}
                      onChange={(e) => handleChange('neighborhood', e.target.value)}
                      placeholder="Bairro"
                    />
                    <Input
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full h-12 mt-4"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === 'signin' ? (
              <>
                Não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-primary hover:underline font-medium"
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-primary hover:underline font-medium"
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}
