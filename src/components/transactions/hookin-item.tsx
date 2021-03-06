import React from 'react';
import { Link } from 'react-router-dom';
import * as mp from 'blindmixer-lib';
import HookinAccepted from 'blindmixer-lib/dist/status/hookin-accepted';

import * as Docs from '../../wallet/docs';
import Timeago from '../../util/timeago';

type Props = {
  statuses: mp.Status[] | undefined;
  claimable: Docs.Claimable;
  isMobile: boolean;
};

export default function HookinItem({ claimable, statuses, isMobile }: Props) {
  if (claimable.kind !== 'Hookin') {
    throw new Error('hookin expected');
  }
  const fetchedMemo = localStorage.getItem(claimable.bitcoinAddress);

  let status = 'pending confs';
  if (statuses === undefined) {
    status = '';
  } else {
    for (const s of statuses) {
      if (s instanceof HookinAccepted) {
        status = 'confirmed';
      }
    }
  }

  return (
    <Link to={`claimables/${claimable.hash}`} className="transaction-card Hookin">
      {isMobile ? undefined : (
        <div className="text-muted">
          <Timeago date={claimable.created} />
        </div>
      )}

      <div>
        <span className="fa-stack">
          <i className="fas fa-circle fa-stack-2x" />
          <i className={'fad fa-stack-1x fa-inverse fa-arrow-down'} />
        </span>
        <span>
          Bitcoin Deposit
          <br /> ( {isMobile ? fetchedMemo : claimable.bitcoinAddress} ){' '}
        </span>
      </div>
      <div>{claimable.amount} satoshis</div>
      <div>{status}</div>
    </Link>
  );
}
