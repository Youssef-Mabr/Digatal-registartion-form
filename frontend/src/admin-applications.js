// Admin Applications List Handler
window.addEventListener('DOMContentLoaded', function() {
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    const applicationsList = document.getElementById('applicationsList');
    const searchInput = document.getElementById('applicationsSearch');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            renderApplications(applications, searchInput.value);
        });
    }

    renderApplications(applications, searchInput ? searchInput.value : '');
});

function renderApplications(applications, searchValue) {
    const applicationsList = document.getElementById('applicationsList');
    const normalizedSearch = (searchValue || '').trim().toLowerCase();
    const filtered = applications
        .slice()
        .sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate))
        .filter(app => {
            if (!normalizedSearch) {
                return true;
            }

            const searchableText = [app.fullName, app.vehicleNumber, app.referenceNumber]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchableText.includes(normalizedSearch);
        });

    const badge = document.getElementById('appCountBadge');
    if (badge) {
        badge.textContent = `${filtered.length} application${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
        applicationsList.innerHTML = '<div style="text-align:center;padding:40px;color:#757575;">No applications found</div>';
        return;
    }

    applicationsList.innerHTML = '';

    // Generate application cards
    filtered.forEach((app, index) => {
        const date = new Date(app.submissionDate);
        const formattedDate = date.toLocaleDateString('en-MY', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-MY', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const card = document.createElement('div');
        card.className = `application-card ${!app.read ? 'unread' : ''}`;
        card.setAttribute('data-testid', `application-card-${index}`);
        card.onclick = function() {
            viewApplication(index);
        };
        
        card.innerHTML = `
            <div class="application-header">
                <div class="applicant-info">
                    <h3>${app.fullName}</h3>
                    <p class="vehicle-number">${app.vehicleNumber}</p>
                </div>
                <span class="status-badge ${app.status.toLowerCase()}" data-testid="status-${index}">${app.status}</span>
            </div>
            <div class="application-meta">
                <span class="date-time">${formattedDate} at ${formattedTime}</span>
                <span class="date-time">Ref: ${app.referenceNumber}</span>
            </div>
        `;
        
        applicationsList.appendChild(card);
    });
}

function viewApplication(index) {
    // Mark as read
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    applications[index].read = true;
    localStorage.setItem('applications', JSON.stringify(applications));
    
    // Store current application index
    localStorage.setItem('currentApplicationIndex', index);
    
    // Navigate to details page
    window.location.href = 'admin-details.html';
}