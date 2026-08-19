// Admin Application Details Handler
let currentApplicationApprovalContext = null;

window.addEventListener('DOMContentLoaded', function() {
    const referenceNumber = sessionStorage.getItem('currentApplicationReference');

    if (!referenceNumber) {
        window.location.href = 'admin-applications.html';
        return;
    }
    
    const detailsContainer = document.getElementById('detailsContainer');

        wireApplicationApprovalModal();
        currentApplicationApprovalContext = null;

    requestJson(`/admin/applications/${encodeURIComponent(referenceNumber)}`, { loadingMessage: 'Loading application details...' })
        .then(result => {
            const app = result.application;
            const formattedDate = formatDateTime(app.submittedAt);

            // Wire admin download button (full PDF using shared util)
            const adminDownloadBtn = document.getElementById('adminDownloadFormBtn');
            if (adminDownloadBtn) {
                adminDownloadBtn.addEventListener('click', async function() {
                    const original = adminDownloadBtn.textContent;
                    adminDownloadBtn.disabled = true;
                    adminDownloadBtn.textContent = 'Preparing PDF...';
                    try {
                        await downloadSubmissionPdf(app);
                    } catch (e) {
                        showAppMessage('Could not generate PDF: ' + e.message, 'error');
                    } finally {
                        adminDownloadBtn.disabled = false;
                        adminDownloadBtn.textContent = original;
                    }
                });
            }

            const appTypeLabels = {
                registration: 'New Registration',
                deregistration: 'Deregistration',
                edit_remove: 'Edit / Remove Vehicle'
            };
            const appType = app.applicationType || 'registration';
            const appTypeLabel = appTypeLabels[appType] || 'New Registration';
            const isRegistration = appType === 'registration';
            const isEditRemove = appType === 'edit_remove';

            const remarksSectionHtml = isEditRemove ? `
                <div class="details-section" data-testid="detail-remarks-section">
                    <h2>Remarks / Notes</h2>
                    <div class="detail-row" style="align-items:flex-start;">
                        <span class="detail-value" data-testid="detail-remarks" style="white-space:pre-wrap;line-height:1.55;">${escapeHtml(app.remarks || '-')}</span>
                    </div>
                </div>
            ` : '';

            const receiptSectionHtml = isRegistration ? `
                <div class="details-section" data-testid="detail-receipt-section">
                    <h2>Payment Receipt</h2>
                    ${app.receiptUrl ? `<a href="${escapeHtml(app.receiptUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(app.receiptUrl)}" alt="Payment Receipt" class="receipt-image" data-testid="receipt-image"></a>` : '<p class="no-receipt">No receipt uploaded</p>'}
                </div>
            ` : '';

            const approvedReceiptSectionHtml = app.receiptInfo ? `
                <div class="details-section" data-testid="detail-approved-receipt-section">
                    <h2>Approved Receipt Information</h2>
                    <div class="detail-row"><span class="detail-label">Receipt Number:</span><span class="detail-value">${escapeHtml(app.receiptInfo.receiptNumber || '-')}</span></div>
                    <div class="detail-row"><span class="detail-label">Company Name:</span><span class="detail-value">${escapeHtml(app.receiptInfo.companyName || '-')}</span></div>
                    <div class="detail-row"><span class="detail-label">Company Address:</span><span class="detail-value" style="white-space:pre-wrap;">${escapeHtml(app.receiptInfo.companyAddress || '-')}</span></div>
                    <div class="detail-row"><span class="detail-label">Parking Type:</span><span class="detail-value">${escapeHtml(app.receiptInfo.parkingType || '-')}</span></div>
                    <div class="detail-row"><span class="detail-label">Subscription Month:</span><span class="detail-value">${escapeHtml(app.receiptInfo.subscriptionMonth || app.receiptInfo.productMonth || '-')}</span></div>
                    <div class="detail-row"><span class="detail-label">Vehicle Plate Number(s):</span><span class="detail-value">${escapeHtml((app.receiptInfo.vehiclePlateNumbers || []).join(', ') || '-')}</span></div>
                    <div class="detail-row"><span class="detail-label">Quantity:</span><span class="detail-value">${escapeHtml(String(app.receiptInfo.quantity || 1))}</span></div>
                    <div class="detail-row"><span class="detail-label">Unit Price:</span><span class="detail-value">RM ${escapeHtml(String(app.receiptInfo.unitPrice || 0))}</span></div>
                    <div class="detail-row"><span class="detail-label">Total Amount:</span><span class="detail-value"><strong>RM ${escapeHtml(String(app.receiptInfo.totalAmount || 0))}</strong></span></div>
                    <div class="detail-row"><span class="detail-label">Additional Notes:</span><span class="detail-value">${escapeHtml(app.receiptInfo.additionalNotes || '-')}</span></div>
                </div>
            ` : '';

            const parkingSectionHtml = `
                <div class="details-section">
                    <h2>Parking Information</h2>
                    <div class="detail-row"><span class="detail-label">Parking Type:</span><span class="detail-value">${escapeHtml(app.parkingType || '-')}</span></div>
                    <div class="detail-row"><span class="detail-label">Subscription Period:</span><span class="detail-value">${escapeHtml(app.subscriptionPeriod || '-')}</span></div>
                    ${isRegistration ? `<div class="detail-row"><span class="detail-label">Total Amount:</span><span class="detail-value"><strong>RM ${app.totalAmount ?? '-'}</strong></span></div>` : ''}
                </div>
            `;

            detailsContainer.innerHTML = `
                <div class="details-section">
                    <h2>Reference Information</h2>
                    <div class="detail-row">
                        <span class="detail-label">Reference Number:</span>
                        <span class="detail-value" data-testid="detail-reference">${escapeHtml(app.referenceNumber || '')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Application Type:</span>
                        <span class="detail-value" data-testid="detail-app-type">${appTypeLabel}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Submission Date:</span>
                        <span class="detail-value" data-testid="detail-date">${formattedDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="status-badge ${(app.status || '').toLowerCase()}" data-testid="detail-status">${escapeHtml(app.status || '')}</span>
                    </div>
                </div>

                <div class="details-section">
                    <h2>Applicant Information</h2>
                    <div class="detail-row"><span class="detail-label">Full Name:</span><span class="detail-value" data-testid="detail-name">${escapeHtml(app.fullName || '')}</span></div>
                    <div class="detail-row"><span class="detail-label">Phone Number:</span><span class="detail-value">${escapeHtml(app.phoneNumber || '')}</span></div>
                    <div class="detail-row"><span class="detail-label">Customer Email:</span><span class="detail-value" data-testid="detail-email">${escapeHtml(app.email || '-')}</span></div>
                    <div class="detail-row"><span class="detail-label">Company Name:</span><span class="detail-value">${escapeHtml(app.companyName || '')}</span></div>
                    <div class="detail-row"><span class="detail-label">Staff ID:</span><span class="detail-value">${escapeHtml(app.staffId || '-')}</span></div>
                </div>

                ${remarksSectionHtml}

                <div class="details-section">
                    <h2>Vehicle Information</h2>
                    <div class="detail-row"><span class="detail-label">Vehicle Number:</span><span class="detail-value">${escapeHtml(app.vehicleNumber || '-')}</span></div>
                    <div class="detail-row"><span class="detail-label">Vehicle Model:</span><span class="detail-value">${escapeHtml(app.vehicleModel || '-')}</span></div>
                    <div class="detail-row"><span class="detail-label">Vehicle Type:</span><span class="detail-value">${escapeHtml(app.vehicleType || '-')}</span></div>
                    <div class="detail-row"><span class="detail-label">Vehicle Color:</span><span class="detail-value">${escapeHtml(app.vehicleColor || '-')}</span></div>
                </div>

                ${parkingSectionHtml}

                ${receiptSectionHtml}

                ${approvedReceiptSectionHtml}
            `;

            if (app.status === 'Pending') {
                const actionButtons = document.getElementById('actionButtons');
                actionButtons.style.display = 'flex';

                document.getElementById('approveBtn').addEventListener('click', function() {
                    if (isRegistration) {
                        openApplicationApprovalModal(referenceNumber, app);
                        return;
                    }

                    updateApplicationStatus(referenceNumber, 'Approved', this);
                });

                document.getElementById('rejectBtn').addEventListener('click', function() {
                    updateApplicationStatus(referenceNumber, 'Rejected', this);
                });
            }
        })
        .catch(error => {
            showAppMessage(error.message, 'error', 'Application unavailable');
            detailsContainer.innerHTML = `<div style="color:#b91c1c;padding:24px;">${escapeHtml(error.message)}</div>`;
        });
});

