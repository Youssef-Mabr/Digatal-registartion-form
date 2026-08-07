// Admin Applications List Handler
const ADMIN_APP_TYPE_LABELS = {
    registration: 'Registration',
    deregistration: 'Deregistration',
    edit_remove: 'Edit / Remove',
};

const PARKING_CONTROL_META = {
    non_reserved: {
        key: 'non_reserved',
        parkingType: 'Non Reserved',
        label: 'Non-Reserved Parking',
        monthlyPrice: 'RM159',
        description: 'Flexible monthly access for drivers who want affordable parking without a fixed spot.',
        icon: '◌',
    },
    reserved: {
        key: 'reserved',
        parkingType: 'Reserved',
        label: 'Reserved Parking',
        monthlyPrice: 'RM212',
        description: 'Dedicated parking with better convenience for daily commuters and frequent visitors.',
        icon: '◉',
    },
    premium: {
        key: 'premium',
        parkingType: 'Premium',
        label: 'Premium Parking',
        monthlyPrice: 'RM318',
        description: 'Priority parking with the best access, ideal for frequent users who want premium placement.',
        icon: '★',
    },
};

const ADMIN_APP_TYPE_BADGE_COLORS = {
    registration: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
    deregistration: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
    edit_remove: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
};

let allApplications = [];

window.addEventListener('DOMContentLoaded', function() {
    const applicationsList = document.getElementById('applicationsList');
    const filter = document.getElementById('appTypeFilter');
    const searchInput = document.getElementById('applicationsSearch');

    loadApplications();

    if (filter) {
        filter.addEventListener('change', renderApplications);
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderApplications);
    }
});

async function loadApplications() {
    const applicationsList = document.getElementById('applicationsList');
    try {
        const result = await requestJson('/admin/applications', { loadingMessage: 'Loading applications...' });
        allApplications = result.applications || [];
        renderApplications();
    } catch (error) {
        showAppMessage(error.message, 'error', 'Applications unavailable');
        if (applicationsList) {
            applicationsList.innerHTML = `<div style="text-align:center;padding:40px;color:#b91c1c;">${escapeHtml(error.message)}</div>`;
        }
    }
}

function renderApplications() {
    const applicationsList = document.getElementById('applicationsList');
    const filter = document.getElementById('appTypeFilter');
    const filterValue = filter ? filter.value : 'all';
    const searchInput = document.getElementById('applicationsSearch');
    const searchValue = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const badge = document.getElementById('appCountBadge');

    const filtered = allApplications.filter(app => {
        const matchesType = filterValue === 'all' || (app.applicationType || 'registration') === filterValue;
        if (!matchesType) {
            return false;
        }

        if (!searchValue) {
            return true;
        }

        const plateCandidates = [
            app.vehicleNumber,
            ...(Array.isArray(app.vehicles) ? app.vehicles.map(vehicle => vehicle && vehicle.vehicleNumber).filter(Boolean) : []),
        ];

        const searchableText = [
            app.fullName,
            app.referenceNumber,
            ...plateCandidates,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return searchableText.includes(searchValue);
    });

    if (applicationsList) {
        applicationsList.innerHTML = '';
    }

    if (badge) {
        const typeLabel = filterValue === 'all' ? 'applications' : `${filterValue.replace('_', ' ')} applications`;
        badge.textContent = `${filtered.length} of ${allApplications.length} ${typeLabel}`;
    }

    if (!applicationsList) {
        return;
    }

    if (filtered.length === 0) {
        applicationsList.innerHTML = '<div style="text-align:center;padding:40px;color:#757575;">No applications found</div>';
        return;
    }

    filtered.forEach((app, index) => {
        const formattedDateTime = formatDateTime(app.submittedAt);
        const appType = app.applicationType || 'registration';
        const typeLabel = ADMIN_APP_TYPE_LABELS[appType] || 'Registration';
        const badgeColors = ADMIN_APP_TYPE_BADGE_COLORS[appType] || ADMIN_APP_TYPE_BADGE_COLORS.registration;
        const typeBadgeHtml = `<span class="app-type-chip" data-testid="app-type-chip-${index}" style="display:inline-block;padding:3px 10px;border-radius:999px;background:${badgeColors.bg};color:${badgeColors.color};border:1px solid ${badgeColors.border};font-size:12px;font-weight:600;">${typeLabel}</span>`;

        const card = document.createElement('div');
        card.className = 'application-card';
        card.setAttribute('data-testid', `application-card-${index}`);
        card.onclick = function() {
            viewApplication(app.referenceNumber);
        };

        card.innerHTML = `
            <div class="application-header">
                <div class="applicant-info">
                    <h3>${escapeHtml(app.fullName || '')}</h3>
                    <p class="vehicle-number">${escapeHtml(app.vehicleNumber || '-')}</p>
                    <div style="margin-top:6px;">${typeBadgeHtml}</div>
                </div>
                <span class="status-badge ${(app.status || '').toLowerCase()}" data-testid="status-${index}">${escapeHtml(app.status || '')}</span>
            </div>
            <div class="application-meta">
                <span class="date-time" data-testid="card-datetime-${index}">${formattedDateTime}</span>
                <span class="date-time">Ref: ${escapeHtml(app.referenceNumber || '')}</span>
            </div>
        `;

        applicationsList.appendChild(card);
    });
}

function viewApplication(referenceNumber) {
    sessionStorage.setItem('currentApplicationReference', referenceNumber);
    window.location.href = 'admin-details.html';
}
