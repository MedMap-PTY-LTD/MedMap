"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/payfastITN.ts
const express_1 = __importStar(require("express"));
const PaymentService_1 = require("../services/PaymentService");
const router = (0, express_1.Router)();
// IMPORTANT: PayFast sends application/x-www-form-urlencoded, not JSON
router.post('/api/payments/payfast/notify', express_1.default.urlencoded({ extended: true }), // <- must parse form data
async (req, res) => {
    try {
        const itnData = req.body; // Record<string, string>
        const result = await PaymentService_1.PaymentService.handleITN(itnData);
        if (result.success) {
            console.log('✅ ITN processed:', itnData.m_payment_id);
        }
        else {
            console.error('❌ ITN failed:', result.error);
        }
        // ALWAYS return 200 — PayFast retries on non-2xx responses
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('ITN route error:', error);
        res.status(200).send('OK'); // Still 200 to stop retry storms
    }
});
exports.default = router;
//# sourceMappingURL=payfastITN.js.map