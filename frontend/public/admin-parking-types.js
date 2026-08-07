window.addEventListener('DOMContentLoaded', function() {
    loadParkingAvailabilityForAdmin()
        .then(() => {
            renderParkingControlCards('parkingManagementGrid', handleParkingToggle);
            startParkingAvailabilityPolling(() => renderParkingControlCards('parkingManagementGrid', handleParkingToggle));
        })
        .catch(error => {
            const panel = document.getElementById('parkingManagementGrid');
            if (panel) {
                panel.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:#b91c1c;">${escapeHtml(error.message)}</div>`;
            }
        });

    window.addEventListener('beforeunload', stopParkingAvailabilityPolling);
});

async function handleParkingToggle(parkingKey, isAvailable, triggerButton) {
    const meta = PARKING_CONTROL_META[parkingKey];
    const nextAvailable = !isAvailable;
    const confirmed = window.confirm(`Change ${meta.label} to ${nextAvailable ? 'available' : 'sold out'}?`);
    if (!confirmed) {
        return;
    }

    const success = await updateParkingAvailability(parkingKey, nextAvailable, triggerButton);
    if (success) {
        renderParkingControlCards('parkingManagementGrid', handleParkingToggle);
    }
}
