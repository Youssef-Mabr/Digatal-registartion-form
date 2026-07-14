// Review Page Handler
const REVIEW_APP_TYPE_LABELS = {
    registration: 'New Registration',
    deregistration: 'Deregistration',
    edit_remove: 'Edit / Remove Vehicle'
};

function isParkingTypeAvailable(parkingType, parkingAvailabilityMap) {
    const key = getParkingTypeKey(parkingType);
    if (!key) {
        return false;
    }

    const record = parkingAvailabilityMap[key];
    return record ? record.available !== false : true;
}

async function loadParkingAvailabilityForReview() {
    try {
        const parkingAvailability = await fetchParkingAvailability({ skipLoading: true });
        return normalizeParkingAvailability(parkingAvailability);
    } catch (error) {
        console.warn('Unable to verify parking availability on review page.', error);
        return {};
    }
}

function disableProceedButton(message) {
    const proceedBtn = document.getElementById('proceedBtn');
    if (proceedBtn) {
        proceedBtn.disabled = true;
        proceedBtn.textContent = 'Parking Sold Out';
    }
    if (message) {
        showAppMessage(message, 'warning', 'Parking sold out');
    }
}

window.addEventListener('DOMContentLoaded', function() {
    const savedData = sessionStorage.getItem('currentApplication');

    if (!savedData) {
        // No data found, redirect to registration
        window.location.href = 'registration.html';
        return;
    }

    const data = JSON.parse(savedData);

    const applicationType = (data.applicationType && REVIEW_APP_TYPE_LABELS[data.applicationType])
        ? data.applicationType
        : 'registration';
    const paymentRequired = applicationType === 'registration';

    // Application Type header
    const appTypeEl = document.getElementById('review-applicationType');
    if (appTypeEl) appTypeEl.textContent = REVIEW_APP_TYPE_LABELS[applicationType];

    // Remarks section
    const remarksSection = document.getElementById('review-remarks-section');
    const remarksEl = document.getElementById('review-remarks');
    if (applicationType === 'edit_remove') {
        remarksSection.style.display = '';
        remarksEl.textContent = data.remarks || '-';
    } else {
        remarksSection.style.display = 'none';
    }

    // Populate personal information
    document.getElementById('review-fullName').textContent = data.fullName;
    document.getElementById('review-phoneNumber').textContent = data.phoneNumber;
    document.getElementById('review-email').textContent = data.email || '';
    document.getElementById('review-companyName').textContent = data.companyName;
    document.getElementById('review-staffId').textContent = data.staffId || '-';

    // Populate vehicles into the Vehicle Information section
    const allSections = document.querySelectorAll('.review-container > .review-section');
    // Sections in order: [0]Application Details, [1]Remarks (may be hidden), [2]Personal Info, [3]Vehicle Info, [4]Parking Subscription
    const vehicleSection = allSections[3];
    if (vehicleSection) {
        vehicleSection.innerHTML = '<h2>Vehicle Information</h2>';
        (data.vehicles || []).forEach((vehicle, index) => {
            const vehicleDiv = document.createElement('div');
            vehicleDiv.style.marginBottom = '20px';
            vehicleDiv.style.paddingBottom = '20px';
            if (index < data.vehicles.length - 1) {
                vehicleDiv.style.borderBottom = '1px solid var(--border-gray)';
            }

            vehicleDiv.innerHTML = `
                <h3 style="color: var(--primary-green); margin-bottom: 10px; font-size: 16px;">Vehicle ${index + 1}</h3>
                <div class="review-item">
                    <span class="review-label">Vehicle Number:</span>
                    <span class="review-value" data-testid="review-vehicle-number-${index}">${vehicle.vehicleNumber}</span>
                </div>
                <div class="review-item">
                    <span class="review-label">Vehicle Model:</span>
                    <span class="review-value" data-testid="review-vehicle-model-${index}">${vehicle.vehicleModel}</span>
                </div>
                <div class="review-item">
                    <span class="review-label">Vehicle Type:</span>
                    <span class="review-value" data-testid="review-vehicle-type-${index}">${vehicle.vehicleType}</span>
                </div>
                <div class="review-item">
                    <span class="review-label">Vehicle Color:</span>
                    <span class="review-value" data-testid="review-vehicle-color-${index}">${vehicle.vehicleColor}</span>
                </div>
            `;
            vehicleSection.appendChild(vehicleDiv);
        });
    }

    // Parking subscription section
    const parkingSection = document.getElementById('review-parking-section');
    const parkingTypeText = data.parkingType || '';
    let price = 0;
    if (parkingTypeText.includes('Non Reserved')) price = 159;
    else if (parkingTypeText.includes('Reserved')) price = 212;
    else if (parkingTypeText.includes('Premium')) price = 318;

    document.getElementById('review-parkingType').textContent = parkingTypeText ? `${parkingTypeText} (RM${price} per car)` : '-';
    document.getElementById('review-subscriptionPeriod').textContent = data.subscriptionPeriod || '-';

    // Compute totalAmount if missing (registration only shows amount)
    let totalAmount = data.totalAmount;
    if (!totalAmount || isNaN(totalAmount)) {
        const multipliers = { 'Monthly': 1, 'Quarterly': 3, 'Yearly': 12 };
        const mult = multipliers[data.subscriptionPeriod] || 1;
        const carCount = (data.vehicles || []).length || 1;
        totalAmount = price * mult * carCount;
        data.totalAmount = totalAmount;
        sessionStorage.setItem('currentApplication', JSON.stringify(data));
    }
    document.getElementById('review-totalAmount').textContent = `RM ${totalAmount}`;

    // Hide amount + parking section for non-payment types (but keep parking selection visible read-only? spec says hide payment section)
    if (!paymentRequired) {
        // Keep parking selections visible (they are part of the request), but hide total amount row.
        const totalRow = document.getElementById('review-total-row');
        if (totalRow) totalRow.style.display = 'none';
    }

    // Wire proceed button
    const proceedBtn = document.getElementById('proceedBtn');
    if (proceedBtn) {
        proceedBtn.dataset.originalText = proceedBtn.textContent;
        proceedBtn.disabled = true;
        proceedBtn.textContent = 'Checking availability...';

        if (paymentRequired) {
            proceedBtn.addEventListener('click', () => {
                window.location.href = 'payment.html';
            });
        } else {
            proceedBtn.addEventListener('click', async () => {
                await submitNonPaymentApplication(data, proceedBtn);
            });
        }
    }

    loadParkingAvailabilityForReview().then(parkingAvailabilityMap => {
        if (!isParkingTypeAvailable(data.parkingType, parkingAvailabilityMap)) {
            disableProceedButton(`${data.parkingType} is sold out. Please choose another parking type before continuing.`);
            return;
        }

        const proceedBtn = document.getElementById('proceedBtn');
        if (proceedBtn) {
            proceedBtn.disabled = false;
            proceedBtn.textContent = paymentRequired ? 'Proceed to Payment' : 'Submit Request';
        }
    });
});

async function submitNonPaymentApplication(data, button) {
    if (typeof setButtonLoading === 'function') setButtonLoading(button, true, 'Submitting...');
    try {
        const formData = new FormData();
        formData.append('applicationData', JSON.stringify(data));
        const result = await requestFormData('/applications', formData, {
            loadingMessage: 'Submitting your request...'
        });
        const fullSubmission = Object.assign({}, data, result);
        sessionStorage.removeItem('currentApplication');
        sessionStorage.setItem('lastSubmission', JSON.stringify(fullSubmission));
        window.location.href = 'success.html';
    } catch (error) {
        showAppMessage(error.message || 'Submission failed', 'error', 'Submission failed');
        if (typeof setButtonLoading === 'function') setButtonLoading(button, false);
    }
}
