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

window.addEventListener('DOMContentLoaded', function() {
    const raw = sessionStorage.getItem('lastRenewalSubmission');
    if (!raw) {
        return;
    }

    try {
        const submission = JSON.parse(raw);
        document.getElementById('renewalReference').textContent = submission.renewalReference || '-';
        document.getElementById('renewalType').textContent = submission.renewalType || 'Individual';
        document.getElementById('renewalStatus').textContent = submission.status || 'Pending';
        document.getElementById('renewalSubmittedAt').textContent = formatRenewalDateTime(submission.submittedAt);
    } catch (error) {
        console.warn('Unable to read renewal submission data', error);
    }
}
