let currentRenewalApprovalContext = null;

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
            currentRenewalApprovalContext = { renewalReference, renewal };
            renderRenewalDetails(renewal);
            wireStatusActions(renewalReference, renewal.status, renewal);
        })
        .catch(error => {
            showAppMessage(error.message, 'error', 'Renewal request unavailable');
            detailsContainer.innerHTML = `<div style="color:#b91c1c;padding:24px;">${escapeHtml(error.message)}</div>`;
        });

    wireApprovalModal();
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
    const isTenant = renewal.renewalType === 'Tenant';
    const quantityEntries = renewal.parkingQuantities || {};
    const pricingBreakdown = renewal.pricingBreakdown || {};
    const receiptInfo = renewal.receiptInfo || null;

    const tenantVehicleHtml = isTenant ? `
        <div class="details-section">
            <h2>Company Information</h2>
            <div class="detail-row"><span class="detail-label">Company Name:</span><span class="detail-value">${escapeHtml(renewal.companyName || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Contact Person:</span><span class="detail-value">${escapeHtml(renewal.contactPerson || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Email:</span><span class="detail-value">${escapeHtml(renewal.email || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Phone Number:</span><span class="detail-value">${escapeHtml(renewal.phoneNumber || '-')}</span></div>
        </div>

        <div class="details-section">
            <h2>Parking Quantities</h2>
            <div class="detail-row"><span class="detail-label">Non-Reserved:</span><span class="detail-value">${escapeHtml(String(quantityEntries.non_reserved || 0))}</span></div>
            <div class="detail-row"><span class="detail-label">Reserved:</span><span class="detail-value">${escapeHtml(String(quantityEntries.reserved || 0))}</span></div>
            <div class="detail-row"><span class="detail-label">Premium:</span><span class="detail-value">${escapeHtml(String(quantityEntries.premium || 0))}</span></div>
        </div>

        <div class="details-section">
            <h2>Vehicle Lists</h2>
            <div class="detail-row"><span class="detail-label">Non-Reserved:</span><span class="detail-value">${escapeHtml(((renewal.vehiclePlateNumbers && renewal.vehiclePlateNumbers.non_reserved) || []).join(', ') || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Reserved:</span><span class="detail-value">${escapeHtml(((renewal.vehiclePlateNumbers && renewal.vehiclePlateNumbers.reserved) || []).join(', ') || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Premium:</span><span class="detail-value">${escapeHtml(((renewal.vehiclePlateNumbers && renewal.vehiclePlateNumbers.premium) || []).join(', ') || '-')}</span></div>
        </div>

        <div class="details-section">
            <h2>Pricing Breakdown</h2>
            <div class="detail-row"><span class="detail-label">Non-Reserved Total:</span><span class="detail-value">RM ${escapeHtml(String(pricingBreakdown.non_reservedTotal || 0))}</span></div>
            <div class="detail-row"><span class="detail-label">Reserved Total:</span><span class="detail-value">RM ${escapeHtml(String(pricingBreakdown.reservedTotal || 0))}</span></div>
            <div class="detail-row"><span class="detail-label">Premium Total:</span><span class="detail-value">RM ${escapeHtml(String(pricingBreakdown.premiumTotal || 0))}</span></div>
            <div class="detail-row"><span class="detail-label">Grand Total:</span><span class="detail-value"><strong>RM ${escapeHtml(String(pricingBreakdown.grandTotal || 0))}</strong></span></div>
        </div>
    ` : `
        <div class="details-section">
            <h2>Applicant Information</h2>
            <div class="detail-row"><span class="detail-label">Full Name:</span><span class="detail-value">${escapeHtml(renewal.fullName || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Email Address:</span><span class="detail-value">${escapeHtml(renewal.email || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Vehicle Plate Numbers:</span><span class="detail-value">${escapeHtml(plateNumbers.length ? plateNumbers.join(', ') : '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Renewal Month / Payment Note:</span><span class="detail-value">${escapeHtml(renewal.renewalMonthNote || '-')}</span></div>
        </div>
    `;

    detailsContainer.innerHTML = `
        <div class="details-section">
            <h2>Reference Information</h2>
            <div class="detail-row"><span class="detail-label">Renewal Reference:</span><span class="detail-value">${escapeHtml(renewal.renewalReference || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Renewal Type:</span><span class="detail-value">${escapeHtml(renewal.renewalType || 'Individual')}</span></div>
            <div class="detail-row"><span class="detail-label">Submission Date:</span><span class="detail-value">${escapeHtml(formatDateTime(renewal.submittedAt))}</span></div>
            <div class="detail-row"><span class="detail-label">Status:</span><span class="status-badge ${(renewal.status || '').toLowerCase()}">${escapeHtml(renewal.status || 'Pending')}</span></div>
        </div>

        ${tenantVehicleHtml}

        <div class="details-section">
            <h2>Payment Receipt</h2>
            ${renewal.receiptUrl ? `<a href="${escapeHtml(renewal.receiptUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(renewal.receiptUrl)}" alt="Renewal Receipt" class="receipt-image"></a>` : '<p class="no-receipt">No receipt uploaded</p>'}
        </div>

        ${receiptInfo ? `
        <div class="details-section">
            <h2>Approved Receipt Information</h2>
            <div class="detail-row"><span class="detail-label">Receipt Number:</span><span class="detail-value">${escapeHtml(receiptInfo.receiptNumber || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Company Name:</span><span class="detail-value">${escapeHtml(receiptInfo.companyName || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Company Address:</span><span class="detail-value">${escapeHtml(receiptInfo.companyAddress || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Product / Subscription Month:</span><span class="detail-value">${escapeHtml(receiptInfo.productMonth || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Parking Type:</span><span class="detail-value">${escapeHtml(receiptInfo.parkingType || '-')}</span></div>
            <div class="detail-row"><span class="detail-label">Quantity:</span><span class="detail-value">${escapeHtml(String(receiptInfo.quantity || 0))}</span></div>
            <div class="detail-row"><span class="detail-label">Unit Price:</span><span class="detail-value">RM ${escapeHtml(String(receiptInfo.unitPrice || 0))}</span></div>
            <div class="detail-row"><span class="detail-label">Total Amount:</span><span class="detail-value"><strong>RM ${escapeHtml(String(receiptInfo.totalAmount || 0))}</strong></span></div>
            <div class="detail-row"><span class="detail-label">Additional Notes:</span><span class="detail-value">${escapeHtml(receiptInfo.additionalNotes || '-')}</span></div>
        </div>
        ` : ''}
    `;
}

function wireStatusActions(renewalReference, status, renewal) {
    if (status !== 'Pending') {
        return;
    }

    const actionButtons = document.getElementById('renewalActionButtons');
    const approveButton = document.getElementById('renewalApproveBtn');
    const rejectButton = document.getElementById('renewalRejectBtn');

    actionButtons.style.display = 'flex';

    approveButton.addEventListener('click', function() {
        if (renewal && renewal.renewalType === 'Individual') {
            openApprovalModal(renewalReference);
            return;
        }

        updateRenewalStatus(renewalReference, 'Approved', approveButton);
    });

    rejectButton.addEventListener('click', function() {
        updateRenewalStatus(renewalReference, 'Rejected', rejectButton);
    });
}

function wireApprovalModal() {
    const modal = document.getElementById('renewalApprovalModal');
    const backdrop = document.getElementById('renewalApprovalBackdrop');
    const closeBtn = document.getElementById('renewalApprovalCloseBtn');
    const cancelBtn = document.getElementById('approvalCancelBtn');
    const form = document.getElementById('renewalApprovalForm');
    const quantityInput = document.getElementById('approvalQuantity');
    const unitPriceInput = document.getElementById('approvalUnitPrice');
    const totalAmountInput = document.getElementById('approvalTotalAmount');

    function closeModal() {
        if (!modal) {
            return;
        }

        modal.hidden = true;
        document.body.classList.remove('has-open-approval-modal');
        currentRenewalApprovalContext = null;
        if (form) {
            form.reset();
        }
    }

    function updateComputedTotal() {
        const quantity = Number(quantityInput ? quantityInput.value : 0) || 0;
        const unitPrice = Number(unitPriceInput ? unitPriceInput.value : 0) || 0;
        if (totalAmountInput) {
            totalAmountInput.value = quantity > 0 && unitPrice > 0 ? String(quantity * unitPrice) : '';
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

    if (quantityInput) {
        quantityInput.addEventListener('input', updateComputedTotal);
    }

    if (unitPriceInput) {
        unitPriceInput.addEventListener('input', updateComputedTotal);
    }

    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            if (!currentRenewalApprovalContext) {
                showAppMessage('Renewal details are missing.', 'error');
                return;
            }

            const approvalPayload = {
                receiptNumber: (document.getElementById('approvalReceiptNumber').value || '').trim(),
                productMonth: (document.getElementById('approvalProductMonth').value || '').trim(),
                parkingType: (document.getElementById('approvalParkingType').value || '').trim(),
                quantity: Number(document.getElementById('approvalQuantity').value || 0),
                unitPrice: Number(document.getElementById('approvalUnitPrice').value || 0),
                totalAmount: Number(document.getElementById('approvalTotalAmount').value || 0),
                additionalNotes: (document.getElementById('approvalAdditionalNotes').value || '').trim(),
            };

            if (!approvalPayload.productMonth || !approvalPayload.parkingType) {
                showAppMessage('Please complete all required receipt fields.', 'warning');
                return;
            }

            if (!approvalPayload.quantity || !approvalPayload.unitPrice || !approvalPayload.totalAmount) {
                showAppMessage('Please complete the quantity, unit price, and total amount fields.', 'warning');
                return;
            }

            if (approvalPayload.totalAmount !== approvalPayload.quantity * approvalPayload.unitPrice) {
                showAppMessage('Total Amount must equal Quantity multiplied by Unit Price.', 'warning');
                return;
            }

            const submitButton = document.getElementById('approvalConfirmBtn');
            setButtonLoading(submitButton, true, 'Confirming...');

            try {
                const result = await requestJson(`/admin/renewals/${encodeURIComponent(currentRenewalApprovalContext.renewalReference)}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(approvalPayload),
                    loadingMessage: 'Saving receipt information...',
                });

                showAppMessage(result.message || 'Renewal request approved successfully.', 'success', 'Approved');
                closeModal();
                setTimeout(() => {
                    window.location.href = 'admin-renewals.html';
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

    function closeModal() {
        if (!modal) {
            return;
        }

        modal.hidden = true;
        document.body.classList.remove('has-open-approval-modal');
        currentRenewalApprovalContext = null;
        if (form) {
            form.reset();
        }
    }

    window.closeRenewalApprovalModal = closeModal;
}

function generateReceiptNumber(reference) {
    const normalized = String(reference || '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `RCPT-${normalized || Date.now()}`;
}

function openApprovalModal(renewalReference) {
    const modal = document.getElementById('renewalApprovalModal');
    if (!modal || !currentRenewalApprovalContext || currentRenewalApprovalContext.renewalReference !== renewalReference) {
        showAppMessage('Renewal details are not ready yet.', 'warning');
        return;
    }

    const renewal = currentRenewalApprovalContext.renewal;
    if (!renewal) {
        showAppMessage('Renewal details are not ready yet.', 'warning');
        return;
    }
    const plateNumbers = Array.isArray(renewal.vehiclePlateNumbers) ? renewal.vehiclePlateNumbers : [];

    document.getElementById('approvalCustomerName').value = renewal.fullName || '-';
    document.getElementById('approvalCustomerEmail').value = renewal.email || '-';
    document.getElementById('approvalVehiclePlates').value = plateNumbers.length ? plateNumbers.join(', ') : '-';
    document.getElementById('approvalReceiptNumber').value = generateReceiptNumber(renewalReference);
    document.getElementById('approvalProductMonth').value = renewal.renewalMonthNote || '';
    document.getElementById('approvalParkingType').value = 'Individual Renewal';
    document.getElementById('approvalQuantity').value = '1';
    document.getElementById('approvalUnitPrice').value = '';
    document.getElementById('approvalTotalAmount').value = '';
    document.getElementById('approvalAdditionalNotes').value = '';

    modal.hidden = false;
    document.body.classList.add('has-open-approval-modal');
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
