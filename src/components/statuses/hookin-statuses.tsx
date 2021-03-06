import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Col, Row } from 'reactstrap';
import CopyToClipboard from '../../util/copy-to-clipboard';
import * as mp from 'blindmixer-lib';
import { useClaimableStatuses, wallet } from '../../state/wallet';
import Claimed from 'blindmixer-lib/dist/status/claimed';
import HookinAccepted from 'blindmixer-lib/dist/status/hookin-accepted';

type HookinProps = {
  created: Date;
  claimableHash: string;
  claimable: mp.Hookin & Partial<mp.Acknowledged.Claimable>;
};

export default function HookinStatuses(props: HookinProps) {
  const [currentConsolidationFee, setCurrentConsolidationFee] = useState(0);
  const [currentFee, setCurrentFee] = useState(0); // we can merge this with consolidation fee, but might be nice for people to know the difference?

  const claimable = props.claimable.toPOD();
  const statuses = useClaimableStatuses(props.claimableHash);
  const [memo, setMemo] = useState<undefined | string>(undefined);
  // should fix double claim for now
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const getData = async (): Promise<void> => {
      if (statuses) {
        for (const s of statuses) {
          if (s instanceof HookinAccepted) {
            setCurrentConsolidationFee(s.consolidationFee);
          }
          if (s instanceof Claimed) {
            setCurrentFee(s.claimRequest.fee);
          }
        }
        if (props.claimable instanceof mp.Acknowledged.default) {
          if (!statuses.some((status) => status instanceof HookinAccepted)) {
            await wallet.requestStatuses(props.claimableHash);
          } else {
            if (!statuses.some((status) => status instanceof Claimed)) {
              if (!loading) {
                setLoading(!loading);
                await wallet.claimClaimable(props.claimable);
              }
            }
          }
        } else {
          // wallet.acknowledgeClaimable(props.claimable);
        }
      }
    };
    const fetchedMemo = localStorage.getItem(claimable.bitcoinAddress);
    if (fetchedMemo) {
      setMemo(fetchedMemo);
    }
    getData();
  }, [claimable, statuses]); // I think not updating because it's unacked is only an issue with hookins..? invoice is always acked, OK, we could have a transfer edge-case where it's not acked at first (different feerate?!)

  const GetStatuses = () => {
    if (!statuses) {
      return <span> Loading Statuses...</span>;
    }
    if (props.claimable instanceof mp.Acknowledged.default) {
      if (statuses.some((status) => status instanceof HookinAccepted)) {
        if (statuses.some((status) => status instanceof Claimed)) {
          return (
            <a href="#status" className="btn btn-outline-success status-badge">
              Hookin accepted and claimed!
            </a>
          );
        } else if (mp.computeClaimableRemaining(props.claimable.contents, statuses) === 0) {
          return (
            <a href="#status" className="btn btn-outline-warning status-badge">
              Custodian has accepted the hookin but the fees are greater than its value. It's worthless!
            </a>
          );
        } else {
          return (
            <a href="#status" className="btn btn-outline-primary status-badge">
              Custodian has accepted the hookin but we haven't claimed it!
            </a>
          );
        }
      } else {
        return (
          <a href="#status" className="btn btn-outline-primary status-badge">
            Custodian has not yet accepted the hookin!
          </a>
        );
      }
    } else {
      return (
        <a href="#status" className="btn btn-outline-danger status-badge">
          Custodian is not aware of the hookin!
        </a>
      );
    }
  };

  const txid =
    wallet.config.custodian.currency === 'tBTC' ? `https://blockstream.info/testnet/tx/${claimable.txid}` : `https://blockstream.info/tx/${claimable.txid}`;

  return (
    <div>
      <h5>
        <i className="fad fa-arrow-from-top" /> Hookin
      </h5>
      <div className="inner-container">
        <GetStatuses />
        <br /> &nbsp;
        <Row>
          <Col sm={{ size: 2, offset: 0 }}>
            <p className="address-title">Address: </p>
          </Col>
          <Col sm={{ size: 8, offset: 0 }}>
            <div className="claimable-text-container">
              {claimable.bitcoinAddress}
              <CopyToClipboard className="btn btn-light" style={{}} text={claimable.bitcoinAddress}>
                <i className="fa fa-copy" />
              </CopyToClipboard>
            </div>
          </Col>
        </Row>
        <Row>
          <Col sm={{ size: 2, offset: 0 }}>
            <p className="address-title">Transaction ID: </p>
          </Col>
          <Col sm={{ size: 8, offset: 0 }}>
            <div className="claimable-text-container">
              <a href={txid} target="_blank" rel="noreferrer">
                {' '}
                {claimable.txid}
              </a>
              <CopyToClipboard className="btn btn-light" style={{}} text={claimable.txid}>
                <i className="fa fa-copy" />
              </CopyToClipboard>
            </div>
          </Col>
        </Row>
        <Row>
          <Col sm={{ size: 2, offset: 0 }}>
            <p className="address-title">Amount: </p>
          </Col>
          <Col sm={{ size: 8, offset: 0 }}>
            <div className="claimable-text-container">
              {`${claimable.amount - currentFee} sat`}
              {/* <CopyToClipboard className="btn btn-light" style={{}} text={claimable.amount.toString()}>
                <i className="fa fa-copy" />
              </CopyToClipboard> */}
            </div>
          </Col>
        </Row>
        <Row>
          <Col sm={{ size: 2, offset: 0 }}>
            <p className="address-title">ConsolidationFee: </p>
          </Col>
          <Col sm={{ size: 8, offset: 0 }}>
            <div className="claimable-text-container">
              {`${currentConsolidationFee} sat`}

              {/* <CopyToClipboard className="btn btn-light" style={{}} text={CurrentConsolidationFee.toString()}>
                <i className="fa fa-copy" />
              </CopyToClipboard> */}
            </div>
          </Col>
        </Row>
        {statuses && statuses.some((status) => status instanceof Claimed && status.claimRequest.fee != 0) === false ? (
          <Row>
            <Col sm={{ size: 2, offset: 0 }}>
              <p className="address-title">Anti-Cheating Fee: </p>
            </Col>
            <Col sm={{ size: 8, offset: 0 }}>
              <div className="claimable-text-container">
                {`${currentFee} sat`}

                {/* <CopyToClipboard className="btn btn-light" style={{}} text={CurrentConsolidationFee.toString()}>
          <i className="fa fa-copy" />
        </CopyToClipboard> */}
              </div>
            </Col>
          </Row>
        ) : undefined}
        {memo != undefined ? (
          <Row>
            <Col sm={{ size: 2, offset: 0 }}>
              <p className="address-title">Memo: </p>
            </Col>
            <Col sm={{ size: 8, offset: 0 }}>
              <div className="claimable-text-container">{memo}</div>
            </Col>
          </Row>
        ) : undefined}
        <Row>
          <Col sm={{ size: 2, offset: 0 }}>
            <p className="address-title">Created: </p>
          </Col>
          <Col sm={{ size: 8, offset: 0 }}>
            <div className="claimable-text-container">{props.created.toString()}</div>
          </Col>
        </Row>
        {claimable.amount < currentConsolidationFee ? (
          <Row>
            <Col sm={{ size: 8, offset: 0 }}>
              <div className="claimable-text-container">
                {' '}
                <a href="#status" className="btn btn-outline-danger status-badge">
                  the fees for this Hookin are greater than the inputs itself! It's worthless!{' '}
                </a>
              </div>
            </Col>
          </Row>
        ) : undefined}
      </div>
    </div>
  );
}
