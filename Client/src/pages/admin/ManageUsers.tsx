import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import {
  Plus, UserIcon, Search, Pencil, Clock,
  Users as UsersIcon, Key as KeyIcon, Trash2,
  Sparkles, ShieldCheck, MoreVertical, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import { ListSkeleton } from '@/components/ui/SkeletonCards';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ─────────────── tiny avatar component ─────────────── */
function UserAvatar({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' | 'lg' }) {
  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base' };
  const active = user.status === 'active';
  return (
    <div className="relative inline-flex shrink-0">
      <div className={cn(
        'rounded-full flex items-center justify-center font-bold tracking-tight select-none',
        sizes[size],
        active
          ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
      )}>
        {initials}
      </div>
      {user.isOnline && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111318] shadow-sm" />
      )}
    </div>
  );
}

/* ─────────────── stat card ─────────────── */
function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: number; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="flex items-center gap-4 bg-white dark:bg-[#1A1D24] rounded-2xl border border-slate-100 dark:border-white/[0.06] px-5 py-4 shadow-sm">
      <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', accent)}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-800 dark:text-white leading-none">{value}</p>
      </div>
    </div>
  );
}

/* ─────────────── field component ─────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</Label>
      {children}
    </div>
  );
}

const fieldCls = 'h-11 rounded-xl bg-slate-50 dark:bg-[#0E1117] border border-slate-200 dark:border-white/[0.08] font-medium text-sm focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 transition-all';

/* ═══════════════════════════════════════════════════════════ */
export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', username: '', password: '' });
  const [editFormData, setEditFormData] = useState({ name: '', username: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({ password: '', confirmPassword: '' });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => { fetchUsers(false); }, []);

  useSocket({
    'USER_CREATED': () => fetchUsers(true),
    'USER_UPDATED': () => fetchUsers(true),
    'USER_DELETED': () => fetchUsers(true),
  });

  const fetchUsers = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await getUsersApi();
      setUsers(data.filter((u: User) => u.role === 'BILLER'));
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const openAddDialog = () => { setFormData({ name: '', username: '', password: '' }); setIsDialogOpen(true); };
  const openEditDialog = (user: User) => { setEditingUser(user); setEditFormData({ name: user.name, username: user.username }); setIsEditDialogOpen(true); };
  const openPasswordDialog = (user: User) => { setEditingUser(user); setPasswordFormData({ password: '', confirmPassword: '' }); setIsPasswordDialogOpen(true); };
  const openDeleteDialog = (user: User) => { setUserToDelete(user); setIsDeleteDialogOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const username = formData.username.trim().toLowerCase();
    const password = formData.password.trim();
    if (!name || !username || !password) return toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
    if (password.length < 6) return toast({ title: 'Error', description: 'Password must be 6+ characters', variant: 'destructive' });
    try {
      const newUser = await createUserApi({ name, username, password, role: 'BILLER', status: 'active' } as any);
      setUsers([...users, newUser]);
      toast({ title: 'User created successfully' });
      setIsDialogOpen(false);
    } catch { toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' }); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = editFormData.name.trim();
    const username = editFormData.username.trim().toLowerCase();
    if (!name || !username) return toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
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
    } catch { toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' }); }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (passwordFormData.password.length < 6) return toast({ title: 'Error', description: 'Password must be 6+ characters', variant: 'destructive' });
    if (passwordFormData.password !== passwordFormData.confirmPassword) return toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
    try {
      const updated = await updateUserApi(editingUser.id, { password: passwordFormData.password });
      if (updated) { toast({ title: 'Password updated successfully' }); setIsPasswordDialogOpen(false); setEditingUser(null); }
    } catch { toast({ title: 'Error', description: 'Failed to update password', variant: 'destructive' }); }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserApi(userToDelete.id);
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast({ title: 'User deleted successfully' });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch { toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' }); }
  };

  const toggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await updateUserApi(user.id, { status: newStatus });
      if (updated) {
        setUsers(users.map(u => u.id === user.id ? updated : u));
        toast({ title: `User ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
      }
    } catch { toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' }); }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const activeUsers = users.filter(u => u.status === 'active').length;
  const inactiveUsers = users.filter(u => u.status === 'inactive').length;
  const onlineUsers = users.filter(u => u.isOnline).length;

  return (
    <div className="min-h-full bg-[#F5F6FA] dark:bg-[#0E1117] p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Staff Management</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage biller accounts and access permissions</p>
          </div>
          <Button
            onClick={openAddDialog}
            className="gap-2 h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-200 dark:shadow-indigo-900/40 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Biller
          </Button>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Staff" value={users.length} icon={UsersIcon} accent="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600" />
          <StatCard label="Active" value={activeUsers} icon={ShieldCheck} accent="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" />
          <StatCard label="Restricted" value={inactiveUsers} icon={KeyIcon} accent="bg-slate-100 dark:bg-slate-800 text-slate-400" />
          <StatCard label="Online Now" value={onlineUsers} icon={TrendingUp} accent="bg-violet-50 dark:bg-violet-500/10 text-violet-600" />
        </div>

        {/* ── Search + Table ── */}
        <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-slate-100 dark:border-white/[0.06] shadow-sm overflow-hidden">

          {/* Table toolbar */}
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search by name or username…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 rounded-lg bg-slate-50 dark:bg-[#0E1117] border border-slate-200 dark:border-white/[0.08] text-sm focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:block">
              {filteredUsers.length} of {users.length} members
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                  {['Member', 'Username', 'Status', 'Last Seen', 'Access', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50 dark:border-white/[0.03]">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-4 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" style={{ width: j === 0 ? '160px' : j === 5 ? '80px' : '100px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <UsersIcon className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No members found</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Try adjusting your search query</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredUsers.map((user, idx) => (
                      <motion.tr
                        key={user.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25, delay: idx * 0.03 }}
                        className={cn(
                          'border-b last:border-0 border-slate-50 dark:border-white/[0.03] transition-colors',
                          'hover:bg-slate-50/70 dark:hover:bg-white/[0.02]',
                          user.status === 'inactive' && 'opacity-60'
                        )}
                      >
                        {/* Member */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={user} size="md" />
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-white leading-tight">{user.name}</p>
                              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Biller</p>
                            </div>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">@{user.username}</span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <Badge className={cn(
                            'rounded-full px-2.5 text-[10px] font-semibold border-0',
                            user.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          )}>
                            <span className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400')} />
                            {user.status === 'active' ? 'Active' : 'Restricted'}
                          </Badge>
                        </td>

                        {/* Last Seen */}
                        <td className="px-5 py-3.5">
                          {user.isOnline ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-xs font-medium">Online now</span>
                            </div>
                          ) : user.lastLogin ? (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs">{formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600">Never</span>
                          )}
                        </td>

                        {/* Access toggle */}
                        <td className="px-5 py-3.5">
                          <Switch
                            checked={user.status === 'active'}
                            onCheckedChange={() => toggleUserStatus(user)}
                            className="data-[state=checked]:bg-indigo-600 scale-90"
                          />
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl border-slate-100 dark:border-white/[0.08]">
                              <DropdownMenuItem onClick={() => openEditDialog(user)} className="gap-2 cursor-pointer text-sm font-medium">
                                <Pencil className="h-3.5 w-3.5" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPasswordDialog(user)} className="gap-2 cursor-pointer text-sm font-medium">
                                <KeyIcon className="h-3.5 w-3.5" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDeleteDialog(user)} className="gap-2 cursor-pointer text-sm font-medium text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-500/10">
                                <Trash2 className="h-3.5 w-3.5" /> Delete Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          {!isLoading && filteredUsers.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-50 dark:border-white/[0.04] text-xs text-slate-400">
              Showing {filteredUsers.length} member{filteredUsers.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ DIALOGS ══════════════ */}

      {/* Add User */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl border border-slate-100 dark:border-white/[0.08] shadow-2xl bg-white dark:bg-[#1A1D24] max-w-md p-0">
          <div className="p-7">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-indigo-900/40">
                  <Plus className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Add New Biller</DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 mt-0.5">Create a new staff account with access credentials</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full Name">
                <Input placeholder="e.g. Rahul Sharma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={fieldCls} />
              </Field>
              <Field label="Username">
                <Input placeholder="e.g. rahul123" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className={fieldCls} />
              </Field>
              <Field label="Initial Password">
                <Input type="password" placeholder="Minimum 6 characters" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={fieldCls} />
              </Field>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-10 rounded-xl font-medium border-slate-200 dark:border-white/[0.08]">Cancel</Button>
                <Button type="submit" className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-200 dark:shadow-indigo-900/30">Create Account</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-2xl border border-slate-100 dark:border-white/[0.08] shadow-2xl bg-white dark:bg-[#1A1D24] max-w-md p-0">
          <div className="p-7">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Pencil className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Edit Details</DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 mt-0.5">Update account information for {editingUser?.name}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Field label="Full Name">
                <Input value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className={fieldCls} />
              </Field>
              <Field label="Username">
                <Input value={editFormData.username} onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })} className={fieldCls} />
              </Field>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1 h-10 rounded-xl font-medium border-slate-200 dark:border-white/[0.08]">Cancel</Button>
                <Button type="submit" className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Save Changes</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="rounded-2xl border border-slate-100 dark:border-white/[0.08] shadow-2xl bg-white dark:bg-[#1A1D24] max-w-md p-0">
          <div className="p-7">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                  <KeyIcon className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Reset Password</DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 mt-0.5">Set a new password for {editingUser?.name}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Field label="New Password">
                <Input type="password" placeholder="Minimum 6 characters" value={passwordFormData.password} onChange={(e) => setPasswordFormData({ ...passwordFormData, password: e.target.value })} className={fieldCls} />
              </Field>
              <Field label="Confirm Password">
                <Input type="password" placeholder="Repeat new password" value={passwordFormData.confirmPassword} onChange={(e) => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })} className={fieldCls} />
              </Field>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="flex-1 h-10 rounded-xl font-medium border-slate-200 dark:border-white/[0.08]">Cancel</Button>
                <Button type="submit" className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold">Update Password</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-2xl border border-slate-100 dark:border-white/[0.08] shadow-2xl bg-white dark:bg-[#1A1D24] max-w-sm p-0">
          <div className="p-7">
            <div className="h-11 w-11 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white mb-1">Delete Account?</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              This will permanently remove <strong className="text-slate-700 dark:text-slate-300">{userToDelete?.name}</strong>'s account and revoke all system access. This action cannot be undone.
            </DialogDescription>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1 h-10 rounded-xl font-medium border-slate-200 dark:border-white/[0.08]">Cancel</Button>
              <Button onClick={handleDeleteUser} className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md shadow-red-200 dark:shadow-red-900/30">Delete Account</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}