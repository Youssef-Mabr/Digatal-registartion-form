// Registration Form Handler
let numberOfVehicles = 0;

let parkingAvailabilityMap = {};
let parkingAvailabilityRefreshTimer = null;
const PARKING_AVAILABILITY_REFRESH_MS = 15000;

const APP_TYPE_LABELS = {
    registration: 'New Registration',
    deregistration: 'Deregistration',
    edit_remove: 'Edit / Remove Vehicle'
};

function isParkingTypeAvailable(parkingType) {
    const key = getParkingTypeKey(parkingType);
    if (!key) {
        return false;
    }

    const record = parkingAvailabilityMap[key];
    return record ? record.available !== false : true;
}

function updateParkingAvailabilityCards(showNotice = false) {
    const parkingInputs = document.querySelectorAll('input[name="parkingType"]');
    let selectedInput = document.querySelector('input[name="parkingType"]:checked');

    parkingInputs.forEach(input => {
        const card = input.closest('.parking-plan-card');
        const availabilityKey = getParkingTypeKey(input.value);
        const availability = availabilityKey ? parkingAvailabilityMap[availabilityKey] : null;
        const isAvailable = availability ? availability.available !== false : true;
        const statusBadge = card ? card.querySelector('[data-parking-status]') : null;
        const actionButton = card ? card.querySelector('[data-parking-action]') : null;

        input.disabled = !isAvailable;

        if (card) {
            card.classList.toggle('is-sold-out', !isAvailable);
            card.setAttribute('aria-disabled', String(!isAvailable));
        }

        if (statusBadge) {
            statusBadge.textContent = isAvailable ? 'Available' : 'Sold Out';
            statusBadge.classList.toggle('is-available', isAvailable);
            statusBadge.classList.toggle('is-sold-out', !isAvailable);
        }

        if (actionButton) {
            actionButton.disabled = !isAvailable;
            actionButton.textContent = isAvailable ? 'Subscribe' : 'Sold Out';
        }
    });

    selectedInput = document.querySelector('input[name="parkingType"]:checked');
    if (selectedInput && selectedInput.disabled) {
        selectedInput.checked = false;
        if (showNotice) {
            showAppMessage('The selected parking type is now sold out. Please choose another option.', 'warning');
        }
    }
}

async function loadParkingAvailability(showNotice = false) {
    try {
        const parkingAvailability = await fetchParkingAvailability({ skipLoading: true });
        parkingAvailabilityMap = normalizeParkingAvailability(parkingAvailability);
        updateParkingAvailabilityCards(showNotice);
    } catch (error) {
        console.warn('Unable to load parking availability.', error);
    }
}

function startParkingAvailabilityPolling() {
    stopParkingAvailabilityPolling();
    parkingAvailabilityRefreshTimer = window.setInterval(() => {
        loadParkingAvailability(false);
    }, PARKING_AVAILABILITY_REFRESH_MS);
}

function stopParkingAvailabilityPolling() {
    if (parkingAvailabilityRefreshTimer) {
        window.clearInterval(parkingAvailabilityRefreshTimer);
        parkingAvailabilityRefreshTimer = null;
    }
}

function getApplicationType() {
    const stored = sessionStorage.getItem('applicationType');
    if (stored && APP_TYPE_LABELS[stored]) return stored;
    return null;
}

function applyApplicationType() {
    const type = getApplicationType();
    if (!type) {
        // No selection yet — send user back to choose application type.
        window.location.href = 'application-type.html';
        return null;
    }
    const banner = document.getElementById('applicationTypeBanner');
    const label = document.getElementById('applicationTypeLabel');
    if (banner && label) {
        label.textContent = APP_TYPE_LABELS[type];
        banner.style.display = 'block';
    }
    const remarksSection = document.getElementById('remarksSection');
    const remarksField = document.getElementById('remarks');
    if (remarksSection && remarksField) {
        if (type === 'edit_remove') {
            remarksSection.style.display = 'block';
            remarksField.setAttribute('required', 'required');
        } else {
            remarksSection.style.display = 'none';
            remarksField.removeAttribute('required');
        }
    }
    return type;
}

