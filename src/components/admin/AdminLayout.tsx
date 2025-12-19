import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { 
  LayoutDashboard, 
  FolderOpen, 
  ShoppingBag, 
  ClipboardList, 
  Palette, 
  Settings,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  Store,
  Star,
  Users,
  Megaphone,
  CreditCard,
  Crown
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: FolderOpen, label: 'Categorias', path: '/admin/categories' },
  { icon: ShoppingBag, label: 'Produtos', path: '/admin/products' },
  { icon: ClipboardList, label: 'Pedidos', path: '/admin/orders' },
  { icon: Star, label: 'Avaliações', path: '/admin/reviews' },
  { icon: Users, label: 'Leads', path: '/admin/leads' },
  { icon: Megaphone, label: 'Campanhas', path: '/admin/campaigns' },
  { icon: Palette, label: 'Aparência', path: '/admin/appearance' },
  { icon: Settings, label: 'Configurações', path: '/admin/settings' },
  { icon: CreditCard, label: 'Planos', path: '/precos' },
];

function Sidebar({ collapsed, setCollapsed, onLogout }: { collapsed: boolean; setCollapsed: (v: boolean) => void; onLogout: () => void }) {
  const location = useLocation();

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-sidebar z-50 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full p-4">
        {/* Logo */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-lg">M</span>
            </div>
            {!collapsed && (
              <span className="font-bold text-lg text-sidebar-foreground">MENU AI</span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg hover:bg-sidebar-accent flex items-center justify-center text-sidebar-foreground transition-colors"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="space-y-2 pt-4 border-t border-sidebar-border">
          <Link
            to="/demo"
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Store className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">Ver Cardápio</span>}
          </Link>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileNav({ isOpen, setIsOpen, onLogout }: { isOpen: boolean; setIsOpen: (v: boolean) => void; onLogout: () => void }) {
  const location = useLocation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-72 bg-sidebar z-50 lg:hidden"
          >
            <div className="flex flex-col h-full p-4">
              <div className="flex items-center justify-between mb-8">
                <Link to="/admin" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
                  <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg">M</span>
                  </div>
                  <span className="font-bold text-lg text-sidebar-foreground">MENU AI</span>
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-sidebar-accent flex items-center justify-center text-sidebar-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="space-y-2 pt-4 border-t border-sidebar-border">
                <button 
                  onClick={() => { setIsOpen(false); onLogout(); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sair</span>
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { planName, isSubscribed, isInTrial, trialEndsAt } = usePlanLimits();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: 'Até logo!',
      description: 'Você saiu da sua conta.',
    });
    navigate('/');
  };

  const getPlanBadgeColor = () => {
    if (isInTrial) return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
    if (!isSubscribed) return 'bg-destructive/20 text-destructive';
    if (planName === 'Premium') return 'bg-purple-500/20 text-purple-600 dark:text-purple-400';
    if (planName === 'Pro') return 'bg-primary/20 text-primary';
    return 'bg-muted text-muted-foreground';
  };

  const getStatusIndicator = () => {
    if (isInTrial) return { color: 'bg-blue-500', pulse: true };
    if (!isSubscribed) return { color: 'bg-destructive', pulse: true };
    return { color: 'bg-green-500', pulse: false };
  };

  const getTrialDaysLeft = () => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getSubscriptionStatus = () => {
    if (isInTrial) {
      const days = getTrialDaysLeft();
      return days > 0 ? `Trial • ${days} dias restantes` : 'Trial expirado';
    }
    if (!isSubscribed) return 'Sem assinatura ativa';
    return `${planName} • Ativo`;
  };

  const displayPlanName = isInTrial ? `Trial (${getTrialDaysLeft()}d)` : planName;
  const statusIndicator = getStatusIndicator();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} onLogout={handleLogout} />
      </div>

      {/* Mobile Nav */}
      <MobileNav isOpen={mobileNavOpen} setIsOpen={setMobileNavOpen} onLogout={handleLogout} />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 h-16 bg-card border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 ml-4">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">M</span>
              </div>
              <span className="font-bold text-foreground">MENU AI</span>
            </div>
          </div>
          <Link to="/precos" className="flex items-center gap-2">
            <div className="relative">
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${statusIndicator.color} ${statusIndicator.pulse ? 'animate-pulse' : ''}`} />
              <Badge className={`${getPlanBadgeColor()} border-0 cursor-pointer`}>
                <Crown className="w-3 h-3 mr-1" />
                {displayPlanName}
              </Badge>
            </div>
          </Link>
        </header>

        {/* Desktop Header with Plan Badge */}
        <header className="hidden lg:flex sticky top-0 z-30 h-16 bg-card border-b border-border items-center justify-end px-8">
          <Link to="/precos" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">{getSubscriptionStatus()}</p>
            </div>
            <div className="relative">
              <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusIndicator.color} ${statusIndicator.pulse ? 'animate-pulse' : ''}`} />
              <Badge className={`${getPlanBadgeColor()} border-0 cursor-pointer`}>
                <Crown className="w-3 h-3 mr-1" />
                {displayPlanName}
              </Badge>
            </div>
          </Link>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
