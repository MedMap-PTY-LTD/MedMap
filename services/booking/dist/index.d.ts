/// <reference types="node" />
import { Server } from 'socket.io';
declare const app: import("express-serve-static-core").Express;
declare const httpServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare const io: Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export { app, io, httpServer };
//# sourceMappingURL=index.d.ts.map