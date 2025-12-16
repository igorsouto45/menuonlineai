import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Download, Check } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallPWAButton() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  if (isInstalled) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-xs font-medium"
      >
        <Check className="w-3 h-3" />
        App instalado
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {isInstallable && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
        >
          <Button
            onClick={promptInstall}
            size="sm"
            variant="outline"
            className="gap-2 rounded-full text-xs h-8 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Download className="w-3 h-3" />
            Instalar App
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
