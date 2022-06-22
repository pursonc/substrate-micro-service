import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import {
  TransferReq,
  TransferResp,
  StakingReq,
  StakingResp,
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
  ): Promise<TransferResp> {
    // Wait for the promise to resolve async WASM
    await cryptoWaitReady();
    // Create a new keyring, and add an "Alice" account
    const keyring = new Keyring();

    const seed = uint8ArrayfromHexString(data.fromKey);

    const miPoolUser = keyring.addFromSeed(
      seed,
      { name: 'miPool-User' },
      'ed25519',
    );

    console.log(
      "miPool-User's SS58-Encoded Address:",
      deriveAddress(miPoolUser.publicKey, PolkadotSS58Format.polkadot),
    );

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
        nonce: 0,
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
    const payloadInfo = decode(signingPayload, {
      metadataRpc,
      registry,
    });
    console.log(
      `\nDecoded Transaction\n  To: ${
        (payloadInfo.method.args.dest as { id: string })?.id
      }\n` + `  Amount: ${payloadInfo.method.args.value}`,
    );
    // Sign a payload. This operation should be performed on an offline device.
    const signature = signWith(miPoolUser, signingPayload, {
      metadataRpc,
      registry,
    });
    console.log(`\nSignature: ${signature}`);
    // Serialize a signed transaction.
    const tx = construct.signedTx(unsigned, signature, {
      metadataRpc,
      registry,
    });
    console.log(`\nTransaction to Submit: ${tx}`);
    const actualTxHash = await rpcToDefaultNode('author_submitExtrinsic', [tx]);
    console.log(`Actual Tx Hash: ${actualTxHash}`);
    return { resultHash: actualTxHash };
  }

  @GrpcMethod('SubstrateService', 'staking')
  async staking(
    data: StakingReq,
    metadata: Metadata,
    call: ServerUnaryCall<any, any>,
  ): Promise<StakingResp> {
    // Wait for the promise to resolve async WASM
    await cryptoWaitReady();
    // Create a new keyring, and add an "Alice" account
    const keyring = new Keyring();

    const seed = uint8ArrayfromHexString(data.controllerKey);

    const miPoolUser = keyring.addFromSeed(
      seed,
      { name: 'miPool-User' },
      'ed25519',
    );

    console.log(
      "miPool-User's SS58-Encoded Address:",
      deriveAddress(miPoolUser.publicKey, PolkadotSS58Format.polkadot),
    );

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
    });

    const txInfo = {
      address: deriveAddress(miPoolUser.publicKey, PolkadotSS58Format.polkadot),
      blockHash,
      blockNumber: registry
        .createType('BlockNumber', block.header.number)
        .toNumber(),
      eraPeriod: 64,
      genesisHash,
      metadataRpc,
      nonce: 0,
      specVersion,
      tip: 0,
      transactionVersion,
    };

    const txOptions = {
      metadataRpc,
      registry,
    };
    // Only accept 6 nominator in polkadot
    const targets = data.nominators.split(',', 6);
    const unsignedNominatorMethod = methods.staking.nominate(
      {
        targets,
      },
      txInfo,
      txOptions,
    );

    const unsignedBondMethod = methods.staking.bond(
      {
        controller: miPoolUser.address,
        payee: data.payee,
        value: data.value,
      },
      txInfo,
      txOptions,
    );

    const unsigned = methods.utility.batchAll(
      {
        calls: [unsignedNominatorMethod.method, unsignedBondMethod.method],
      },
      {
        address: miPoolUser.address,
        blockHash: blockHash,
        blockNumber: block.header.number,
        genesisHash,
        metadataRpc,
        nonce: 0,
        specVersion: specVersion,
        tip: 0,
        eraPeriod: 64,
        transactionVersion,
      },
      txOptions,
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
    const payloadInfo = decode(signingPayload, {
      metadataRpc,
      registry,
    });
    console.log(
      `\nDecoded Transaction\n  To: ${
        (payloadInfo.method.args.dest as { id: string })?.id
      }\n` + `  Amount: ${payloadInfo.method.args.value}`,
    );
    // Sign a payload. This operation should be performed on an offline device.
    const signature = signWith(miPoolUser, signingPayload, {
      metadataRpc,
      registry,
    });
    console.log(`\nSignature: ${signature}`);
    // Serialize a signed transaction.
    const tx = construct.signedTx(unsigned, signature, {
      metadataRpc,
      registry,
    });
    console.log(`\nTransaction to Submit: ${tx}`);
    const actualTxHash = await rpcToDefaultNode('author_submitExtrinsic', [tx]);
    console.log(`Actual Tx Hash: ${actualTxHash}`);
    return { resultHash: actualTxHash };
  }
}
