import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  ExternalLink, 
  Copy, 
  Check, 
  Wifi, 
  WifiOff,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Key,
  Link,
  MessageSquare
} from 'lucide-react';

interface EvolutionApiWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  initialValues?: {
    evolutionApiUrl?: string | null;
    evolutionApiKey?: string | null;
    evolutionInstanceName?: string | null;
    orderWelcomeMessage?: string | null;
  };
  onComplete?: () => void;
}

const steps = [
  { id: 1, title: 'Introdução', icon: Smartphone },
  { id: 2, title: 'URL da API', icon: Link },
  { id: 3, title: 'Token (apikey)', icon: Key },
  { id: 4, title: 'Instância', icon: Wifi },
  { id: 5, title: 'Testar Conexão', icon: CheckCircle2 },
  { id: 6, title: 'Mensagem de Boas-Vindas', icon: MessageSquare },
];

export function EvolutionApiWizard({
  open,
  onOpenChange,
  restaurantId,
  initialValues,
  onComplete,
}: EvolutionApiWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    evolutionApiUrl: initialValues?.evolutionApiUrl || '',
    evolutionApiKey: initialValues?.evolutionApiKey || '',
    evolutionInstanceName: initialValues?.evolutionInstanceName || '',
    orderWelcomeMessage: initialValues?.orderWelcomeMessage || '',
  });

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

  const testConnection = async () => {
    if (!formData.evolutionApiUrl || !formData.evolutionApiKey) {
      toast({
        title: 'Campos incompletos',
        description: 'Preencha a URL e o token (apikey) antes de testar.',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setTestResult('idle');

    try {
      const { data, error } = await supabase.functions.invoke('test-evolution-connection', {
        body: {
          evolutionApiUrl: formData.evolutionApiUrl,
          evolutionApiKey: formData.evolutionApiKey,
          evolutionInstanceName: formData.evolutionInstanceName,
        },
      });

      if (error) throw error;

      if (data.success && data.connected) {
        setTestResult('success');
        toast({
          title: 'Conexão estabelecida!',
          description: 'WhatsApp conectado com sucesso.',
        });
      } else if (data.success) {
        setTestResult('error');
        toast({
          title: 'Instância encontrada',
          description: data.message || 'Mas o WhatsApp não está conectado. Escaneie o QR Code na Evolution API.',
          variant: 'destructive',
        });
      } else {
        setTestResult('error');
        toast({
          title: 'Falha na conexão',
          description: data.error || 'Verifique as credenciais.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      setTestResult('error');
      toast({
        title: 'Erro ao testar',
        description: 'Verifique as credenciais e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const saveAndComplete = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          evolution_api_url: formData.evolutionApiUrl || null,
          evolution_api_key: formData.evolutionApiKey || null,
          evolution_instance_name: formData.evolutionInstanceName || null,
          order_welcome_message: formData.orderWelcomeMessage || null,
        })
        .eq('id', restaurantId);

      if (error) throw error;

      toast({
        title: 'Configuração salva!',
        description: 'Evolution API configurada com sucesso.',
      });

      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving Evolution API config:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return !!formData.evolutionApiUrl;
      case 3:
        return !!formData.evolutionApiKey;
      case 4:
        return true; // instance name is optional in Evolution GO (token identifies the instance)
      case 5:
        return testResult === 'success';
      case 6:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Configurar Evolution GO
          </DialogTitle>
          <DialogDescription>
            Siga os passos para conectar o WhatsApp ao seu restaurante via Evolution GO
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          {/* Steps indicator */}
          <div className="flex justify-between">
            {steps.map((step) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center gap-1 ${
                    isCurrent ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCurrent ? 'bg-primary text-primary-foreground' : 
                    isCompleted ? 'bg-success text-success-foreground' : 
                    'bg-muted'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs hidden sm:block">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="py-4"
          >
            {currentStep === 1 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">O que é o Evolution GO?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      O Evolution GO é a nova versão (em Go/whatsmeow) da Evolution API. Permite
                      enviar notificações automáticas pelo WhatsApp quando o status do pedido muda.
                    </p>
                    <p>
                      Com ela configurada, seus clientes receberão mensagens como:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>✅ Pedido confirmado</li>
                      <li>👨‍🍳 Pedido em preparação</li>
                      <li>🎉 Pedido pronto para retirada</li>
                      <li>🛵 Pedido saiu para entrega</li>
                    </ul>
                  </CardContent>
                </Card>

                <Alert>
                  <AlertDescription>
                    <strong>Pré-requisitos:</strong> Você precisa de uma instância do Evolution GO
                    criada e conectada ao WhatsApp (QR Code escaneado).
                    <a 
                      href="https://pool-evolution-go-008.cloud.pageup.dev.br/swagger/index.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1 inline-flex items-center gap-1"
                    >
                      Ver documentação (Swagger) <ExternalLink className="w-3 h-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl">URL da Evolution API</Label>
                  <Input
                    id="apiUrl"
                    placeholder="https://sua-evolution-api.com"
                    value={formData.evolutionApiUrl}
                    onChange={(e) => setFormData({ ...formData, evolutionApiUrl: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    A URL onde sua Evolution API está hospedada (sem barra no final)
                  </p>
                </div>

                <Alert>
                  <AlertDescription>
                    Exemplo: <code className="bg-muted px-1 rounded">https://api.seudominio.com</code>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">Chave da API (API Key)</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Sua chave de API"
                    value={formData.evolutionApiKey}
                    onChange={(e) => setFormData({ ...formData, evolutionApiKey: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    A chave de autenticação da sua Evolution API
                  </p>
                </div>

                <Alert>
                  <AlertDescription>
                    Você pode encontrar a API Key no painel da Evolution API ou no arquivo de configuração.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instanceName">Nome da Instância</Label>
                  <Input
                    id="instanceName"
                    placeholder="minha-instancia"
                    value={formData.evolutionInstanceName}
                    onChange={(e) => setFormData({ ...formData, evolutionInstanceName: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    O nome da instância que você criou na Evolution API
                  </p>
                </div>

                <Alert>
                  <AlertDescription>
                    <p className="mb-2">
                      <strong>Configurar Webhook:</strong> Para receber pedidos via WhatsApp, 
                      configure o webhook na sua instância:
                    </p>
                    <div className="flex items-center gap-2 bg-muted p-2 rounded text-xs font-mono break-all">
                      <span className="flex-1">{webhookUrl}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="shrink-0 h-6 w-6"
                        onClick={copyWebhookUrl}
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <Card className={`border-2 ${
                  testResult === 'success' ? 'border-success' : 
                  testResult === 'error' ? 'border-destructive' : 
                  'border-border'
                }`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                      {testResult === 'idle' && (
                        <>
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <Wifi className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Testar Conexão</h3>
                            <p className="text-sm text-muted-foreground">
                              Clique para verificar se as credenciais estão corretas
                            </p>
                          </div>
                        </>
                      )}

                      {testing && (
                        <>
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          </div>
                          <p className="text-sm">Testando conexão...</p>
                        </>
                      )}

                      {testResult === 'success' && (
                        <>
                          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-success" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-success">Conexão Estabelecida!</h3>
                            <p className="text-sm text-muted-foreground">
                              WhatsApp conectado com sucesso
                            </p>
                          </div>
                        </>
                      )}

                      {testResult === 'error' && (
                        <>
                          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                            <WifiOff className="w-8 h-8 text-destructive" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-destructive">Falha na Conexão</h3>
                            <p className="text-sm text-muted-foreground">
                              Verifique as credenciais e tente novamente
                            </p>
                          </div>
                        </>
                      )}

                      <Button 
                        onClick={testConnection} 
                        disabled={testing}
                        variant={testResult === 'success' ? 'outline' : 'default'}
                      >
                        {testing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Testando...
                          </>
                        ) : testResult === 'success' ? (
                          'Testar Novamente'
                        ) : (
                          'Testar Conexão'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {testResult === 'error' && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Verifique se a URL está correta</li>
                        <li>Confirme se a API Key está válida</li>
                        <li>Certifique-se de que a instância existe</li>
                        <li>Verifique se o WhatsApp está conectado na instância</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="welcomeMessage">Mensagem de Boas-Vindas (opcional)</Label>
                  <textarea
                    id="welcomeMessage"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    placeholder="Obrigado por pedir conosco! Seu pedido será preparado com muito carinho."
                    value={formData.orderWelcomeMessage}
                    onChange={(e) => setFormData({ ...formData, orderWelcomeMessage: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Esta mensagem será enviada quando o pedido for confirmado
                  </p>
                </div>

                <Card className="bg-success/5 border-success/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-success" />
                      <div>
                        <h3 className="font-semibold">Tudo pronto!</h3>
                        <p className="text-sm text-muted-foreground">
                          Clique em "Concluir" para salvar as configurações
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>

          {currentStep < steps.length ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={saveAndComplete}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Concluir
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
