import React, { useState, useEffect } from 'react';
import * as hi from 'blindmixer-lib';
import { wallet, useBalance } from '../../state/wallet';
import { Row, Button, Form, FormGroup, Label, Input, Col, InputGroup } from 'reactstrap';
import { toast } from 'react-toastify';
import getFeeSchedule, { FeeScheduleResult, getDynamicFeeRate } from '../../wallet/requests/get-fee-schedule';
import FetchTx, { AddressInfoTx } from '../../wallet/requests/bitcoin-txs';
import { RouteComponentProps } from 'react-router-dom';
import { RequestError } from '../../wallet/requests/make-request';

import fetchTxReceives from '../../wallet/requests/bitcoin-txs';

interface ctx {
  currentTxid: string | undefined;
}

export default function FeebumpSend(props: RouteComponentProps<{}, any, ctx>): JSX.Element {
  const [toText] = useState<undefined | string>(props.history.location.state ? props.history.location.state.currentTxid : undefined);
  const balance = useBalance();
  const [localCalculatedFee, setLocalCalculatedFee] = useState<number | string | undefined>(undefined);
  const [confTarget, setConfTarget] = useState<string>('6'); // 6 is default immediate.

  const [fetchedWeight, setFetchedWeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    async function getResponse() {
      if (toText && confTarget) {
        setLocalCalculatedFee(await calculateFee(await fetchTxReceives(toText)));
      }
    }
    toast.promise(getResponse(), {
      pending: 'Fetching and calculating fees!',
      success: 'Received new fees!',
      error: 'Could not receive new fees!',
    });
  }, [confTarget, toText]);

  // we should check bytes rather than inputs/outputs, but this'll do somewhat.

  let sendType = ((): { kind: 'empty' } | { kind: 'error'; message: string } | { kind: 'txid' } => {
    if (toText === undefined) {
      return { kind: 'empty' };
    }

    let decodedtxid = toText;
    if (decodedtxid.length === 64) {
      return { kind: 'txid' };
    } else return { kind: 'error', message: 'not a valid txid.' };
  })();

  async function calculateFee(Response: RequestError | AddressInfoTx): Promise<number | string> {
    if (Response instanceof RequestError) {
      return `unable to fetch transaction ${Response.message}`;
    }
    if (!Number.isFinite(Number(confTarget)) || Number(confTarget) <= 0) {
      // toast.error("invalid blockTarget");
      return 'Not a valid confTarget';
    }

    const { vin, vout, status, fee, weight } = Response;
    const fees = await getDynamicFeeRate(wallet.config, Number(confTarget));
    if (fees instanceof RequestError) {
      return fees.message;
    }
    setFetchedWeight(weight);

    if (status.confirmed) {
      return 'Invalid TX | TXID already confirmed';
    }
    for (let index = 0; index < vin.length; index++) {
      const sequence = vin[index];

      // needs to be lower than 0xfffffffe
      if (!(sequence.sequence < parseInt('0xfffffffe', 16))) {
        return 'Not flagging for RBF';
      }
    }

    const amount = Math.round(fees * weight) - fee;
    // It seems like feebump increase is by default 5 sat/b ? todo: check this
    const minFee = (Response.weight / 4) * 5;
    if (amount < minFee) {
      return Math.round(minFee);
    }
    return Math.round(amount);
  }

  async function send() {
    const amount = localCalculatedFee;
    if (!amount || typeof amount == 'string') {
      toast.error('invalid amount');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('invalid amount');
      return;
    }
    if (balance < amount) {
      throw new Error('trying to send a larger amount than we actually have coins for, will not work');
    }

    const txid = hi.Buffutils.fromHex(toText, 32);
    if (txid instanceof Error) {
      throw txid;
    }
    let transferHash;
    {
      transferHash = await wallet.sendFeeBump(txid, 0, amount, Number(confTarget));
    }

    // current intended behaviour: push user to failed claimable???! TODO

    if (typeof transferHash === 'string') {
      //toast.error("Oops! " + transferHash);
      return;
    }

    props.history.push(`/claimables/${transferHash.toPOD()}`);
  }

  function handleConfTargetChange(event: React.ChangeEvent<HTMLInputElement>) {
    setConfTarget(event.target.value);
    // reset UI
    setFetchedWeight(undefined);
    setLocalCalculatedFee(undefined);
  }
  // const maxAmount = balance; // TODO: Reduce the tx fee

  if (!toText) {
    return (
      <div>
        <h5 className="main-header">Feebump!</h5>
        <div className="inner-container">No txid found</div>
      </div>
    );
  }

  return (
    <div>
      <h5 className="main-header">Feebump!</h5>
      <div className="inner-container">
        <Form>
          <FormGroup row className="bordered-form-group">
            <Label for="toText" sm={3}>
              Transaction ID:
            </Label>
            <Col sm={{ size: 9, offset: 0 }}>
              <InputGroup>
                <Input value={toText == undefined ? '' : toText} type="text" className="to-text-input" required disabled />
              </InputGroup>
            </Col>
          </FormGroup>

          {sendType.kind === 'error' ? <p>Error: {sendType.message}</p> : undefined}
          <p>
            <b>Expected Fee:</b> {localCalculatedFee && typeof localCalculatedFee == 'number' ? localCalculatedFee + ' sat' : localCalculatedFee}
          </p>
          <FormGroup row className="bordered-form-group">
            <Label for="toText" sm={3}>
              Confirm within:
            </Label>
            <Col sm={{ size: 12, offset: 1 }} md={{ size: 9, offset: 0 }}>
              <InputGroup>
                <Input value={confTarget} onChange={handleConfTargetChange} /> {/*// e => setFeetext(e.targe.value) */}
                {/* )} */}
                <div className="input-group-append">
                  <span className="input-group-text">confTarget</span>
                </div>
              </InputGroup>
            </Col>
          </FormGroup>
          <FormGroup row>
            <Col className="submit-button-container">
              <Button
                id="AppSendButton"
                color="success"
                className="btn-blindmixer"
                onClick={() => {
                  send();
                  disableAfterClick();
                }}
              >
                Send
              </Button>
            </Col>
          </FormGroup>
          {localCalculatedFee && typeof localCalculatedFee == 'number' && fetchedWeight && (
            <Label>
              {fetchedWeight > 561 + 200
                ? 'Please note: You will most likely pay a disproportionate amount of money for this feebump.'
                : "It seems like this tx has a limited amount of inputs/outputs. You'll likely pay a fair share!"}
            </Label>
          )}
        </Form>
      </div>
    </div>
  );
}
// this should prevent accidental double clicks. Not sure if this is most ideal. (Will be gone on refresh.)
function disableAfterClick() {
  return ((document.getElementById('AppSendButton') as HTMLInputElement).disabled = true);
}
