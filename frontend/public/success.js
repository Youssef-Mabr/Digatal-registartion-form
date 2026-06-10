// Success Page Handler
const API_BASE = 'http://localhost:5000/api';

window.addEventListener('DOMContentLoaded', async function() {
    const referenceNumber = localStorage.getItem('lastSubmission');

    if (!referenceNumber) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/applications/reference/${referenceNumber}`);
        const application = await response.json();

        if (!response.ok) {
            throw new Error(application.message || 'Application not found');
        }

        document.getElementById('referenceNumber').textContent = application.referenceNumber;

        const date = new Date(application.submittedAt || application.submissionDate || Date.now());
        const formattedDate = date.toLocaleDateString('en-MY', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('submissionDate').textContent = formattedDate;
    } catch (error) {
        alert(error.message);
        window.location.href = 'index.html';
    }
});

function returnHome() {
    localStorage.removeItem('lastSubmission');
    window.location.href = 'index.html';
}