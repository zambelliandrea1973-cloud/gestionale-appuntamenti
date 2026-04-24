import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, UserPlus, Search, Edit, CreditCard, History } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StaffUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  createdAt?: string;
  referralCode?: string;
}

export default function StaffManagementPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [, setIsEditDialogOpen] = useState(false);
  const [, setIsPaymentHistoryDialogOpen] = useState(false);
  const [, setIsBankingDialogOpen] = useState(false);

  const [formError, setFormError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [, setSelectedUser] = useState<StaffUser | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "staff"
  });

  const { data: staffUsers = [], isLoading, error } = useQuery({
    queryKey: ['/api/staff/users'],
    queryFn: async () => {
      const response = await fetch('/api/staff/users', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        await response.text();
        throw new Error(`Failed to fetch staff users: ${response.status}`);
      }

      const data = await response.json();
      return data;
    },
  });

  const handleAddUser = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      setFormError(t('staffManagementBasic.requiredFields'));
      return;
    }

    setIsCreating(true);
    setFormError("");

    try {
      const response = await fetch('/api/staff/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
        setFormData({ username: "", email: "", password: "", role: "staff" });
        setIsAddDialogOpen(false);
        toast({
          title: t('staffManagementBasic.success'),
          description: t('staffManagementBasic.successDescription'),
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || t('staffManagementBasic.createError'));
      }
    } catch (err: any) {
      setFormError(err.message || t('staffManagementBasic.genericCreateError'));
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: err.message || t('staffManagementBasic.createUnable'),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClick = (user: StaffUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleBankingClick = (user: StaffUser) => {
    setSelectedUser(user);
    setIsBankingDialogOpen(true);
  };

  const handlePaymentHistoryClick = (user: StaffUser) => {
    setSelectedUser(user);
    setIsPaymentHistoryDialogOpen(true);
  };

  const filteredUsers = staffUsers.filter((user: StaffUser) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>
            {t('staffManagementBasic.loadError')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('staffManagementBasic.title')}</h1>
          <p className="text-muted-foreground">{t('staffManagementBasic.subtitle')}</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>{t('staffManagementBasic.addStaff')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('staffManagementBasic.addDialogTitle')}</DialogTitle>
                <DialogDescription>
                  {t('staffManagementBasic.addDialogDescription')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {formError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('common.error')}</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">{t('staffManagementBasic.usernameLabel')}</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder={t('staffManagementBasic.usernamePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('staffManagementBasic.emailLabel')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={t('staffManagementBasic.emailPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('staffManagementBasic.passwordLabel')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={t('staffManagementBasic.passwordPlaceholder')}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isCreating}
                >
                  {t('staffManagementBasic.cancel')}
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('staffManagementBasic.creating')}
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      {t('staffManagementBasic.createUser')}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('staffManagementBasic.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((user: StaffUser) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{user.username}</CardTitle>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </div>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(user)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {t('staffManagementBasic.editButton')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBankingClick(user)}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  {t('staffManagementBasic.bankingButton')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaymentHistoryClick(user)}
                >
                  <History className="h-4 w-4 mr-1" />
                  {t('staffManagementBasic.historyButton')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('staffManagementBasic.noStaffFound')}</p>
        </div>
      )}
    </div>
  );
}
