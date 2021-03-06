import React, { useState } from 'react';
import * as bip39 from '../../bip39';
import WalletDatabase from '../../wallet/database';
import { setWallet } from '../../state/wallet';
import { Button, Form, FormGroup, Label, Input, Col, UncontrolledCollapse } from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import LeftPanel from './left-panel';
import { Link } from 'react-router-dom';

// they can reverse-proxy if they want to/should?
const defaultCustodian = `https://mainnet.blindmixer.com/#pubmp1qv83cyx8m8acc4j86j6g5rdyd30g0rszh2ahed2g5gxemgnyzc69v8z0daw`;

export default function CreateWallet(props: any & { isMobile: boolean }) {
  const [walletName, setWalletName] = useState('main');

  const [custodianUrl, setCustodianUrl] = useState(defaultCustodian);
  const [password, setPassword] = useState('');
  const [seed, setSeed] = useState(bip39.generateMnemonic());

  async function createWallet() {
    const db = await WalletDatabase.create(walletName, custodianUrl, seed, password);
    if (db instanceof Error) {
      console.error(db);
      toast.error('Oops! ' + db.message);
      return;
    }
    setWallet(db);
    props.setIsWalletSet(true);
    console.log('wallet created: ', walletName);
  }
  return (
    <div className="full-page-container">
      <ToastContainer theme="colored" autoClose={5000} />
      <LeftPanel isMobile={props.isMobile} />
      <div className="full-page-right-side">
        <h3 className="main-heading">Create New Wallet</h3>
        <Form>
          <FormGroup row>
            <Label for="walletName" sm={4}>
              Name
            </Label>
            <Col sm={{ size: 8, offset: 0 }}>
              <Input value={walletName} onChange={(e) => setWalletName(e.target.value)} placeholder="Name" type="text" name="walletName" required />
            </Col>
          </FormGroup>
          <FormGroup row>
            <Label for="custodianUrl" sm={4}>
              Custodian URL:
              <br />
              <small id="toggler">What is this?</small>
            </Label>
            <Col sm={{ size: 8, offset: 0 }}>
              <Input value={custodianUrl} name="custodianUrl" onChange={(e) => setCustodianUrl(e.target.value)} list="default=custodian-urls" />
              {/* TODO: */}
              <datalist id="default=custodian-urls">
                <option value="https://mainnet.blindmixer.com/#pubmp1qv83cyx8m8acc4j86j6g5rdyd30g0rszh2ahed2g5gxemgnyzc69v8z0daw" />
                <option value="https://testnet.blindmixer.com/#pubmp1qf98kxatpw43mqjft6j72dps5wn66yzp47k3zm0yn4skhedv32x5sphklj2" />
              </datalist>
            </Col>
            <UncontrolledCollapse toggler="#toggler">
              <p className="custodian-url-text">The custodian URL is used to connect to the server that is responsible of managing your funds.</p>
            </UncontrolledCollapse>
          </FormGroup>
          <FormGroup row>
            <Label for="password" sm={4}>
              Password
            </Label>
            <Col sm={{ size: 8, offset: 0 }}>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" name="password" />
            </Col>
          </FormGroup>

          <FormGroup row>
            <Col className="submit-button-container">
              <Button color="success" className="btn-blindmixer" onClick={createWallet}>
                Create Wallet
              </Button>
            </Col>
          </FormGroup>
        </Form>
        <p>
          Already have a wallet? <Link to="/restore">Restore </Link>
        </p>
      </div>
    </div>
  );
}
