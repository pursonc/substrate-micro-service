import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { GetKeyPairReq } from './interfaces/get-key-pair-req';
import { GetKeyPairResp } from './interfaces/get-key-pair-resp';

@Controller('substrate')
export class SubstrateController {
  @GrpcMethod('SubstrateService', 'GetKeyPair')
  GetKeyPair(
    data: GetKeyPairReq,
    metadata: Metadata,
    call: ServerUnaryCall<any, any>,
  ): GetKeyPairResp {
    const result = {
      DOT: {
        privateKey: 123,
        publicKey: 123,
        address: 123,
      },
    };
    return result[data.coin];
  }
}
