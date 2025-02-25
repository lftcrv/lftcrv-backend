# Wallet Deployment Process

## Overview
The wallet deployment process is a critical part of the agent creation system. It involves multiple orchestrated steps to create, fund, and deploy a Starknet wallet for each agent, followed by the deployment of a unique token contract.

## Technical Implementation Details

### How Wallet Deployment Works Under the Hood

The wallet deployment process leverages Starknet's Account Abstraction model, which requires deploying a smart contract to represent each user account. Here's the detailed technical flow:

1. **Account Contract Preparation**:
   - We use OpenZeppelin's Account contract implementation (specified by `OZ_ACCOUNT_CLASSHASH`)
   - The contract is already deployed on Starknet as a class, we just need to deploy instances

2. **Deployment Transaction Structure**:
   ```json
   {
     "type": "DEPLOY_ACCOUNT",
     "contract_address_salt": "<starkKeyPub>",
     "constructor_calldata": ["<publicKey>"],
     "class_hash": "<ozAccountClassHash>",
     "max_fee": "0x1234567890"
   }
   ```

3. **Deployment Mechanism**:
   - The `deployAccount` method from Starknet.js creates a special transaction type
   - This transaction is signed with the private key
   - The transaction is submitted to the Starknet sequencer
   - The sequencer processes the transaction and deploys the contract

4. **Address Pre-computation**:
   - Before deployment, we calculate the contract address using:
     ```typescript
     const contractAddress = hash.calculateContractAddressFromHash(
       starkKeyPub,           // Salt for uniqueness
       ozAccountClassHash,    // Class hash of the account contract
       constructorCalldata,   // Initial parameters (public key)
       0                      // Deployment nonce (0 for first deployment)
     );
     ```
   - This allows us to know the address before actual deployment
   - We can fund this address before the contract exists on-chain

5. **Transaction Lifecycle**:
   - `RECEIVED` → `PENDING` → `ACCEPTED_ON_L2` → `ACCEPTED_ON_L1`
   - We wait for `ACCEPTED_ON_L2` status before considering deployment successful
   - Full confirmation (L1) can take hours but isn't required for functionality

6. **Gas Management**:
   - The admin wallet pays for deployment gas
   - We transfer ETH to the new wallet for future transactions
   - Gas estimation is performed before deployment to ensure sufficient funds

## Signature Validation During Account Deployment

### The Signature Validation Paradox

**Q: How does the backend handle signature validation during account deployment? We're getting a signature validation error when trying to deploy a Starknet account, even though the account doesn't exist yet.**

A: This is a common paradox in Starknet account deployment: you need to sign a transaction to deploy an account, but the account doesn't exist yet to validate the signature. Our solution:

1. We use a special transaction type `DEPLOY_ACCOUNT` which has different validation rules
2. The signature is validated against the provided public key in the constructor calldata, not the deployed contract
3. The backend uses the `Account` class from Starknet.js which handles this special case automatically

```typescript
// This creates an Account instance for a non-deployed account
const account = new Account(
  provider,
  futureAddress, // Pre-computed address that doesn't exist yet
  privateKey
);

// Starknet.js handles the special signature validation for DEPLOY_ACCOUNT
const { transaction_hash } = await account.deployAccount({
  classHash,
  constructorCalldata,
  addressSalt
});
```

### EVM-to-Starknet Account Derivation Flow

**Q: How does the system handle users with existing EVM accounts who need Starknet accounts?**

A: We use a deterministic derivation process to create Starknet accounts from EVM addresses:

1. **Request Signature**: Ask the user to sign a message with their EVM wallet
2. **Derive Keys**: Use the signature to deterministically derive a Starknet private key
3. **Check Deployment**: Verify if the derived account is already deployed
4. **Deploy if Needed**: Only deploy if the account doesn't exist yet

The flow in the frontend looks like this:

```typescript
// 1. Request signature from MetaMask or other EVM wallet
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, evmAddress]
});

// 2. Save signature to local storage for future use
localStorage.setItem(`signature_${evmAddress.toLowerCase()}`, signature);

// 3. Derive Starknet account from signature
const { starknetAddress, privateKey } = await deriveStarknetAccount(evmAddress, signature);

// 4. Check if account is already deployed
const isDeployed = await checkAccountDeployed(starknetAddress);

// 5. Only deploy if needed
if (!isDeployed) {
  await deployAccount(privateKey, starknetAddress);
}
```

