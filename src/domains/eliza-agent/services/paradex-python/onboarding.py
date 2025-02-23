import asyncio
import logging
import os
import time
import traceback
from typing import Dict, List, Tuple

import aiohttp
from starknet_py.common import int_from_bytes
from utils import (
    build_auth_message,
    build_onboarding_message,
    generate_paradex_account,
    get_account,
    get_l1_eth_account,
)
from shared.api_client import get_paradex_config

NETWORK_CONFIGS = {
    "testnet": {
        "url": "https://api.testnet.paradex.trade/v1",
        "env_prefix": "TESTNET"
    },
    "prod": {
        "url": "https://api.prod.paradex.trade/v1",
        "env_prefix": "PROD"
    }
}

async def perform_onboarding(
    paradex_config: Dict,
    paradex_http_url: str,
    account_address: str,
    private_key: str,
    ethereum_account: str,
) -> bool:
    chain_id = int_from_bytes(paradex_config["starknet_chain_id"].encode())
    account = get_account(account_address, private_key, paradex_config)

    message = build_onboarding_message(chain_id)
    sig = account.sign_message(message)

    headers = {
        "PARADEX-ETHEREUM-ACCOUNT": ethereum_account,
        "PARADEX-STARKNET-ACCOUNT": account_address,
        "PARADEX-STARKNET-SIGNATURE": f'["{sig[0]}","{sig[1]}"]',
    }

    url = paradex_http_url + '/onboarding'
    body = {'public_key': hex(account.signer.public_key)}

    logging.info(f"POST {url}")
    logging.info(f"Headers: {headers}")
    logging.info(f"Body: {body}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=body) as response:
                status_code: int = response.status
                if status_code == 200:
                    logging.info("Onboarding successful")
                    return True
                else:
                    logging.error(f"Status Code: {status_code}")
                    logging.error(f"Response Text: {await response.text()}")
                    logging.error("Unable to POST /onboarding")
                    return False
    except Exception as e:
        logging.error(f"Error during onboarding: {e}")
        return False

async def handle_network(network: str, eth_account) -> Tuple[bool, Dict[str, str]]:
    config = NETWORK_CONFIGS[network]
    paradex_http_url = config["url"]
    env_prefix = config["env_prefix"]
    
    logging.info(f"Processing {network}...")
    
    # Load Paradex config
    paradex_config = await get_paradex_config(paradex_http_url)
    
    # Generate Paradex account
    paradex_account_address, paradex_account_private_key_hex = generate_paradex_account(
        paradex_config, eth_account.key.hex()
    )
    
    # Perform onboarding
    success = await perform_onboarding(
        paradex_config,
        paradex_http_url,
        paradex_account_address,
        paradex_account_private_key_hex,
        eth_account.address,
    )
    
    env_vars = {
        f"PARADEX_{env_prefix}_ADDRESS": paradex_account_address,
        f"PARADEX_{env_prefix}_PRIVATE_KEY": paradex_account_private_key_hex
    }
    
    return success, env_vars

async def main(eth_private_key_hex: str) -> Tuple[bool, Dict[str, str]]:
    # Initialize Ethereum account
    _, eth_account = get_l1_eth_account(eth_private_key_hex)
    
    all_env_vars = {}
    all_success = True
    
    for network in NETWORK_CONFIGS.keys():
        success, env_vars = await handle_network(network, eth_account)
        all_success = all_success and success
        all_env_vars.update(env_vars)
    
    # Write environment variables to a file that can be sourced by the shell script
    with open('/app/.venv/.paradex_env', 'w') as f:
        for key, value in all_env_vars.items():
            f.write(f"export {key}='{value}'\n")
    
    return all_success, all_env_vars

if __name__ == "__main__":
    # Logging
    logging.basicConfig(
        level=os.getenv("LOGGING_LEVEL", "INFO"),
        format="%(asctime)s.%(msecs)03d | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Load environment variables
    eth_private_key_hex = os.getenv('ETHEREUM_PRIVATE_KEY', "")

    if not eth_private_key_hex:
        logging.error("ETHEREUM_PRIVATE_KEY environment variable is required")
        exit(1)

    try:
        loop = asyncio.get_event_loop()
        success, env_vars = loop.run_until_complete(main(eth_private_key_hex))
        
        if not success:
            logging.error("Onboarding failed for one or more networks")
            exit(1)
            
        logging.info("Successfully onboarded to all networks")
        logging.info("Generated environment variables:")
        for key, value in env_vars.items():
            logging.info(f"{key}='{value[:10]}...'")
            
    except Exception as e:
        logging.error("Local Main Error")
        logging.error(e)
        traceback.print_exc()
        exit(1)