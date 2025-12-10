import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Textarea } from './ui/textarea'
import { Switch } from './ui/switch'
import { Checkbox } from './ui/checkbox'
import {
  Shield,
  Users,
  UserPlus,
  Lock,
  Key,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  Search
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import {
  useGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  usePermissions,
  useSecurityPolicies,
  useUpdateSessionTimeout,
  useUpdatePasswordExpiry,
  useAssignUserToGroups,
  useResetUserPassword,
  useUnlockUser,
  type Group,
  type Permission
} from '../hooks/useGroups'
import { useRoles, usePrivileges, useCreateRole, useUpdateRole, useDeleteRole } from '../hooks/useRoles'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog'

export function UserManagement() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [resetReason, setResetReason] = useState('')
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [newGroup, setNewGroup] = useState({ name: '', permission_ids: [] as number[] })
  const [isAssignGroupOpen, setIsAssignGroupOpen] = useState(false)
  const [selectedUserForGroup, setSelectedUserForGroup] = useState<any>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])
  const [isManagePermissionsOpen, setIsManagePermissionsOpen] = useState(false)
  const [selectedGroupForPermissions, setSelectedGroupForPermissions] = useState<Group | null>(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([])

  // Role management states
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false)
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false)
  const [isDeleteRoleOpen, setIsDeleteRoleOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [roleSearchQuery, setRoleSearchQuery] = useState('')
  const [privilegeSearch, setPrivilegeSearch] = useState('')
  const [roleFormData, setRoleFormData] = useState({
    role_name: '',
    description: '',
    privilege_ids: [] as number[]
  })

  // Form states for new user
  const [newUser, setNewUser] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: '',
    unit_ids: [] as number[],
    department_ids: [] as number[],
    section_ids: [] as number[],
    status: 'Active'
  })

  // Fetch users from API
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      const { data } = await api.get(`/auth/users/?${params.toString()}`)
      return data
    }
  })

  // Fetch units from API
  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data } = await api.get('/auth/units/')
      return data
    }
  })

  // Fetch departments from API
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/auth/departments/')
      return data
    }
  })

  // Fetch sections from API
  const { data: sectionsData } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const { data } = await api.get('/auth/sections/')
      return data
    }
  })

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      // Prepare payload with arrays for unit_ids, department_ids, and section_ids
      const payload = {
        ...userData,
        unit_ids: userData.unit_ids || [],
        department_ids: userData.department_ids || [],
        section_ids: userData.section_ids || [],
      }
      // Remove empty values
      if (payload.unit_ids.length === 0) delete payload.unit_ids
      if (payload.department_ids.length === 0) delete payload.department_ids
      if (payload.section_ids.length === 0) delete payload.section_ids

      const { data } = await api.post('/auth/users/', payload)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsAddUserOpen(false)
      setNewUser({
        username: '',
        full_name: '',
        email: '',
        password: '',
        role: '',
        unit_ids: [],
        department_ids: [],
        section_ids: [],
        status: 'Active'
      })

      // Show temporary password if generated
      if (data.temporary_password) {
        toast(
          `User created successfully!\n\n` +
          `Username: ${data.username}\n` +
          `Temporary Password: ${data.temporary_password}\n\n` +
          `IMPORTANT:\n` +
          `• Please share this password with the user securely\n` +
          `• The user will be required to change this password on first login\n` +
          `• This password will NOT be shown again\n` +
          `• Email functionality will be implemented to send passwords automatically`
        )
      } else {
        toast.success('User created successfully! User must change password on first login.')
      }
    },
    onError: (error: any) => {
      const detail = error.response?.data
      const message = typeof detail === 'string' ? detail : JSON.stringify(detail)
      toast.error('Failed to create user: ' + (message || error.message))
    }
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...userData }: any) => {
      const { data } = await api.put(`/auth/users/${id}/`, userData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsEditUserOpen(false)
      setSelectedUser(null)
      toast.success('User updated successfully!')
    },
    onError: (error: any) => {
      toast.error('Failed to update user: ' + (error.response?.data?.error || error.message))
    }
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/auth/users/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted successfully!')
    },
    onError: (error: any) => {
      toast.error('Failed to delete user: ' + (error.response?.data?.error || error.message))
    }
  })

  const users = usersData?.results || []
  const units = unitsData?.results || []
  const departments = departmentsData?.results || []
  const sections = sectionsData?.results || []

  // Fetch groups, permissions, and security policies
  const { data: groupsData, isLoading: loadingGroups } = useGroups()
  const { data: permissionsData } = usePermissions()
  const { data: securityPoliciesData } = useSecurityPolicies()
  const updateSessionTimeout = useUpdateSessionTimeout()
  const updatePasswordExpiry = useUpdatePasswordExpiry()

  const groups = groupsData?.results || []
  const permissions = permissionsData?.results || []

  // Fetch roles and privileges
  const { data: rolesData, isLoading: loadingRoles } = useRoles()
  const { data: privilegesData, isLoading: loadingPrivileges } = usePrivileges(true)

  const roles = rolesData?.results || rolesData || []
  const privilegeGroups = privilegesData?.grouped || []

  // Group mutations
  const createGroupMutation = useCreateGroup()
  const updateGroupMutation = useUpdateGroup()
  const deleteGroupMutation = useDeleteGroup()
  const assignUserToGroupsMutation = useAssignUserToGroups()
  const resetPasswordMutation = useResetUserPassword()
  const unlockUserMutation = useUnlockUser()

  // Role mutations
  const createRoleMutation = useCreateRole()
  const updateRoleMutation = useUpdateRole()
  const deleteRoleMutation = useDeleteRole()

  const getStatusBadge = (status: string) => {
    if (status === 'Active') {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    }
    if (status === 'Disabled') {
      return <Badge className="bg-gray-100 text-gray-800">Disabled</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.full_name || !newUser.email || !newUser.password) {
      toast.error('Please fill in all required fields')
      return
    }

    createUserMutation.mutate(newUser)
  }

  const handleEditUser = (user: any) => {
    // Create a safe copy of the user object
    const userCopy = {
      ...user,
      role: user.role?.id || user.role,  // Extract role ID if it's an object
      unit_ids: user.units?.map((u: any) => u.id) || (user.unit?.id ? [user.unit.id] : []),
      department_ids: user.departments?.map((d: any) => d.id) || [],
      section_ids: user.sections?.map((s: any) => s.id) || (user.section?.id ? [user.section.id] : []),
    }
    setSelectedUser(userCopy)
    setIsEditUserOpen(true)
  }

  const handleUpdateUser = () => {
    if (!selectedUser) return

    const payload: any = {
      id: selectedUser.id,
      full_name: selectedUser.full_name,
      email: selectedUser.email,
      status: selectedUser.status
    }

    // Add role if provided
    if (selectedUser.role) {
      payload.role = selectedUser.role
    }

    // Add unit_ids, department_ids, and section_ids arrays
    if (selectedUser.unit_ids && selectedUser.unit_ids.length > 0) {
      payload.unit_ids = selectedUser.unit_ids
    }
    if (selectedUser.department_ids && selectedUser.department_ids.length > 0) {
      payload.department_ids = selectedUser.department_ids
    }
    if (selectedUser.section_ids && selectedUser.section_ids.length > 0) {
      payload.section_ids = selectedUser.section_ids
    }

    updateUserMutation.mutate(payload)
  }

  const handleDeleteUser = (userId: number) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate(userId)
    }
  }

  const handleResetPassword = (user: any) => {
    const newPassword = prompt('Enter new temporary password for ' + user.username + ':')
    if (!newPassword) return

    const reason = prompt('Enter reason for password reset:') || 'Administrative password reset'

    resetPasswordMutation.mutate(
      { user_id: user.id, new_password: newPassword, reason },
      {
        onSuccess: () => {
          toast(`Password reset successfully for ${user.username}`)
        },
        onError: (error: any) => {
          toast.error('Failed to reset password: ' + (error.response?.data?.error || error.message))
        }
      }
    )
  }

  const handleUnlockUser = (user: any) => {
    const reason = prompt('Enter reason for unlocking account:') || 'Administrative unlock'

    unlockUserMutation.mutate(
      { user_id: user.id, reason },
      {
        onSuccess: () => {
          toast(`Account unlocked successfully for ${user.username}`)
        },
        onError: (error: any) => {
          toast.error('Failed to unlock account: ' + (error.response?.data?.error || error.message))
        }
      }
    )
  }

  const renderUsersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900">User Management</h2>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-900 hover:bg-blue-800">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input
                    placeholder="e.g., john.doe"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="e.g., John Doe"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="john.doe@company.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newUser.role || undefined}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role: any) => (
                      <SelectItem key={role.id} value={role.id.toString()}>{role.role_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Units (Select Multiple)</Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {units.length === 0 ? (
                    <p className="text-sm text-gray-500">No units available</p>
                  ) : (
                    units.map((unit: any) => (
                      <div key={unit.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`unit-${unit.id}`}
                          checked={newUser.unit_ids.includes(unit.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewUser({ ...newUser, unit_ids: [...newUser.unit_ids, unit.id] })
                            } else {
                              // When unchecking a unit, remove departments and sections from that unit
                              const deptIdsToRemove = departments
                                .filter((d: any) => d.unit?.id === unit.id)
                                .map((d: any) => d.id)
                              const sectionIdsToRemove = sections
                                .filter((s: any) => deptIdsToRemove.includes(s.department?.id))
                                .map((s: any) => s.id)
                              setNewUser({
                                ...newUser,
                                unit_ids: newUser.unit_ids.filter(id => id !== unit.id),
                                department_ids: newUser.department_ids.filter(id => !deptIdsToRemove.includes(id)),
                                section_ids: newUser.section_ids.filter(id => !sectionIdsToRemove.includes(id))
                              })
                            }
                          }}
                        />
                        <label htmlFor={`unit-${unit.id}`} className="text-sm cursor-pointer">
                          {unit.unit_code} - {unit.unit_name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                {newUser.unit_ids.length > 0 && (
                  <p className="text-xs text-gray-500">{newUser.unit_ids.length} unit(s) selected</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Departments (Select Multiple)</Label>
                {newUser.unit_ids.length === 0 ? (
                  <div className="border rounded-md p-3 bg-gray-50">
                    <p className="text-sm text-gray-500">Please select at least one unit first</p>
                  </div>
                ) : (
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                    {departments.filter((dept: any) => newUser.unit_ids.includes(dept.unit?.id)).length === 0 ? (
                      <p className="text-sm text-gray-500">No departments available for selected units</p>
                    ) : (
                      departments
                        .filter((dept: any) => newUser.unit_ids.includes(dept.unit?.id))
                        .map((dept: any) => (
                          <div key={dept.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`dept-${dept.id}`}
                              checked={newUser.department_ids.includes(dept.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewUser({ ...newUser, department_ids: [...newUser.department_ids, dept.id] })
                                } else {
                                  // When unchecking a department, remove sections from that department
                                  const sectionIdsToRemove = sections
                                    .filter((s: any) => s.department?.id === dept.id)
                                    .map((s: any) => s.id)
                                  setNewUser({
                                    ...newUser,
                                    department_ids: newUser.department_ids.filter(id => id !== dept.id),
                                    section_ids: newUser.section_ids.filter(id => !sectionIdsToRemove.includes(id))
                                  })
                                }
                              }}
                            />
                            <label htmlFor={`dept-${dept.id}`} className="text-sm cursor-pointer">
                              {dept.department_name}
                              <span className="text-xs text-gray-500 ml-1">
                                ({dept.unit?.unit_code})
                              </span>
                            </label>
                          </div>
                        ))
                    )}
                  </div>
                )}
                {newUser.department_ids.length > 0 && (
                  <p className="text-xs text-gray-500">{newUser.department_ids.length} department(s) selected</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Sections (Select Multiple)</Label>
                {newUser.department_ids.length === 0 ? (
                  <div className="border rounded-md p-3 bg-gray-50">
                    <p className="text-sm text-gray-500">Please select at least one department first</p>
                  </div>
                ) : (
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                    {sections.filter((section: any) => newUser.department_ids.includes(section.department?.id)).length === 0 ? (
                      <p className="text-sm text-gray-500">No sections available for selected departments</p>
                    ) : (
                      sections
                        .filter((section: any) => newUser.department_ids.includes(section.department?.id))
                        .map((section: any) => (
                          <div key={section.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`section-${section.id}`}
                              checked={newUser.section_ids.includes(section.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewUser({ ...newUser, section_ids: [...newUser.section_ids, section.id] })
                                } else {
                                  setNewUser({ ...newUser, section_ids: newUser.section_ids.filter(id => id !== section.id) })
                                }
                              }}
                            />
                            <label htmlFor={`section-${section.id}`} className="text-sm cursor-pointer">
                              {section.section_name}
                              {section.department && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({section.department.department_name})
                                </span>
                              )}
                            </label>
                          </div>
                        ))
                    )}
                  </div>
                )}
                {newUser.section_ids.length > 0 && (
                  <p className="text-xs text-gray-500">{newUser.section_ids.length} section(s) selected</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter user password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newUser.status}
                    onValueChange={(value) => setNewUser({ ...newUser, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-blue-900 hover:bg-blue-800"
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search users by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Total Users: {users.length}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingUsers ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Unit(s)</TableHead>
                  <TableHead>Department(s)</TableHead>
                  <TableHead>Section(s)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-gray-500">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.groups && user.groups.length > 0 ? (
                        <div className="space-y-1">
                          {user.groups.map((group: any) => (
                            <Badge key={group.id} variant="outline" className="mr-1">
                              {group.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline">No Role</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.units && user.units.length > 0 ? (
                        <div className="space-y-1">
                          {user.units.map((unit: any) => (
                            <div key={unit.id}>
                              <div className="font-medium">{unit.unit_code}</div>
                              <div className="text-xs text-gray-500">{unit.unit_name}</div>
                            </div>
                          ))}
                        </div>
                      ) : user.unit ? (
                        <div>
                          <div className="font-medium">{user.unit.unit_code}</div>
                          <div className="text-xs text-gray-500">{user.unit.unit_name}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.departments && user.departments.length > 0 ? (
                        <div className="space-y-1">
                          {user.departments.map((dept: any) => (
                            <div key={dept.id}>{dept.department_name}</div>
                          ))}
                        </div>
                      ) : user.section?.department ? (
                        <div>
                          <div>{user.section.department.department_name}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.sections && user.sections.length > 0 ? (
                        <div className="space-y-1">
                          {user.sections.map((section: any) => (
                            <div key={section.id}>{section.section_name}</div>
                          ))}
                        </div>
                      ) : user.section ? (
                        <div>
                          <div>{user.section.section_name}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(user.status)}
                        {user.password_expired && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Password Expired
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleString('en-GB', { hour12: false })
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {/* <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignGroups(user)}
                          title="Manage Groups"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button> */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.status === 'Locked' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnlockUser(user)}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            title="Unlock Account"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(user)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Reset Password"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        {/* <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={user.id === currentUser?.id}
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button> */}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const handleCreateGroup = async () => {
    if (!newGroup.name) {
      toast.error('Please enter a group name')
      return
    }

    try {
      await createGroupMutation.mutateAsync(newGroup)
      setIsAddGroupOpen(false)
      setNewGroup({ name: '', permission_ids: [] })
      toast.success('Group created successfully!')
    } catch (error: any) {
      toast.error('Failed to create group: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleEditGroup = (group: Group) => {
    setSelectedGroup(group)
    setIsEditGroupOpen(true)
  }

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return

    try {
      await updateGroupMutation.mutateAsync({
        id: selectedGroup.id,
        name: selectedGroup.name
      })
      setIsEditGroupOpen(false)
      setSelectedGroup(null)
      toast.success('Group updated successfully!')
    } catch (error: any) {
      toast.error('Failed to update group: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleDeleteGroup = async (groupId: number) => {
    if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        await deleteGroupMutation.mutateAsync(groupId)
        toast.success('Group deleted successfully!')
      } catch (error: any) {
        toast.error('Failed to delete group: ' + (error.response?.data?.error || error.message))
      }
    }
  }

  const handleAssignGroups = (user: any) => {
    setSelectedUserForGroup(user)
    setSelectedGroupIds(user.groups?.map((g: any) => g.id) || [])
    setIsAssignGroupOpen(true)
  }

  const handleSaveGroupAssignment = async () => {
    if (!selectedUserForGroup) return

    try {
      await assignUserToGroupsMutation.mutateAsync({
        user_id: selectedUserForGroup.id,
        group_ids: selectedGroupIds
      })
      setIsAssignGroupOpen(false)
      setSelectedUserForGroup(null)
      setSelectedGroupIds([])
      toast.success('User groups updated successfully!')
    } catch (error: any) {
      toast.error('Failed to update user groups: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleManagePermissions = (group: Group) => {
    setSelectedGroupForPermissions(group)
    // Convert permission codenames to IDs by matching with available permissions
    const permissionIds: number[] = []
    if (permissionsData?.results && group.permissions) {
      group.permissions.forEach(codename => {
        const perm = permissionsData.results.find((p: Permission) => p.codename === codename)
        if (perm) {
          permissionIds.push(perm.id)
        }
      })
    }
    setSelectedPermissionIds(permissionIds)
    setIsManagePermissionsOpen(true)
  }

  const handleSavePermissions = async () => {
    if (!selectedGroupForPermissions) return

    try {
      await updateGroupMutation.mutateAsync({
        id: selectedGroupForPermissions.id,
        permission_ids: selectedPermissionIds
      })
      setIsManagePermissionsOpen(false)
      setSelectedGroupForPermissions(null)
      setSelectedPermissionIds([])
      toast.success('Group permissions updated successfully!')
    } catch (error: any) {
      toast.error('Failed to update group permissions: ' + (error.response?.data?.error || error.message))
    }
  }

  const renderSecurityPoliciesTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900">Security Policies</h2>
      </div>

      {securityPoliciesData ? (
        <>
          {/* Password Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Password Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {/* Password Expiry with Input */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Password Expiry (Days)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      className="w-[200px]"
                      defaultValue={securityPoliciesData.password_policy.password_expiry_days}
                      onBlur={async (e) => {
                        const value = parseInt(e.target.value)
                        if (value >= 1 && value <= 90 && value !== securityPoliciesData.password_policy.password_expiry_days) {
                          try {
                            await updatePasswordExpiry.mutateAsync({
                              password_expiry_days: value
                            })
                            toast.success('Password expiry updated successfully')
                          } catch (error: any) {
                            toast.error(error.response?.data?.error || 'Failed to update password expiry')
                            e.target.value = String(securityPoliciesData.password_policy.password_expiry_days)
                          }
                        } else if (value < 1 || value > 90) {
                          toast.error('Password expiry must be between 1 and 90 days')
                          e.target.value = String(securityPoliciesData.password_policy.password_expiry_days)
                        }
                      }}
                    />
                    <p className="text-sm text-gray-500">
                      Current: {securityPoliciesData.password_policy.password_expiry_days} days (max 90)
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    All users' passwords will expire after this many days. Changes apply to new password changes.
                  </p>
                </div>

                {/* Other password policies (read-only) */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Minimum Length</Label>
                    <Badge variant="outline">{securityPoliciesData.password_policy.min_length} characters</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Require Uppercase</Label>
                    <Switch checked={securityPoliciesData.password_policy.require_uppercase} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Require Lowercase</Label>
                    <Switch checked={securityPoliciesData.password_policy.require_lowercase} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Require Numbers</Label>
                    <Switch checked={securityPoliciesData.password_policy.require_numbers} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Require Special Characters</Label>
                    <Switch checked={securityPoliciesData.password_policy.require_special} disabled />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                Session Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {/* Session Timeout with Dropdown */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Session Timeout</Label>
                  <div className="flex items-center gap-4">
                    <Select
                      value={String(securityPoliciesData.session_policy.session_timeout_minutes)}
                      onValueChange={async (value) => {
                        try {
                          await updateSessionTimeout.mutateAsync({
                            session_timeout_minutes: parseInt(value)
                          })
                          toast.success('Session timeout updated successfully')
                        } catch (error: any) {
                          toast.error(error.response?.data?.error || 'Failed to update session timeout')
                        }
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {securityPoliciesData.session_policy.timeout_options?.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      Current: {securityPoliciesData.session_policy.session_timeout_minutes} minutes
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Changes apply to new sessions immediately. Existing sessions retain their original timeout.
                  </p>
                </div>

                
              </div>
            </CardContent>
          </Card>

          {/* Account Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Account Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label>Max Login Attempts</Label>
                  <Badge variant="outline">{securityPoliciesData.account_policy.max_login_attempts}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Lockout Duration</Label>
                  <Badge variant="outline">{securityPoliciesData.account_policy.lockout_duration_minutes} minutes</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Email Verification</Label>
                  <Switch checked={securityPoliciesData.account_policy.require_email_verification} disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-gray-500">Loading security policies...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // Role management handlers
  const resetRoleForm = () => {
    setRoleFormData({
      role_name: '',
      description: '',
      privilege_ids: []
    })
    setPrivilegeSearch('')
  }

  const handleCreateRole = () => {
    if (!roleFormData.role_name.trim()) {
      toast.error('Role name is required')
      return
    }

    createRoleMutation.mutate(roleFormData, {
      onSuccess: () => {
        toast.success('Role created successfully')
        setIsCreateRoleOpen(false)
        resetRoleForm()
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to create role')
      }
    })
  }

  const handleEditRole = (role: any) => {
    setSelectedRole(role)
    setRoleFormData({
      role_name: role.role_name,
      description: role.description,
      privilege_ids: role.privilege_ids || []
    })
    setIsEditRoleOpen(true)
  }

  const handleUpdateRole = () => {
    if (!selectedRole) return

    updateRoleMutation.mutate(
      { id: selectedRole.id, data: roleFormData },
      {
        onSuccess: () => {
          toast.success('Role updated successfully')
          setIsEditRoleOpen(false)
          setSelectedRole(null)
          resetRoleForm()
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.error || 'Failed to update role')
        }
      }
    )
  }

  const handleDeleteRole = () => {
    if (!selectedRole) return

    deleteRoleMutation.mutate(selectedRole.id, {
      onSuccess: () => {
        toast.success('Role deleted successfully')
        setIsDeleteRoleOpen(false)
        setSelectedRole(null)
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to delete role')
      }
    })
  }

  const togglePrivilege = (privId: number) => {
    setRoleFormData((prev) => ({
      ...prev,
      privilege_ids: prev.privilege_ids.includes(privId)
        ? prev.privilege_ids.filter((id) => id !== privId)
        : [...prev.privilege_ids, privId]
    }))
  }

  const selectAllInGroup = (groupPrivs: any[]) => {
    const groupPrivIds = groupPrivs.map((p) => p.id)
    const allSelected = groupPrivIds.every((id) =>
      roleFormData.privilege_ids.includes(id)
    )

    if (allSelected) {
      setRoleFormData((prev) => ({
        ...prev,
        privilege_ids: prev.privilege_ids.filter(
          (id) => !groupPrivIds.includes(id)
        )
      }))
    } else {
      setRoleFormData((prev) => ({
        ...prev,
        privilege_ids: [
          ...prev.privilege_ids,
          ...groupPrivIds.filter((id) => !prev.privilege_ids.includes(id))
        ]
      }))
    }
  }

  const filteredRoles = (roles || []).filter((role: any) =>
    role.role_name?.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(roleSearchQuery.toLowerCase())
  )

  const filteredPrivilegeGroups = (privilegeGroups || []).map((group: any) => ({
    ...group,
    privileges: privilegeSearch
      ? (group.privileges || []).filter((priv: any) =>
          priv.name?.toLowerCase().includes(privilegeSearch.toLowerCase()) ||
          priv.codename?.toLowerCase().includes(privilegeSearch.toLowerCase())
        )
      : (group.privileges || [])
  })).filter((group: any) => (group.privileges || []).length > 0)

  const renderRolesTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900">Groups & Roles</h2>
        </div>
        <Button onClick={() => {
          resetRoleForm()
          setIsCreateRoleOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search roles..."
            value={roleSearchQuery}
            onChange={(e) => setRoleSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Roles Table */}
      <Card>
        <CardContent className="p-0">
          {loadingRoles ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No roles found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map((role: any) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.role_name}</TableCell>
                      <TableCell style={{ textWrap: 'auto' }} className="text-sm text-gray-600 " >
                        {role.description || '-'}
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
                          <Badge variant="outline">Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!role.is_core_role && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRole(role)
                                setIsDeleteRoleOpen(true)
                              }}
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
    </div>
  )

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Groups / Roles', icon: UserCheck },
    { id: 'security-policies', label: 'Security Policies', icon: Shield }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-gray-900">User Management</h1>
        {/* <p className="text-gray-600">Manage users, roles, and security policies</p> */}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center space-x-2 data-[state=active]:bg-blue-900 data-[state=active]:text-white"
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="users" className="m-0">
            {renderUsersTab()}
          </TabsContent>
          <TabsContent value="roles" className="m-0">
            {renderRolesTab()}
          </TabsContent>
          <TabsContent value="security-policies" className="m-0">
            {renderSecurityPoliciesTab()}
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit User Dialog */}
      {isEditUserOpen && selectedUser && (
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
            <div className="flex flex-col max-h-[85vh]">
              <DialogHeader className="p-6 pb-4 flex-shrink-0">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Edit className="h-5 w-5 text-blue-900" />
                  Edit User
                </DialogTitle>
                <DialogDescription>
                  Update user information, organizational assignment, and account status
                </DialogDescription>
              </DialogHeader>
              {selectedUser && (
              <div className="space-y-6 overflow-y-auto px-6 pb-2" style={{ maxHeight: 'calc(85vh - 160px)' }}>
              {/* User Info Section */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">User Information</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium text-gray-600">Username:</span>
                    <span className="text-gray-900">{selectedUser.username}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Full Name *</Label>
                    <Input
                      value={selectedUser.full_name || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Email Address *</Label>
                    <Input
                      type="email"
                      value={selectedUser.email || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                      placeholder="user@company.com"
                    />
                  </div>
                </div>
              </div>

              {/* Organizational Assignment Section */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Organizational Assignment</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Units (Select Multiple)</Label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {units.length === 0 ? (
                        <p className="text-sm text-gray-500">No units available</p>
                      ) : (
                        units.map((unit: any) => (
                          <div key={unit.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-unit-${unit.id}`}
                              checked={selectedUser.unit_ids?.includes(unit.id) || false}
                              onCheckedChange={(checked) => {
                                const currentIds = selectedUser.unit_ids || []
                                if (checked) {
                                  setSelectedUser({ ...selectedUser, unit_ids: [...currentIds, unit.id] })
                                } else {
                                  // When unchecking a unit, remove departments and sections from that unit
                                  const deptIdsToRemove = departments
                                    .filter((d: any) => d.unit?.id === unit.id)
                                    .map((d: any) => d.id)
                                  const sectionIdsToRemove = sections
                                    .filter((s: any) => deptIdsToRemove.includes(s.department?.id))
                                    .map((s: any) => s.id)
                                  setSelectedUser({
                                    ...selectedUser,
                                    unit_ids: currentIds.filter(id => id !== unit.id),
                                    department_ids: (selectedUser.department_ids || []).filter(id => !deptIdsToRemove.includes(id)),
                                    section_ids: (selectedUser.section_ids || []).filter(id => !sectionIdsToRemove.includes(id))
                                  })
                                }
                              }}
                            />
                            <label htmlFor={`edit-unit-${unit.id}`} className="text-sm cursor-pointer">
                              {unit.unit_code} - {unit.unit_name}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    {selectedUser.unit_ids?.length > 0 && (
                      <p className="text-xs text-gray-500">{selectedUser.unit_ids.length} unit(s) selected</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Departments (Select Multiple)</Label>
                    {!selectedUser.unit_ids || selectedUser.unit_ids.length === 0 ? (
                      <div className="border rounded-md p-3 bg-gray-50">
                        <p className="text-sm text-gray-500">Please select at least one unit first</p>
                      </div>
                    ) : (
                      <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                        {departments.filter((dept: any) => selectedUser.unit_ids?.includes(dept.unit?.id)).length === 0 ? (
                          <p className="text-sm text-gray-500">No departments available for selected units</p>
                        ) : (
                          departments
                            .filter((dept: any) => selectedUser.unit_ids?.includes(dept.unit?.id))
                            .map((dept: any) => (
                              <div key={dept.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`edit-dept-${dept.id}`}
                                  checked={selectedUser.department_ids?.includes(dept.id) || false}
                                  onCheckedChange={(checked) => {
                                    const currentIds = selectedUser.department_ids || []
                                    if (checked) {
                                      setSelectedUser({ ...selectedUser, department_ids: [...currentIds, dept.id] })
                                    } else {
                                      // When unchecking a department, remove sections from that department
                                      const sectionIdsToRemove = sections
                                        .filter((s: any) => s.department?.id === dept.id)
                                        .map((s: any) => s.id)
                                      setSelectedUser({
                                        ...selectedUser,
                                        department_ids: currentIds.filter(id => id !== dept.id),
                                        section_ids: (selectedUser.section_ids || []).filter(id => !sectionIdsToRemove.includes(id))
                                      })
                                    }
                                  }}
                                />
                                <label htmlFor={`edit-dept-${dept.id}`} className="text-sm cursor-pointer">
                                  {dept.department_name}
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({dept.unit?.unit_code})
                                  </span>
                                </label>
                              </div>
                            ))
                        )}
                      </div>
                    )}
                    {selectedUser.department_ids?.length > 0 && (
                      <p className="text-xs text-gray-500">{selectedUser.department_ids.length} department(s) selected</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Sections (Select Multiple)</Label>
                    {!selectedUser.department_ids || selectedUser.department_ids.length === 0 ? (
                      <div className="border rounded-md p-3 bg-gray-50">
                        <p className="text-sm text-gray-500">Please select at least one department first</p>
                      </div>
                    ) : (
                      <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                        {sections.filter((section: any) => selectedUser.department_ids?.includes(section.department?.id)).length === 0 ? (
                          <p className="text-sm text-gray-500">No sections available for selected departments</p>
                        ) : (
                          sections
                            .filter((section: any) => selectedUser.department_ids?.includes(section.department?.id))
                            .map((section: any) => (
                              <div key={section.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`edit-section-${section.id}`}
                                  checked={selectedUser.section_ids?.includes(section.id) || false}
                                  onCheckedChange={(checked) => {
                                    const currentIds = selectedUser.section_ids || []
                                    if (checked) {
                                      setSelectedUser({ ...selectedUser, section_ids: [...currentIds, section.id] })
                                    } else {
                                      setSelectedUser({ ...selectedUser, section_ids: currentIds.filter(id => id !== section.id) })
                                    }
                                  }}
                                />
                                <label htmlFor={`edit-section-${section.id}`} className="text-sm cursor-pointer">
                                  {section.section_name}
                                  {section.department && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({section.department.department_name})
                                    </span>
                                  )}
                                </label>
                              </div>
                            ))
                        )}
                      </div>
                    )}
                    {selectedUser.section_ids?.length > 0 && (
                      <p className="text-xs text-gray-500">{selectedUser.section_ids.length} section(s) selected</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Status Section */}
              <div className="space-y-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account Status & Role</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Status</Label>
                    <Select
                      value={selectedUser.status}
                      onValueChange={(value) => setSelectedUser({ ...selectedUser, status: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span>Active</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Disabled">
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                            <span>Disabled</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Locked">
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                            <span>Locked</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Role *</Label>
                    <Select
                      value={selectedUser.role?.toString() || ''}
                      onValueChange={(value) => setSelectedUser({ ...selectedUser, role: parseInt(value) })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {(roles || []).map((role: any) => (
                          <SelectItem key={role.role_id || role.id} value={(role.role_id || role.id)?.toString()}>
                            {role.role_name}
                            {role.is_core_role && (
                              <span className="ml-2 text-xs text-gray-500">(Core)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedUser.password_expired && (
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <p className="text-xs text-red-600 font-medium">
                      Password has expired. Account is locked. Use the Unlock button to reset.
                    </p>
                  </div>
                )}
              </div>

              </div>
              )}
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 p-6 pt-4 flex-shrink-0 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsEditUserOpen(false)}
                  disabled={updateUserMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-900 hover:bg-blue-800"
                  onClick={handleUpdateUser}
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group: {selectedGroup?.name}</DialogTitle>
            <DialogDescription>Modify group name and settings</DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input
                  value={selectedGroup.name || ''}
                  onChange={(e) => setSelectedGroup({ ...selectedGroup, name: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditGroupOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-blue-900 hover:bg-blue-800"
                  onClick={handleUpdateGroup}
                  disabled={updateGroupMutation.isPending}
                >
                  {updateGroupMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign User to Groups Dialog */}
      <Dialog open={isAssignGroupOpen} onOpenChange={setIsAssignGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Groups: {selectedUserForGroup?.full_name}</DialogTitle>
            <DialogDescription>Select which groups this user should belong to</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Groups</Label>
              <div className="space-y-2">
                {groups.map((group: Group) => (
                  <div key={group.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={selectedGroupIds.includes(group.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedGroupIds([...selectedGroupIds, group.id])
                        } else {
                          setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id))
                        }
                      }}
                    />
                    <label htmlFor={`group-${group.id}`} className="text-sm cursor-pointer">
                      {group.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAssignGroupOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-blue-900 hover:bg-blue-800"
                onClick={handleSaveGroupAssignment}
                disabled={assignUserToGroupsMutation.isPending}
              >
                {assignUserToGroupsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <Dialog open={isManagePermissionsOpen} onOpenChange={setIsManagePermissionsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions: {selectedGroupForPermissions?.name}</DialogTitle>
            <DialogDescription>Add or remove permissions for this group</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="text-sm text-gray-500 mb-2">
                Select permissions to assign to this group. Users in this group will inherit these permissions.
              </div>
              {permissionsData?.grouped ? (
                <div className="space-y-4">
                  {Object.entries(permissionsData.grouped).map(([contentTypeId, perms]: [string, any]) => {
                    const permList = perms as Permission[]
                    if (permList.length === 0) return null

                    // Get the app name from the first permission
                    const appName = permList[0]?.name.split('|')[0]?.trim() || 'Other'

                    return (
                      <div key={contentTypeId} className="border rounded-md p-3">
                        <div className="font-medium text-sm mb-2 text-blue-900">{appName}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {permList.map((permission: Permission) => {
                            const permName = permission.name.split('|')[1]?.trim() || permission.name
                            return (
                              <div key={permission.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`perm-${permission.id}`}
                                  checked={selectedPermissionIds.includes(permission.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedPermissionIds([...selectedPermissionIds, permission.id])
                                    } else {
                                      setSelectedPermissionIds(selectedPermissionIds.filter(id => id !== permission.id))
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`perm-${permission.id}`}
                                  className="text-sm cursor-pointer"
                                  title={permission.codename}
                                >
                                  {permName}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {permissions.map((permission: Permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`perm-${permission.id}`}
                        checked={selectedPermissionIds.includes(permission.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPermissionIds([...selectedPermissionIds, permission.id])
                          } else {
                            setSelectedPermissionIds(selectedPermissionIds.filter(id => id !== permission.id))
                          }
                        }}
                      />
                      <label htmlFor={`perm-${permission.id}`} className="text-sm cursor-pointer">
                        {permission.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsManagePermissionsOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-blue-900 hover:bg-blue-800"
                onClick={handleSavePermissions}
                disabled={updateGroupMutation.isPending}
              >
                {updateGroupMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Permissions'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Role</DialogTitle>
            <DialogDescription>
              Create a role with custom privileges
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Role Name *</Label>
                <Input
                  value={roleFormData.role_name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, role_name: e.target.value })}
                  placeholder="e.g., Document Controller"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  placeholder="Brief description of this role's responsibilities"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Privileges ({roleFormData.privilege_ids.length} selected)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search privileges..."
                    value={privilegeSearch}
                    onChange={(e) => setPrivilegeSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto mt-2">
                  {loadingPrivileges ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Accordion type="multiple" className="w-full">
                      {filteredPrivilegeGroups.map((group: any) => {
                        const allSelected = group.privileges.every((p: any) =>
                          roleFormData.privilege_ids.includes(p.id)
                        )

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
                                {(group.privileges || []).map((priv: any) => (
                                  <div key={priv.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`create-priv-${priv.id}`}
                                      checked={roleFormData.privilege_ids.includes(priv.id)}
                                      onCheckedChange={() => togglePrivilege(priv.id)}
                                    />
                                    <label
                                      htmlFor={`create-priv-${priv.id}`}
                                      className="text-sm cursor-pointer"
                                    >
                                      {priv.name}
                                      <span className="text-gray-500 ml-2">
                                        ({priv.codename})
                                      </span>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                      })}
                    </Accordion>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={createRoleMutation.isPending}
              className="bg-blue-900 hover:bg-blue-800"
            >
              {createRoleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Role'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Role</DialogTitle>
            <DialogDescription>
              Update role details and privileges
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Role Name *</Label>
                <Input
                  value={roleFormData.role_name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, role_name: e.target.value })}
                  placeholder="e.g., Document Controller"
                  disabled={selectedRole?.is_core_role}
                />
                {selectedRole?.is_core_role && (
                  <p className="text-xs text-gray-500">Core roles cannot be renamed</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  placeholder="Brief description of this role's responsibilities"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Privileges ({roleFormData.privilege_ids.length} selected)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search privileges..."
                    value={privilegeSearch}
                    onChange={(e) => setPrivilegeSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto mt-2">
                  {loadingPrivileges ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Accordion type="multiple" className="w-full">
                      {filteredPrivilegeGroups.map((group: any) => {
                        const allSelected = group.privileges.every((p: any) =>
                          roleFormData.privilege_ids.includes(p.id)
                        )

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
                                {(group.privileges || []).map((priv: any) => (
                                  <div key={priv.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-priv-${priv.id}`}
                                      checked={roleFormData.privilege_ids.includes(priv.id)}
                                      onCheckedChange={() => togglePrivilege(priv.id)}
                                    />
                                    <label
                                      htmlFor={`edit-priv-${priv.id}`}
                                      className="text-sm cursor-pointer"
                                    >
                                      {priv.name}
                                      <span className="text-gray-500 ml-2">
                                        ({priv.codename})
                                      </span>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                      })}
                    </Accordion>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditRoleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updateRoleMutation.isPending}
              className="bg-blue-900 hover:bg-blue-800"
            >
              {updateRoleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <AlertDialog open={isDeleteRoleOpen} onOpenChange={setIsDeleteRoleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{selectedRole?.role_name}"?
              This action cannot be undone.
              {selectedRole?.user_count > 0 && (
                <div className="mt-2 p-2 bg-red-50 rounded text-red-600">
                  Warning: This role has {selectedRole.user_count} user(s) assigned.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={deleteRoleMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteRoleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction> */}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
