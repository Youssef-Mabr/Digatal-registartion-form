function selectRenewalType(type) {
    if (type !== 'individual') {
        return;
    }

    sessionStorage.removeItem('currentRenewalDraft');
    sessionStorage.removeItem('lastRenewalSubmission');
    sessionStorage.setItem('renewalType', 'Individual');
    window.location.href = 'renewal-individual.html';
}
