const PARKING_CONTROL_META = {
    non_reserved: {
        key: 'non_reserved',
        parkingType: 'Non Reserved',
        label: 'Non-Reserved Parking',
        monthlyPrice: 'RM159',
        description: 'Flexible monthly access for drivers who want affordable parking without a fixed spot.',
        icon: '◌',
    },
    reserved: {
        key: 'reserved',
        parkingType: 'Reserved',
        label: 'Reserved Parking',
        monthlyPrice: 'RM212',
        description: 'Dedicated parking with better convenience for daily commuters and frequent visitors.',
        icon: '◉',
    },
    premium: {
        key: 'premium',
        parkingType: 'Premium',
        label: 'Premium Parking',
        monthlyPrice: 'RM318',
        description: 'Priority parking with the best access, ideal for frequent users who want premium placement.',
        icon: '★',
    },
};

let parkingAvailabilityMap = {};
let parkingAvailabilityRefreshTimer = null;

function getParkingControlMetaList() {
    return Object.values(PARKING_CONTROL_META);
}

async function loadParkingAvailabilityForAdmin() {
    const result = await requestJson('/admin/parking-availability', {
        loadingMessage: 'Loading parking availability...',
        skipLoading: true,
    });
    parkingAvailabilityMap = normalizeParkingAvailability(result.parkingAvailability || []);
    return parkingAvailabilityMap;
}

function startParkingAvailabilityPolling(renderFn) {
    stopParkingAvailabilityPolling();
    parkingAvailabilityRefreshTimer = window.setInterval(async () => {
        try {
            await loadParkingAvailabilityForAdmin();
            renderFn();
        } catch (error) {
            console.warn('Parking availability refresh failed', error);
        }
    }, 15000);
}

function stopParkingAvailabilityPolling() {
    if (parkingAvailabilityRefreshTimer) {
        window.clearInterval(parkingAvailabilityRefreshTimer);
        parkingAvailabilityRefreshTimer = null;
    }
}

function renderParkingControlCards(panelId, onToggle) {
    const panel = document.getElementById(panelId);
    if (!panel) {
        return;
    }

    panel.innerHTML = '';

    getParkingControlMetaList().forEach(meta => {
        const availability = parkingAvailabilityMap[meta.key] || { available: true };
        const isAvailable = availability.available !== false;

        const card = document.createElement('div');
        card.className = `parking-control-card ${isAvailable ? 'is-available' : 'is-sold-out'}`;

        card.innerHTML = `
            <div class="parking-control-card__top">
                <div>
                    <span class="parking-control-card__eyebrow">Parking Type</span>
                    <h3>${escapeHtml(meta.label)}</h3>
                </div>
                <span class="parking-control-card__status ${isAvailable ? 'is-available' : 'is-sold-out'}">${isAvailable ? 'Available' : 'Sold Out'}</span>
            </div>
            <div class="parking-control-card__pricing">
                <span class="parking-control-card__price">${escapeHtml(meta.monthlyPrice)}</span>
                <span class="parking-control-card__period">per month</span>
            </div>
            <p class="parking-control-card__description">${escapeHtml(meta.description)}</p>
            <div class="parking-control-card__footer">
                <div class="parking-control-card__toggle-copy">
                    <span class="parking-control-card__toggle-label">Toggle availability</span>
                    <strong>${isAvailable ? 'ON' : 'OFF'}</strong>
                </div>
                <button type="button" class="parking-toggle-button ${isAvailable ? 'is-on' : 'is-off'}" data-toggle-parking="${meta.key}" aria-pressed="${isAvailable ? 'true' : 'false'}">${isAvailable ? 'ON' : 'OFF'}</button>
            </div>
        `;

        const toggleButton = card.querySelector('[data-toggle-parking]');
        toggleButton.addEventListener('click', () => {
            onToggle(meta.key, isAvailable, toggleButton);
        });

        panel.appendChild(card);
    });
}

async function updateParkingAvailability(parkingKey, nextAvailable, triggerButton) {
    const meta = PARKING_CONTROL_META[parkingKey];
    if (!meta) {
        return;
    }

    if (triggerButton) {
        triggerButton.disabled = true;
    }

    try {
        const result = await requestJson(`/admin/parking-availability/${encodeURIComponent(parkingKey)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available: nextAvailable }),
            loadingMessage: nextAvailable ? `Marking ${meta.label} available...` : `Marking ${meta.label} sold out...`,
        });

        parkingAvailabilityMap = normalizeParkingAvailability(result.parkingAvailability || []);
        showAppMessage(`${meta.label} is now ${nextAvailable ? 'available' : 'sold out'}.`, 'success', 'Parking availability updated');
        return true;
    } catch (error) {
        showAppMessage(error.message, 'error', 'Unable to update parking availability');
        return false;
    } finally {
        if (triggerButton) {
            triggerButton.disabled = false;
        }
    }
}
