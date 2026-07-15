const API_BASE_URL = window.__API_BASE_URL__ || 'https://hispeedcity-backend-635388135964.us-central1.run.app/api';
let activeRequestCount = 0;
let messageTimer = null;

const PARKING_TYPE_META = {
    'Non Reserved': { key: 'non_reserved', label: 'Non-Reserved Parking' },
    Reserved: { key: 'reserved', label: 'Reserved Parking' },
    Premium: { key: 'premium', label: 'Premium Parking' },
};

function getParkingTypeMeta(parkingType) {
    return PARKING_TYPE_META[parkingType] || null;
}

function getParkingTypeKey(parkingType) {
    const meta = getParkingTypeMeta(parkingType);
    return meta ? meta.key : null;
}

function getParkingTypeLabel(parkingType) {
    const meta = getParkingTypeMeta(parkingType);
    return meta ? meta.label : (parkingType || 'Parking Type');
}

function normalizeParkingAvailability(items) {
    const availabilityMap = {};
    (Array.isArray(items) ? items : []).forEach(item => {
        if (!item) {
            return;
        }

        const key = item.key || getParkingTypeKey(item.parkingType);
        if (!key) {
            return;
        }

        availabilityMap[key] = {
            key,
            parkingType: item.parkingType || '',
            label: item.label || getParkingTypeLabel(item.parkingType),
            available: item.available !== false,
            updatedAt: item.updatedAt || null,
        };
    });
    return availabilityMap;
}

function normalizeParkingPrices(items) {
    const priceMap = {};
    (Array.isArray(items) ? items : []).forEach(item => {
        if (!item) {
            return;
        }

        const key = item.key || getParkingTypeKey(item.parkingType);
        if (!key) {
            return;
        }

        priceMap[key] = {
            key,
            parkingType: item.parkingType || '',
            label: item.label || getParkingTypeLabel(item.parkingType),
            monthlyPrice: Number(item.monthlyPrice || 0),
        };
    });
    return priceMap;
}

async function fetchParkingAvailability(options = {}) {
    const response = await requestJson('/parking-availability', options);
    return Array.isArray(response.parkingAvailability) ? response.parkingAvailability : [];
}

async function fetchParkingPrices(options = {}) {
    const response = await requestJson('/parking-prices', options);
    return Array.isArray(response.parkingPrices) ? response.parkingPrices : [];
}

function ensureFeedbackShell() {
    if (!document.getElementById('appLoadingOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'appLoadingOverlay';
        overlay.className = 'app-loading-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = `
            <div class="app-loading-panel" role="status" aria-live="polite">
                <span class="app-spinner" aria-hidden="true"></span>
                <span id="appLoadingText">Please wait...</span>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    if (!document.getElementById('appMessageRegion')) {
        const region = document.createElement('div');
        region.id = 'appMessageRegion';
        region.className = 'app-message-region';
        region.setAttribute('aria-live', 'assertive');
        region.setAttribute('aria-atomic', 'true');
        document.body.appendChild(region);
    }
}

function showLoading(message = 'Please wait...') {
    ensureFeedbackShell();
    activeRequestCount += 1;
    const overlay = document.getElementById('appLoadingOverlay');
    const label = document.getElementById('appLoadingText');
    label.textContent = message;
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
}

function hideLoading() {
    activeRequestCount = Math.max(0, activeRequestCount - 1);
    if (activeRequestCount > 0) {
        return;
    }

    const overlay = document.getElementById('appLoadingOverlay');
    if (overlay) {
        overlay.classList.remove('is-visible');
        overlay.setAttribute('aria-hidden', 'true');
    }
}

function friendlyErrorMessage(error) {
    if (!error) {
        return 'Something went wrong. Please try again.';
    }

    if (error.name === 'TypeError') {
        return 'Unable to reach the server. Please check your connection and try again.';
    }

    return error.message || 'Something went wrong. Please try again.';
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
}

function showAppMessage(message, type = 'error', title) {
    ensureFeedbackShell();

    const region = document.getElementById('appMessageRegion');
    const messageTitle = title || (type === 'success' ? 'Success' : type === 'warning' ? 'Check this' : 'Something went wrong');
    const toast = document.createElement('div');
    toast.className = `app-message app-message-${type}`;
    toast.innerHTML = `
        <div class="app-message-icon" aria-hidden="true">${type === 'success' ? 'OK' : '!'}</div>
        <div class="app-message-content">
            <strong>${escapeHtml(messageTitle)}</strong>
            <p>${escapeHtml(message)}</p>
        </div>
        <button type="button" class="app-message-close" aria-label="Dismiss message">x</button>
    `;

    region.innerHTML = '';
    region.appendChild(toast);

    const closeButton = toast.querySelector('.app-message-close');
    closeButton.addEventListener('click', () => toast.remove());

    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => {
        toast.remove();
    }, type === 'success' ? 3200 : 5200);
}

function setButtonLoading(button, isLoading, loadingText = 'Please wait...') {
    if (!button) {
        return;
    }

    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
        button.disabled = true;
        button.classList.add('is-loading');
        return;
    }

    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove('is-loading');
}

function getAuthToken() {
    return sessionStorage.getItem('adminToken');
}

function authHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    const token = getAuthToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

async function requestJson(path, options = {}) {
    const { headers: optionHeaders, loadingMessage = 'Loading...', skipLoading = false, ...restOptions } = options;

    if (!skipLoading) {
        showLoading(loadingMessage);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...restOptions,
            headers: authHeaders(optionHeaders || {}),
        });

        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();

        if (!response.ok) {
            const message = body && body.detail ? body.detail : (body && body.message ? body.message : 'Request failed');
            throw new Error(message);
        }

        return body;
    } catch (error) {
        throw new Error(friendlyErrorMessage(error));
    } finally {
        if (!skipLoading) {
            hideLoading();
        }
    }
}

async function requestFormData(path, formData, options = {}) {
    const { loadingMessage = 'Uploading...', skipLoading = false } = options;

    if (!skipLoading) {
        showLoading(loadingMessage);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: authHeaders(),
            body: formData,
        });

        const body = await response.json();
        if (!response.ok) {
            throw new Error(body.detail || body.message || 'Request failed');
        }
        return body;
    } catch (error) {
        throw new Error(friendlyErrorMessage(error));
    } finally {
        if (!skipLoading) {
            hideLoading();
        }
    }
}