The derivation process ensures:
- The same EVM address always produces the same Starknet address
- Users don't need to manage multiple private keys
- Returning users can use their existing Starknet account

**Q: When I connect with an EVM account for a user that exists (and already has a Starknet account), what's the flow?**

A: For existing users, the flow is simplified:

1. **Check Local Storage**: Look for a saved signature for this EVM address
2. **Request Signature if Needed**: Only ask for a new signature if not found in storage
3. **Derive Starknet Address**: Use the signature to derive the Starknet address
4. **Verify Deployment**: Check that the account is deployed (it should be)
5. **Use Existing Account**: No need to deploy again

This approach:
- Minimizes user friction for returning users
- Ensures transaction validation works properly
- Maintains the deterministic relationship between EVM and Starknet accounts

The logs show this working correctly:
```
✅ Found existing signature for address: 0x8B784D94EFB8Ae90816e0e2Cf0272732325AD4c4
...
✅ Account already deployed with class hash: 0x4d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f
- No need to deploy again
```

### Front-end Approach to Bypass Signature Validation

**Q: In the front-end code, I see you're using a special approach to bypass signature validation during initial account deployment. Could you explain how this works?**

A: Our front-end uses a two-step approach:

1. **Pre-compute the account address** using the same formula as the backend
2. **Use a special deployment transaction** that doesn't require the account to exist yet

```typescript
// Front-end code
const calculateAccountAddress = (publicKey) => {
  return hash.calculateContractAddressFromHash(
    publicKey,
    OZ_ACCOUNT_CLASS_HASH,
    CallData.compile({ publicKey }),
    0
  );
};

// Create a special account for deployment
const deployerAccount = new Account(
  provider,
  calculateAccountAddress(publicKey),
  privateKey,
  '1' // Version 1 for newer OZ accounts
);

// Deploy using the special DEPLOY_ACCOUNT transaction type
const response = await deployerAccount.deployAccount({
  classHash: OZ_ACCOUNT_CLASS_HASH,
  constructorCalldata: CallData.compile({ publicKey }),
  addressSalt: publicKey
});
```

### Correct Format for Constructor Calldata and Signature

**Q: What's the correct format for the constructor calldata and signature when deploying a Starknet account?**

A: For OpenZeppelin accounts:

1. **Constructor Calldata**: Just the public key as a felt (no '0x' prefix)
   ```typescript
   const constructorCalldata = CallData.compile({ publicKey: starkKeyPub });
   ```

2. **Signature**: The signature is generated automatically by Starknet.js when using the `Account` class
   ```typescript
   // You don't need to manually create the signature
   // This is handled internally by the deployAccount method
   const { transaction_hash } = await account.deployAccount({...});
   ```

3. **If you're getting "Signature is invalid" errors**, check:
   - The private key matches the public key in the constructor calldata
   - You're using the correct account version (v0 or v1)
   - The public key is properly formatted as a felt

### Nonce Values for Initial Deployment

**Q: Is there a specific nonce value we should be using for the initial account deployment?**

A: For initial account deployment:

1. The nonce should be `0` for the `DEPLOY_ACCOUNT` transaction
2. This is handled automatically by Starknet.js when using the `deployAccount` method
3. You don't need to specify the nonce manually

```typescript
// Nonce is handled internally
const { transaction_hash } = await account.deployAccount({
  classHash,
  constructorCalldata,
  addressSalt
});
```

### Backend Endpoints for Account Deployment

**Q: Does the backend have a special endpoint or method to deploy accounts without signature validation?**

A: Our backend provides a dedicated endpoint for account deployment:

```http
POST /api/starknet/setup
Headers: x-api-key: <api-key>
```

This endpoint:
1. Creates a new wallet (keys + pre-computed address)
2. Funds the address with ETH
3. Deploys the account using the special `DEPLOY_ACCOUNT` transaction
4. Returns the deployed wallet details

The signature validation is handled internally by the Starknet.js library and doesn't require special bypassing.

### Signature Processing with deriveStarkKeyFromSignature

**Q: In the front-end code, I noticed you're using deriveStarkKeyFromSignature to process signatures. Is there a specific way we should be formatting the signature?**

A: `deriveStarkKeyFromSignature` is used for a different purpose - recovering a public key from a signature. For account deployment:

1. We **don't** use `deriveStarkKeyFromSignature` during account deployment
2. We generate the key pair first, then deploy the account with the public key
3. The signature for the deployment transaction is generated automatically by Starknet.js

If you're implementing a custom solution:
```typescript
// Generate key pair first
const privateKey = stark.randomAddress();
const publicKey = ec.starkCurve.getStarkKey(privateKey);

// Then deploy using this key pair
const account = new Account(provider, futureAddress, privateKey);
await account.deployAccount({...});
```

### Recommended Approach for Initial Account Deployment

**Q: What's the recommended approach for handling the initial account deployment when the account doesn't exist yet?**

A: Our recommended approach:

1. **Use the Starknet.js Account class** which handles the special case of deploying non-existent accounts
2. **Pre-fund the account address** before deployment
3. **Use the DEPLOY_ACCOUNT transaction type** (handled by `deployAccount` method)
4. **Let Starknet.js handle the signature** generation and validation

Complete example:
```typescript
// 1. Generate keys
const privateKey = stark.randomAddress();
const publicKey = ec.starkCurve.getStarkKey(privateKey);

// 2. Calculate future address
const futureAddress = hash.calculateContractAddressFromHash(
  publicKey,
  OZ_ACCOUNT_CLASS_HASH,
  CallData.compile({ publicKey }),
  0
);

// 3. Fund the address (using an existing account)
await adminAccount.execute({
  contractAddress: ETH_TOKEN_ADDRESS,
  entrypoint: 'transfer',
  calldata: CallData.compile({
    recipient: futureAddress,
    amount: { low: '50000000000000000', high: '0' }
  })
});

// 4. Create account instance for the non-deployed account
const newAccount = new Account(
  provider,
  futureAddress,
  privateKey
);

// 5. Deploy the account
const { transaction_hash } = await newAccount.deployAccount({
  classHash: OZ_ACCOUNT_CLASS_HASH,
  constructorCalldata: CallData.compile({ publicKey }),
  addressSalt: publicKey
});

// 6. Wait for deployment to complete
await provider.waitForTransaction(transaction_hash);
```

## Troubleshooting Starknet Account Deployment Issues

### Understanding the Derivation Process in Detail

**Q: In the logs, it looks like we're deriving a Starknet address for a user that already exists. Is this correct?**

A: Yes, this is the expected behavior. Let's analyze the log step by step:

```
✅ Got new signature from wallet: {length: 132, preview: '0xe088fe2c...55bed8b41c'}
💾 Saving signature to storage...
📊 Updated localStorage state: {keys: Array(17), length: 17, newSignatureKey: 'signature_0x8b784d94efb8ae90816e0e2cf0272732325ad4c4'}
✅ Signature saved successfully
🔄 Deriving Starknet account from signature...
```

1. First, we get a signature from the EVM wallet (MetaMask)
2. We save this signature to localStorage with the key `signature_0x8b784d94efb8ae90816e0e2cf0272732325ad4c4`
3. Then we start the derivation process

```
[Starknet Derivation]: 🔄 Starting Starknet account derivation for EVM address: 0x8B784D94EFB8Ae90816e0e2Cf0272732325AD4c4
[Starknet Derivation]: ✅ Found existing signature for address: 0x8B784D94EFB8Ae90816e0e2Cf0272732325AD4c4
```

4. The system recognizes we have a signature for this EVM address
5. This is normal - we just saved it in the previous step

```
[Starknet Derivation]: 🔍 Processing signature for key derivation: {signatureLength: 132, signaturePreview: '0xe088fe2c...55bed8b41c'}
[Starknet Derivation]: ✅ Cleaned signature: {length: 130, preview: 'e088fe2c17...55bed8b41c'}
[Starknet Derivation]: 📊 Hashed signature: {hash: '214dd19525bd998df9a3ec6036b8f2168bf726cb5806e12f493cc9abb06e4d6', preview: '214dd19525...9abb06e4d6'}
[Starknet Derivation]: 🔑 Derived private key: {preview: '0x214dd195...9abb06e4d7'}
```

6. The system processes the signature:
   - Cleans it (removes '0x' prefix)
   - Hashes it to create a deterministic private key
   - This ensures the same signature always produces the same private key