async function updateApplicationStatus(referenceNumber, newStatus, button) {
    setButtonLoading(button, true, `${newStatus}...`);

    try {
        await requestJson(`/admin/applications/${encodeURIComponent(referenceNumber)}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
            loadingMessage: `Updating application...`
        });
        showAppMessage(`Application ${newStatus.toLowerCase()} successfully.`, 'success');
        setTimeout(() => {
            window.location.href = 'admin-applications.html';
        }, 900);
    } catch (error) {
        showAppMessage(error.message, 'error');
        setButtonLoading(button, false);
    }
}

function getApplicationVehicleNumbers(application) {
    const vehicles = Array.isArray(application.vehicles) ? application.vehicles : [];
    const numbers = vehicles
        .map(vehicle => (vehicle && vehicle.vehicleNumber ? String(vehicle.vehicleNumber).trim().toUpperCase() : ''))
        .filter(Boolean);

    if (!numbers.length && application.vehicleNumber) {
        numbers.push(String(application.vehicleNumber).trim().toUpperCase());
    }

    return Array.from(new Set(numbers));
}

function calculateRegistrationReceipt(application) {
    const parkingPrices = {
        'Non Reserved': 159,
        Reserved: 212,
        Premium: 318,
    };
    const multipliers = {
        Monthly: 1,
        Quarterly: 3,
        'Half-Year': 6,
        'Half Year': 6,
        Yearly: 12,
    };

    const quantity = Math.max(getApplicationVehicleNumbers(application).length, 1);
    const parkingType = application.parkingType || '-';
    const subscriptionPeriod = application.subscriptionPeriod || '-';
    const unitPrice = parkingPrices[parkingType] || 0;
    const totalAmount = unitPrice * (multipliers[subscriptionPeriod] || 1) * quantity;

    return { quantity, parkingType, subscriptionPeriod, unitPrice, totalAmount };
}

function wireApplicationApprovalModal() {
    const modal = document.getElementById('applicationApprovalModal');
    const backdrop = document.getElementById('applicationApprovalBackdrop');
    const closeBtn = document.getElementById('applicationApprovalCloseBtn');
    const cancelBtn = document.getElementById('approvalCancelBtn');
    const form = document.getElementById('applicationApprovalForm');

    function closeModal() {
        if (!modal) {
            return;
        }

        modal.hidden = true;
        document.body.classList.remove('has-open-approval-modal');
        currentApplicationApprovalContext = null;
        if (form) {
            form.reset();
        }
    }

    if (backdrop) {
        backdrop.addEventListener('click', closeModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            if (!currentApplicationApprovalContext) {
                showAppMessage('Application details are missing.', 'error');
                return;
            }

            const submitButton = document.getElementById('approvalConfirmBtn');
            setButtonLoading(submitButton, true, 'Confirming...');

            try {
                const result = await requestJson(`/admin/applications/${encodeURIComponent(currentApplicationApprovalContext.referenceNumber)}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                    loadingMessage: 'Generating receipt and sending email...'
                });

                showAppMessage(result.message || 'Application approved successfully.', 'success', 'Approved');
                closeModal();
                setTimeout(() => {
                    window.location.href = 'admin-applications.html';
                }, 1000);
            } catch (error) {
                showAppMessage(error.message, 'error', 'Approval failed');
                setButtonLoading(submitButton, false);
            }
        });
    }

    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal && !modal.hidden) {
            closeModal();
        }
    });

    window.closeApplicationApprovalModal = closeModal;
}

function openApplicationApprovalModal(referenceNumber, application) {
    const modal = document.getElementById('applicationApprovalModal');
    if (!modal || !application) {
        showAppMessage('Application details are not ready yet.', 'warning');
        return;
    }

    const vehicleNumbers = getApplicationVehicleNumbers(application);
    const receiptPreview = calculateRegistrationReceipt(application);

    currentApplicationApprovalContext = { referenceNumber, application };

    document.getElementById('approvalCustomerName').textContent = application.fullName || '-';
    document.getElementById('approvalCustomerEmail').textContent = application.email || '-';
    document.getElementById('approvalCompanyName').textContent = application.companyName || '-';
    document.getElementById('approvalParkingType').textContent = receiptPreview.parkingType || '-';
    document.getElementById('approvalSubscriptionPeriod').textContent = receiptPreview.subscriptionPeriod || '-';
    document.getElementById('approvalVehiclePlates').textContent = vehicleNumbers.length ? vehicleNumbers.join(', ') : '-';
    document.getElementById('approvalTotalAmount').textContent = `RM ${receiptPreview.totalAmount || 0}`;
    modal.hidden = false;
    document.body.classList.add('has-open-approval-modal');
}
