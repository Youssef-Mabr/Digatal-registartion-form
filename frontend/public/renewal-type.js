function selectRenewalType(type) {
    if (type === 'individual') {
        sessionStorage.removeItem('currentRenewalDraft');
        sessionStorage.removeItem('lastRenewalSubmission');
        sessionStorage.setItem('renewalType', 'Individual');
        window.location.href = 'renewal-individual.html';
        return;
    }

    if (type === 'tenant') {
        sessionStorage.removeItem('currentRenewalDraft');
        sessionStorage.removeItem('lastRenewalSubmission');
        sessionStorage.setItem('renewalType', 'Tenant');
        window.location.href = 'renewal-tenant.html';
    }
}
