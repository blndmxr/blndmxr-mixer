import React, { useEffect } from 'react';

import BitcoinAddressInfo from './tables/bitcoin-address-info';
import ReceiveBitcoin from './receive/receive';
import { BrowserRouter, HashRouter as Router, Route, Switch, RouteComponentProps, Redirect } from 'react-router-dom';

import Send from './send/send';
import Hookins from './tables/hookins';
import Addresses from './tables/addresses';
import Coins from './tables/coins';
import Config from './config';
import Hookouts from './tables/hookouts';
import TopBar from './navigation/top-bar';
import Navbar from './navigation/navbar';
import Footer from './navigation/footer';
import Page from './page';
import useWindowSize from '../window-size';
import Transactions from './transactions/transactions';
import ClaimableInfo from './statuses/claimable-info';
import LightningInvoice from './statuses/lightning-invoice-statuses';
import Support from './support';
import ReceiveLightning from './receive/lightning';
import FeebumpSend from './send/feebump-send';
import Backup from './backup';
import Settings from './settings';
import Faq from './faq';
import Invoices from './tables/invoices';
import Payments from './tables/payments';
import { wallet } from '../state/wallet';
import { toast, ToastContainer } from 'react-toastify';
import makeRequest from '../wallet/requests/make-request';
import getCustodianInfo from '../wallet/requests/get-custodian-info';
import { CustodianInfo } from 'blindmixer-lib';

function NoMatch(params: RouteComponentProps<any>) {
  return (
    <div>
      <h3>
        No match for <code>{params.location.pathname}</code>
      </h3>
    </div>
  );
}

//const Router: any = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

export default function LoadedApp() {
  let windowSize = useWindowSize();
  // console.log('window size is: ', windowSize);
  let mobileView = windowSize.innerWidth < 576;

  useEffect(() => {
    (async () => {
      // automatically acked
      const custodian = await getCustodianInfo(`${wallet.config.custodianUrl}/#${wallet.config.custodian.acknowledgementKey.toPOD()}`);
      if (custodian instanceof Error || custodian instanceof CustodianInfo) {
        toast.error("Can't fetch new custodian keys");
        throw custodian;
      }

      if (wallet.config.custodian.blindCoinKeys.length < custodian.ci.blindCoinKeys.length) {
        // check if our local copy matches custodians new old keys

        // this is easier?
        const localOldestFirst = [...wallet.config.custodian.blindCoinKeys].reverse(); // don't mutate
        const newOldestFirst = [...custodian.ci.blindCoinKeys].reverse();

        for (let i = 0; i < wallet.config.custodian.blindCoinKeys.length; i++) {
          const localOldKeys = localOldestFirst[i];
          const newOldFetchedKeys = newOldestFirst[i];
          // check all individual keys
          for (let k = 0; k < localOldKeys.length; k++) {
            const localOldKey = localOldKeys[k];
            const newOldKey = newOldFetchedKeys[k];

            if (localOldKey.toPOD() != newOldKey.toPOD()) {
              toast.error('custodian fed invalid old keys');
              throw `custodian fed invalid/incorrect old keys ${localOldKey.toPOD()} while the custodian gives us ${newOldKey.toPOD()}`;
            }
          }
        }
        // push new signature, push new blinded coin keys, assume they are valid
        wallet.config.custodian.blindCoinKeys = custodian.ci.blindCoinKeys;
        const walletConfig = await wallet.db.get('config', 1);
        if (!walletConfig) {
          return new Error('Invalid config?');
        }
        walletConfig.custodian.blindCoinKeys = custodian.ci.blindCoinKeys.map((ck) => ck.map((c) => c.toPOD()));
        walletConfig.sig = custodian.sigP.toPOD();
        walletConfig.pubkey = custodian.ephemeral.toPOD(); // didnt store the new key...
        wallet.db.put('config', walletConfig);
        toast.success('Updated your signing keys!');
      }
    })();

    (async () => {
      const response = (await makeRequest(`${wallet.config.custodianUrl}/tor-check`)) as boolean;

      response ? toast.success("It looks like you're using tor!") : toast.error("Are you sure you're using TOR? You might miss out on additional privacy.");
    })();
  }, []);

  return (
    <Router>
      <div className="App-wrapper">
        <TopBar isMobile={mobileView} />
        {!mobileView ? <Navbar isMobile={mobileView} /> : ''}
        <div className="main-container">
          <ToastContainer theme="colored" autoClose={5000} />
          <Switch>
            <Route path="/create-wallet" exact render={() => <Redirect to="/" />} />
            <Route path="/" exact component={() => <Transactions isMobile={mobileView} />} />
            <Route path="/receive" exact component={ReceiveBitcoin} />
            <Route path="/backup" exact component={Backup} />
            <Route path="/faq" exact component={Faq} />
            <Route path="/receive/lightning" exact component={ReceiveLightning} />
            <Route path="/addresses/:address" component={BitcoinAddressInfo} />
            <Route path="/addresses" component={Addresses} />
            <Route path="/send" exact component={Send} />
            <Route path="/feebump-send" exact component={FeebumpSend} />
            <Route path="/claimables/:hash" component={ClaimableInfo} />
            <Route path="/lightning-invoice/:hash" component={LightningInvoice} />
            <Route path="/hookins" component={Hookins} />
            <Route path="/invoices" component={Invoices} />
            <Route path="/payments" component={Payments} />
            <Route path="/hookouts" component={Hookouts} />
            <Route path="/coins" component={Coins} />
            <Route path="/config" component={Config} />
            <Route path="/settings" exact component={Settings} />
            {/* <Route path="/contact" render={props => <Page {...props} page="Contact" />} /> */}
            <Route path="/support" render={(props) => <Support />} />
            <Route component={NoMatch} />
          </Switch>
          {!mobileView ? (
            <div className="App-footer">
              <Footer />
            </div>
          ) : (
            ''
          )}
        </div>
        {mobileView ? <Navbar isMobile={mobileView} /> : ''}
      </div>
    </Router>
  );
}
