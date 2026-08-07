// Success Page Handler
const SUCCESS_APP_TYPE_LABELS = {
    registration: 'New Registration',
    deregistration: 'Deregistration',
    edit_remove: 'Edit / Remove Vehicle'
};

const SUCCESS_MESSAGES = {
    registration: 'Your application has been submitted and payment is pending verification.',
    deregistration: 'Your deregistration request has been submitted successfully.',
    edit_remove: 'Your vehicle modification request has been submitted successfully.'
};

const SUCCESS_HEADINGS = {
    registration: 'Application Submitted Successfully',
    deregistration: 'Deregistration Submitted Successfully',
    edit_remove: 'Modification Request Submitted Successfully'
};

window.addEventListener('DOMContentLoaded', function() {
    const savedSubmission = sessionStorage.getItem('lastSubmission');

    if (!savedSubmission) {
        window.location.href = 'index.html';
        return;
    }

    const submission = JSON.parse(savedSubmission);
    const type = SUCCESS_APP_TYPE_LABELS[submission.applicationType] ? submission.applicationType : 'registration';

    document.getElementById('referenceNumber').textContent = submission.referenceNumber || '-';
    const appTypeEl = document.getElementById('applicationTypeValue');
    if (appTypeEl) appTypeEl.textContent = SUCCESS_APP_TYPE_LABELS[type];

    const submittedAt = submission.submittedAt || new Date().toISOString();
    document.getElementById('submissionDate').textContent = formatDateOnly(submittedAt);
    document.getElementById('submissionTime').textContent = formatTimeOnly(submittedAt);

    const heading = document.querySelector('[data-testid="success-title"]');
    if (heading) heading.textContent = SUCCESS_HEADINGS[type];

    const message = document.getElementById('successMessage');
    if (message) message.textContent = SUCCESS_MESSAGES[type];

    const downloadBtn = document.getElementById('downloadFormBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async function() {
            const original = downloadBtn.textContent;
            downloadBtn.disabled = true;
            downloadBtn.textContent = 'Preparing PDF...';
            try {
                await downloadSubmissionPdf(submission);
            } catch (e) {
                if (typeof showAppMessage === 'function') {
                    showAppMessage('Could not generate PDF: ' + e.message, 'error');
                } else {
                    alert('Could not generate PDF: ' + e.message);
                }
            } finally {
                downloadBtn.disabled = false;
                downloadBtn.textContent = original;
            }
        });
    }
});

function returnHome() {
    sessionStorage.removeItem('lastSubmission');
    sessionStorage.removeItem('applicationType');
    window.location.href = 'index.html';
}
