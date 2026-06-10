// Payment Page Handler
const API_BASE = 'http://localhost:5000/api';
let uploadedReceipt = null;

function isAcceptedReceipt(file) {
    const acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const acceptedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    return acceptedTypes.includes(file.type) || acceptedExtensions.some((extension) => file.name.toLowerCase().endsWith(extension));
}

function pdfPreviewDataUri() {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
            <rect width="640" height="360" rx="24" fill="#f5f5f5"/>
            <rect x="210" y="72" width="220" height="216" rx="18" fill="#ffffff" stroke="#00C853" stroke-width="8"/>
            <text x="320" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" fill="#00C853">PDF</text>
            <text x="320" y="224" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#757575">Receipt Uploaded</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getSavedApplication() {
    const savedData = localStorage.getItem('currentApplication');

    if (!savedData) {
        window.location.href = 'registration.html';
        return null;
    }

    return JSON.parse(savedData);
}

window.addEventListener('DOMContentLoaded', function() {
    const data = getSavedApplication();
    if (!data) return;

    document.getElementById('paymentAmount').textContent = `RM ${data.totalAmount}`;

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
            alert('File size must be less than 5MB');
            return;
        }

        if (!isAcceptedReceipt(file)) {
            alert('Please upload a JPG, JPEG, PNG, or PDF file');
            return;
        }

        uploadedReceipt = file;
        uploadPlaceholder.style.display = 'none';
        uploadPreview.style.display = 'block';

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            previewImage.src = pdfPreviewDataUri();
            previewImage.alt = 'PDF receipt preview';
        } else {
            const reader = new FileReader();
            reader.onload = function(event) {
                previewImage.src = event.target.result;
                previewImage.alt = 'Receipt preview';
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
        previewImage.src = '';
    });

    document.getElementById('submitBtn').addEventListener('click', async function() {
        if (!uploadedReceipt) {
            alert('Please upload a payment receipt before submitting');
            return;
        }

        try {
            const applicationPayload = {
                ...data,
                receiptImage: undefined,
                submissionDate: new Date().toISOString(),
                status: 'Pending',
            };

            const formData = new FormData();
            formData.append('applicationData', JSON.stringify(applicationPayload));
            formData.append('receipt', uploadedReceipt);

            const response = await fetch(`${API_BASE}/applications`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to submit application');
            }

            localStorage.setItem('lastSubmission', result.referenceNumber);
            localStorage.removeItem('currentApplication');
            window.location.href = 'success.html';
        } catch (error) {
            alert(error.message);
        }
    });
});
