// Admin Dashboard Handler
window.addEventListener('DOMContentLoaded', function() {
    const adminMenuButton = document.getElementById('adminMenuButton');
    const adminDrawer = document.getElementById('adminDashboardDrawer');
    const adminDrawerOverlay = document.getElementById('adminDrawerOverlay');
    const adminDrawerClose = document.getElementById('adminDrawerClose');

    function openAdminDrawer() {
        if (!adminMenuButton || !adminDrawer || !adminDrawerOverlay) {
            return;
        }

        adminDrawer.classList.add('is-open');
        adminDrawerOverlay.hidden = false;
        adminMenuButton.setAttribute('aria-expanded', 'true');
        adminDrawer.setAttribute('aria-hidden', 'false');
        document.body.classList.add('has-open-drawer');
    }

    function closeAdminDrawer() {
        if (!adminMenuButton || !adminDrawer || !adminDrawerOverlay) {
            return;
        }

        adminDrawer.classList.remove('is-open');
        adminDrawerOverlay.hidden = true;
        adminMenuButton.setAttribute('aria-expanded', 'false');
        adminDrawer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('has-open-drawer');
    }

    if (adminMenuButton) {
        adminMenuButton.addEventListener('click', openAdminDrawer);
    }

    if (adminDrawerClose) {
        adminDrawerClose.addEventListener('click', closeAdminDrawer);
    }

    if (adminDrawerOverlay) {
        adminDrawerOverlay.addEventListener('click', closeAdminDrawer);
    }

    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeAdminDrawer();
        }
    });

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
