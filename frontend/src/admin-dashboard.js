// Admin Dashboard Handler
window.addEventListener('DOMContentLoaded', function() {
    // Initialize with dummy data if no applications exist
    let applications = JSON.parse(localStorage.getItem('applications') || '[]');
    
    if (applications.length === 0) {
        // Create 5 dummy applications
        const dummyApplications = [
            {
                referenceNumber: 'SP-2026-000001',
                fullName: 'Ahmad bin Abdullah',
                phoneNumber: '012-3456789',
                companyName: 'Tech Solutions Sdn Bhd',
                staffId: 'TS-2024-001',
                vehicleNumber: 'WXY 1234',
                vehicleModel: 'Toyota Camry',
                vehicleType: 'Sedan',
                vehicleColor: 'Silver',
                parkingType: 'Premium',
                subscriptionPeriod: 'Monthly',
                totalAmount: 318,
                submissionDate: new Date('2026-01-15T09:30:00').toISOString(),
                status: 'Pending',
                read: false,
                receiptImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNzU3NTc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QYXltZW50IFJlY2VpcHQ8L3RleHQ+PC9zdmc+'
            },
            {
                referenceNumber: 'SP-2026-000002',
                fullName: 'Siti Nurhaliza binti Ismail',
                phoneNumber: '013-9876543',
                companyName: 'Digital Marketing Hub',
                staffId: 'DMH-2024-045',
                vehicleNumber: 'ABC 5678',
                vehicleModel: 'Honda Civic',
                vehicleType: 'Sedan',
                vehicleColor: 'White',
                parkingType: 'Reserved',
                subscriptionPeriod: 'Quarterly',
                totalAmount: 636,
                submissionDate: new Date('2026-01-20T14:15:00').toISOString(),
                status: 'Approved',
                read: true,
                receiptImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNzU3NTc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QYXltZW50IFJlY2VpcHQ8L3RleHQ+PC9zdmc+'
            },
            {
                referenceNumber: 'SP-2026-000003',
                fullName: 'Raj Kumar a/l Subramaniam',
                phoneNumber: '016-2345678',
                companyName: 'Global Finance Corp',
                staffId: 'GFC-2024-089',
                vehicleNumber: 'DEF 9012',
                vehicleModel: 'Mazda CX-5',
                vehicleType: 'SUV',
                vehicleColor: 'Black',
                parkingType: 'Non Reserved',
                subscriptionPeriod: 'Yearly',
                totalAmount: 1908,
                submissionDate: new Date('2026-01-22T11:45:00').toISOString(),
                status: 'Pending',
                read: false,
                receiptImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNzU3NTc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QYXltZW50IFJlY2VpcHQ8L3RleHQ+PC9zdmc+'
            },
            {
                referenceNumber: 'SP-2026-000004',
                fullName: 'Lee Mei Ling',
                phoneNumber: '017-8765432',
                companyName: 'Creative Design Studio',
                staffId: 'CDS-2024-120',
                vehicleNumber: 'GHI 3456',
                vehicleModel: 'Perodua Myvi',
                vehicleType: 'Hatchback',
                vehicleColor: 'Red',
                parkingType: 'Non Reserved',
                subscriptionPeriod: 'Monthly',
                totalAmount: 159,
                submissionDate: new Date('2026-01-25T16:20:00').toISOString(),
                status: 'Rejected',
                read: true,
                receiptImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNzU3NTc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QYXltZW50IFJlY2VpcHQ8L3RleHQ+PC9zdmc+'
            },
            {
                referenceNumber: 'SP-2026-000005',
                fullName: 'Muhammad Hafiz bin Razak',
                phoneNumber: '019-3456789',
                companyName: 'Engineering Solutions',
                staffId: 'ES-2024-156',
                vehicleNumber: 'JKL 7890',
                vehicleModel: 'Toyota Alphard',
                vehicleType: 'Mini Van',
                vehicleColor: 'White',
                parkingType: 'Premium',
                subscriptionPeriod: 'Quarterly',
                totalAmount: 954,
                submissionDate: new Date('2026-01-28T10:00:00').toISOString(),
                status: 'Pending',
                read: false,
                receiptImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNzU3NTc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QYXltZW50IFJlY2VpcHQ8L3RleHQ+PC9zdmc+'
            }
        ];
        
        applications = dummyApplications;
        localStorage.setItem('applications', JSON.stringify(applications));
    }
    
    // Calculate statistics
    const totalApplications = applications.length;
    const pendingCount = applications.filter(app => app.status === 'Pending').length;
    const approvedCount = applications.filter(app => app.status === 'Approved').length;
    const rejectedCount = applications.filter(app => app.status === 'Rejected').length;
    
    // Update dashboard
    document.getElementById('totalApplications').textContent = totalApplications;
    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('approvedCount').textContent = approvedCount;
    document.getElementById('rejectedCount').textContent = rejectedCount;
});