import { PayFastConfiguration } from './PaymentService';
export declare class PayFastSubscriptionService {
    static cancel(token: string, config: PayFastConfiguration): Promise<any>;
    static update(token: string, config: PayFastConfiguration, amountCents: number, runDate: string): Promise<any>;
}
//# sourceMappingURL=PayFastSubscriptionService.d.ts.map