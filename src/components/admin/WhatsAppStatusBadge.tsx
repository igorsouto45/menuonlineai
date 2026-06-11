import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, WifiOff, AlertCircle, Circle } from 'lucide-react';

export type WhatsAppStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'unknown';

interface Props {
  status: WhatsAppStatus;
  detail?: string;
  className?: string;
}

const config: Record<WhatsAppStatus, { label: string; icon: any; className: string }> = {
  connected: {
    label: 'Conectado',
    icon: CheckCircle2,
    className: 'bg-success/10 text-success border-success/30 hover:bg-success/20',
  },
  connecting: {
    label: 'Em conexão',
    icon: Loader2,
    className: 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20',
  },
  disconnected: {
    label: 'Desconectado',
    icon: WifiOff,
    className: 'bg-muted text-muted-foreground border-border',
  },
  error: {
    label: 'Erro',
    icon: AlertCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20',
  },
  unknown: {
    label: 'Desconhecido',
    icon: Circle,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function WhatsAppStatusBadge({ status, detail, className }: Props) {
  const c = config[status];
  const Icon = c.icon;
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 font-medium ${c.className} ${className ?? ''}`}
      title={detail}
    >
      <Icon className={`w-3.5 h-3.5 ${status === 'connecting' ? 'animate-spin' : ''}`} />
      <span>{c.label}</span>
      {detail && status !== 'connected' && (
        <span className="text-[10px] opacity-70 hidden sm:inline">· {detail}</span>
      )}
    </Badge>
  );
}
