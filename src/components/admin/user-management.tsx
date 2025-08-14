'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    Users,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Mail,
    Calendar,
    AlertTriangle
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface User {
    id: string
    email: string
    role: string
    isActive: boolean
    emailVerified: boolean
    createdAt: string
    updatedAt: string
}



export function UserManagement() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [roleFilter, statusFilter])

    const fetchUsers = async () => {
        try {
            setLoading(true)

            const params = new URLSearchParams()
            if (roleFilter) params.append('role', roleFilter)
            if (statusFilter) params.append('isActive', statusFilter)

            const response = await fetch(`/api/admin/users?${params.toString()}`)

            if (!response.ok) {
                throw new Error('Failed to fetch users')
            }

            const data = await response.json()
            setUsers(data.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleEditUser = async (updates: Partial<User>) => {
        if (!selectedUser) return

        try {
            setActionLoading(true)

            const response = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    updates
                })
            })

            if (!response.ok) {
                throw new Error('Failed to update user')
            }

            await fetchUsers()
            setShowEditDialog(false)
            setSelectedUser(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update user')
        } finally {
            setActionLoading(false)
        }
    }

    const handleDeleteUser = async () => {
        if (!selectedUser) return

        try {
            setActionLoading(true)

            const response = await fetch(`/api/admin/users?userId=${selectedUser.id}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('Failed to deactivate user')
            }

            await fetchUsers()
            setShowDeleteDialog(false)
            setSelectedUser(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to deactivate user')
        } finally {
            setActionLoading(false)
        }
    }

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'system_admin': return 'destructive'
            case 'admin': return 'default'
            case 'facility': return 'secondary'
            case 'donor': return 'outline'
            default: return 'outline'
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const columns = [
        {
            header: 'User',
            accessorKey: 'email',
            cell: ({ row }: { row: { original: User } }) => (
                <div className="space-y-1">
                    <div className="font-medium">{row.original.email}</div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>Joined {formatDate(row.original.createdAt)}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Role',
            accessorKey: 'role',
            cell: ({ row }: { row: { original: User } }) => (
                <Badge variant={getRoleBadgeVariant(row.original.role)}>
                    {row.original.role.replace('_', ' ').toUpperCase()}
                </Badge>
            )
        },
        {
            header: 'Status',
            accessorKey: 'isActive',
            cell: ({ row }: { row: { original: User } }) => (
                <div className="space-y-1">
                    <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
                        {row.original.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {!row.original.emailVerified && (
                        <div className="flex items-center space-x-1 text-xs text-amber-600">
                            <Mail className="h-3 w-3" />
                            <span>Unverified</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Actions',
            id: 'actions',
            cell: ({ row }: { row: { original: User } }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() => {
                                setSelectedUser(row.original)
                                setShowEditDialog(true)
                            }}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                setSelectedUser(row.original)
                                setShowDeleteDialog(true)
                            }}
                            className="text-red-600"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deactivate
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-600">Manage system users and their permissions</p>
                </div>
                <Button onClick={fetchUsers} variant="outline">
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-800">{error}</span>
                    </div>
                </div>
            )}

            {/* Filters and Search */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <span>User Directory</span>
                    </CardTitle>
                    <CardDescription>
                        Search and filter system users
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by email or role..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Roles</SelectItem>
                                <SelectItem value="donor">Donor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="facility">Facility</SelectItem>
                                <SelectItem value="system_admin">System Admin</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Status</SelectItem>
                                <SelectItem value="true">Active</SelectItem>
                                <SelectItem value="false">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DataTable
                        columns={columns}
                        data={filteredUsers}
                        searchKey="email"
                    />
                </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user role and status
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Email</label>
                                <Input value={selectedUser.email} disabled />
                            </div>

                            <div>
                                <label className="text-sm font-medium">Role</label>
                                <Select
                                    defaultValue={selectedUser.role}
                                    onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="donor">Donor</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="facility">Facility</SelectItem>
                                        <SelectItem value="system_admin">System Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Status</label>
                                <Select
                                    defaultValue={selectedUser.isActive.toString()}
                                    onValueChange={(value) => setSelectedUser({ ...selectedUser, isActive: value === 'true' })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Active</SelectItem>
                                        <SelectItem value="false">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => handleEditUser({
                                role: selectedUser?.role,
                                isActive: selectedUser?.isActive
                            })}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete User Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Deactivate User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to deactivate this user? This action will disable their access to the system.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="font-medium">{selectedUser.email}</div>
                            <div className="text-sm text-gray-600">Role: {selectedUser.role}</div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <LoadingSpinner size="sm" /> : 'Deactivate User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}