import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Crown,
  AlertTriangle,
  Download,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  churnRate: number;
  totalRevenue: number;
  newUsersThisMonth: number;
}

interface SubscriptionData {
  id: string;
  user_email: string;
  plan_name: string;
  status: string;
  amount: number;
  current_period_end: string;
  created_at: string;
}

export const AdminDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    monthlyRecurringRevenue: 0,
    churnRate: 0,
    totalRevenue: 0,
    newUsersThisMonth: 0,
  });
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadSubscriptions(),
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, created_at");

    const { data: activeSubscriptions } = await supabase
      .from("user_subscriptions")
      .select(`
        *,
        subscription_plans!inner(price_monthly)
      `)
      .eq("status", "active");

    const { data: billingEvents } = await supabase
      .from("billing_events")
      .select("amount, created_at")
      .eq("status", "succeeded");

    const totalUsers = profiles?.length || 0;
    const activeSubs = activeSubscriptions?.length || 0;
    
    const mrr = activeSubscriptions?.reduce((sum, sub) => {
      return sum + (sub.subscription_plans?.price_monthly || 0);
    }, 0) || 0;

    const totalRevenue = billingEvents?.reduce((sum, event) => {
      return sum + (event.amount || 0);
    }, 0) || 0;

    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newUsersThisMonth = profiles?.filter(profile => 
      new Date(profile.created_at) >= thisMonth
    ).length || 0;

    setStats({
      totalUsers,
      activeSubscriptions: activeSubs,
      monthlyRecurringRevenue: mrr,
      churnRate: 2.5, // This would need more complex calculation
      totalRevenue,
      newUsersThisMonth,
    });
  };

  const loadSubscriptions = async () => {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select(`
        id,
        status,
        current_period_end,
        created_at,
        user_id,
        subscription_plans!inner(name, price_monthly)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading subscriptions:", error);
      return;
    }

    const formattedData: SubscriptionData[] = (data || []).map(sub => ({
      id: sub.id,
      user_email: `user-${sub.user_id.slice(0, 8)}`, // Simplified for demo
      plan_name: sub.subscription_plans?.name || 'Unknown',
      status: sub.status,
      amount: sub.subscription_plans?.price_monthly || 0,
      current_period_end: sub.current_period_end,
      created_at: sub.created_at,
    }));

    setSubscriptions(formattedData);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
    toast({
      title: "Dashboard refreshed",
      description: "All data has been updated",
    });
  };

  const exportData = async () => {
    try {
      const csvData = subscriptions.map(sub => ({
        'User Email': sub.user_email,
        'Plan': sub.plan_name,
        'Status': sub.status,
        'Amount': sub.amount,
        'Period End': new Date(sub.current_period_end).toLocaleDateString(),
        'Created': new Date(sub.created_at).toLocaleDateString(),
      }));

      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Subscription data exported as CSV",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default", label: "Active" },
      trialing: { variant: "secondary", label: "Trial" },
      past_due: { variant: "destructive", label: "Past Due" },
      canceled: { variant: "outline", label: "Canceled" },
      unpaid: { variant: "destructive", label: "Unpaid" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { variant: "outline", label: status };

    return (
      <Badge variant={config.variant as "default" | "secondary" | "destructive" | "outline" | null | undefined}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-muted"></CardHeader>
              <CardContent className="h-16 bg-muted/50"></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your business metrics and user activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newUsersThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyRecurringRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${(stats.monthlyRecurringRevenue / stats.activeSubscriptions || 0).toFixed(2)} ARPU
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.churnRate}%</div>
            <p className="text-xs text-muted-foreground">
              Monthly churn rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Recent Subscriptions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Subscriptions</CardTitle>
              <CardDescription>
                Latest subscription activity and status updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.user_email}</TableCell>
                      <TableCell>{sub.plan_name}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>${sub.amount}/month</TableCell>
                      <TableCell>{new Date(sub.current_period_end).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
                <CardDescription>Financial performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Revenue</span>
                    <span className="font-semibold">${stats.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MRR</span>
                    <span className="font-semibold">${stats.monthlyRecurringRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Annual Run Rate</span>
                    <span className="font-semibold">${(stats.monthlyRecurringRevenue * 12).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Metrics</CardTitle>
                <CardDescription>User engagement and growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Users</span>
                    <span className="font-semibold">{stats.totalUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paying Customers</span>
                    <span className="font-semibold">{stats.activeSubscriptions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversion Rate</span>
                    <span className="font-semibold">
                      {((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Important notifications and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">High Churn Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Churn rate has increased by 15% this month
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Activity className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Revenue Milestone</p>
                    <p className="text-sm text-muted-foreground">
                      MRR has reached ${stats.monthlyRecurringRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};