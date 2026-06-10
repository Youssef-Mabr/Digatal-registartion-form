// Admin Dashboard Handler
const API_BASE = 'http://localhost:5000/api';

function getAdminToken() {
    return localStorage.getItem('adminToken');
}

function redirectToLogin() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    window.location.href = 'admin-login.html';
}

async function fetchStats() {
    const response = await fetch(`${API_BASE}/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` }
    });
    const data = await response.json();

    if (response.status === 401) {
        redirectToLogin();
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
        redirectToLogin();
        return;
    }

    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                await fetch(`${API_BASE}/admin/logout`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${getAdminToken()}` }
                });
            } catch (error) {
                // ignore network errors on logout
            }
            redirectToLogin();
        });
    }

    try {
        await fetchStats();
    } catch (error) {
        alert(error.message);
    }
});