// Listen for number of cars selection
document.getElementById('numberOfCars').addEventListener('change', function(e) {
    numberOfVehicles = parseInt(e.target.value);
    generateVehicleSections(numberOfVehicles);
    document.getElementById('parkingSection').style.display = 'block';
});

// Helper function to create form group element
function createFormGroup(labelText, inputConfig) {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const label = document.createElement('label');
    label.setAttribute('for', inputConfig.id);
    label.textContent = labelText;
    
    const input = document.createElement('input');
    Object.keys(inputConfig).forEach(key => {
        if (key === 'dataset') {
            Object.keys(inputConfig.dataset).forEach(dataKey => {
                input.dataset[dataKey] = inputConfig.dataset[dataKey];
            });
        } else {
            input.setAttribute(key, inputConfig[key]);
        }
    });
    
    formGroup.appendChild(label);
    formGroup.appendChild(input);
    return formGroup;
}

// Helper function to create checkbox option
function createCheckboxOption(name, value, testId, labelText) {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = name;
    checkbox.value = value;
    checkbox.setAttribute('data-testid', testId);
    
    const span = document.createElement('span');
    span.textContent = labelText;
    
    label.appendChild(checkbox);
    label.appendChild(span);
    return label;
}

// Predefined options for dropdowns
const VEHICLE_MODELS = [
    'Perodua Myvi',
    'Perodua Axia',
    'Perodua Bezza',
    'Perodua Alza',
    'Proton Saga',
    'Proton X50',
    'Proton X70',
    'Honda City',
    'Honda HR-V',
    'Toyota Vios',
    'Toyota Hilux',
    'Other'
];

const VEHICLE_COLORS = [
    'White', 'Black', 'Silver', 'Grey', 'Red',
    'Blue', 'Green', 'Yellow', 'Brown', 'Gold',
    'Orange', 'Other'
];

// Helper function to create a select form group
function createSelectGroup(labelText, selectConfig, options) {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';

    const label = document.createElement('label');
    label.setAttribute('for', selectConfig.id);
    label.textContent = labelText;

    const select = document.createElement('select');
    select.className = 'form-select';
    Object.keys(selectConfig).forEach(key => {
        if (key === 'dataset') {
            Object.keys(selectConfig.dataset).forEach(dataKey => {
                select.dataset[dataKey] = selectConfig.dataset[dataKey];
            });
        } else {
            select.setAttribute(key, selectConfig[key]);
        }
    });

    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = selectConfig.placeholder || 'Select an option';
    placeholderOpt.disabled = true;
    placeholderOpt.selected = true;
    select.appendChild(placeholderOpt);

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });

    formGroup.appendChild(label);
    formGroup.appendChild(select);
    return formGroup;
}

