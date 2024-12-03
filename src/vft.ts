import { decodeAddress, GearApi } from '@gear-js/api';
import { Keyring } from '@polkadot/api';
import { readFileSync } from 'fs';

import { Program } from './lib';

// 1. Preparing

// 1.1 Connecting to the API
const VARA_TESTNET_ENDPOINT = 'wss://testnet.vara.network';
const api = await GearApi.create({ providerAddress: VARA_TESTNET_ENDPOINT });

// 1.2 Getting Developer Accounts
const aliceKeyring = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
const bobKeyring = new Keyring({ type: 'sr25519' }).addFromUri('//Bob');
const aliceAccountAddress = decodeAddress(aliceKeyring.address);
const bobAccountAddress = decodeAddress(bobKeyring.address);

// 1.3 Defining Token Constant
const TOKEN = {
  NAME: 'Tutorial Token',
  SYMBOL: 'TT',
  DECIMALS: 12,
} as const;

// 2. Getting Program Instance

// 2.1 to create or upload new program
const vftProgram = new Program(api);

// or to use existing program
const PROGRAM_ID =
  '0x69548a586ad7b83178ffdebfdd626236311f093e52589c9952aa40edec2e2d55';

const existingVftProgram = new Program(api, PROGRAM_ID);

// 2.2 Uploading the Program
// The code reads the WebAssembly file, creates a new constructor from the code, calculates the gas required, and uploads the program.

const optWasmBuffer = readFileSync('./extended_vft.opt.wasm');

const uploadProgramTransaction = await vftProgram
  .newCtorFromCode(optWasmBuffer, TOKEN.NAME, TOKEN.SYMBOL, TOKEN.DECIMALS)
  .withAccount(aliceKeyring)
  .calculateGas();

const { response: uploadProgramResponse } =
  await uploadProgramTransaction.signAndSend();

await uploadProgramResponse();

// or Creating the Program
// The code creates the program using the uploaded code ID, calculates the gas required, and sends the transaction.

const VFT_CODE_ID =
  '0xf7dba362cd66a35fb95c41b6a530ee287f013caecde32e4d8fa498a716913c3f';

const createProgramTransaction = vftProgram.newCtorFromCodeId(
  VFT_CODE_ID,
  TOKEN.NAME,
  TOKEN.SYMBOL,
  TOKEN.DECIMALS
);

const { response: createProgramResponse } =
  await createProgramTransaction.signAndSend();

await createProgramResponse();

// 3. Minting Tokens
// The code calculates the amount of tokens to mint, mints new tokens to Alice's account, calculates the gas required, and sends the transaction.

const tokensAmount = 1 * 10 ** TOKEN.DECIMALS;

const mintTransaction = await vftProgram.vft
  .mint(aliceAccountAddress, tokensAmount)
  .withAccount(aliceKeyring)
  .calculateGas();

const { response: mintResponse } = await mintTransaction.signAndSend();
await mintResponse();

// 4. Reading balances
// The code retrieves the balances of Alice and Bob.

const balance = await vftProgram.vft.balanceOf(aliceAccountAddress);
console.log(`Alice's balance: ${balance}`);

const bobBalance = await vftProgram.vft.balanceOf(bobAccountAddress);
console.log(`Bob's balance: ${bobBalance}`);

// 5. Subscribing to Transfer Events
// The code subscribes to transfer events, monitors token transfers, and retrieves the balances of Alice and Bob.

const unsubscribe = vftProgram.vft.subscribeToTransferEvent(
  async ({ from, to, value }) => {
    if (
      from !== aliceAccountAddress ||
      to !== bobAccountAddress ||
      value !== tokensAmount
    )
      return;

    const balance = await vftProgram.vft.balanceOf(aliceAccountAddress);
    console.log(`Alice's balance: ${balance}`);

    const bobBalance = await vftProgram.vft.balanceOf(bobAccountAddress);
    console.log(`Bob's balance: ${bobBalance}`);

    (await unsubscribe)();
  }
);

// 6. Transferring Tokens
// The code transfers tokens from Alice to Bob, calculates the gas required, and sends the transaction.

const transferTransaction = await vftProgram.vft
  .transfer(bobAccountAddress, tokensAmount)
  .withAccount(aliceKeyring)
  .calculateGas();

await transferTransaction.signAndSend();
