export interface TransferReq {
  from: string;
  to: string;
  amount: string;
  coin: string;
}

export interface MethodsResp {
  signingPayload: string;
}

export interface StakeReq {
  controller: string;
  payee: string;
  value: string;
  coin: string;
}

export interface signReq {
  privateKey: string;
  signingPayload: string;
}

export interface signatureResp {
  signature: string;
}
