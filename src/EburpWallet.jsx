// Completed collections use display metadata rather than the active-hunt
// registry. Only the source-matched core participates in this catalogue, and
// the metadata-only import avoids loading the full archival image collection.
import WalletPage from './WalletPage';
import catalogue from './eburpWalletCatalogue.json';

export default function EburpWallet(props) {
  return <WalletPage {...props} extraCatalogue={catalogue.artifacts} extraExpeditions={catalogue.expeditions}
    nonTradingEthscriptionIds={catalogue.nonTradingEthscriptionIds} />;
}
