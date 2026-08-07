// Admin Application Details Handler
window.addEventListener('DOMContentLoaded', function() {
    const index = localStorage.getItem('currentApplicationIndex');
    
    if (index === null) {
        window.location.href = 'admin-applications.html';
        return;
    }
    
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    const app = applications[parseInt(index)];
    
    if (!app) {
        window.location.href = 'admin-applications.html';
        return;
    }
    
    const detailsContainer = document.getElementById('detailsContainer');
    
    // Format date
    const date = new Date(app.submissionDate);
    const formattedDate = date.toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Build details HTML
    detailsContainer.innerHTML = `
        <div class="details-section">
            <h2>Reference Information</h2>
            <div class="detail-row">
                <span class="detail-label">Reference Number:</span>
                <span class="detail-value" data-testid="detail-reference">${app.referenceNumber}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Submission Date:</span>
                <span class="detail-value" data-testid="detail-date">${formattedDate}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="status-badge ${app.status.toLowerCase()}" data-testid="detail-status">${app.status}</span>
            </div>
        </div>
        
        <div class="details-section">
            <h2>Applicant Information</h2>
            <div class="detail-row">
                <span class="detail-label">Full Name:</span>
                <span class="detail-value" data-testid="detail-name">${app.fullName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Phone Number:</span>
                <span class="detail-value">${app.phoneNumber}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Customer Email:</span>
                <span class="detail-value" data-testid="detail-email">${app.email || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Company Name:</span>
                <span class="detail-value">${app.companyName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Staff ID:</span>
                <span class="detail-value">${app.staffId || '-'}</span>
            </div>
        </div>
        
        <div class="details-section">
            <h2>Vehicle Information</h2>
            <div class="detail-row">
                <span class="detail-label">Vehicle Number:</span>
                <span class="detail-value">${app.vehicleNumber}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Vehicle Model:</span>
                <span class="detail-value">${app.vehicleModel}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Vehicle Type:</span>
                <span class="detail-value">${app.vehicleType}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Vehicle Color:</span>
                <span class="detail-value">${app.vehicleColor}</span>
            </div>
        </div>
        
        <div class="details-section">
            <h2>Parking Information</h2>
            <div class="detail-row">
                <span class="detail-label">Parking Type:</span>
                <span class="detail-value">${app.parkingType}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Subscription Period:</span>
                <span class="detail-value">${app.subscriptionPeriod}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Total Amount:</span>
                <span class="detail-value"><strong>RM ${app.totalAmount}</strong></span>
            </div>
        </div>
        
        <div class="details-section">
            <h2>Payment Receipt</h2>
            ${app.receiptImage ? 
                `<img src="${app.receiptImage}" alt="Payment Receipt" class="receipt-image" data-testid="receipt-image">` : 
                '<p class="no-receipt">No receipt uploaded</p>'
            }
        </div>
    `;
    
    // Show action buttons only if status is Pending
    if (app.status === 'Pending') {
        const actionButtons = document.getElementById('actionButtons');
        actionButtons.style.display = 'flex';
        
        document.getElementById('approveBtn').addEventListener('click', function() {
            updateApplicationStatus(parseInt(index), 'Approved');
        });
        
        document.getElementById('rejectBtn').addEventListener('click', function() {
            updateApplicationStatus(parseInt(index), 'Rejected');
        });
    }
});

function updateApplicationStatus(index, newStatus) {
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    applications[index].status = newStatus;
    localStorage.setItem('applications', JSON.stringify(applications));
    
    // Show confirmation and redirect
    alert(`Application ${newStatus.toLowerCase()} successfully!`);
    window.location.href = 'admin-applications.html';
}