```
[Starknet Derivation]: 🔄 Starting account deployment with provider
[Starknet Derivation]: 🌐 Connected to node: Unknown
[Starknet Derivation]: 🔑 Using private key: 0x214dd195...9abb06e4d7
[Starknet Derivation]: Raw public key: 04058ed9aed5e67c74f20c61970783290d8a0a8289f4f0679e8653ab5aca44fb3a02f427c352aa9476de7fdd7a5ab6de360e4b204d636c6d9832af7308a3be398c
[Starknet Derivation]: Formatted public key (x-coordinate): 0x058ed9aed5e67c74f20c61970783290d8a0a8289f4f0679e8653ab5aca44fb3a
[Starknet Derivation]: Public key as BigInt: 2513958918629170785065594812495420241698024665608637124456070778861706869562
```

7. The system derives the public key from the private key
8. It formats the public key correctly for Starknet (taking the x-coordinate)

```
[Starknet Derivation]: 📝 Calculated account address: 0x29bf1029b72bdb9b0f2913bc1e2243f439c521337c4f14df86dc0ee67b4c7c0
[Starknet Derivation]: ✅ Account already deployed with class hash: 0x4d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f
[Starknet Derivation]: - No need to deploy again
```

9. The system calculates the deterministic account address
10. It checks if this account is already deployed on-chain
11. It finds that the account is already deployed, so no deployment is needed

This is the expected behavior for returning users:
- We always derive the Starknet address from the EVM signature
- We check if it's already deployed
- If it is (as in this case), we skip deployment
- The user can immediately use their existing Starknet account

The key insight is that **we always perform the derivation process**, even for existing users. This is necessary because:
1. We need the private key to sign transactions
2. The private key is derived from the signature
3. We don't store private keys long-term for security reasons

The logs show the system is working correctly - it's deriving the Starknet address, finding it already exists, and skipping deployment.

### Contract Class Hash Issues

**Q: Are the OZ_PROXY_CLASS_HASH and OZ_ACCOUNT_CLASS_HASH values correct for the Starknet Sepolia network?**

A: Class hashes differ between networks. For Sepolia, use these values:
- OZ_ACCOUNT_CLASS_HASH: `0x04d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f`
- OZ_PROXY_CLASS_HASH: `0x025ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918`

