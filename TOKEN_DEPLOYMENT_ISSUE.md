# Fix Token Deployment Missing Parameter Issue

## Problem
Token deployment is failing with the error:
```
Token deployment failed: Validate: arg _locker of cairo type core::starknet::contract_address::ContractAddress should be type (String, Number or BigInt), but is undefined undefined.
```

This occurs during the agent creation process at step 5 "Deploy Agent Token" after the wallet has been successfully created, funded, and deployed.

## Root Cause
The token contract deployment function requires a parameter called `_locker` which is currently undefined. This parameter is likely a contract address for token locking/vesting functionality.

## Proposed Solution
1. Add the missing `_locker` parameter to the token deployment function:
   ```typescript
   const tokenContract = await createAgentToken({
     name: `${agentName.toUpperCase()}_TOKEN`,
     symbol: `ELIZA${agentId.substring(0, 4)}`,
     locker: process.env.TOKEN_LOCKER_ADDRESS // Add this parameter
   });
   ```

2. Add the required environment variable:
   ```
   TOKEN_LOCKER_ADDRESS=0x... // Address of the locker contract
   ```

3. Update the orchestration data structure to include the locker address if it's passed from the frontend.

4. Add validation before the token deployment step to ensure all required parameters are present.

## Testing Plan
1. Add the environment variable to the development environment
2. Test agent creation to verify token deployment succeeds
3. Add unit tests for the token deployment function with the new parameter

## Related Issues
- Fixes #ZZ - Token deployment failing with missing locker parameter 