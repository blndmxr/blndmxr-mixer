import React from 'react';
// @ts-ignore
import { TheQr } from '@the-/ui-qr';
import { Button, Row, Col, UncontrolledCollapse, InputGroup, Input } from 'reactstrap';
import * as Docs from '../../wallet/docs';
import { wallet, useUnusedBitcoinAddress, useHookinsOfAddress } from '../../state/wallet';
import CopyToClipboard from '../../util/copy-to-clipboard';
import { toast } from 'react-toastify';
import HookinsTable from '../tables/hookins-table';

// this is getting a bit crazy - we now have /receive/ /addresses/ /hookins/ all displaying hookin-tables
function RenderAddress({ address: addressDoc }: { address: Docs.BitcoinAddress }) {
  const hookins = useHookinsOfAddress(addressDoc.address) || [];

  return hookins.length >= 1 ? (
    <div>
      <hr />
      <HookinsTable hookins={hookins} />
    </div>
  ) : null;
}

function show(addressDoc: Docs.BitcoinAddress) {
  let memo: string | undefined;
  const fetchedMemo = localStorage.getItem(addressDoc.address);
  if (fetchedMemo) {
    memo = fetchedMemo;
  }
  function PushMemo(memo: string | undefined) {
    if (memo) {
      localStorage.setItem(addressDoc.address, memo);
      toast.success('Memo saved!');
    }
  }

  // duplicate function from  /bitcoin-address-info/
  function check() {
    const hasDeposit = wallet.checkBitcoinAddress(addressDoc);

    hasDeposit.then((a) => !a && toast.info('No Deposits found!'));
  }

  return (
    <div>
      <h5 className="main-header">Receive</h5>
      <div className="inner-container">
        <div className="qr-code-wrapper">
          <div className="qr-code-container">
            <span>
              <TheQr text={addressDoc.address.toUpperCase()} />
            </span>
          </div>
        </div>
        <Row>
          <Col sm={{ size: 2, offset: 0 }}>
            <p className="address-title">Address:</p>
          </Col>
          <Col sm={{ size: 8, offset: 0 }}>
            <div className="address-text-container">
              <code>{addressDoc.address}</code>{' '}
              <CopyToClipboard className="btn btn-light" style={{}} text={addressDoc.address}>
                <i className="fa fa-copy" />
              </CopyToClipboard>
            </div>
          </Col>
        </Row>
        <div className="text-container">
          <p className="text-muted">
            <span>
              <i className="fa fa-info-circle" />{' '}
            </span>
            After N confirmations, funds will be usable.
          </p>
        </div>
        {/* {wallet.config.custodian.wipeDate  && (new Date(wallet.config.custodian.wipeDate) < new Date(Date.now() + 48*60*60*1000)) && (
                <div className="text-container">
                <p >
                  <span>
                  <i className="fad fa-exclamation-triangle" />{' '}
                  </span>
                  The custodian will wipe in less than two days or has already wiped. Please do not deposit any more funds!
                </p>
              </div>
        )  } */}
        <Button color="secondary" onClick={check}>
          Check
        </Button>{' '}
        <Button color="secondary" id="addMemo">
          Add memo
        </Button>
        <UncontrolledCollapse toggler="addMemo">
          <br />
          <Row>
            <Col sm={{ size: 2, offset: 0 }}>
              <p className="address-title">Add memo to deposit address:</p>
            </Col>

            <Col sm={{ size: 9, offset: 0 }}>
              <InputGroup>
                <Input
                  defaultValue={memo ? memo : 'Memo'}
                  onChange={(e) => {
                    memo = e.target.value;
                  }}
                  type="text"
                  className="to-text-input"
                />
              </InputGroup>
              <br />
              <Button color="primary" onClick={() => PushMemo(memo)}>
                Save!
              </Button>
            </Col>
          </Row>
        </UncontrolledCollapse>
        <RenderAddress address={addressDoc} />
      </div>
    </div>
  );
}

export default function Receive() {
  const address = useUnusedBitcoinAddress();

  if (address === undefined) {
    return <p>Loading...</p>;
  }

  return show(address);
}
