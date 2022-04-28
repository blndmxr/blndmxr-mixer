import React from 'react';

export default function Support() {
  return (
    <div>
      <h5>Support</h5>
      <div className="inner-container">
        <p>
          You might find the support you need on the official website's{' '}
          <a href={'https://blindmixer.com/faq/'} target="_blank" rel="noreferrer">
            Frequently Asked Questions
          </a>
          .
        </p>
        {GLOBALS.WALLET_NAME != 'blindmixer' && (
          <p>
            This wallet is ran by {GLOBALS.WALLET_NAME} but the custodian is operated by blindmixer. For questions about fees you can contact us{' '}
            <a href={`https://${GLOBALS.WALLET_NAME}.com`} target="_blank" rel="noreferrer">
              Here
            </a>
            .
          </p>
        )}
        {/* <p>
          If you still need support, please e-mail us at{' '}
          <a href="mailto:email?Subject=Support%20Request">email</a>
        </p>
        <small>Please only use this email for support requests related to the functionality of the wallet.</small> */}
      </div>
    </div>
  );
}
