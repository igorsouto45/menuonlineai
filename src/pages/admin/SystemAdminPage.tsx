import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  Users, 
  Store, 
  ShoppingBag, 
  TrendingUp, 
  Search,
  Eye,
  Shield,
  Crown
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  is_open: boolean;
  created_at: string;
  owner_id: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface SystemStats {
  totalUsers: number;
  totalRestaurants: number;
  totalOrders: number;
  totalProducts: number;
}

export default function SystemAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalRestaurants: 0,
    totalOrders: 0,
    totalProducts: 0,
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAdminAndLoadData();
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) return;

    try {
      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (roleError) throw roleError;

      setIsAdmin(roleData === true);

      if (roleData) {
        await loadSystemData();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemData = async () => {
    try {
      // Load stats
      const [usersResult, restaurantsResult, ordersResult, productsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('restaurants').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalRestaurants: restaurantsResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalProducts: productsResult.count || 0,
      });

      // Load restaurants
      const { data: restaurantsData } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (restaurantsData) {
        setRestaurants(restaurantsData);
      }

      // Load users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (usersData) {
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error loading system data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados do sistema.',
        variant: 'destructive',
      });
    }
  };

  const promoteToAdmin = async (email: string) => {
    try {
      const { error } = await supabase.rpc('promote_user_to_admin', { user_email: email });
      
      if (error) throw error;

      toast({
        title: 'Usuário promovido!',
        description: `${email} agora é administrador.`,
      });
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível promover o usuário.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie todo o sistema MENU AI</p>
          </div>
          <Badge className="ml-auto bg-primary/10 text-primary border-0">
            <Crown className="w-3 h-3 mr-1" />
            Admin Master
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de Usuários', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
            { label: 'Restaurantes', value: stats.totalRestaurants, icon: Store, color: 'text-green-500' },
            { label: 'Pedidos', value: stats.totalOrders, icon: ShoppingBag, color: 'text-orange-500' },
            { label: 'Produtos', value: stats.totalProducts, icon: TrendingUp, color: 'text-purple-500' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar restaurantes ou usuários..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Restaurants */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  Restaurantes ({filteredRestaurants.length})
                </CardTitle>
                <CardDescription>Todos os restaurantes cadastrados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {filteredRestaurants.map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{restaurant.name}</p>
                        <p className="text-sm text-muted-foreground">/{restaurant.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary"
                          className={restaurant.is_open 
                            ? 'bg-success/20 text-success border-0' 
                            : 'bg-muted text-muted-foreground border-0'
                          }
                        >
                          {restaurant.is_open ? 'Aberto' : 'Fechado'}
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredRestaurants.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum restaurante encontrado
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Users */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Usuários ({filteredUsers.length})
                </CardTitle>
                <CardDescription>Todos os usuários cadastrados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {filteredUsers.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {profile.full_name || 'Sem nome'}
                        </p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => promoteToAdmin(profile.email)}
                        className="text-xs"
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        Tornar Admin
                      </Button>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
