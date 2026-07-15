// Admin Dashboard Handler
window.addEventListener('DOMContentLoaded', function() {
    requestJson('/admin/dashboard/stats', { loadingMessage: 'Loading dashboard...' })
        .then(stats => {
            document.getElementById('totalApplications').textContent = stats.totalApplications;
            document.getElementById('pendingCount').textContent = stats.pendingApplications;
            document.getElementById('approvedCount').textContent = stats.approvedApplications;
            document.getElementById('rejectedCount').textContent = stats.rejectedApplications;
            const renewalCount = document.getElementById('renewalCount');
            if (renewalCount) {
                renewalCount.textContent = stats.totalRenewals || 0;
            }
        })
        .catch(error => {
            showAppMessage(error.message, 'error', 'Dashboard unavailable');
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 1400);
        });
});
