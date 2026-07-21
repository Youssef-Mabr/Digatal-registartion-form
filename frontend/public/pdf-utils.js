// Shared utilities for the Smart Parking Portal
// - formatDateTime(value): formats a date to "DD/MM/YYYY HH:mm:ss"
// - downloadSubmissionPdf(app): builds and downloads a PDF of the application

function pad2(n) {
    return String(n).padStart(2, '0');
}

function getMalaysiaDateParts(value) {
    const d = (value instanceof Date) ? value : new Date(value);
    if (isNaN(d.getTime())) return null;

    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(d).reduce((accumulator, part) => {
        if (part.type !== 'literal') accumulator[part.type] = part.value;
        return accumulator;
    }, {});

    return parts;
}

function formatDateTime(value) {
    if (!value) return '-';
    const parts = getMalaysiaDateParts(value);
    if (!parts) return '-';
    return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function formatDateOnly(value) {
    if (!value) return '-';
    const parts = getMalaysiaDateParts(value);
    if (!parts) return '-';
    return `${parts.day}/${parts.month}/${parts.year}`;
}

function formatTimeOnly(value) {
    if (!value) return '-';
    const parts = getMalaysiaDateParts(value);
    if (!parts) return '-';
    return `${parts.hour}:${parts.minute}:${parts.second}`;
}

function ensureJsPdfLoaded() {
    return new Promise((resolve, reject) => {
        if (window.jspdf && window.jspdf.jsPDF) {
            resolve(window.jspdf.jsPDF);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
            else reject(new Error('jsPDF failed to load'));
        };
        script.onerror = () => reject(new Error('Failed to load jsPDF library'));
        document.head.appendChild(script);
    });
}

async function downloadSubmissionPdf(app) {
    const jsPDF = await ensureJsPdfLoaded();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 18;
    let y = 18;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 150, 60);
    doc.text('HiSpeedCity Smart Parking', marginX, y);
    y += 7;
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text('Season Parking Application', marginX, y);
    y += 6;
    doc.setDrawColor(0, 200, 83);
    doc.setLineWidth(0.6);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 8;

    const submittedAt = app.submittedAt || app.submissionDate || new Date().toISOString();

    const appTypeLabels = {
        registration: 'New Registration',
        deregistration: 'Deregistration',
        edit_remove: 'Edit / Remove Vehicle'
    };
    const appTypeLabel = appTypeLabels[app.applicationType] || 'New Registration';

    const vehicles = (app.vehicles && app.vehicles.length) ? app.vehicles : [{
        vehicleNumber: app.vehicleNumber || '-',
        vehicleModel: app.vehicleModel || '-',
        vehicleType: app.vehicleType || '-',
        vehicleColor: app.vehicleColor || '-'
    }];

    const referenceRow = [
        ['Reference Number', app.referenceNumber || '-'],
        ['Application Type', appTypeLabel],
        ['Application Status', app.status || 'Pending'],
        ['Submission Date', formatDateTime(submittedAt)]
    ];

    const applicantRows = [
        ['Full Name', app.fullName || '-'],
        ['Email', app.email || '-'],
        ['Phone Number', app.phoneNumber || '-'],
        ['Company Name', app.companyName || '-'],
        ['Staff ID', app.staffId || '-']
    ];

    const parkingRows = [
        ['Parking Type', app.parkingType || '-'],
        ['Subscription Period', app.subscriptionPeriod || '-'],
        ['Total Amount', (app.totalAmount !== undefined && app.totalAmount !== null) ? `RM ${app.totalAmount}` : '-']
    ];

    function renderSection(title, rows) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 150, 60);
        doc.text(title, marginX, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        rows.forEach(([label, value]) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, marginX, y);
            doc.setFont('helvetica', 'normal');
            const text = String(value == null ? '-' : value);
            const wrapped = doc.splitTextToSize(text, pageWidth - marginX - 70);
            doc.text(wrapped, marginX + 55, y);
            y += 6 * Math.max(wrapped.length, 1);
        });
        y += 4;
    }

    renderSection('Reference Information', referenceRow);
    renderSection('Applicant Information', applicantRows);

    vehicles.forEach((v, idx) => {
        if (y > 240) { doc.addPage(); y = 20; }
        renderSection(`Vehicle ${idx + 1} Information`, [
            ['Vehicle Number', v.vehicleNumber || '-'],
            ['Vehicle Model', v.vehicleModel || '-'],
            ['Vehicle Type', v.vehicleType || '-'],
            ['Vehicle Color', v.vehicleColor || '-']
        ]);
    });

    renderSection('Parking Information', parkingRows);

    if (app.applicationType === 'edit_remove' && app.remarks) {
        renderSection('Remarks / Notes', [['Remarks', app.remarks]]);
    }

    // Footer
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setDrawColor(200, 200, 200);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('This document was generated by HiSpeedCity Smart Parking Portal.', marginX, y);

    const filename = `HiSpeedCity-${app.referenceNumber || 'application'}.pdf`;
    doc.save(filename);
}