// Helper function to create vehicle section
function createVehicleSection(index) {
    const section = document.createElement('div');
    section.className = 'form-section vehicle-section';
    
    // Title
    const title = document.createElement('h3');
    title.textContent = `Vehicle ${index + 1} Information`;
    section.appendChild(title);
    
    // First row: Vehicle Number and Model
    const row1 = document.createElement('div');
    row1.className = 'form-row';
    
    row1.appendChild(createFormGroup('Vehicle Number *', {
        type: 'text',
        id: `vehicleNumber${index}`,
        name: `vehicleNumber${index}`,
        required: true,
        placeholder: 'e.g., ABC 1234',
        dataset: { testid: `vehicle-number-input-${index}` }
    }));

    row1.appendChild(createSelectGroup('Vehicle Model *', {
        id: `vehicleModel${index}`,
        name: `vehicleModel${index}`,
        required: true,
        placeholder: 'Select vehicle model',
        dataset: { testid: `vehicle-model-select-${index}` }
    }, VEHICLE_MODELS));
    
    section.appendChild(row1);
    
    // Second row: Vehicle Type
    const row2 = document.createElement('div');
    row2.className = 'form-row';
    
    const typeGroup = document.createElement('div');
    typeGroup.className = 'form-group full-width';
    
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Vehicle Type * (Check one)';
    typeGroup.appendChild(typeLabel);
    
    const checkboxGroup = document.createElement('div');
    checkboxGroup.className = 'checkbox-group';
    
    const vehicleTypes = [
        { value: 'Sedan', label: 'Sedan' },
        { value: 'Hatchback', label: 'Hatchback' },
        { value: 'SUV', label: 'SUV' },
        { value: 'Mini Van', label: 'Mini Van' },
        { value: 'Others', label: 'Others' }
    ];
    
    vehicleTypes.forEach(type => {
        const checkboxLabel = createCheckboxOption(
            `vehicleType${index}`,
            type.value,
            `vehicle-type-${type.value.toLowerCase().replace(' ', '-')}-${index}`,
            type.label
        );
        checkboxGroup.appendChild(checkboxLabel);
    });
    
    typeGroup.appendChild(checkboxGroup);
    row2.appendChild(typeGroup);
    section.appendChild(row2);
    
    // Third row: Vehicle Color (dropdown)
    const row3 = document.createElement('div');
    row3.className = 'form-row';

    row3.appendChild(createSelectGroup('Vehicle Color *', {
        id: `vehicleColor${index}`,
        name: `vehicleColor${index}`,
        required: true,
        placeholder: 'Select vehicle color',
        dataset: { testid: `vehicle-color-select-${index}` }
    }, VEHICLE_COLORS));

    section.appendChild(row3);

    return section;
}

function generateVehicleSections(count) {
    const container = document.getElementById('vehiclesContainer');
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const vehicleSection = createVehicleSection(i);
        container.appendChild(vehicleSection);
        
        // Add checkbox restriction (only one can be checked per vehicle)
        setupCheckboxRestriction(vehicleSection, i);
    }
}

function setupCheckboxRestriction(section, index) {
    const checkboxes = section.querySelectorAll(`input[name="vehicleType${index}"]`);
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                checkboxes.forEach(cb => {
                    if (cb !== this) cb.checked = false;
                });
            }
        });
    });
}

// Helper function to collect vehicle data
function collectVehicleData() {
    const vehicles = [];
    for (let i = 0; i < numberOfVehicles; i++) {
        const vehicleType = document.querySelector(`input[name="vehicleType${i}"]:checked`)?.value;
        
        if (!vehicleType) {
            throw new Error(`Please select vehicle type for Vehicle ${i + 1}`);
        }
        
        vehicles.push({
            vehicleNumber: document.getElementById(`vehicleNumber${i}`).value,
            vehicleModel: document.getElementById(`vehicleModel${i}`).value,
            vehicleType: vehicleType,
            vehicleColor: document.getElementById(`vehicleColor${i}`).value
        });
    }
    return vehicles;
}

// Helper function to validate parking selections
function validateParkingSelections() {
    const parkingType = document.querySelector('input[name="parkingType"]:checked')?.value;
    const subscriptionPeriod = document.querySelector('input[name="subscriptionPeriod"]:checked')?.value;
    
    if (!parkingType) {
        throw new Error('Please select a parking type');
    }
    if (!isParkingTypeAvailable(parkingType)) {
        throw new Error('The selected parking type is sold out. Please choose another option.');
    }
    if (!subscriptionPeriod) {
        throw new Error('Please select a subscription period');
    }
    
    return { parkingType, subscriptionPeriod };
}

// Helper function to calculate total amount
function calculateTotalAmount() {
    const parkingPrice = parseInt(document.querySelector('input[name="parkingType"]:checked').dataset.price);
    const multiplier = parseInt(document.querySelector('input[name="subscriptionPeriod"]:checked').dataset.multiplier);
    return parkingPrice * multiplier * numberOfVehicles;
}

