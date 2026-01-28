import { useEffect, useMemo, useState } from 'react';
import { userService } from '../services/user.service';
import './AdminUsers.css';

const ROLE_OPTIONS = ['admin', 'editor', 'viewer'];

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [error, setError] = useState('');

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const [tenants, setTenants] = useState([]);

  const tenantOptions = useMemo(() => {
    // tenants endpoint returns all users with counts (each can be a tenant owner)
    const sorted = [...tenants].sort((a, b) => {
      const aKey = `${a.name || ''}`.toLowerCase();
      const bKey = `${b.name || ''}`.toLowerCase();
      return aKey.localeCompare(bKey);
    });
    return sorted;
  }, [tenants]);

  const fetchData = async (page = 1) => {
    try {
      setError('');
      setLoading(true);
      const [usersRes, tenantsRes] = await Promise.all([
        userService.getUsers({ page, limit: pagination.limit }),
        userService.getTenants()
      ]);

      setUsers(usersRes.users);
      setPagination(usersRes.pagination);
      setTenants(tenantsRes.tenants);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load users/tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoleChange = async (userId, role) => {
    try {
      setSavingUserId(userId);
      await userService.updateUserRole(userId, role);
      await fetchData(pagination.page);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update role');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleTenantChange = async (userId, tenantIdValue) => {
    try {
      setSavingUserId(userId);

      // "self" means reset to their own tenant (backend uses null to mean self-tenant in our model)
      const tenantId = tenantIdValue === 'self' ? null : tenantIdValue;

      await userService.updateUserTenant(userId, tenantId);
      await fetchData(pagination.page);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update tenant');
    } finally {
      setSavingUserId(null);
    }
  };

  const canEdit = (userId) => savingUserId === null || savingUserId === userId;

  if (loading) {
    return <div className="admin-users-loading">Loading users…</div>;
  }

  return (
    <div className="admin-users">
      <div className="admin-users-header">
        <h1>Admin: Users</h1>
        <p className="admin-users-subtitle">
          Assign users to a tenant to share videos (e.g., assign viewers to an editor’s tenant).
        </p>
      </div>

      {error && <div className="admin-users-error">{error}</div>}

      <div className="admin-users-table-wrapper">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Tenant</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const currentTenantId = u.tenantId || u._id;
              const isBusy = savingUserId === u._id;

              return (
                <tr key={u._id}>
                  <td className="cell-strong">{u.name}</td>
                  <td className="cell-mono">{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      disabled={!canEdit(u._id) || isBusy}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="admin-users-select"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={currentTenantId?.toString() || 'self'}
                      disabled={!canEdit(u._id) || isBusy}
                      onChange={(e) => handleTenantChange(u._id, e.target.value)}
                      className="admin-users-select"
                    >
                      <option value="self">Self (isolated)</option>
                      {tenantOptions.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name} ({t.email}) — videos: {t.videoCount}, members: {t.memberCount}
                        </option>
                      ))}
                    </select>
                    <div className="admin-users-tenant-hint">
                      Current tenantId: <span className="cell-mono">{currentTenantId}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="admin-users-pagination">
          <button
            className="page-button"
            disabled={pagination.page === 1}
            onClick={() => fetchData(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="page-info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="page-button"
            disabled={pagination.page === pagination.pages}
            onClick={() => fetchData(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

