import * as hi from 'blindmixer-lib';
import Config from '../config';
import makeRequest, { RequestError } from './make-request';

import { notError } from '../../util';

import * as Docs from '../docs';
import { toast } from 'react-toastify';

export async function getStatusesByClaimable(config: Config, claimableHash: string) {
  const url = `${config.custodianUrl}/statuses-by-claimable/${claimableHash}`;

  const statusPOD = await makeRequest<hi.POD.Status[]>(url);

  if (statusPOD instanceof RequestError) {
    //toast.error(`got request error: ${statusPOD.message}`);
    throw statusPOD.message;
  }

  if (!Array.isArray(statusPOD)) {
    throw new Error('statuses-by-claimable should have returned an array...');
  }

  return statusPOD.map((s) => notError(hi.Acknowledged.statusFromPOD(s)));
}

export async function addClaimable(config: Config, claimable: hi.Claimable): Promise<hi.Acknowledged.Claimable | Error> {
  // error can only be something with fromPOD
  const resp = await makeRequest<string>(config.custodianUrl + '/add-claimable', hi.claimableToPOD(claimable));

  if (resp instanceof RequestError) {
    console.error('got request error: ', resp);
    throw resp.message; // needs to throw unfortunately for toaster

    // toast.error(`got request error: ${resp.message}`);
    //	return new Error("could not make request against server: " + resp.message + " : " + resp.statusCode);
  }

  return hi.Acknowledged.claimableFromPOD(resp);
}

export async function getLightningInfo(config: Config): Promise<Docs.LND> {
  const url = `${config.custodianUrl}/inbound-outbound-capacity-lightning/`;
  const resp = await makeRequest<Docs.LND>(url);

  if (resp instanceof RequestError) {
    console.error('got request error: ', resp);
    throw resp.message;
    //toast.error(`got request error: ${resp.message}`);
    //return new Error("could not make request against server: " + resp.message + " : " + resp.statusCode);
  }
  return resp; // what if it is not doc?
}
