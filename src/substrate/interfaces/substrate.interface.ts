export interface TransferReq {
  fromKey: string;
  to: string;
  amount: string;
  coin: string;
}

export interface StakingReq {
  validators: string;
  stashKey: string;
  payee: string;
  value: string;
  coin: string;
}

export interface StakingResp {
  resultHash: string;
}

export interface TransferResp {
  resultHash: string;
}
