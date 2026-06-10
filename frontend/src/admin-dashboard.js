// Admin Dashboard Handler
// Admin Dashboard Handler
const API_BASE = 'http://localhost:5000/api';

function getAdminToken() {
    return localStorage.getItem('adminToken');
}

function handleUnauthorized() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    window.location.href = 'index.html';
}

function authHeaders() {
    const token = getAdminToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function loadDashboardStats() {
    const response = await fetch(`${API_BASE}/admin/dashboard/stats`, {
        headers: authHeaders()
    });
    const data = await response.json();

    if (response.status === 401) {
        handleUnauthorized();
        return;
    }

    if (!response.ok) {
        throw new Error(data.message || 'Failed to load dashboard stats');
    }

    document.getElementById('totalApplications').textContent = data.totalApplications ?? 0;
    document.getElementById('pendingCount').textContent = data.pendingApplications ?? 0;
    document.getElementById('approvedCount').textContent = data.approvedApplications ?? 0;
    document.getElementById('rejectedCount').textContent = data.rejectedApplications ?? 0;
}

window.addEventListener('DOMContentLoaded', async function() {
    if (!getAdminToken()) {
        handleUnauthorized();
        return;
    }

    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                await fetch(`${API_BASE}/admin/logout`, {
                    method: 'POST',
                    headers: authHeaders()
                });
            } catch (error) {
                // Ignore logout network issues and clear session locally.
            }
            handleUnauthorized();
        });
    }

    try {
        await loadDashboardStats();
    } catch (error) {
        alert(error.message);
    }
});