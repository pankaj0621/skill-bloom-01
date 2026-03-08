import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Ban, Trash2, Edit, ShieldCheck, ShieldOff, UserX, UserCheck as UserCheckIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  xp: number;
  computed_level: string;
  current_streak: number;
  created_at: string;
  last_activity_date: string | null;
  role: string | null;
  stream: string | null;
  college: string | null;
  weekly_xp: number;
  bio: string | null;
  is_suspended?: boolean;
  suspend_reason?: string | null;
  suspended_until?: string | null;
}

interface UserManagementProps {
  profiles: Profile[];
}

const UserManagement = ({ profiles }: UserManagementProps) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({ display_name: "", username: "", bio: "", stream: "", college: "" });
  // Suspend form state
  const [suspendForm, setSuspendForm] = useState({ reason: "", duration: "permanent" });
  // Role form state
  const [newRole, setNewRole] = useState<string>("user");

  const filtered = profiles.filter(p => {
    const matchesSearch = !search || 
      (p.display_name?.toLowerCase().includes(search.toLowerCase())) ||
      (p.username?.toLowerCase().includes(search.toLowerCase())) ||
      p.id.includes(search);
    
    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "suspended" && p.is_suspended) ||
      (filterStatus === "active" && !p.is_suspended);
    
    return matchesSearch && matchesStatus;
  });

  // Suspend/Unsuspend mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ userId, suspend, reason, until }: { userId: string; suspend: boolean; reason?: string; until?: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: suspend,
          suspend_reason: suspend ? reason : null,
          suspended_at: suspend ? new Date().toISOString() : null,
          suspended_until: suspend ? until : null,
          suspended_by: suspend ? currentUser?.id : null,
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success(vars.suspend ? "User suspended" : "User unsuspended");
      setSuspendDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Edit profile mutation
  const editMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("Profile updated");
      setEditDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("User deleted");
      setDeleteDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Role mutation
  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (role === "user") {
        // Remove any admin/moderator roles
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .neq("role", "user");
        if (error) throw error;
      } else {
        // Upsert role
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role: role as any }, { onConflict: "user_id,role" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("Role updated");
      setRoleDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (p: Profile) => {
    setSelectedUser(p);
    setEditForm({
      display_name: p.display_name || "",
      username: p.username || "",
      bio: (p as any).bio || "",
      stream: p.stream || "",
      college: p.college || "",
    });
    setEditDialogOpen(true);
  };

  const openSuspend = (p: Profile) => {
    setSelectedUser(p);
    setSuspendForm({ reason: "", duration: "permanent" });
    setSuspendDialogOpen(true);
  };

  const openDelete = (p: Profile) => {
    setSelectedUser(p);
    setDeleteDialogOpen(true);
  };

  const openRole = (p: Profile) => {
    setSelectedUser(p);
    setNewRole("user");
    setRoleDialogOpen(true);
  };

  const handleSuspend = () => {
    if (!selectedUser) return;
    let until: string | null = null;
    if (suspendForm.duration === "7d") until = new Date(Date.now() + 7 * 86400000).toISOString();
    if (suspendForm.duration === "30d") until = new Date(Date.now() + 30 * 86400000).toISOString();
    suspendMutation.mutate({ userId: selectedUser.id, suspend: true, reason: suspendForm.reason, until });
  };

  const isSelf = (id: string) => id === currentUser?.id;

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Users ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} className={p.is_suspended ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p.avatar_url || ""} />
                          <AvatarFallback className="text-xs">{(p.display_name || "U")[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-none flex items-center gap-1.5">
                            {p.display_name || "Unknown"}
                            {isSelf(p.id) && <Badge variant="outline" className="text-[10px] px-1 py-0">You</Badge>}
                          </p>
                          {p.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.is_suspended ? (
                        <Badge variant="destructive" className="text-xs">Suspended</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{p.computed_level}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{p.xp?.toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {format(new Date(p.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Profile" onClick={() => openEdit(p)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Manage Role" onClick={() => openRole(p)} disabled={isSelf(p.id)}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </Button>
                        {p.is_suspended ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600"
                            title="Unsuspend"
                            onClick={() => suspendMutation.mutate({ userId: p.id, suspend: false })}
                          >
                            <UserCheckIcon className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600"
                            title="Suspend"
                            onClick={() => openSuspend(p)}
                            disabled={isSelf(p.id)}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Delete User"
                          onClick={() => openDelete(p)}
                          disabled={isSelf(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Edit {selectedUser?.display_name}'s profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Display Name</Label>
              <Input value={editForm.display_name} onChange={(e) => setEditForm(f => ({ ...f, display_name: e.target.value }))} />
            </div>
            <div>
              <Label>Username</Label>
              <Input value={editForm.username} onChange={(e) => setEditForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={editForm.bio} onChange={(e) => setEditForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stream</Label>
                <Input value={editForm.stream} onChange={(e) => setEditForm(f => ({ ...f, stream: e.target.value }))} />
              </div>
              <div>
                <Label>College</Label>
                <Input value={editForm.college} onChange={(e) => setEditForm(f => ({ ...f, college: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedUser && editMutation.mutate({ userId: selectedUser.id, updates: editForm })}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-amber-600" /> Suspend User</DialogTitle>
            <DialogDescription>Suspend {selectedUser?.display_name}. They won't be able to login.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reason</Label>
              <Textarea
                placeholder="Reason for suspension..."
                value={suspendForm.reason}
                onChange={(e) => setSuspendForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div>
              <Label>Duration</Label>
              <Select value={suspendForm.duration} onValueChange={(v) => setSuspendForm(f => ({ ...f, duration: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!suspendForm.reason || suspendMutation.isPending}>
              {suspendMutation.isPending ? "Suspending..." : "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedUser?.display_name}</strong>'s account and all their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Role</DialogTitle>
            <DialogDescription>Change role for {selectedUser?.display_name}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedUser && roleMutation.mutate({ userId: selectedUser.id, role: newRole })}
              disabled={roleMutation.isPending}
            >
              {roleMutation.isPending ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
