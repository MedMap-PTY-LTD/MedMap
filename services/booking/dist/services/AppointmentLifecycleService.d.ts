import { Server } from 'socket.io';
interface CompletedBookingNotice {
    bookingId: string;
    patientId: string;
    doctorId: string;
    completedAt: string;
}
export declare class AppointmentLifecycleService {
    private static running;
    static start(io?: Server): void;
    static sweep(nowMs?: number): Promise<CompletedBookingNotice[]>;
}
export {};
//# sourceMappingURL=AppointmentLifecycleService.d.ts.map