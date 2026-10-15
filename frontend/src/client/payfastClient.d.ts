export interface BookingRequest {
    doctorId: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    patientPhone?: string;
    doctorName: string;
    doctorSpecialization: string;
    appointmentDate: string;
    appointmentTime: string;
    endTime: string;
    consultationFee: number;
    notes?: string;
}
export declare function createBookingAndPay(booking: BookingRequest): Promise<void>;
//# sourceMappingURL=payfastClient.d.ts.map