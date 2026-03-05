import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getUsersApi, createUserApi, updateUserApi, deleteUserApi } from '@/services/api';
import { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Plus, UserIcon, Search, X, Pencil, Clock, Users as UsersIcon, Key as KeyIcon, Trash2, Sparkles, ShieldCheck, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import { ListSkeleton } from '@/components/ui/SkeletonCards';

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', username: '', password: '' });
  const [editFormData, setEditFormData] = useState({ name: '', username: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers(false);
    // Polling removed - replaced by WebSocket events
  }, []);

  // WebSocket Listeners for real-time user management
  useSocket({
    'USER_CREATED': () => fetchUsers(true),
    'USER_UPDATED': () => fetchUsers(true),
    'USER_DELETED': () => fetchUsers(true),
  });

  const fetchUsers = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await getUsersApi();
      setUsers(data.filter(u => u.role === 'BILLER'));
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const openAddDialog = () => {
    setFormData({ name: '', username: '', password: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditFormData({ name: user.name, username: user.username });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = editFormData.name.trim();
    const username = editFormData.username.trim().toLowerCase();

    if (!name || !username) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    try {
      if (editingUser) {
        const updated = await updateUserApi(editingUser.id, { name, username });
        if (updated) {
          setUsers(users.map(u => u.id === editingUser.id ? updated : u));
          toast({ title: 'User updated successfully' });
          setIsEditDialogOpen(false);
          setEditingUser(null);
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const username = formData.username.trim().toLowerCase();
    const password = formData.password.trim();

    if (!name || !username || !password) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be 6+ characters', variant: 'destructive' });
      return;
    }

    try {
      const newUser = await createUserApi({ name, username, password, role: 'BILLER', status: 'active' } as any);
      setUsers([...users, newUser]);
      toast({ title: 'User created successfully' });
      setIsDialogOpen(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' });
    }
  };

  const toggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await updateUserApi(user.id, { status: newStatus });
      if (updated) {
        setUsers(users.map(u => u.id === user.id ? updated : u));
        toast({ title: `User ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({ password: '', confirmPassword: '' });

  const openPasswordDialog = (user: User) => {
    setEditingUser(user);
    setPasswordFormData({ password: '', confirmPassword: '' });
    setIsPasswordDialogOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (passwordFormData.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be 6+ characters', variant: 'destructive' });
      return;
    }

    if (passwordFormData.password !== passwordFormData.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    try {
      const updated = await updateUserApi(editingUser.id, { password: passwordFormData.password });
      if (updated) {
        toast({ title: 'Password updated successfully' });
        setIsPasswordDialogOpen(false);
        setEditingUser(null);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update password', variant: 'destructive' });
    }
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserApi(userToDelete.id);
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast({ title: 'User deleted successfully' });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeUsers = users.filter(u => u.status === 'active').length;
  const inactiveUsers = users.filter(u => u.status === 'inactive').length;

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-yellow-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-4">
      <div className="max-w-[1400px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md">
              <UsersIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Manage Users
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-xs font-medium">Manage your billing counter staff</p>
            </div>
          </div>
          <Button
            onClick={openAddDialog}
            size="sm"
            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md h-10 px-4">
            <Plus className="h-4 w-4 mr-2" />
            Add New Biller
          </Button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-2 border-white/50 dark:border-slate-700/50 shadow-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Staff</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white mt-1">{users.length}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                  <UsersIcon className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2 border-white/50 dark:border-slate-700/50 shadow-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active</p>
                  <p className="text-xl font-black text-green-600 dark:text-green-500 mt-1">{activeUsers}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2 border-white/50 dark:border-slate-700/50 shadow-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Restricted</p>
                  <p className="text-xl font-black text-slate-400 mt-1">{inactiveUsers}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <KeyIcon className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Section */}
        <Card className="rounded-2xl border-2 border-white/50 dark:border-slate-700/50 shadow-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
              <Input
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-white dark:bg-slate-900 border-none text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Staff Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <ListSkeleton key={i} />
            ))
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredUsers.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-20 text-center bg-white/50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-orange-200"
                >
                  <div className="h-20 w-20 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                    <UserIcon className="h-10 w-10 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">No users found</h3>
                  <p className="text-slate-500">Try a different search term</p>
                </motion.div>
              ) : (
                filteredUsers.map((user, idx) => (
                  <motion.div
                    key={user.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <Card className={cn(
                      "group relative overflow-hidden rounded-2xl border-2 h-full transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10",
                      user.status === 'active'
                        ? "bg-white dark:bg-slate-800 border-orange-100 dark:border-slate-700 hover:border-orange-400"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
                    )}>
                      <div className="absolute top-0 right-0 p-1.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} className="h-7 w-7 rounded-lg bg-white/90 dark:bg-slate-800 shadow-sm hover:text-orange-600"><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openPasswordDialog(user)} className="h-7 w-7 rounded-lg bg-white/90 dark:bg-slate-800 shadow-sm hover:text-orange-600"><KeyIcon className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(user)} className="h-7 w-7 rounded-lg bg-white/90 dark:bg-slate-800 shadow-sm hover:text-red-500"><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>

                      <CardHeader className="pb-2 pt-6 flex flex-col items-center text-center">
                        <div className={cn(
                          "h-14 w-14 rounded-2xl flex items-center justify-center shadow-md relative mb-3 rotate-3 group-hover:rotate-0 transition-transform duration-500",
                          user.status === 'active' ? "bg-gradient-to-br from-orange-500 to-amber-600" : "bg-slate-200 dark:bg-slate-700"
                        )}>
                          <UserIcon className={cn("h-7 w-7", user.status === 'active' ? "text-white" : "text-slate-400")} />
                          {user.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                          )}
                        </div>
                        <h3 className="font-black text-base text-slate-800 dark:text-white leading-tight">
                          {user.name}
                        </h3>
                        <p className="text-xs font-bold text-orange-600 dark:text-orange-400">@{user.username}</p>
                      </CardHeader>

                      <CardContent className="px-4 pb-6">
                        <div className="flex flex-col gap-3 mt-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                            <span>Status</span>
                            <span>Account Access</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge className={cn(
                              "rounded-full px-2 text-[9px] h-5",
                              user.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                            )}>
                              {user.status.toUpperCase()}
                            </Badge>
                            <Switch
                              checked={user.status === 'active'}
                              onCheckedChange={() => toggleUserStatus(user)}
                              className="scale-75 data-[state=checked]:bg-orange-600"
                            />
                          </div>

                          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                {user.isOnline ? (
                                  <>
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-green-600 dark:text-green-500">ONLINE</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                    <span>OFFLINE</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {user.isOnline && user.lastLogin && (
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                <Sparkles className="h-3 w-3 text-orange-400" />
                                <span>Login: {new Date(user.lastLogin).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}

                            {!user.isOnline && user.lastLogout && (
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>Active {formatDistanceToNow(new Date(user.lastLogout), { addSuffix: true })}</span>
                              </div>
                            )}
                            {!user.isOnline && !user.lastLogout && user.lastLogin && (
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>Active {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Dialogs */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="rounded-3xl border-2 border-orange-100 dark:border-slate-800">
            <DialogHeader>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg mb-4">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-black">Add New Biller</DialogTitle>
              <DialogDescription>Create a new account for your billing counter staff.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="font-bold ml-1">Full Name</Label>
                <Input placeholder="e.g. Rahul Sharma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12 rounded-xl bg-orange-50/50 dark:bg-slate-900 border-none" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold ml-1">Username</Label>
                <Input placeholder="e.g. rahul123" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="h-12 rounded-xl bg-orange-50/50 dark:bg-slate-900 border-none" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold ml-1">Initial Password</Label>
                <Input type="password" placeholder="6+ characters" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="h-12 rounded-xl bg-orange-50/50 dark:bg-slate-900 border-none" />
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 font-black shadow-lg shadow-orange-500/20">CREATE ACCOUNT</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Edit Biller Details</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="font-bold ml-1">Full Name</Label>
                <Input value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="h-12 rounded-xl bg-orange-50/50 dark:bg-slate-900 border-none" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold ml-1">Username</Label>
                <Input value={editFormData.username} onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })} className="h-12 rounded-xl bg-orange-50/50 dark:bg-slate-900 border-none" />
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 font-black shadow-lg">UPDATE DETAILS</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Reset Password</DialogTitle>
              <DialogDescription>Updating password for <strong>{editingUser?.name}</strong></DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="font-bold ml-1">New Password</Label>
                <Input type="password" placeholder="6+ characters" value={passwordFormData.password} onChange={(e) => setPasswordFormData({ ...passwordFormData, password: e.target.value })} className="h-12 rounded-xl bg-orange-50/50 dark:bg-slate-900 border-none" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold ml-1">Confirm Password</Label>
                <Input type="password" placeholder="Repeat password" value={passwordFormData.confirmPassword} onChange={(e) => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })} className="h-12 rounded-xl bg-orange-50/50 dark:bg-slate-900 border-none" />
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 font-black shadow-lg">CHANGE PASSWORD</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="rounded-3xl border-2 border-red-100">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-red-600">Delete Account?</DialogTitle>
              <DialogDescription className="pt-2 text-slate-600">
                Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This will permanently remove their access to the system.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="rounded-xl font-bold">CANCEL</Button>
              <Button onClick={handleDeleteUser} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-lg shadow-red-500/20">YES, DELETE</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
