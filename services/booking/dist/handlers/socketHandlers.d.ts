import { Socket } from 'socket.io';
interface SocketHandlerDependencies {
    io: any;
    socket: Socket;
}
export declare class SocketHandlers {
    private io;
    private socket;
    constructor({ io, socket }: SocketHandlerDependencies);
    private registerHandlers;
    private handleJoinDoctor;
    private handleJoinPatient;
    private handleLeaveDoctor;
    private handleLeavePatient;
    private handleCreateBooking;
    private handleRescheduleBooking;
    private handleCancelBooking;
    private handleUpdateStatus;
    private handleGetSlots;
    private handleGetBookings;
    private handleGetUpcoming;
    private handleGetStats;
    private handleSetAvailability;
}
export {};
//# sourceMappingURL=socketHandlers.d.ts.map