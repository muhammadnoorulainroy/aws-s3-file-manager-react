import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  PersonAdd,
  Delete,
  Edit,
  AdminPanelSettings,
  Person,
  Security,
  SupervisorAccount,
  Email,
  Save,
  Cancel,
  CloudOff,
  Search,
  Refresh,
} from '@mui/icons-material';
import { Pagination, Stack, Tooltip } from '@mui/material';
import { authService } from '../../services/authService';

interface AuthorizedUser {
  email: string;
  role: 'admin' | 'user';
  addedAt: string;
  addedBy: string;
}

interface UserListResponse {
  users: AuthorizedUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  currentUser?: {
    email: string;
    role: 'admin' | 'user';
  };
}

const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [currentUser, setCurrentUser] = useState<{ email: string; role: 'admin' | 'user' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthorizedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AuthorizedUser | null>(null);
  
  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });
  
  // Form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [editUserRole, setEditUserRole] = useState<'admin' | 'user'>('user');

  // Pagination handlers
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    fetchUsers(page);
  };

  const handleItemsPerPageChange = (event: any) => {
    const newItemsPerPage = parseInt(event.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    fetchUsers(1);
  };

  const handleFilterChange = () => {
    if (currentPage === 1) {
      fetchUsers(1);
    } else {
      setCurrentPage(1);
      fetchUsers(1);
    }
  };

  // Helper function to make authenticated requests
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const authHeaders = authService.getAuthHeaders();
    
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    });
  };

  // Fetch authorized users with pagination and filtering
  const fetchUsers = async (page: number = currentPage, resetFilters: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!authService.isAuthenticated()) {
        throw new Error('User not authenticated. Please sign in again.');
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search: resetFilters ? '' : searchTerm,
        role: resetFilters ? 'all' : roleFilter,
        sortBy: 'added_at',
        sortOrder: 'DESC'
      });
      
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : '';
      const response = await makeAuthenticatedRequest(`${baseUrl}/api/users/authorized?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }
      
      const data: UserListResponse = await response.json();
      setUsers(data.users || []);
      setCurrentUser(data.currentUser || null);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 20,
        hasNextPage: false,
        hasPrevPage: false,
      });
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      const errorMessage = err?.message || err?.toString() || 'Failed to fetch users';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new user
  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      setError('Email is required');
      return;
    }

    if (!currentUser || currentUser.role !== 'admin') {
      setError('Only administrators can add users');
      return;
    }

    try {
      setError(null);
      
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : '';
      const response = await makeAuthenticatedRequest(`${baseUrl}/api/users/authorized`, {
        method: 'POST',
        body: JSON.stringify({
          email: newUserEmail.trim().toLowerCase(),
          role: newUserRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add user: ${response.statusText}`);
      }

      // Refresh the user list
      await fetchUsers();
      
      // Reset form
      setNewUserEmail('');
      setNewUserRole('user');
      setIsAddDialogOpen(false);
    } catch (err: any) {
      console.error('Error adding user:', err);
      const errorMessage = err?.message || err?.toString() || 'Failed to add user';
      setError(errorMessage);
    }
  };

  // Edit user role
  const handleEditUser = async () => {
    if (!editingUser || !currentUser || currentUser.role !== 'admin') {
      setError('Only administrators can edit users');
      return;
    }

    try {
      setError(null);
      
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : '';
      const response = await makeAuthenticatedRequest(`${baseUrl}/api/users/authorized/${encodeURIComponent(editingUser.email)}`, {
        method: 'PUT',
        body: JSON.stringify({
          role: editUserRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update user: ${response.statusText}`);
      }

      // Refresh the user list
      await fetchUsers();
      
      // Reset form
      setEditingUser(null);
      setIsEditDialogOpen(false);
    } catch (err: any) {
      console.error('Error updating user:', err);
      const errorMessage = err?.message || err?.toString() || 'Failed to update user';
      setError(errorMessage);
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (user: AuthorizedUser) => {
    if (!currentUser || currentUser.role !== 'admin') {
      setError('Only administrators can delete users');
      return;
    }

    if (user.email === currentUser.email) {
      setError('You cannot delete your own account');
      return;
    }

    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete user
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setError(null);
      
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : '';
      const response = await makeAuthenticatedRequest(`${baseUrl}/api/users/authorized/${encodeURIComponent(userToDelete.email)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete user: ${response.statusText}`);
      }

      // Close dialog and refresh the user list
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      const errorMessage = err?.message || err?.toString() || 'Failed to delete user';
      setError(errorMessage);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Open edit dialog
  const openEditDialog = (user: AuthorizedUser) => {
    setEditingUser(user);
    setEditUserRole(user.role);
    setIsEditDialogOpen(true);
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Trigger API call when filters change (with debounce for search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleFilterChange();
    }, searchTerm ? 500 : 0); // Debounce search by 500ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter, itemsPerPage]);

  const isAdmin = authService.isAdmin();

  // Show local development message
  if (false) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            p: 4,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                }}
              >
                <SupervisorAccount sx={{ fontSize: 20, color: 'white' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#0f172a' }}>
                User Management
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Local Development Message */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            p: 6,
            textAlign: 'center',
          }}
        >
          <CloudOff sx={{ fontSize: 64, color: '#6b7280', mb: 3 }} />
          
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>
            Backend Required
          </Typography>
          
          <Typography variant="body1" sx={{ color: '#64748b', mb: 4, maxWidth: 500, mx: 'auto' }}>
            User Management features require a backend server to be running. This functionality is only available in production mode with proper API endpoints.
          </Typography>

          <Alert severity="info" sx={{ textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              To use User Management:
            </Typography>
            <Typography variant="body2" component="div">
              • Deploy the application to production<br/>
              • Ensure the backend server is running<br/>
              • Access the application via the production URL
            </Typography>
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          p: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              }}
            >
              <SupervisorAccount sx={{ fontSize: 20, color: 'white' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#0f172a' }}>
              User Management
            </Typography>
          </Box>
          
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => setIsAddDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                },
              }}
            >
              Add User
            </Button>
          )}
        </Box>

        {/* Current User Info */}
        {currentUser && (
          <Alert 
            severity="info" 
            sx={{ 
              borderRadius: 3,
              border: '1px solid #bfdbfe',
              backgroundColor: '#eff6ff',
              '& .MuiAlert-icon': {
                color: '#3b82f6',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                <strong>Logged in as:</strong> {currentUser.email}
              </Typography>
              <Chip 
                icon={currentUser.role === 'admin' ? <AdminPanelSettings /> : <Person />}
                label={currentUser.role.toUpperCase()}
                color={currentUser.role === 'admin' ? 'error' : 'primary'}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Alert>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ 
            borderRadius: 3,
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
            '& .MuiAlert-icon': {
              color: '#dc2626',
            },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {error}
          </Typography>
        </Alert>
      )}

      {/* Users Table */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          p: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#0f172a' }}>
            Authorized Users ({pagination.totalCount})
          </Typography>
          <Tooltip title="Refresh Users">
            <IconButton
              onClick={() => fetchUsers(currentPage)}
              disabled={isLoading}
              sx={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                },
                '&:disabled': {
                  background: '#e5e7eb',
                  color: '#9ca3af',
                },
              }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search and Filter Controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 200, flex: 1 }}
            InputProps={{
              startAdornment: <Search sx={{ color: '#9ca3af', mr: 1 }} />,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Role Filter</InputLabel>
            <Select
              value={roleFilter}
              label="Role Filter"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {isLoading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ color: '#64748b' }}>Loading users...</Typography>
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Security sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
              No authorized users found
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Add users to control access to the S3 File Manager
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Added</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Added By</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.email} sx={{ '&:hover': { backgroundColor: '#f9fafb' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1', fontSize: '0.875rem' }}>
                          {user.email.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {user.email}
                          </Typography>
                          {user.email === currentUser?.email && (
                            <Typography variant="caption" sx={{ color: '#6366f1' }}>
                              (You)
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={user.role === 'admin' ? <AdminPanelSettings /> : <Person />}
                        label={user.role.toUpperCase()}
                        color={user.role === 'admin' ? 'error' : 'primary'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        {new Date(user.addedAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        {user.addedBy}
                      </Typography>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(user)}
                            sx={{ 
                              color: '#6366f1',
                              '&:hover': { backgroundColor: 'rgba(99, 102, 241, 0.1)' }
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          {user.email !== currentUser?.email && (
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(user)}
                              sx={{ 
                                color: '#dc2626',
                                '&:hover': { backgroundColor: 'rgba(220, 38, 38, 0.1)' }
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination Controls */}
        {!isLoading && !error && pagination.totalCount > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 3,
              pt: 3,
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} users
              </Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Items per page</InputLabel>
                <Select
                  value={itemsPerPage}
                  label="Items per page"
                  onChange={handleItemsPerPageChange}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Pagination
                count={pagination.totalPages}
                page={pagination.currentPage}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
                siblingCount={1}
                boundaryCount={1}
              />
            </Stack>
          </Box>
        )}
      </Box>

      {/* Add User Dialog */}
      <Dialog 
        open={isAddDialogOpen} 
        onClose={() => setIsAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#0f172a' }}>
          Add New User
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="user@example.com"
              sx={{ borderRadius: 3 }}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUserRole}
                label="Role"
                onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                sx={{ borderRadius: 3 }}
              >
                <MenuItem value="user">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" />
                    User - Can view and use the application
                  </Box>
                </MenuItem>
                <MenuItem value="admin">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AdminPanelSettings fontSize="small" />
                    Admin - Can manage users and access everything
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setIsAddDialogOpen(false)}
            startIcon={<Cancel />}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddUser}
            variant="contained"
            startIcon={<Save />}
            sx={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Add User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#0f172a' }}>
          Edit User Role
        </DialogTitle>
        <DialogContent>
          {editingUser && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
              <Alert severity="info" sx={{ borderRadius: 3 }}>
                <Typography variant="body2">
                  <strong>User:</strong> {editingUser.email}
                </Typography>
              </Alert>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={editUserRole}
                  label="Role"
                  onChange={(e) => setEditUserRole(e.target.value as 'admin' | 'user')}
                  sx={{ borderRadius: 3 }}
                >
                  <MenuItem value="user">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" />
                      User - Can view and use the application
                    </Box>
                  </MenuItem>
                  <MenuItem value="admin">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AdminPanelSettings fontSize="small" />
                      Admin - Can manage users and access everything
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setIsEditDialogOpen(false)}
            startIcon={<Cancel />}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleEditUser}
            variant="contained"
            startIcon={<Save />}
            sx={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Update Role
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={isDeleteDialogOpen} 
        onClose={() => setIsDeleteDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'error.main' }}>
              <Delete />
            </Avatar>
            <Typography variant="h6">Confirm User Removal</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to remove <strong>{userToDelete?.email}</strong> from authorized users?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. The user will lose access to the application immediately.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setIsDeleteDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            sx={{ 
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Remove User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagementTab; 