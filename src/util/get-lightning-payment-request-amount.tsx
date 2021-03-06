import React from 'react';
import * as hi from 'blindmixer-lib';

// Only useful for Lightning Invoices
export default function GetLightningPaymentRequestAmount(paymentRequest: string): number | string {
  const pro = hi.decodeBolt11(paymentRequest);
  let amount;
  if (pro instanceof Error) {
    amount = 'error';
    throw pro;
  }
  if (pro.satoshis) {
    // this invoice has a specific amount...
    amount = pro.satoshis.toString();
  } else {
    // this invoice is for any amount
    amount = ' ';
  }
  return amount;
}
