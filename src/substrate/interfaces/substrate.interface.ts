export interface TransferReq {
  fromKey: string;
  to: string;
  amount: string;
  coin: string;
}

export interface StakingReq {
  nominators: string;
  controllerKey: string;
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
