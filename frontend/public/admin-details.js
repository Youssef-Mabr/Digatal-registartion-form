// Admin Application Details Handler
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
            // ignore
        }
        redirectToLogin();
    });
}

function renderVehicles(app) {
    const vehicles = app.vehicles?.length ? app.vehicles : [{
        vehicleNumber: app.vehicleNumber,
        vehicleModel: app.vehicleModel,
        vehicleType: app.vehicleType,
        vehicleColor: app.vehicleColor,
    }];

    return vehicles.map((vehicle, index) => `
        <div class="detail-row">
            <span class="detail-label">Vehicle ${index + 1} Number:</span>
            <span class="detail-value">${vehicle.vehicleNumber || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Vehicle ${index + 1} Model:</span>
            <span class="detail-value">${vehicle.vehicleModel || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Vehicle ${index + 1} Type:</span>
            <span class="detail-value">${vehicle.vehicleType || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Vehicle ${index + 1} Color:</span>
            <span class="detail-value">${vehicle.vehicleColor || 'N/A'}</span>
        </div>
    `).join('');
}

window.addEventListener('DOMContentLoaded', async function() {
    const referenceNumber = localStorage.getItem('currentApplicationReference');

    if (!getAdminToken() || !referenceNumber) {
        redirectToLogin();
        return;
    }

    bindLogout();

    const detailsContainer = document.getElementById('detailsContainer');

    try {
        const response = await fetch(`${API_BASE}/admin/applications/${referenceNumber}`, {
            headers: authHeaders()
        });
        const data = await response.json();
        const app = data.application;

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || 'Failed to load application details');
        }

        const date = new Date(app.submittedAt || app.submissionDate || Date.now());
        const formattedDate = date.toLocaleDateString('en-MY', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        detailsContainer.innerHTML = `
            <div class="details-section">
                <h2>Reference Information</h2>
                <div class="detail-row">
                    <span class="detail-label">Reference Number:</span>
                    <span class="detail-value" data-testid="detail-reference">${app.referenceNumber}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Submission Date:</span>
                    <span class="detail-value" data-testid="detail-date">${formattedDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="status-badge ${String(app.status || 'Pending').toLowerCase()}" data-testid="detail-status">${app.status || 'Pending'}</span>
                </div>
            </div>
            
            <div class="details-section">
                <h2>Applicant Information</h2>
                <div class="detail-row">
                    <span class="detail-label">Full Name:</span>
                    <span class="detail-value" data-testid="detail-name">${app.fullName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone Number:</span>
                    <span class="detail-value">${app.phoneNumber}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Company Name:</span>
                    <span class="detail-value">${app.companyName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Staff ID:</span>
                    <span class="detail-value">${app.staffId}</span>
                </div>
            </div>
            
            <div class="details-section">
                <h2>Vehicle Information</h2>
                ${renderVehicles(app)}
            </div>
            
            <div class="details-section">
                <h2>Parking Information</h2>
                <div class="detail-row">
                    <span class="detail-label">Parking Type:</span>
                    <span class="detail-value">${app.parkingType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Subscription Period:</span>
                    <span class="detail-value">${app.subscriptionPeriod}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Amount:</span>
                    <span class="detail-value"><strong>RM ${app.totalAmount}</strong></span>
                </div>
            </div>
            
            <div class="details-section">
                <h2>Payment Receipt</h2>
                ${app.receiptUrl ? `<img src="${app.receiptUrl}" alt="Payment Receipt" class="receipt-image" data-testid="receipt-image">` : '<p class="no-receipt">No receipt uploaded</p>'}
            </div>
        `;

        if ((app.status || 'Pending') === 'Pending') {
            const actionButtons = document.getElementById('actionButtons');
            actionButtons.style.display = 'flex';

            document.getElementById('approveBtn').addEventListener('click', function() {
                updateApplicationStatus(app.referenceNumber, 'Approved');
            });

            document.getElementById('rejectBtn').addEventListener('click', function() {
                updateApplicationStatus(app.referenceNumber, 'Rejected');
            });
        }
    } catch (error) {
        alert(error.message);
    }
});

async function updateApplicationStatus(referenceNumber, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/admin/applications/${referenceNumber}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await response.json();

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || 'Failed to update application status');
        }

        alert(`Application ${newStatus.toLowerCase()} successfully!`);
        window.location.href = 'admin-applications.html';
    } catch (error) {
        alert(error.message);
    }
}
