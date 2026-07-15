const TENANT_TYPES = [
    { key: 'non_reserved', label: 'Non-Reserved Parking' },
    { key: 'reserved', label: 'Reserved Parking' },
    { key: 'premium', label: 'Premium Parking' },
];

const TENANT_MAX_PLATES = 50;
let tenantUploadedReceipt = null;
let tenantPriceMap = {};

window.addEventListener('DOMContentLoaded', function() {
    initializeTenantRenewal();
});

async function initializeTenantRenewal() {
    try {
        const prices = await fetchParkingPrices({ skipLoading: true });
        tenantPriceMap = normalizeParkingPrices(prices);
    } catch (error) {
        tenantPriceMap = {};
    }

    renderTenantQuantityInputs();
    renderTenantVehicleGroups();
    TENANT_TYPES.forEach(item => renderTenantVehicleInputs(item.key, 0));
    renderTenantPricingSummary();
    bindTenantUpload();

    document.getElementById('tenantQuantityGrid').addEventListener('input', handleTenantQuantityChange);
    document.getElementById('tenantRenewalForm').addEventListener('submit', submitTenantRenewal);
}

function getTenantPrice(key) {
    return Number(tenantPriceMap[key] && tenantPriceMap[key].monthlyPrice ? tenantPriceMap[key].monthlyPrice : ({ non_reserved: 159, reserved: 212, premium: 318 }[key] || 0));
}

function renderTenantQuantityInputs() {
    const grid = document.getElementById('tenantQuantityGrid');
    grid.innerHTML = TENANT_TYPES.map(item => `
        <div class="tenant-quantity-card">
            <label for="qty-${item.key}">${escapeHtml(item.label)} Quantity</label>
            <input type="number" min="0" max="50" value="0" id="qty-${item.key}" data-tenant-qty="${item.key}">
            <p class="tenant-qty-price">RM ${getTenantPrice(item.key)}/month</p>
        </div>
    `).join('');
}

function renderTenantVehicleGroups() {
    const container = document.getElementById('tenantVehicleGroups');
    container.innerHTML = TENANT_TYPES.map(item => `
        <div class="tenant-vehicle-group" id="group-${item.key}">
            <div class="tenant-vehicle-group__header">
                <h3>${escapeHtml(item.label)}</h3>
                <span class="tenant-vehicle-group__count" data-tenant-group-count="${item.key}">0 vehicles</span>
            </div>
            <div class="tenant-vehicle-inputs" data-tenant-inputs="${item.key}"></div>
        </div>
    `).join('');
}

function handleTenantQuantityChange(event) {
    if (!event.target.dataset.tenantQty) {
        return;
    }

    const key = event.target.dataset.tenantQty;
    const quantity = Math.max(0, Math.min(TENANT_MAX_PLATES, parseInt(event.target.value || '0', 10) || 0));
    event.target.value = String(quantity);
    renderTenantVehicleInputs(key, quantity);
    renderTenantPricingSummary();
}

function renderTenantVehicleInputs(key, quantity) {
    const inputsContainer = document.querySelector(`[data-tenant-inputs="${key}"]`);
    const countLabel = document.querySelector(`[data-tenant-group-count="${key}"]`);
    if (!inputsContainer || !countLabel) {
        return;
    }

    countLabel.textContent = `${quantity} vehicle${quantity === 1 ? '' : 's'}`;

    if (quantity === 0) {
        inputsContainer.innerHTML = '<p class="tenant-empty-note">No vehicles added for this category.</p>';
        return;
    }

    const existingValues = Array.from(inputsContainer.querySelectorAll('input')).map(input => input.value);
    inputsContainer.innerHTML = '';
    for (let index = 0; index < quantity; index += 1) {
        const wrapper = document.createElement('div');
        wrapper.className = 'tenant-vehicle-input-row';
        wrapper.innerHTML = `
            <label>Plate ${index + 1}</label>
            <input type="text" maxlength="20" data-tenant-plate="${key}" placeholder="Enter plate number" value="${escapeHtml(existingValues[index] || '')}">
        `;
        inputsContainer.appendChild(wrapper);
    }
}

function getTenantQuantities() {
    return TENANT_TYPES.reduce((acc, item) => {
        const input = document.getElementById(`qty-${item.key}`);
        acc[item.key] = Math.max(0, parseInt(input.value || '0', 10) || 0);
        return acc;
    }, {});
}

function getTenantPlateGroups() {
    const grouped = {};
    TENANT_TYPES.forEach(item => {
        grouped[item.key] = Array.from(document.querySelectorAll(`[data-tenant-plate="${item.key}"]`))
            .map(input => (input.value || '').trim().toUpperCase())
            .filter(Boolean);
    });
    return grouped;
}

function renderTenantPricingSummary() {
    const summary = document.getElementById('tenantPricingSummary');
    const quantities = getTenantQuantities();

    const lines = TENANT_TYPES.map(item => {
        const unitPrice = getTenantPrice(item.key);
        const total = quantities[item.key] * unitPrice;
        return `
            <div class="tenant-pricing-row">
                <span>${escapeHtml(item.label)} (${quantities[item.key]} x RM ${unitPrice})</span>
                <strong>RM ${total}</strong>
            </div>
        `;
    });

    const grandTotal = TENANT_TYPES.reduce((sum, item) => sum + (quantities[item.key] * getTenantPrice(item.key)), 0);
    summary.innerHTML = `${lines.join('')}<div class="tenant-pricing-row tenant-pricing-row--grand"><span>Grand Total</span><strong>RM ${grandTotal}</strong></div>`;
}

