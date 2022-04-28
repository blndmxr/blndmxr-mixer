import * as hi from 'blindmixer-lib';
import Claimed from 'blindmixer-lib/dist/status/claimed';

import makeRequest, { RequestError } from './make-request';
import genNonces from './gen-nonces';
import Config from '../config';
import { notError } from '../../util';
import { toast } from 'react-toastify';
import { wallet } from '../../state/wallet';

export default async function makeClaim(config: Config, claimant: hi.PrivateKey, claimable: hi.Claimable, coinsMagnitudes: hi.Magnitude[], fee: number) {
  // We are using the hash of the private key as the blinding secret, in case we need to reveal it
  // we can do so without revealing out private key

  const claimHash = claimable.hash();

  const seenNonces = new Set<string>();

  const maxRetries = 64;

  for (let retry = 1; retry <= maxRetries; retry++) {
    const nonces = await genNonces(config, coinsMagnitudes.length, seenNonces);

    const coinsRequest = config.deriveCoinsRequest(claimHash, nonces, coinsMagnitudes);

    // if the period switches between the last refresh and the coin derivation, ask the custodian to notice us.
    const claimReq = hi.ClaimRequest.newAuthorized(claimHash, coinsRequest, claimant, fee, wallet.config.custodian.blindCoinKeys.length);

    let claimResp = await makeRequest<any>(config.custodianUrl + '/claim', claimReq.toPOD());

    if (claimResp instanceof RequestError) {
      if (claimResp.message === 'RETRY_NONCE') {
        console.warn('server asked us to retry with a different nonce (very normal). Retry: ', retry);
        continue;
      }

      if (claimResp.message === 'WRONG_KEYS') {
        toast.error('Please reload your wallet and try again! Missing newest signing keys!');
        throw new Error('Invalid keys, expected a different signing period that we are locally on, please calculate yourself if this is correct!');
      }

      return claimResp;
    }

    console.log('Claim response is: ', claimResp);

    const status = notError(hi.Acknowledged.statusFromPOD(claimResp));

    if (!(status.contents instanceof Claimed)) {
      throw new Error('expected a claimed status, got a ' + status.contents);
    }

    if (status.contents.claimableHash.toPOD() !== claimHash.toPOD()) {
      throw new Error('status hash doesnt match what it should');
    }

    return status;
  }

  throw new Error('After ' + maxRetries + ' could not claim!');
}
