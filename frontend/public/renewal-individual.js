let uploadedRenewalReceipt = null;
const MAX_PLATES = 3;

window.addEventListener('DOMContentLoaded', function() {
    ensureMinimumPlateFields();
    bindReceiptUpload();

    const addPlateBtn = document.getElementById('addPlateBtn');
    addPlateBtn.addEventListener('click', addPlateField);

    const renewalForm = document.getElementById('renewalForm');
    renewalForm.addEventListener('submit', submitRenewalRequest);
});

function ensureMinimumPlateFields() {
    const existing = document.querySelectorAll('.renewal-plate-input').length;
    if (existing === 0) {
        addPlateField();
    }
    updatePlateControls();
}

function addPlateField() {
    const plateFields = document.getElementById('plateFields');
    const count = plateFields.querySelectorAll('.renewal-plate-item').length;
    if (count >= MAX_PLATES) {
        return;
    }

    const item = document.createElement('div');
    item.className = 'renewal-plate-item';
    item.innerHTML = `
        <input
            type="text"
            class="renewal-plate-input"
            placeholder="Vehicle Plate Number ${count + 1}"
            maxlength="20"
            required
        >
        <button type="button" class="btn btn-danger renewal-remove-plate">Remove</button>
    `;

    const removeBtn = item.querySelector('.renewal-remove-plate');
    removeBtn.addEventListener('click', function() {
        item.remove();
        ensureMinimumPlateFields();
    });

    plateFields.appendChild(item);
    updatePlateControls();
}

function updatePlateControls() {
    const plateItems = Array.from(document.querySelectorAll('.renewal-plate-item'));
    const addPlateBtn = document.getElementById('addPlateBtn');

    plateItems.forEach((item, index) => {
        const input = item.querySelector('.renewal-plate-input');
        const removeBtn = item.querySelector('.renewal-remove-plate');
        input.required = index === 0;
        removeBtn.disabled = plateItems.length === 1;
    });

    addPlateBtn.disabled = plateItems.length >= MAX_PLATES;
}

function bindReceiptUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const receiptUpload = document.getElementById('receiptUpload');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewImage = document.getElementById('previewImage');
    const removeImage = document.getElementById('removeImage');

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
            uploadedRenewalReceipt = event.target.result;
            if (file.type === 'application/pdf') {
                previewImage.src = '';
                previewImage.alt = `PDF receipt: ${file.name}`;
                previewImage.style.display = 'none';
                let pdfLabel = document.getElementById('pdfReceiptLabel');
                if (!pdfLabel) {
                    pdfLabel = document.createElement('div');
                    pdfLabel.id = 'pdfReceiptLabel';
                    pdfLabel.style.cssText = 'padding:20px;background:#f0fdf4;border-radius:8px;color:#166534;font-weight:600;text-align:center;';
                    uploadPreview.insertBefore(pdfLabel, uploadPreview.firstChild);
                }
                pdfLabel.textContent = `📄 ${file.name}`;
                pdfLabel.style.display = 'block';
            } else {
                const pdfLabel = document.getElementById('pdfReceiptLabel');
                if (pdfLabel) {
                    pdfLabel.style.display = 'none';
                }
                previewImage.src = event.target.result;
                previewImage.style.display = '';
            }
            uploadPlaceholder.style.display = 'none';
            uploadPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    removeImage.addEventListener('click', function(e) {
        e.stopPropagation();
        uploadedRenewalReceipt = null;
        receiptUpload.value = '';
        uploadPlaceholder.style.display = 'block';
        uploadPreview.style.display = 'none';
    });
}

function collectPlateNumbers() {
    const plateInputs = Array.from(document.querySelectorAll('.renewal-plate-input'));
    const plates = plateInputs
        .map(input => (input.value || '').trim().toUpperCase())
        .filter(Boolean);

    return Array.from(new Set(plates));
}

function validateRenewalPayload(payload, file) {
    if (!payload.fullName) {
        return 'Full Name is required.';
    }

    if (!payload.vehiclePlateNumbers.length) {
        return 'At least one vehicle plate number is required.';
    }

    if (payload.vehiclePlateNumbers.length > MAX_PLATES) {
        return 'Maximum 3 vehicle plate numbers are allowed.';
    }

    if (!payload.renewalMonthNote) {
        return 'Renewal Month / Payment Note is required.';
    }

    if (!uploadedRenewalReceipt || !file) {
        return 'Please upload a payment receipt before submitting.';
    }

    return null;
}

async function submitRenewalRequest(event) {
    event.preventDefault();

    const submitButton = document.getElementById('submitRenewalBtn');
    const receiptUpload = document.getElementById('receiptUpload');
    const receiptFile = receiptUpload.files[0];

    const payload = {
        renewalType: 'Individual',
        fullName: (document.getElementById('fullName').value || '').trim(),
        vehiclePlateNumbers: collectPlateNumbers(),
        renewalMonthNote: (document.getElementById('renewalMonthNote').value || '').trim(),
    };

    const validationError = validateRenewalPayload(payload, receiptFile);
    if (validationError) {
        showAppMessage(validationError, 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('renewalData', JSON.stringify(payload));
    formData.append('receipt', receiptFile);

    setButtonLoading(submitButton, true, 'Submitting...');
    try {
        const result = await requestFormData('/renewals', formData, {
            loadingMessage: 'Submitting renewal request...',
        });

        const fullSubmission = Object.assign({}, payload, result);
        sessionStorage.setItem('lastRenewalSubmission', JSON.stringify(fullSubmission));
        window.location.href = 'renewal-success.html';
    } catch (error) {
        showAppMessage(error.message, 'error', 'Submission failed');
        setButtonLoading(submitButton, false);
    }
}
