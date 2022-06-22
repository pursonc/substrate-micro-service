import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import {
  TransferReq,
  StakeReq,
  MethodsResp,
} from './interfaces/substrate.interface';

import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import {
  construct,
  decode,
  deriveAddress,
  getRegistry,
  methods,
  PolkadotSS58Format,
} from '@substrate/txwrapper-polkadot';

import {
  rpcToDefaultNode,
  signWith,
  uint8ArrayfromHexString,
} from '../../common/util';

@Controller('substrate')
export class SubstrateController {
  @GrpcMethod('SubstrateService', 'transfer')
  async transfer(
    data: TransferReq,
    metadata: Metadata,
    call: ServerUnaryCall<any, any>,
  ): Promise<MethodsResp> {


    const { block } = await rpcToDefaultNode('chain_getBlock');
    const blockHash = await rpcToDefaultNode('chain_getBlockHash');
    const genesisHash = await rpcToDefaultNode('chain_getBlockHash', [0]);
    const metadataRpc = await rpcToDefaultNode('state_getMetadata');
    const { specVersion, transactionVersion, specName } =
      await rpcToDefaultNode('state_getRuntimeVersion');

    const registry = getRegistry({
      chainName: 'Polkadot',
      specName,
      specVersion,
      metadataRpc,
      asCallsOnlyArg: true,
    });
    //[`transferKeepAlive`] Same as the [`transfer`] call, but with a check that the transfer will not kill the
    // origin account.
    const unsigned = methods.balances.transfer(
      {
        value: data.amount,
        dest: data.to, // Bob
      },
      {
        address: deriveAddress(
          miPoolUser.publicKey,
          PolkadotSS58Format.polkadot,
        ),
        blockHash,
        blockNumber: registry
          .createType('BlockNumber', block.header.number)
          .toNumber(),
        eraPeriod: 64,
        genesisHash,
        metadataRpc,
        nonce: 1, // Assuming this is Alice's first tx on the chain
        specVersion,
        tip: 0,
        transactionVersion,
      },
      {
        metadataRpc,
        registry,
      },
    );

    // Decode an unsigned transaction.
    const decodedUnsigned = decode(unsigned, {
      metadataRpc,
      registry,
    });
    console.log(
      `\nDecoded Transaction\n  To: ${
        (decodedUnsigned.method.args.dest as { id: string })?.id
      }\n` + `  Amount: ${decodedUnsigned.method.args.value}`,
    );

    // // Construct the signing payload from an unsigned transaction.
    const signingPayload = construct.signingPayload(unsigned, { registry });
    console.log(`\nPayload to Sign: ${signingPayload}`);

    // Decode the information from a signing payload.
    // const payloadInfo = decode(signingPayload, {
    //   metadataRpc,
    //   registry,
    // });
    // console.log(
    //   `\nDecoded Transaction\n  To: ${
    //     (payloadInfo.method.args.dest as { id: string })?.id
    //   }\n` + `  Amount: ${payloadInfo.method.args.value}`,
    // );

    // Sign a payload. This operation should be performed on an offline device.
    // const signature = signWith(miPoolUser, signingPayload, {
    //   metadataRpc,
    //   registry,
    // });
    // console.log(`\nSignature: ${signature}`);

    // Serialize a signed transaction.
    // const tx = construct.signedTx(unsigned, signature, {
    //   metadataRpc,
    //   registry,
    // });
    // console.log(`\nTransaction to Submit: ${tx}`);

    // Derive the tx hash of a signed transaction offline.
    // const expectedTxHash = construct.txHash(tx);
    // console.log(`\nExpected Tx Hash: ${expectedTxHash}`);

    // Send the tx to the node. Again, since `txwrapper` is offline-only, this
    // operation should be handled externally. Here, we just send a JSONRPC
    // request directly to the node.
    // const actualTxHash = await rpcToDefaultNode('author_submitExtrinsic', [tx]);
    // console.log(`Actual Tx Hash: ${actualTxHash}`);

    // Decode a signed payload.
    // const txInfo = decode(tx, {
    //   metadataRpc,
    //   registry,
    // });
    // console.log(
    //   `\nDecoded Transaction\n  To: ${
    //     (txInfo.method.args.dest as { id: string })?.id
    //   }\n` + `  Amount: ${txInfo.method.args.value}\n`,
    // );

    return { signingPayload };
  }

  @GrpcMethod('SubstrateService', 'stake')
  async stake(
    data: StakeReq,
    metadata: Metadata,
    call: ServerUnaryCall<any, any>,
  ): Promise<MethodsResp> {


    const { block } = await rpcToDefaultNode('chain_getBlock');
    const blockHash = await rpcToDefaultNode('chain_getBlockHash');
    const genesisHash = await rpcToDefaultNode('chain_getBlockHash', [0]);
    const metadataRpc = await rpcToDefaultNode('state_getMetadata');
    const { specVersion, transactionVersion, specName } =
      await rpcToDefaultNode('state_getRuntimeVersion');

    const registry = getRegistry({
      chainName: 'Polkadot',
      specName,
      specVersion,
      metadataRpc,
      asCallsOnlyArg: true,
    });
    //[`transferKeepAlive`] Same as the [`transfer`] call, but with a check that the transfer will not kill the
    // origin account.
    const unsigned = methods.staking.bond(
      {
        controller: data.controller,
        payee: data.payee,
        value: data.value,
      },
      {
        address: deriveAddress(
          miPoolUser.publicKey,
          PolkadotSS58Format.polkadot,
        ),
        blockHash,
        blockNumber: registry
          .createType('BlockNumber', block.header.number)
          .toNumber(),
        eraPeriod: 64,
        genesisHash,
        metadataRpc,
        nonce: 1, // Assuming this is Alice's first tx on the chain
        specVersion,
        tip: 0,
        transactionVersion,
      },
      {
        metadataRpc,
        registry,
      },
    );

    // Decode an unsigned transaction.
    const decodedUnsigned = decode(unsigned, {
      metadataRpc,
      registry,
    });
    console.log(
      `\nDecoded Transaction\n  calls: ${JSON.stringify(
        decodedUnsigned.method.args.calls
      )}\n`
    );

    // Construct the signing payload from an unsigned transaction.
    const signingPayload = construct.signingPayload(unsigned, { registry });
    console.log(`\nPayload to Sign: ${signingPayload}`);

    return { signingPayload };
  }

  @GrpcMethod('SubstrateService', 'signTx')
  async signTx(): Promise<SubstrateResp> {
    // Wait for the promise to resolve async WASM
    await cryptoWaitReady();
    // Create a new keyring, and add an "Alice" account
    const keyring = new Keyring();

    const seed = uint8ArrayfromHexString(data.fromKey);

    // console.info('priKey:', data.fromKey, 'seed:', seed);

    const miPoolUser = keyring.addFromSeed(
      seed,
      { name: 'miPool-User' },
      'ed25519',
    );

    console.log(
      "miPool-User's SS58-Encoded Address:",
      deriveAddress(miPoolUser.publicKey, PolkadotSS58Format.polkadot),
    );
  }

}
