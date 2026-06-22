import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, Loader2, Settings, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface EvolutionApiStatusProps {
  evolutionApiUrl?: string | null;
  evolutionApiKey?: string | null;
  evolutionInstanceName?: string | null;
  onSetupClick?: () => void;
  compact?: boolean;
}

export function EvolutionApiStatus({
  evolutionApiUrl,
  evolutionApiKey,
  evolutionInstanceName,
  onSetupClick,
  compact = false,
}: EvolutionApiStatusProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'checking' | 'connected' | 'disconnected' | 'not_configured'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const isConfigured = !!(evolutionApiUrl && evolutionApiKey && evolutionInstanceName);

  useEffect(() => {
    if (!isConfigured) {
      setStatus('not_configured');
      setStatusMessage('Evolution API não configurada');
      return;
    }

    checkConnection();
  }, [evolutionApiUrl, evolutionApiKey, evolutionInstanceName]);

  const checkConnection = async (opts?: { withToast?: boolean }) => {
    const withToast = opts?.withToast ?? false;

    if (!isConfigured) {
      if (withToast) {
        toast.error('Evolution API não configurada', {
          description: 'Preencha URL, chave e instância nas configurações.',
        });
      }
      return;
    }

    setStatus('checking');
    setStatusMessage('Verificando conexão...');

    const toastId = withToast ? toast.loading('Testando conexão com a Evolution API...') : undefined;

    try {
      const { data, error } = await supabase.functions.invoke('test-evolution-connection', {
        body: {
          evolutionApiUrl,
          evolutionApiKey,
          evolutionInstanceName,
        },
      });

      if (error) throw error;

      if (data.success && data.connected) {
        setStatus('connected');
        setStatusMessage('WhatsApp conectado');
        if (withToast) {
          toast.success('WhatsApp conectado ✅', {
            id: toastId,
            description: data.message || `Instância "${evolutionInstanceName}" está online.`,
          });
        }
      } else if (data.success) {
        setStatus('disconnected');
        setStatusMessage(data.message || 'Instância encontrada, mas não conectada');
        if (withToast) {
          toast.warning('WhatsApp desconectado ⚠️', {
            id: toastId,
            description: data.message || 'Escaneie o QR Code para conectar.',
          });
        }
      } else {
        setStatus('disconnected');
        setStatusMessage(data.error || 'Falha na conexão');
        if (withToast) {
          toast.error('Falha na conexão', {
            id: toastId,
            description: data.error || 'Verifique URL, chave e nome da instância.',
          });
        }
      }
    } catch (err) {
      console.error('Error checking Evolution connection:', err);
      setStatus('disconnected');
      setStatusMessage('Erro ao verificar conexão');
      if (withToast) {
        toast.error('Erro ao verificar conexão', {
          id: toastId,
          description: err instanceof Error ? err.message : 'Tente novamente em instantes.',
        });
      }
    }
  };

  const handleSetupClick = () => {
    if (onSetupClick) {
      onSetupClick();
    } else {
      navigate('/admin/settings');
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              {status === 'checking' && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {status === 'connected' && (
                <Wifi className="w-4 h-4 text-success" />
              )}
              {status === 'disconnected' && (
                <WifiOff className="w-4 h-4 text-warning" />
              )}
              {status === 'not_configured' && (
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
              )}
              {status === 'idle' && (
                <Wifi className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{statusMessage}</p>
            {status !== 'connected' && status !== 'checking' && (
              <p className="text-xs text-muted-foreground mt-1">
                Clique para configurar
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {status === 'checking' && (
        <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Verificando...</span>
        </Badge>
      )}
      
      {status === 'connected' && (
        <Badge className="flex items-center gap-1.5 py-1 px-3 bg-success/20 text-success border-success/30 hover:bg-success/30">
          <Wifi className="w-3.5 h-3.5" />
          <span>WhatsApp Conectado</span>
        </Badge>
      )}
      
      {status === 'disconnected' && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className="flex items-center gap-1.5 py-1 px-3 bg-warning/20 text-warning border-warning/30 cursor-pointer hover:bg-warning/30"
                onClick={handleSetupClick}
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span>WhatsApp Desconectado</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{statusMessage}</p>
              <p className="text-xs text-muted-foreground mt-1">Clique para verificar configurações</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {status === 'not_configured' && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSetupClick}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configurar WhatsApp</span>
        </Button>
      )}

      {isConfigured && status !== 'checking' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => checkConnection({ withToast: true })}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Testar conexão</span>
        </Button>
      )}
    </div>
  );
}
