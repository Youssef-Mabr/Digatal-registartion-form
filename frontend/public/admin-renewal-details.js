window.addEventListener('DOMContentLoaded', function() {
    const renewalReference = sessionStorage.getItem('currentRenewalReference');
    const detailsContainer = document.getElementById('renewalDetailsContainer');

    if (!renewalReference) {
        window.location.href = 'admin-renewals.html';
        return;
    }

    requestJson(`/admin/renewals/${encodeURIComponent(renewalReference)}`, { loadingMessage: 'Loading renewal details...' })
        .then(result => {
            const renewal = result.renewal;
            renderRenewalDetails(renewal);
            wireStatusActions(renewalReference, renewal.status);
        })
        .catch(error => {
            showAppMessage(error.message, 'error', 'Renewal request unavailable');
            detailsContainer.innerHTML = `<div style="color:#b91c1c;padding:24px;">${escapeHtml(error.message)}</div>`;
        });
});

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

function renderRenewalDetails(renewal) {
    const detailsContainer = document.getElementById('renewalDetailsContainer');
    const plateNumbers = Array.isArray(renewal.vehiclePlateNumbers) ? renewal.vehiclePlateNumbers : [];

    detailsContainer.innerHTML = `
        <div class="details-section">
            <h2>Reference Information</h2>
            <div class="detail-row"><span class="detail-label">Renewal Reference:</span><span class="detail-value">${escapeHtml(renewal.renewalReference || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Renewal Type:</span><span class="detail-value">${escapeHtml(renewal.renewalType || 'Individual')}</span></div>
            <div class="detail-row"><span class="detail-label">Submission Date:</span><span class="detail-value">${escapeHtml(formatDateTime(renewal.submittedAt))}</span></div>
            <div class="detail-row"><span class="detail-label">Status:</span><span class="status-badge ${(renewal.status || '').toLowerCase()}">${escapeHtml(renewal.status || 'Pending')}</span></div>
        </div>

        <div class="details-section">
            <h2>Parker Information</h2>
            <div class="detail-row"><span class="detail-label">Full Name:</span><span class="detail-value">${escapeHtml(renewal.fullName || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Vehicle Plate Numbers:</span><span class="detail-value">${escapeHtml(plateNumbers.length ? plateNumbers.join(', ') : '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Renewal Month / Payment Note:</span><span class="detail-value">${escapeHtml(renewal.renewalMonthNote || '-')}</span></div>
        </div>

        <div class="details-section">
            <h2>Payment Receipt</h2>
            ${renewal.receiptUrl ? `<a href="${escapeHtml(renewal.receiptUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(renewal.receiptUrl)}" alt="Renewal Receipt" class="receipt-image"></a>` : '<p class="no-receipt">No receipt uploaded</p>'}
        </div>
    `;
}

function wireStatusActions(renewalReference, status) {
    if (status !== 'Pending') {
        return;
    }

    const actionButtons = document.getElementById('renewalActionButtons');
    const approveButton = document.getElementById('renewalApproveBtn');
    const rejectButton = document.getElementById('renewalRejectBtn');

    actionButtons.style.display = 'flex';

    approveButton.addEventListener('click', function() {
        updateRenewalStatus(renewalReference, 'Approved', approveButton);
    });

    rejectButton.addEventListener('click', function() {
        updateRenewalStatus(renewalReference, 'Rejected', rejectButton);
    });
}

async function updateRenewalStatus(renewalReference, status, button) {
    setButtonLoading(button, true, `${status}...`);

    try {
        await requestJson(`/admin/renewals/${encodeURIComponent(renewalReference)}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
            loadingMessage: 'Updating renewal status...',
        });

        showAppMessage(`Renewal request ${status.toLowerCase()} successfully.`, 'success');
        setTimeout(() => {
            window.location.href = 'admin-renewals.html';
        }, 900);
    } catch (error) {
        showAppMessage(error.message, 'error');
        setButtonLoading(button, false);
    }
}
