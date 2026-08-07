// Application Type Selection Page
function selectApplicationType(type) {
    const allowed = ['registration', 'deregistration', 'edit_remove'];
    if (!allowed.includes(type)) return;

    // Clear any prior in-progress state so switching type starts fresh
    sessionStorage.removeItem('currentApplication');
    sessionStorage.removeItem('lastSubmission');
    sessionStorage.setItem('applicationType', type);
    window.location.href = 'registration.html';
}
