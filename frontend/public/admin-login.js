// Admin Login Handler
const API_BASE = 'http://localhost:5000/api';

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Please enter username and password');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Login failed');
        }

        localStorage.setItem('adminToken', result.token);
        localStorage.setItem('adminUsername', result.admin.username);
        window.location.href = 'admin-dashboard.html';
    } catch (error) {
        alert(error.message);
    }
});