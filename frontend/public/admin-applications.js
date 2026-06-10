// Admin Applications List Handler
const API_BASE = 'http://localhost:5000/api';

function getAdminToken() {
    return localStorage.getItem('adminToken');
}

function authHeaders() {
    const token = getAdminToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function redirectToLogin() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    window.location.href = 'admin-login.html';
}

function bindLogout() {
    const logoutLink = document.querySelector('.logout-link');
    if (!logoutLink) return;

    logoutLink.addEventListener('click', async function(e) {
        e.preventDefault();
        try {
            await fetch(`${API_BASE}/admin/logout`, {
                method: 'POST',
                headers: authHeaders()
            });
        } catch (error) {
            // ignore network errors on logout
        }
        redirectToLogin();
    });
}

function getPrimaryVehicle(application) {
    if (application.vehicleNumber) {
        return application.vehicleNumber;
    }

    return application.vehicles?.[0]?.vehicleNumber || 'N/A';
}

window.addEventListener('DOMContentLoaded', async function() {
    if (!getAdminToken()) {
        redirectToLogin();
        return;
    }

    bindLogout();

    const applicationsList = document.getElementById('applicationsList');

    try {
        const response = await fetch(`${API_BASE}/admin/applications`, {
            headers: authHeaders()
        });
        const data = await response.json();

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || 'Failed to load applications');
        }

        const applications = data.applications || [];
        if (applications.length === 0) {
            applicationsList.innerHTML = '<div style="text-align:center;padding:40px;color:#757575;">No applications found</div>';
            return;
        }

        applications.forEach((app, index) => {
            const date = new Date(app.submittedAt || app.submissionDate || Date.now());
            const formattedDate = date.toLocaleDateString('en-MY', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            const formattedTime = date.toLocaleTimeString('en-MY', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const card = document.createElement('div');
            card.className = 'application-card';
            card.setAttribute('data-testid', `application-card-${index}`);
            card.onclick = function() {
                viewApplication(app.referenceNumber);
            };

            card.innerHTML = `
                <div class="application-header">
                    <div class="applicant-info">
                        <h3>${app.fullName}</h3>
                        <p class="vehicle-number">${getPrimaryVehicle(app)}</p>
                    </div>
                    <span class="status-badge ${String(app.status || 'Pending').toLowerCase()}" data-testid="status-${index}">${app.status || 'Pending'}</span>
                </div>
                <div class="application-meta">
                    <span class="date-time">${formattedDate} at ${formattedTime}</span>
                    <span class="date-time">Ref: ${app.referenceNumber}</span>
                </div>
            `;

            applicationsList.appendChild(card);
        });
    } catch (error) {
        alert(error.message);
    }
});

function viewApplication(referenceNumber) {
    localStorage.setItem('currentApplicationReference', referenceNumber);
    window.location.href = 'admin-details.html';
}
