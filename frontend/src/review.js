// Review Page Handler
window.addEventListener('DOMContentLoaded', function() {
    const savedData = localStorage.getItem('currentApplication');
    
    if (!savedData) {
        // No data found, redirect to registration
        window.location.href = 'registration.html';
        return;
    }
    
    const data = JSON.parse(savedData);
    
    // Populate personal information
    document.getElementById('review-fullName').textContent = data.fullName;
    document.getElementById('review-phoneNumber').textContent = data.phoneNumber;
    document.getElementById('review-email').textContent = data.email || '';
    document.getElementById('review-companyName').textContent = data.companyName;
    document.getElementById('review-staffId').textContent = data.staffId || '-';
    
    // Create vehicle information section
    const vehicleSection = document.querySelector('.review-container').children[1];
    vehicleSection.innerHTML = '<h2>Vehicle Information</h2>';
    
    data.vehicles.forEach((vehicle, index) => {
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
    
    // Update parking subscription
    const parkingTypeText = data.parkingType;
    let price = 0;
    if (parkingTypeText.includes('Non Reserved')) price = 159;
    else if (parkingTypeText.includes('Reserved')) price = 212;
    else if (parkingTypeText.includes('Premium')) price = 318;
    
    document.getElementById('review-parkingType').textContent = `${data.parkingType} (RM${price} per car)`;
    document.getElementById('review-subscriptionPeriod').textContent = data.subscriptionPeriod;
    document.getElementById('review-totalAmount').textContent = `RM ${data.totalAmount}`;
});