Verify these values on [Starknet Sepolia Explorer](https://sepolia.starkscan.co/class/0x04d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f).

**Q: The error mentions "Entry point EntryPointSelector(0x79dc0da7...) not found in contract" - could there be a mismatch?**

A: This error typically indicates:
1. Using an incorrect class hash for the network
2. Using an outdated contract version
3. Trying to call a function that doesn't exist in the contract

Solution: Verify the class hash and ensure you're using the latest OpenZeppelin account contract version compatible with your Starknet.js version.

### Constructor Calldata Issues

**Q: Is the format of the constructor calldata correct?**

A: For OpenZeppelin accounts, the constructor calldata should contain only the public key:

```typescript
const constructorCalldata = CallData.compile({ publicKey: starkKeyPub });
```

Make sure the public key is properly formatted (as a felt, not a string with '0x').

**Q: Should we be using a different format for the initialize selector or calldata parameters?**

A: For account deployment, you don't need an initialize selector. The constructor calldata should only contain the public key. If using a proxy pattern, you would need additional parameters.

### Deployment Process Issues

**Q: Is there a specific sequence of transactions needed for this type of account deployment?**

A: The standard sequence is:
1. Generate keys and calculate the future address
2. Fund the address with ETH
3. Deploy the account contract

For proxy-based accounts, you would:
1. Deploy the implementation contract
2. Deploy the proxy contract pointing to the implementation
3. Initialize the proxy

**Q: Does the account deployment need to be done in multiple steps?**

A: For standard OZ accounts, it's a single step. For proxy-based accounts, you need multiple steps. Our implementation uses the standard approach.

### RPC Provider Issues

**Q: Are there any known issues with the RPC provider for account deployments?**

A: Some RPC providers have limitations with:
- Rate limiting
- Incomplete implementation of Starknet JSON-RPC API
- Inconsistent behavior with fee estimation

Try alternative providers:
- Infura: `https://sepolia.infura.io/v3/YOUR_API_KEY`
- Alchemy: `https://starknet-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
- Nethermind: `https://sepolia.nethermind.io/v3/YOUR_API_KEY`

**Q: Would using a different RPC endpoint help?**

A: Yes, if you're experiencing issues, try switching providers. Different providers have different infrastructure and may handle deployments differently.

### Starknet.js Version Issues

**Q: Are there any known issues with Starknet.js v6.11.0 for account deployments?**

A: Starknet.js v6.x has significant changes from v5.x. Common issues include:
- Changed API for account deployment
- Different handling of constructor calldata
- New fee estimation mechanism

For v6.11.0, ensure you're using the updated API:
```typescript
const { transaction_hash } = await account.deployAccount({
  classHash: ozAccountClassHash,
  constructorCalldata: constructorCalldata,
  addressSalt: starkKeyPub,
});
```

**Q: Would upgrading or downgrading the library help?**

A: If you're experiencing issues with v6.11.0:
- Try v6.12.0+ for bug fixes
- Or downgrade to v5.14.1 if your code was originally written for v5.x

### Deployment Parameters Issues

**Q: Is the maxFee parameter being correctly applied?**

A: In Starknet.js v6.x, you can specify maxFee in the deployAccount options:

```typescript
await account.deployAccount({
  classHash: ozAccountClassHash,
  constructorCalldata: constructorCalldata,
  addressSalt: starkKeyPub,
  maxFee: "0x1234567890" // Optional, will be estimated if not provided
});
```

For fee estimation issues, try:
1. Manually setting a higher maxFee
2. Using a different RPC provider
3. Checking if the admin account has sufficient funds

**Q: Should we be using a different approach for setting the fee?**

A: You can try:
1. Manual fee calculation: `maxFee = estimatedFee * 1.5`
2. Fixed high fee: `maxFee = "0x1234567890"`
3. Using the `estimateFee` method before deployment

### Account Type Issues

**Q: Is the OpenZeppelin account contract the correct one to use?**

A: Yes, the OpenZeppelin account is the most widely used and tested. Alternatives include:
- Argent X account
- Braavos account
- Custom account implementations

**Q: Are there any special considerations for deploying this specific account type?**

A: For OpenZeppelin accounts:
1. Ensure the public key is correctly formatted
2. Make sure you're using the correct class hash for your network
3. Fund the address before deployment
4. Use the correct constructor calldata format

### Public Key Issues

**Q: Could the modulo operation on the public key be causing issues?**

A: Public keys should be valid field elements (felts). If your public key is too large, you might need to apply modulo with the Starknet prime:

```typescript
const starknetPrime = "0x800000000000011000000000000000000000000000000000000000000000001";
const publicKeyMod = BigInt(publicKey) % BigInt(starknetPrime);
```

**Q: Should we be using a different approach to handle large public keys?**

A: Ensure your public key is:
1. A valid felt (< Starknet prime)
2. Derived correctly from the private key
3. Formatted without '0x' prefix in the constructor calldata

## Prerequisites
Before starting the wallet deployment process, ensure these environment variables are set:
```env
ADMIN_WALLET_PK=<admin-private-key>
NODE_URL=<starknet-node-url>
ADMIN_WALLET_ADDRESS=<admin-wallet-address>
ETH_TOKEN_ADDRESS=<eth-token-contract-address>
OZ_ACCOUNT_CLASSHASH=<openzeppelin-account-class-hash>
```

## Deployment Steps

### 1. Wallet Creation
The first step creates a new Starknet wallet with associated keys:

```typescript
// Creates a new wallet with:
// - Starknet private key
// - Public key
// - Contract address
// - Ethereum private key for L1 operations
const wallet = {
  privateKey: stark.randomAddress(),
  starkKeyPub: ec.starkCurve.getStarkKey(privateKey),
  ozContractAddress: hash.calculateContractAddressFromHash(...),
  ethereumPrivateKey: ethers.Wallet.createRandom().privateKey
}
```

### 2. Wallet Funding
Transfers initial ETH to the wallet for deployment costs:

```typescript
// Transfers 0.00025 ETH to the new wallet
const AMOUNT = 250000000000000n; // in wei
await adminAccount.execute(
  ethContract.populate('transfer', {
    recipient: wallet.ozContractAddress,
    amount: uint256.bnToUint256(AMOUNT)
  })
);
```

### 3. Wallet Deployment
Deploys the actual wallet contract on Starknet:

```typescript
// Deploys OpenZeppelin account contract
const { transaction_hash, contract_address } = await account.deployAccount({
  classHash: wallet.ozAccountClassHash,
  constructorCalldata: wallet.ozAccountConstructorCallData,
  addressSalt: wallet.starkKeyPub
});
```

### 4. Token Deployment
Creates a unique token for the agent:

```typescript
// Deploys ERC20 token with:
// - Unique symbol (ELIZA + agent ID prefix)
// - Custom name based on agent name
// - Bonding curve parameters
const tokenContract = await createAgentToken({
  name: `${agentName.toUpperCase()}_TOKEN`,
  symbol: `ELIZA${agentId.substring(0, 4)}`
});
```

## Database Schema
The wallet information is stored in the `AgentWallet` table:

```prisma
model AgentWallet {
  id                    String     @id @default(uuid())
  privateKey            String
  publicKey             String
  ethPrivateKey         String
  contractAddress       String
  fundTransactionHash   String?
  deployTransactionHash String?
  deployedAddress       String?
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt
  elizaAgentId          String     @unique
  elizaAgent            ElizaAgent @relation(fields: [elizaAgentId], references: [id])
}
```

## Orchestration Flow
The deployment process is orchestrated in a specific order:

```typescript
{
  steps: [
    { id: 'create-db-record', order: 1 },
    { id: 'create-wallet', order: 2 },
    { id: 'fund-wallet', order: 3 },
    { id: 'deploy-wallet', order: 4 },
    { id: 'deploy-agent-token', order: 5 },
    { id: 'create-container', order: 6 },
    { id: 'start-container', order: 7 }
  ]
}
```

## Error Handling
Each step includes error handling:
- Transaction failures are caught and logged
- Failed deployments trigger rollback procedures
- Wallet state is tracked in the database
- Retry mechanisms for transient failures

## Security Considerations
1. Private keys are stored securely in the database
2. Admin wallet is protected with strict access controls
3. Funding amounts are fixed to prevent overspending
4. Contract deployments use deterministic addresses

## Testing
To test the wallet deployment:

```bash
# 1. Set up test environment
cp .env.example .env.test
# Edit .env.test with test network values

# 2. Run deployment tests
npm run test src/domains/blockchain/starknet/services/__tests__/wallet.service.spec.ts

# 3. Monitor deployment
npm run test:e2e src/domains/eliza-agent/orchestration/steps/__tests__/deploy-wallet.step.spec.ts
```

## Monitoring
The deployment process can be monitored through:
1. Logging interceptors for HTTP requests
2. Transaction hashes in Starknet explorer
3. Database state changes
4. Container creation events

## Common Issues and Solutions

### 1. Insufficient Funds
**Problem**: Wallet deployment fails due to insufficient ETH
**Solution**: Check admin wallet balance and adjust funding amount

### 2. Network Issues
**Problem**: Starknet RPC node connection failures
**Solution**: Implement retry mechanism with exponential backoff

### 3. Contract Deployment Failures
**Problem**: Account contract deployment reverts
**Solution**: Verify class hash and constructor arguments

### 4. Token Deployment Parameter Issues
**Problem**: Token deployment fails with error like: `Validate: arg _locker of cairo type core::starknet::contract_address::ContractAddress should be type (String, Number or BigInt), but is undefined undefined`
**Solution**: 
- This typically happens when a required parameter is missing in the token deployment call
- The `_locker` parameter is a contract address that should be provided by the frontend or set in the backend
- Check that all required parameters are being passed correctly:
  ```typescript
  // Example of correct token deployment call
  const tokenContract = await createAgentToken({
    name: `${agentName.toUpperCase()}_TOKEN`,
    symbol: `ELIZA${agentId.substring(0, 4)}`,
    locker: "0x123...789" // This parameter is missing in the failing case
  });
  ```
- Verify the orchestration data includes all necessary parameters
- If using environment variables for some parameters, ensure they are properly set
- Add validation before the token deployment step to catch missing parameters early

This error is not related to the wallet derivation or deployment process, but occurs in the subsequent token deployment step. The wallet is successfully deployed, but the token deployment fails due to missing or invalid parameters.

## API Endpoints

### Deploy Wallet
```http
POST /api/starknet/setup
Headers: x-api-key: <api-key>
Response: {
  "status": "success",
  "data": {
    "wallet": {
      "contractAddress": "0x...",
      "deployedAddress": "0x...",
      "transactionHash": "0x..."
    }
  }
}
```

## Future Improvements
1. Multi-signature wallet support
2. Enhanced error recovery
3. Automated balance monitoring
4. Deployment optimization for gas fees
5. Advanced token features (staking, governance) 