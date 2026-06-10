// Registration Form Handler
let numberOfVehicles = 0;

document.getElementById('numberOfCars').addEventListener('change', function(e) {
    numberOfVehicles = parseInt(e.target.value);
    generateVehicleSections(numberOfVehicles);
    document.getElementById('parkingSection').style.display = 'block';
});

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

function createVehicleSection(index) {
    const section = document.createElement('div');
    section.className = 'form-section vehicle-section';

    const title = document.createElement('h3');
    title.textContent = `Vehicle ${index + 1} Information`;
    section.appendChild(title);

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

    row1.appendChild(createFormGroup('Vehicle Model *', {
        type: 'text',
        id: `vehicleModel${index}`,
        name: `vehicleModel${index}`,
        required: true,
        placeholder: 'e.g., Toyota Camry',
        dataset: { testid: `vehicle-model-input-${index}` }
    }));

    section.appendChild(row1);

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
        checkboxGroup.appendChild(createCheckboxOption(
            `vehicleType${index}`,
            type.value,
            `vehicle-type-${type.value.toLowerCase().replace(' ', '-')}-${index}`,
            type.label
        ));
    });

    typeGroup.appendChild(checkboxGroup);
    row2.appendChild(typeGroup);
    section.appendChild(row2);

    const row3 = document.createElement('div');
    row3.className = 'form-row';

    row3.appendChild(createFormGroup('Vehicle Color *', {
        type: 'text',
        id: `vehicleColor${index}`,
        name: `vehicleColor${index}`,
        required: true,
        dataset: { testid: `vehicle-color-input-${index}` }
    }));

    section.appendChild(row3);
    return section;
}

function generateVehicleSections(count) {
    const container = document.getElementById('vehiclesContainer');
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const vehicleSection = createVehicleSection(i);
        container.appendChild(vehicleSection);
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

function validateParkingSelections() {
    const parkingType = document.querySelector('input[name="parkingType"]:checked')?.value;
    const subscriptionPeriod = document.querySelector('input[name="subscriptionPeriod"]:checked')?.value;

    if (!parkingType) {
        throw new Error('Please select a parking type');
    }
    if (!subscriptionPeriod) {
        throw new Error('Please select a subscription period');
    }

    return { parkingType, subscriptionPeriod };
}

function calculateTotalAmount() {
    const parkingPrice = parseInt(document.querySelector('input[name="parkingType"]:checked').dataset.price);
    const multiplier = parseInt(document.querySelector('input[name="subscriptionPeriod"]:checked').dataset.multiplier);
    return parkingPrice * multiplier * numberOfVehicles;
}

function getPersonalInformation() {
    return {
        fullName: document.getElementById('fullName').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        companyName: document.getElementById('companyName').value,
        staffId: document.getElementById('staffId').value,
        numberOfCars: numberOfVehicles
    };
}

document.getElementById('registrationForm').addEventListener('submit', function(e) {
    e.preventDefault();

    try {
        const formData = getPersonalInformation();
        const parkingSelections = validateParkingSelections();
        const vehicles = collectVehicleData();

        formData.vehicles = vehicles;
        formData.parkingType = parkingSelections.parkingType;
        formData.subscriptionPeriod = parkingSelections.subscriptionPeriod;
        formData.totalAmount = calculateTotalAmount();

        localStorage.setItem('currentApplication', JSON.stringify(formData));
        window.location.href = 'review.html';
    } catch (error) {
        alert(error.message);
    }
});

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
    const savedData = localStorage.getItem('currentApplication');
    if (!savedData) return;
    
    const data = JSON.parse(savedData);
    
    // Populate personal fields
    document.getElementById('fullName').value = data.fullName || '';
    document.getElementById('phoneNumber').value = data.phoneNumber || '';
    document.getElementById('companyName').value = data.companyName || '';
    document.getElementById('staffId').value = data.staffId || '';
    
    populateVehicleFields(data);
    populateParkingSelections(data);
});