// Helper function to get personal information
function getPersonalInformation() {
    const emailInput = document.getElementById('email');
    const emailValue = (emailInput.value || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue) {
        throw new Error('Customer Email is required');
    }
    if (!emailRegex.test(emailValue)) {
        throw new Error('Please enter a valid email address');
    }

    return {
        fullName: document.getElementById('fullName').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        email: emailValue,
        companyName: document.getElementById('companyName').value,
        staffId: (document.getElementById('staffId').value || '').trim(),
        numberOfCars: numberOfVehicles
    };
}

document.getElementById('registrationForm').addEventListener('submit', function(e) {
    e.preventDefault();

    try {
        const applicationType = getApplicationType();
        if (!applicationType) {
            window.location.href = 'application-type.html';
            return;
        }

        const formData = getPersonalInformation();
        const parkingSelections = validateParkingSelections();
        const vehicles = collectVehicleData();

        formData.vehicles = vehicles;
        formData.parkingType = parkingSelections.parkingType;
        formData.subscriptionPeriod = parkingSelections.subscriptionPeriod;
        formData.applicationType = applicationType;
        formData.paymentRequired = applicationType === 'registration';

        const remarksField = document.getElementById('remarks');
        const remarksValue = remarksField ? (remarksField.value || '').trim() : '';
        if (applicationType === 'edit_remove' && !remarksValue) {
            throw new Error('Please enter Remarks / Notes for your Edit / Remove Vehicle request.');
        }
        formData.remarks = remarksValue;

        sessionStorage.setItem('currentApplication', JSON.stringify(formData));
        window.location.href = 'review.html';
    } catch (error) {
        showAppMessage(error.message, 'warning');
    }
});

// Helper function to populate vehicle fields
function populateVehicleFields(data) {
    if (!data.numberOfCars) return;
    
    document.getElementById('numberOfCars').value = data.numberOfCars;
    numberOfVehicles = data.numberOfCars;
    generateVehicleSections(numberOfVehicles);
    document.getElementById('parkingSection').style.display = 'block';
    
    setTimeout(() => {
        data.vehicles.forEach((vehicle, i) => {
            document.getElementById(`vehicleNumber${i}`).value = vehicle.vehicleNumber || '';
            document.getElementById(`vehicleModel${i}`).value = vehicle.vehicleModel || '';
            document.getElementById(`vehicleColor${i}`).value = vehicle.vehicleColor || '';
            
            if (vehicle.vehicleType) {
                const checkbox = document.querySelector(`input[name="vehicleType${i}"][value="${vehicle.vehicleType}"]`);
                if (checkbox) checkbox.checked = true;
            }
        });
    }, 100);
}

// Helper function to populate parking selections
function populateParkingSelections(data) {
    if (data.parkingType) {
        const parkingTypeRadio = document.querySelector(`input[name="parkingType"][value="${data.parkingType}"]`);
        if (parkingTypeRadio) parkingTypeRadio.checked = true;
    }
    
    if (data.subscriptionPeriod) {
        const subscriptionRadio = document.querySelector(`input[name="subscriptionPeriod"][value="${data.subscriptionPeriod}"]`);
        if (subscriptionRadio) subscriptionRadio.checked = true;
    }
}

// Load existing data if returning from review page
window.addEventListener('DOMContentLoaded', function() {
    // Apply application type UX (banner + remarks visibility). Redirects if type is missing.
    if (!applyApplicationType()) return;

    loadParkingAvailability();
    startParkingAvailabilityPolling();
    window.addEventListener('beforeunload', stopParkingAvailabilityPolling);

    const savedData = sessionStorage.getItem('currentApplication');
    if (!savedData) return;

    const data = JSON.parse(savedData);

    // Populate personal fields
    document.getElementById('fullName').value = data.fullName || '';
    document.getElementById('phoneNumber').value = data.phoneNumber || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('companyName').value = data.companyName || '';
    document.getElementById('staffId').value = data.staffId || '';

    const remarksField = document.getElementById('remarks');
    if (remarksField) remarksField.value = data.remarks || '';

    populateVehicleFields(data);
    populateParkingSelections(data);
    updateParkingAvailabilityCards(false);
});
