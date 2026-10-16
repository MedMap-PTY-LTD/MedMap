"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payFastApiSignature = exports.payFastSignature = exports.payFastEncode = void 0;
const crypto_1 = __importDefault(require("crypto"));
// PayFast custom integration uses PHP-style URL encoding and field order.
function payFastEncode(value) {
    return encodeURIComponent(value.trim())
        .replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
        .replace(/%20/g, '+');
}
exports.payFastEncode = payFastEncode;
function payFastSignature(fields, passphrase, includeBlank = false) {
    const parameters = Object.entries(fields)
        .filter(([key, value]) => key !== 'signature' && (includeBlank || value !== ''))
        .map(([key, value]) => `${key}=${payFastEncode(value)}`);
    if (passphrase?.trim())
        parameters.push(`passphrase=${payFastEncode(passphrase)}`);
    return crypto_1.default.createHash('md5').update(parameters.join('&')).digest('hex');
}
exports.payFastSignature = payFastSignature;
// PayFast's recurring-billing API uses alphabetically sorted parameters,
// unlike its custom checkout signature which preserves field order.
function payFastApiSignature(fields, passphrase) {
    const parameters = Object.entries({ ...fields, passphrase })
        .filter(([, value]) => value !== '')
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, value]) => `${key}=${payFastEncode(value)}`);
    return crypto_1.default.createHash('md5').update(parameters.join('&')).digest('hex');
}
exports.payFastApiSignature = payFastApiSignature;
//# sourceMappingURL=payfastSignature.js.map