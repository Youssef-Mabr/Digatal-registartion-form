// Payment Page Handler
let uploadedReceipt = null;

function getCurrentApplication() {
    const savedData = sessionStorage.getItem('currentApplication');
    if (!savedData) {
        window.location.href = 'registration.html';
        return null;
    }
    return JSON.parse(savedData);
}

window.addEventListener('DOMContentLoaded', function() {
    const data = getCurrentApplication();
    if (!data) {
        return;
    }
    // Guard: payment page is only for New Registration flow.
    if (data.applicationType && data.applicationType !== 'registration') {
        window.location.href = 'review.html';
        return;
    }

    const parkingType = data.parkingType;
    if (!parkingType) {
        window.location.href = 'registration.html';
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Checking availability...';
    }

    loadParkingAvailabilityForPayment(parkingType);

    document.getElementById('paymentAmount').textContent = `RM ${data.totalAmount}`;
    
    // Upload area click handler
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
        if (file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                showAppMessage('File size must be less than 5MB.', 'warning');
                receiptUpload.value = '';
                return;
            }

            // Validate file type (JPG, JPEG, PNG only)
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            const fileName = (file.name || '').toLowerCase();
            const extOk = /\.(jpg|jpeg|png)$/i.test(fileName);
            if (!allowedTypes.includes(file.type) && !extOk) {
                showAppMessage('Unsupported file format. Please upload JPG, JPEG or PNG only.', 'warning');
                receiptUpload.value = '';
                return;
            }

            // Read and display the image preview
            const reader = new FileReader();
            reader.onload = function(event) {
                uploadedReceipt = event.target.result;
                previewImage.src = event.target.result;
                previewImage.style.display = '';
                uploadPlaceholder.style.display = 'none';
                uploadPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    
    removeImage.addEventListener('click', function(e) {
        e.stopPropagation();
        uploadedReceipt = null;
        receiptUpload.value = '';
        uploadPlaceholder.style.display = 'block';
        uploadPreview.style.display = 'none';
    });
    
    // Submit button handler
    document.getElementById('submitBtn').addEventListener('click', function() {
        if (!uploadedReceipt) {
            showAppMessage('Please upload a payment receipt before submitting.', 'warning');
            return;
        }

        const submitApplication = async () => {
            setButtonLoading(this, true, 'Submitting...');
            try {
                const formData = new FormData();
                formData.append('applicationData', JSON.stringify(data));
                formData.append('receipt', receiptUpload.files[0]);

                const result = await requestFormData('/applications', formData, {
                    loadingMessage: 'Submitting your application...'
                });
                // Merge full submitted application data with server response for downstream pages
                const fullSubmission = Object.assign({}, data, result);
                sessionStorage.removeItem('currentApplication');
                sessionStorage.setItem('lastSubmission', JSON.stringify(fullSubmission));
                window.location.href = 'success.html';
            } catch (error) {
                showAppMessage(error.message, 'error', 'Submission failed');
                setButtonLoading(this, false);
            }
        };

        submitApplication();
    });
});

async function loadParkingAvailabilityForPayment(parkingType) {
    try {
        const parkingAvailability = await fetchParkingAvailability({ skipLoading: true });
        const parkingAvailabilityMap = normalizeParkingAvailability(parkingAvailability);
        const key = getParkingTypeKey(parkingType);
        const record = key ? parkingAvailabilityMap[key] : null;
        const submitBtn = document.getElementById('submitBtn');

        if (record && record.available === false) {
            showAppMessage(`${getParkingTypeLabel(parkingType)} is sold out. Please choose another parking type.`, 'warning', 'Parking sold out');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Parking Sold Out';
            }
            setTimeout(() => {
                window.location.href = 'registration.html';
            }, 1500);
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText || 'Submit Application';
        }
    } catch (error) {
        console.warn('Unable to verify parking availability before payment.', error);
    }
}
