function formatRenewalDateTime(value) {
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

function getRenewalQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        renewalReference: params.get('renewalReference') || '',
        renewalType: params.get('renewalType') || '',
        submittedAt: params.get('submittedAt') || '',
    };
}

async function loadRenewalSubmission() {
    const queryParams = getRenewalQueryParams();
    const storedRaw = sessionStorage.getItem('lastRenewalSubmission');
    let submission = null;

    if (storedRaw) {
        try {
            submission = JSON.parse(storedRaw);
        } catch (error) {
            submission = null;
        }
    }

    return Object.assign({}, submission || {}, queryParams);
}

window.addEventListener('DOMContentLoaded', function() {
    loadRenewalSubmission()
        .then(submission => {
            document.getElementById('renewalReference').textContent = submission.renewalReference || '-';
            document.getElementById('renewalType').textContent = submission.renewalType || 'Individual';
            document.getElementById('renewalStatus').textContent = submission.status || 'Pending';
            document.getElementById('renewalSubmittedAt').textContent = formatRenewalDateTime(submission.submittedAt);

            const submitAnotherButton = document.querySelector('.form-actions .btn-secondary');
            if (submitAnotherButton) {
                submitAnotherButton.onclick = function() {
                    window.location.href = (submission.renewalType || 'Individual') === 'Tenant'
                        ? 'renewal-tenant.html'
                        : 'renewal-individual.html';
                };
            }
        })
        .catch(error => {
            console.warn('Unable to read renewal submission data', error);
        });
}
