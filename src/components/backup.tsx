import React, { useEffect } from 'react';
import { Button, Form, FormGroup, Label, Input, FormText, Row, Col, InputGroup } from 'reactstrap';
import { useState } from 'react';
import { wallet, getAllStatuses } from '../state/wallet';
import { toast } from 'react-toastify';
import * as hi from 'blindmixer-lib';
import Claimed from 'blindmixer-lib/dist/status/claimed';
import { decodeBitcoinAddress } from 'blindmixer-lib';

interface Backup {
  [key: string]: string;
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default function Backup() {
  const [hidden, setHidden] = useState(true);

  // todo: maybe additonal error handling
  const keypairs = { ...localStorage };
  const recoverJSON = (data: Blob) => {
    const fileReader = new FileReader();
    fileReader.readAsText(data, 'UTF-8');
    fileReader.onload = (d) => {
      if (d.target) {
        if (d.target.result) {
          if (typeof d.target.result === 'string') {
            const json = JSON.parse(d.target.result) as Array<Backup>;
            for (const k in json) {
              localStorage.setItem(k, json[k] as any);
            }
            toast.success('Memos recovered correctly!');
          }
        }
      }
    };
  };

  const coinRecovery = () => {
    // everything is deterministic, so we just take all the claim statuses, take the nonces, take the claimable hash, derive the blinded version, derive the unblinded version, push POD.
    const [coins, setCoins] = useState<
      | {
          coin: hi.POD.Coin;
          blindedMessage: string;
          blindedSig: string;
          blindNonce: string;
          keys: string;
          message: string;
          signature: hi.POD.Signature;
          claimableHash: string;
        }[]
      | undefined
    >(undefined);
    const [address, setAddress] = useState<string>('');

    const statuses = getAllStatuses();

    // TODO: only do this when triggered, may take a while to load.
    function handleToTextChange(event: React.ChangeEvent<HTMLInputElement>) {
      setAddress(event.target.value);
    }

    useEffect(() => {
      async function getCoins() {
        await delay(1000);
        if (statuses) {
          let coinArr = [];
          for (let i = 0; i < statuses.length; i++) {
            const element = statuses[i];
            if (element instanceof Claimed) {
              for (let k = 0; k < element.blindedReceipts.length; k++) {
                const blindedMessage = element.claimRequest.coinRequests[k].blindedOwner;
                const blindedSig = element.blindedReceipts[k];
                const blindNonce = element.claimRequest.coinRequests[k].blindingNonce;

                const blindingsecret = wallet.config.deriveBlindingSecret(element.claimableHash, blindNonce);
                const newOwner = wallet.config.deriveOwner(element.claimableHash, element.claimRequest.coinRequests[k].blindingNonce);
                const magnitude = element.claimRequest.coinRequests[k].magnitude;

                const blindKeySet = wallet.config.custodian.blindCoinKeys[wallet.config.custodian.blindCoinKeys.length - element.claimRequest.coinPeriod];

                const signer = blindKeySet[magnitude.n];
                const [u, s] = hi.blindMessage(blindingsecret, blindNonce, signer, newOwner.toPublicKey().buffer);
                if (blindedMessage.toPOD() != s.toPOD()) {
                  throw 'invalid BlindedMessage';
                }

                // quick check to verify blinded and unblinded as validly signed
                // we should probably not do this as it takes a good amount of resources when mapping for 1000+ claims

                if (!blindedSig.verify(blindNonce, blindedMessage.c, signer)) {
                  throw 'invalid blinded sig';
                }
                const coinSig = hi.unblind(u, blindedSig);
                const coin = new hi.Coin(newOwner.toPublicKey(), magnitude, coinSig, element.claimRequest.coinPeriod);
                if (!coin.receipt.verify(newOwner.toPublicKey().buffer, blindKeySet[magnitude.n])) {
                  throw 'invalid unblinded sig'; // impossible
                }

                const priv = hi.PrivateKey.fromBytes(blindingsecret);
                if (priv instanceof Error) {
                  throw priv;
                }

                // just take the address from string...
                const message = hi.Buffutils.fromString(address);
                const signature = hi.Signature.compute(message, newOwner);

                if (!signature.verify(message, newOwner.toPublicKey())) {
                  throw signature;
                }

                coinArr.push({
                  coin: coin.toPOD(),
                  blindedMessage: blindedMessage.toPOD(),
                  blindedSig: blindedSig.toPOD(),
                  blindNonce: blindNonce.toPOD(),
                  keys: priv.toPOD(),
                  message: address,
                  signature: signature.toPOD(),
                  claimableHash: element.claimableHash.toPOD(),
                });
              }
            }
          }
          setCoins(coinArr);
        }
      }

      if (address != '') {
        const decoded = decodeBitcoinAddress(address);
        if (!(decoded instanceof Error) && decoded.network == (wallet.config.custodian.currency === 'tBTC' ? 'testnet' : 'mainnet')) {
          toast.success(`using ${address} to sign!`);
          toast.promise(getCoins(), {
            pending: 'Generating and signing backup!',
            success: 'Coins are ready for download!',
            error: 'Failed to generate backup!',
          });
        }
      }
    }, [address, statuses]); // if address before status, rerender on status (unlikely)

    return (
      <span>
        <hr />
        <p>
          Download a backup which contains all the unblinded and blinded coins and their keys. Note: Only do this when the custodian has been breached! This
          will allow you to prove ownership of the coins.
        </p>
        <Row>
          <Col sm={{ size: 2, offset: 0 }}>
            <p className="address-title">Add your address!</p>
          </Col>
          <Col sm={{ size: 9, offset: 0 }}>
            <InputGroup>
              <Input value={address} onChange={handleToTextChange} type="text" className="to-text-input" required />
            </InputGroup>
            <br />
            <p>This is the address where your recovered funds will be sent to. Please choose it carefully.</p>
            <br />
            <Button
              color="secondary"
              href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(coins))}`}
              download={`${GLOBALS.WALLET_NAME}_coin_recover_${new Date()}.json`}
            >
              Download my coins.
            </Button>
          </Col>
        </Row>
        {<br />} {<br />}
        <p>
          <b>Note:</b> Unlike a seed, you will need to continuously back up new coins. Subsequently, anyone with these keys will be able to link your in and
          outputs together. Already-spent coins will be included.
        </p>
      </span>
    );
  };

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target != null && event.target.files != null) {
      toast.success('Upload successful!');
      recoverJSON(event.target.files[0]);
    }
  }

  return (
    <div>
      <h5 className="main-header">Backup</h5>
      <div className="inner-container">
        <p>A sufficient backup consists of your wallet mnemonic and the right custodian URL. (and optionally, if applicable, the original password.) </p>
        <span>
          {hidden ? '' : <pre style={{ height: '4vw' }}>{JSON.stringify(wallet.config.toDoc().mnemonic, null, 2)}</pre>}{' '}
          {hidden ? (
            <Button color="secondary" onClick={() => setHidden(false)}>
              Show me my mnemonic!
            </Button>
          ) : (
            <Button color="secondary" onClick={() => setHidden(true)}>
              Hide my mnemonic!
            </Button>
          )}
        </span>
        {<br />} {<br />}
        <p>Custodian URL:</p>
        <span>
          <pre>{JSON.stringify(wallet.config.toDoc().custodianUrl, null, 2)}</pre>
        </span>
        <span>
          <p>
            Download a backup which contains all the wallet-specific user-specified data, which you can use to recover your memos in the event of data loss or
            other failure.
          </p>
          <Button
            color="secondary"
            href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(keypairs))}`}
            download={`${GLOBALS.WALLET_NAME}_memos_${new Date()}.json`}
          >
            Download my Memos.
          </Button>
          {<br />} {<br />}
          <p>
            <b>Note:</b> A single backup is sufficient for all the wallets used <b>only</b> on this particular browser. Unlike a seed, you will need to
            continuously back up new memos.
          </p>
        </span>
        {coinRecovery()}
        <span>
          <Form>
            <FormGroup>
              <Label for="uploadMemos">Recover my local storage</Label>
              <Input type="file" name="file" id="uploadMemos" onChange={handleFileUpload} />
              <FormText color="muted">Please upload the JSON backup of your Localstorage.</FormText>
            </FormGroup>
          </Form>
        </span>
        {<br />} {<br />}
        <a href={`https://blindmixer.com/faq/`} target="_blank" rel="noreferrer">
          Frequently Asked Questions
        </a>
      </div>
    </div>
  );
}
