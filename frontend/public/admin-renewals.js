let allRenewals = [];

window.addEventListener('DOMContentLoaded', function() {
    const filter = document.getElementById('renewalStatusFilter');
    if (filter) {
        filter.addEventListener('change', renderRenewals);
    }

    loadRenewals();
});

async function loadRenewals() {
    const renewalsList = document.getElementById('renewalsList');

    try {
        const result = await requestJson('/admin/renewals', { loadingMessage: 'Loading renewal requests...' });
        allRenewals = result.renewals || [];
        renderRenewals();
    } catch (error) {
        showAppMessage(error.message, 'error', 'Renewal requests unavailable');
        if (renewalsList) {
            renewalsList.innerHTML = `<div style="text-align:center;padding:40px;color:#b91c1c;">${escapeHtml(error.message)}</div>`;
        }
    }
}

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

function renderRenewals() {
    const renewalsList = document.getElementById('renewalsList');
    const filter = document.getElementById('renewalStatusFilter');
    const badge = document.getElementById('renewalCountBadge');

    if (!renewalsList) {
        return;
    }

    const selectedStatus = filter ? filter.value : 'all';
    const filtered = allRenewals.filter(renewal => selectedStatus === 'all' || renewal.status === selectedStatus);

    if (badge) {
        badge.textContent = `${filtered.length} of ${allRenewals.length} renewal requests`;
    }

    renewalsList.innerHTML = '';

    if (!filtered.length) {
        renewalsList.innerHTML = '<div style="text-align:center;padding:40px;color:#757575;">No renewal requests found</div>';
        return;
    }

    filtered.forEach((renewal, index) => {
        const card = document.createElement('div');
        card.className = 'application-card';
        card.setAttribute('data-testid', `renewal-card-${index}`);
        card.addEventListener('click', function(event) {
            const viewButton = event.target.closest('.renewal-view-btn');
            if (viewButton) {
                return;
            }
            viewRenewal(renewal.renewalReference);
        });

        const plateList = Array.isArray(renewal.vehiclePlateNumbers) ? renewal.vehiclePlateNumbers.join(', ') : '-';
        const submittedAt = formatDateTime(renewal.submittedAt);

        card.innerHTML = `
            <div class="application-header">
                <div class="applicant-info">
                    <h3>${escapeHtml(renewal.fullName || '-')}</h3>
                    <p class="vehicle-number">Plates: ${escapeHtml(plateList)}</p>
                    <p class="vehicle-number">Renewal Month: ${escapeHtml(renewal.renewalMonthNote || '-')}</p>
                </div>
                <span class="status-badge ${(renewal.status || '').toLowerCase()}">${escapeHtml(renewal.status || 'Pending')}</span>
            </div>
            <div class="application-meta">
                <span class="date-time">${escapeHtml(submittedAt)}</span>
                <span class="date-time">Ref: ${escapeHtml(renewal.renewalReference || '')}</span>
            </div>
            <div style="margin-top:14px;display:flex;justify-content:flex-end;">
                <button type="button" class="btn btn-secondary renewal-view-btn" style="padding:8px 18px;font-size:14px;">View</button>
            </div>
        `;

        const viewBtn = card.querySelector('.renewal-view-btn');
        viewBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            viewRenewal(renewal.renewalReference);
        });

        renewalsList.appendChild(card);
    });
}

function viewRenewal(reference) {
    sessionStorage.setItem('currentRenewalReference', reference);
    window.location.href = 'admin-renewal-details.html';
}
