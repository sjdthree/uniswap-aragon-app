import {toDecimals} from "../lib/math-utils";
import {ETHER_TOKEN_FAKE_ADDRESS} from "../lib/shared-constants";
import {tokenContract$} from "./ExternalContracts";
import {mergeMap} from 'rxjs/operators'

const MAX_CONFIRMATION_PERIOD_SECONDS = 60 * 60 * 24 * 10 // 10 days (needs to be in the future or ganache might crash)

const setAgent = (api, address) => {
    api.setAgent(address)
        .subscribe()
}

const setUniswapFactory = (api, address) => {
    api.setUniswapFactory(address)
        .subscribe()
}

const withdraw = (api, token, recipient, amount, decimals) => {
    const adjustedAmount = toDecimals(amount.toString(), parseInt(decimals))
    api.transfer(token, recipient, adjustedAmount)
        .subscribe()
}

async function deposit(api, tokenAddress, amount, decimals) {

    if (decimals === -1) {
        decimals = await tokenContract$(api, tokenAddress).pipe(
            mergeMap(token => token.decimals())).toPromise()
    }

    const adjustedAmount = toDecimals(amount.toString(), parseInt(decimals))

    if (tokenAddress === ETHER_TOKEN_FAKE_ADDRESS) {
        api.deposit(tokenAddress, adjustedAmount, {value: adjustedAmount})
            .subscribe()
    } else {
        api.deposit(tokenAddress, adjustedAmount, {
            token: {
                address: tokenAddress,
                value: adjustedAmount
            },
            // Hardcoded gas to prevent MetaMask doing gas estimation and telling the user that their
            // transaction will fail (before the approve is mined).
            gas: 450000
        })
            .subscribe()
    }
}

async function ethToTokenSwapInput(api, inputToken, inputAmount, outputToken, outputAmount) {

    const convertedInputAmount = toDecimals(inputAmount, parseInt(inputToken.decimals))
    const convertedOutputAmount = toDecimals(outputAmount, parseInt(outputToken.decimals))

    const currentBlock = await api.web3Eth('getBlock', 'latest').toPromise()
    const deadline = currentBlock.timestamp + MAX_CONFIRMATION_PERIOD_SECONDS

    if (inputToken.address === ETHER_TOKEN_FAKE_ADDRESS && outputToken.address !== ETHER_TOKEN_FAKE_ADDRESS) {
        api.ethToTokenSwapInput(outputToken.address, convertedInputAmount, convertedOutputAmount, deadline)
            .subscribe()
    } else if (inputToken.address !== ETHER_TOKEN_FAKE_ADDRESS && outputToken.address === ETHER_TOKEN_FAKE_ADDRESS) {
        api.tokenToEthSwapInput(inputToken.address, convertedInputAmount, convertedOutputAmount, deadline)
            .subscribe()
    }


}

export {
    setAgent,
    setUniswapFactory,
    withdraw,
    deposit,
    ethToTokenSwapInput
}