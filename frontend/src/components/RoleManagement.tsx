import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Lock,
  Loader2,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";
import { useRoles, usePrivileges, useCreateRole, useUpdateRole, useDeleteRole } from '../hooks/useRoles';

interface Role {
  id: number;
  role_name: string;
  description: string;
  user_count: number;
  permission_count: number;
  privilege_count: number;
  privileges: Privilege[];
  privilege_ids: number[];
  is_core_role: boolean;
}

interface Privilege {
  id: number;
  name: string;
  codename: string;
  description?: string;
  category?: string;
}

interface PrivilegeGroup {
  category: string;
  category_display: string;
  privileges: Privilege[];
}

export function RoleManagement() {
  // API Hooks
  const { data: rolesData, isLoading: loadingRoles } = useRoles();
  const { data: privilegesData, isLoading: loadingPrivileges } = usePrivileges(true);
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  const roles = rolesData?.results || [];
  const privilegeGroups: PrivilegeGroup[] = privilegesData?.grouped || [];
  const allPrivileges: Privilege[] = privilegeGroups.flatMap(g => g.privileges);

  // State management
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    role_name: "",
    description: "",
    privilege_ids: [] as number[],
  });

  // Privilege search
  const [privilegeSearch, setPrivilegeSearch] = useState("");

  // Filter roles based on search
  const filteredRoles = roles.filter((role: Role) =>
    role.role_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter privileges based on search
  const filteredPrivilegeGroups = privilegeGroups.map(group => ({
    ...group,
    privileges: privilegeSearch
      ? group.privileges.filter((priv) =>
          priv.name.toLowerCase().includes(privilegeSearch.toLowerCase()) ||
          priv.codename.toLowerCase().includes(privilegeSearch.toLowerCase())
        )
      : group.privileges
  })).filter(group => group.privileges.length > 0);

  // Reset form
  const resetForm = () => {
    setFormData({
      role_name: "",
      description: "",
      privilege_ids: [],
    });
    setPrivilegeSearch("");
  };

  // Handle create role
  const handleCreateRole = () => {
    if (!formData.role_name.trim()) {
      toast.error("Role name is required");
      return;
    }

    createRoleMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Role created successfully");
        setIsCreateDialogOpen(false);
        resetForm();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || "Failed to create role");
      },
    });
  };

  // Handle edit role
  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      role_name: role.role_name,
      description: role.description,
      privilege_ids: role.privilege_ids || [],
    });
    setIsEditDialogOpen(true);
  };

  // Handle update role
  const handleUpdateRole = () => {
    if (!selectedRole) return;

    updateRoleMutation.mutate(
      { id: selectedRole.id, data: formData },
      {
        onSuccess: () => {
          toast.success("Role updated successfully");
          setIsEditDialogOpen(false);
          setSelectedRole(null);
          resetForm();
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.error || "Failed to update role");
        },
      }
    );
  };

  // Handle delete role
  const handleDeleteRole = () => {
    if (!selectedRole) return;

    deleteRoleMutation.mutate(selectedRole.id, {
      onSuccess: () => {
        toast.success("Role deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedRole(null);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || "Failed to delete role");
      },
    });
  };

  // Toggle privilege selection
  const togglePrivilege = (privId: number) => {
    setFormData((prev) => ({
      ...prev,
      privilege_ids: prev.privilege_ids.includes(privId)
        ? prev.privilege_ids.filter((id) => id !== privId)
        : [...prev.privilege_ids, privId],
    }));
  };

  // Select all privileges in a group
  const selectAllInGroup = (groupPrivs: Privilege[]) => {
    const groupPrivIds = groupPrivs.map((p) => p.id);
    const allSelected = groupPrivIds.every((id) =>
      formData.privilege_ids.includes(id)
    );

    if (allSelected) {
      // Deselect all
      setFormData((prev) => ({
        ...prev,
        privilege_ids: prev.privilege_ids.filter(
          (id) => !groupPrivIds.includes(id)
        ),
      }));
    } else {
      // Select all
      setFormData((prev) => ({
        ...prev,
        privilege_ids: [
          ...prev.privilege_ids,
          ...groupPrivIds.filter((id) => !prev.privilege_ids.includes(id)),
        ],
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Create and manage custom roles with specific permissions. The 4 core roles (System Admin, Section Head, Store Head, User) cannot be deleted.
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Roles Table */}
          {loadingRoles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-center">Privileges</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No roles found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map((role: Role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        {role.role_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {role.description || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {role.user_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {role.privilege_count || role.privileges?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {role.is_core_role ? (
                          <Badge variant="default" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Core
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!role.is_core_role && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedRole(role);
                                setIsDeleteDialogOpen(true);
                              }}
                              disabled={role.user_count > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role with specific permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Role Name */}
            <div className="space-y-2">
              <Label htmlFor="role_name">Role Name *</Label>
              <Input
                id="role_name"
                value={formData.role_name}
                onChange={(e) =>
                  setFormData({ ...formData, role_name: e.target.value })
                }
                placeholder="e.g., Quality Auditor"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this role's responsibilities"
                rows={3}
              />
            </div>

            {/* Privileges */}
            <div className="space-y-2">
              <Label>Privileges ({formData.privilege_ids.length} selected)</Label>

              {/* Privilege Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search privileges..."
                  value={privilegeSearch}
                  onChange={(e) => setPrivilegeSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Privileges by Category */}
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                {loadingPrivileges ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {filteredPrivilegeGroups.map((group) => {
                      const allSelected = group.privileges.every((p) =>
                        formData.privilege_ids.includes(p.id)
                      );

                      return (
                        <AccordionItem key={group.category} value={group.category}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={() => selectAllInGroup(group.privileges)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="font-medium">{group.category_display}</span>
                              <Badge variant="outline">{group.privileges.length}</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pl-6">
                              {group.privileges.map((priv) => (
                                <div key={priv.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`priv-${priv.id}`}
                                    checked={formData.privilege_ids.includes(priv.id)}
                                    onCheckedChange={() => togglePrivilege(priv.id)}
                                  />
                                  <label
                                    htmlFor={`priv-${priv.id}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {priv.name}
                                    <span className="text-muted-foreground ml-2">
                                      ({priv.codename})
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={createRoleMutation.isPending}
            >
              {createRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog - Similar to Create */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.role_name}</DialogTitle>
            <DialogDescription>
              {selectedRole?.is_core_role
                ? "You can modify permissions for core roles but cannot rename or delete them"
                : "Modify role details and permissions"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Role Name - Disabled for core roles */}
            <div className="space-y-2">
              <Label htmlFor="edit_role_name">Role Name *</Label>
              <Input
                id="edit_role_name"
                value={formData.role_name}
                onChange={(e) =>
                  setFormData({ ...formData, role_name: e.target.value })
                }
                disabled={selectedRole?.is_core_role}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            {/* Privileges - Same as Create Dialog */}
            <div className="space-y-2">
              <Label>Privileges ({formData.privilege_ids.length} selected)</Label>

              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search privileges..."
                  value={privilegeSearch}
                  onChange={(e) => setPrivilegeSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                {loadingPrivileges ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {filteredPrivilegeGroups.map((group) => {
                      const allSelected = group.privileges.every((p) =>
                        formData.privilege_ids.includes(p.id)
                      );

                      return (
                        <AccordionItem key={group.category} value={group.category}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={() => selectAllInGroup(group.privileges)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="font-medium">{group.category_display}</span>
                              <Badge variant="outline">{group.privileges.length}</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pl-6">
                              {group.privileges.map((priv) => (
                                <div key={priv.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`edit-priv-${priv.id}`}
                                    checked={formData.privilege_ids.includes(priv.id)}
                                    onCheckedChange={() => togglePrivilege(priv.id)}
                                  />
                                  <label
                                    htmlFor={`edit-priv-${priv.id}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {priv.name}
                                    <span className="text-muted-foreground ml-2">
                                      ({priv.codename})
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedRole(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{selectedRole?.role_name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedRole(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRoleMutation.isPending}
            >
              {deleteRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