function bindTenantUpload() {
    const uploadArea = document.getElementById('tenantUploadArea');
    const receiptUpload = document.getElementById('tenantReceiptUpload');
    const placeholder = document.getElementById('tenantUploadPlaceholder');
    const preview = document.getElementById('tenantUploadPreview');
    const previewImage = document.getElementById('tenantPreviewImage');
    const removeImage = document.getElementById('tenantRemoveImage');

    uploadArea.addEventListener('click', function() {
        receiptUpload.click();
    });

    receiptUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showAppMessage('File size must be less than 5MB.', 'warning');
            receiptUpload.value = '';
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        const fileName = (file.name || '').toLowerCase();
        const extOk = /\.(jpg|jpeg|png|pdf)$/i.test(fileName);
        if (!allowedTypes.includes(file.type) && !extOk) {
            showAppMessage('Unsupported file format. Please upload JPG, JPEG, PNG or PDF only.', 'warning');
            receiptUpload.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            tenantUploadedReceipt = event.target.result;
            if (file.type === 'application/pdf') {
                previewImage.src = '';
                previewImage.style.display = 'none';
                let pdfLabel = document.getElementById('tenantPdfReceiptLabel');
                if (!pdfLabel) {
                    pdfLabel = document.createElement('div');
                    pdfLabel.id = 'tenantPdfReceiptLabel';
                    pdfLabel.style.cssText = 'padding:20px;background:#f0fdf4;border-radius:8px;color:#166534;font-weight:600;text-align:center;';
                    preview.insertBefore(pdfLabel, preview.firstChild);
                }
                pdfLabel.textContent = `📄 ${file.name}`;
                pdfLabel.style.display = 'block';
            } else {
                const pdfLabel = document.getElementById('tenantPdfReceiptLabel');
                if (pdfLabel) {
                    pdfLabel.style.display = 'none';
                }
                previewImage.src = event.target.result;
                previewImage.style.display = '';
            }
            placeholder.style.display = 'none';
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    removeImage.addEventListener('click', function(e) {
        e.stopPropagation();
        tenantUploadedReceipt = null;
        receiptUpload.value = '';
        placeholder.style.display = 'block';
        preview.style.display = 'none';
    });
}

function validateTenantRenewal(payload, receiptFile) {
    if (!payload.companyName || !payload.contactPerson || !payload.email || !payload.phoneNumber || !payload.renewalMonthNote) {
        return 'Please fill in all required company information.';
    }

    const anyQuantity = Object.values(payload.parkingQuantities).some(value => value > 0);
    if (!anyQuantity) {
        return 'Please select at least one parking quantity.';
    }

    for (const key of TENANT_TYPES.map(item => item.key)) {
        if (payload.parkingQuantities[key] > 0 && payload.vehiclePlateNumbers[key].length !== payload.parkingQuantities[key]) {
            return `${key.replace('_', ' ').toUpperCase()} vehicle plates must match the selected quantity.`;
        }
    }

    if (!receiptFile || !tenantUploadedReceipt) {
        return 'Please upload a payment receipt before submitting.';
    }

    return null;
}

async function submitTenantRenewal(event) {
    event.preventDefault();

    const receiptFile = document.getElementById('tenantReceiptUpload').files[0];
    const payload = {
        renewalType: 'Tenant',
        companyName: (document.getElementById('companyName').value || '').trim(),
        contactPerson: (document.getElementById('contactPerson').value || '').trim(),
        email: (document.getElementById('tenantEmail').value || '').trim(),
        phoneNumber: (document.getElementById('tenantPhoneNumber').value || '').trim(),
        renewalMonthNote: (document.getElementById('tenantRenewalMonthNote').value || '').trim(),
        parkingQuantities: getTenantQuantities(),
        vehiclePlateNumbers: getTenantPlateGroups(),
    };

    const validationError = validateTenantRenewal(payload, receiptFile);
    if (validationError) {
        showAppMessage(validationError, 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('renewalData', JSON.stringify(payload));
    formData.append('receipt', receiptFile);

    const submitButton = document.getElementById('submitTenantRenewalBtn');
    setButtonLoading(submitButton, true, 'Submitting...');
    try {
        const result = await requestFormData('/renewals/tenant', formData, { loadingMessage: 'Submitting tenant renewal...' });
        sessionStorage.setItem('lastRenewalSubmission', JSON.stringify(Object.assign({}, payload, result)));
        window.location.href = 'renewal-success.html';
    } catch (error) {
        showAppMessage(error.message, 'error', 'Submission failed');
        setButtonLoading(submitButton, false);
    }
}

function handleTenantQuantityChange(event) {
    if (!event.target.dataset.tenantQty) {
        return;
    }

    const key = event.target.dataset.tenantQty;
    const quantity = Math.max(0, Math.min(TENANT_MAX_PLATES, parseInt(event.target.value || '0', 10) || 0));
    event.target.value = String(quantity);
    renderTenantVehicleInputs(key, quantity);
    renderTenantPricingSummary();
}
