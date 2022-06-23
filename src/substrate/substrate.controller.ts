import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import {
  TransferReq,
  TransferResp,
  StakingReq,
  StakingResp,
} from './interfaces/substrate.interface';
import 'dotenv/config';
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
      'sr25519',
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
        nonce: 3, //遇到outdate错误 需要增加nounce数字
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

    const expectedTxHash = construct.txHash(tx);
    console.log(`\nExpected Tx Hash: ${expectedTxHash}`);

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

    const seed = uint8ArrayfromHexString(data.stashKey);

    const miPoolUser = keyring.addFromSeed(
      seed,
      { name: 'miPool-User' },
      'sr25519',
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
      nonce: 5,
      specVersion,
      tip: 0,
      transactionVersion,
    };

    const txOptions = {
      metadataRpc,
      registry,
    };

    /**
     * payee types
     * Staked - Pay into the stash account, increasing the amount at stake accordingly.
     * Stash - Pay into the stash account, not increasing the amount at stake.
     * Account - Pay into a custom account, like so: Account DMTHrNcmA8QbqRS4rBq8LXn8ipyczFoNMb1X4cY2WD9tdBX.
     * Controller - Pay into the controller account.
     */
    const unsignedBondMethod = methods.staking.bond(
      {
        controller: miPoolUser.address,
        payee: data.payee,
        value: data.value,
      },
      { ...txInfo },
      { ...txOptions },
    );

    // Only accept 6 nominator in polkadot
    const targets = data.validators.split(',', 6);
    const unsignedNominatorMethod = methods.staking.nominate(
      {
        targets,
      },
      { ...txInfo },
      { ...txOptions },
    );

    const unsigned = methods.utility.batchAll(
      {
        calls: [unsignedBondMethod.method, unsignedNominatorMethod.method],
      },
      { ...txInfo },
      { ...txOptions },
    );

    // Decode an unsigned transaction.
    const decodedUnsigned = decode(unsigned, {
      metadataRpc,
      registry,
    });
    console.log(
      `\nDecoded Transaction\n  calls: ${JSON.stringify(
        decodedUnsigned.method.args.calls,
      )}\n`,
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
      `\nDecoded Transaction\n  calls: ${JSON.stringify(
        payloadInfo.method.args.calls,
      )}\n`,
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

    const expectedTxHash = construct.txHash(tx);
    console.log(`\nExpected Tx Hash: ${expectedTxHash}`);
    // bad signature reason: tx struct parameters not match , for example tx nonce is 3 and next is 4. all tx must the same.
    const actualTxHash = await rpcToDefaultNode('author_submitExtrinsic', [tx]);
    console.log(`Actual Tx Hash: ${actualTxHash}`);
    return { resultHash: actualTxHash };
  }
}
