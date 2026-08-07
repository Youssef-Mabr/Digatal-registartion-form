function getPasswordIconMarkup(isVisible) {
    if (isVisible) {
        return `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 3l18 18"></path>
                <path d="M10.58 10.58A3 3 0 0 0 13.42 13.42"></path>
                <path d="M6.61 6.61C4.08 8.4 2.25 12 2.25 12s3.75 6 9.75 6c1.55 0 3-.3 4.3-.83"></path>
                <path d="M9.88 5.1A10.7 10.7 0 0 1 12 4.5c6 0 9.75 7.5 9.75 7.5a17.9 17.9 0 0 1-2.5 3.23"></path>
            </svg>
        `;
    }

    return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2.25 12S6 5.25 12 5.25 21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    `;
}

function setPasswordToggleState(button) {
    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) {
        return;
    }

    const visible = input.type === 'text';
    const fieldLabel = targetId.replace(/([A-Z])/g, ' $1').toLowerCase();
    button.innerHTML = getPasswordIconMarkup(visible);
    button.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} ${fieldLabel}`);
    button.title = `${visible ? 'Hide' : 'Show'} ${fieldLabel}`;
    button.setAttribute('aria-pressed', String(visible));
}

function resetPasswordFieldState(toggleButtons) {
    toggleButtons.forEach(button => {
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) {
            return;
        }
        input.type = 'password';
        setPasswordToggleState(button);
    });
}

function wireAdminDrawer() {
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
}

async function ensureAdminSession() {
    try {
        await requestJson('/admin/me', { skipLoading: true });
        return true;
    } catch (error) {
        showAppMessage('Please log in to access the Change Password page.', 'error', 'Session expired');
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1200);
        return false;
    }
}

window.addEventListener('DOMContentLoaded', function() {
    wireAdminDrawer();

    const form = document.getElementById('changePasswordForm');
    const updateButton = document.getElementById('updatePasswordBtn');
    const cancelButton = document.getElementById('cancelBtn');
    const toggleButtons = Array.from(document.querySelectorAll('.password-toggle'));

    toggleButtons.forEach(button => {
        setPasswordToggleState(button);
        button.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) {
                return;
            }

            input.type = input.type === 'password' ? 'text' : 'password';
            setPasswordToggleState(this);
        });
    });

    cancelButton.addEventListener('click', function() {
        window.location.href = 'admin-dashboard.html';
    });

    ensureAdminSession().then(isAllowed => {
        if (!isAllowed) {
            return;
        }

        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
                showAppMessage('Please complete all password fields.', 'warning');
                return;
            }

            if (newPassword !== confirmNewPassword) {
                showAppMessage('New password and confirmation do not match.', 'warning');
                return;
            }

            if (currentPassword === newPassword) {
                showAppMessage('New password must be different from the current password.', 'warning');
                return;
            }

            setButtonLoading(updateButton, true, 'Updating...');

            try {
                await requestJson('/admin/change-password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
                    loadingMessage: 'Updating password...'
                });

                showAppMessage('Password updated successfully.', 'success', 'Password changed');
                form.reset();
                resetPasswordFieldState(toggleButtons);

                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 1000);
            } catch (error) {
                showAppMessage(error.message, 'error', 'Update failed');
                setButtonLoading(updateButton, false);
            }
        });
    });
});
