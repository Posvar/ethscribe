import { useEffect, useMemo, useState } from 'react';
import { fetchMarketStatus } from './marketApi';
import { MARKET_ADDRESS } from './marketConfig';
import {
  buildDepositTransaction,
  friendlyTransactionError,
  hasDepositSelectorCollision,
  simulateAndSendTransaction,
  waitForTransactionReceipt,
} from './marketTransactions';
import {
  buildCreateEthscriptionTransaction,
  buildFindingAssignment,
  buildWrapperChecks,
  CANONICAL_XPM_MEDIA_TYPE,
  checkExpeditionTarget,
  checkProtocolExistence,
  inspectFile,
  mediaTypeForFile,
  publishFinding,
  signFindingAssignment,
  waitForEthscriptionRecord,
  waitForVerifiedCustody,
  XPM_MEDIA_TYPE_CANDIDATES,
} from './ethscriptionCreation';

function ArrowIcon() {
  return <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 4l5 5-5 5" /></svg>;
}

function short(value, start = 10, end = 8) {
  return value ? `${value.slice(0, start)}…${value.slice(-end)}` : '—';
}

function targetMediaType(artifact) {
  if (artifact?.format === 'XPM') return CANONICAL_XPM_MEDIA_TYPE;
  if (artifact?.format === 'PNG') return 'image/png';
  if (artifact?.format === 'ICO') return 'image/x-icon';
  return '';
}

function earliestExisting(results) {
  return results
    .filter((result) => result.exists && result.ethscription)
    .sort((left, right) => {
      const blockDifference = Number(left.ethscription.block_number) - Number(right.ethscription.block_number);
      if (blockDifference !== 0) return blockDifference;
      return Number(left.ethscription.transaction_index || 0) - Number(right.ethscription.transaction_index || 0);
    })[0] || null;
}

function StatusBanner({ phase, message, transactionHash }) {
  if (!phase || phase === 'idle') return null;
  return (
    <div className={`ethscribe-flow-status flow-${phase}`} role="status">
      <span>{phase.replaceAll('-', ' ').toUpperCase()}</span>
      <strong>{message}</strong>
      {transactionHash && <a href={`https://etherscan.io/tx/${transactionHash}`} target="_blank" rel="noreferrer">View transaction <ArrowIcon /></a>}
    </div>
  );
}

export default function EthscribeWorkbench({
  mode = 'personal',
  artifact = null,
  submissionTargets = [],
  account,
  chainId,
  connectWallet,
  switchToMainnet,
  provider,
}) {
  const embeddedTargetMode = mode === 'target';
  const [selectedTargetId, setSelectedTargetId] = useState(artifact?.id || '');
  const activeArtifact = artifact || submissionTargets.find((target) => target.id === selectedTargetId) || null;
  const submissionMode = Boolean(activeArtifact);
  const lockedMediaType = embeddedTargetMode ? targetMediaType(artifact) : '';
  const [file, setFile] = useState(null);
  const [mediaType, setMediaType] = useState(lockedMediaType || 'application/octet-stream');
  const [inspection, setInspection] = useState(null);
  const [duplicateChecks, setDuplicateChecks] = useState([]);
  const [existing, setExisting] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [ethscription, setEthscription] = useState(null);
  const [custody, setCustody] = useState(null);
  const [market, setMarket] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [claimSummary, setClaimSummary] = useState(artifact ? `Exact-byte candidate for ${artifact.filename}` : '');
  const [sourceUrl, setSourceUrl] = useState('');
  const [finding, setFinding] = useState(null);
  const [targetCheck, setTargetCheck] = useState(null);

  useEffect(() => {
    if (!submissionMode) return undefined;
    let active = true;
    fetchMarketStatus().then((nextMarket) => {
      if (active) setMarket(nextMarket);
    }).catch(() => {
      if (active) setMarket(null);
    });
    return () => { active = false; };
  }, [submissionMode]);

  const onMainnet = chainId?.toLowerCase() === '0x1';
  const targetEligible = Boolean(activeArtifact && targetCheck?.targetId === activeArtifact.id && targetCheck.eligible);
  const rawMatchesTarget = !submissionMode || targetEligible;
  const existingRecord = existing?.ethscription || null;
  const existingOwner = existingRecord?.current_owner?.toLowerCase();
  const connectedOwner = account?.toLowerCase();
  const existingOwnedByWallet = Boolean(existingOwner && connectedOwner && existingOwner === connectedOwner);
  const selectedEthscriptionId = ethscription?.transaction_hash || existingRecord?.transaction_hash || '';
  const busy = ['inspecting', 'creating', 'indexing', 'depositing', 'reconciling', 'signing'].includes(phase);

  const effectiveInspection = useMemo(() => {
    if (!inspection || !existing) return inspection;
    return {
      ...inspection,
      mediaType: existing.mediaType,
      dataUriPrefix: existing.dataUriPrefix,
      protocolContentSha256: existing.protocolContentSha256,
    };
  }, [existing, inspection]);

  const compatibleTargets = useMemo(() => {
    if (!effectiveInspection || embeddedTargetMode) return [];
    return submissionTargets.filter((target) => {
      if (target.status === 'secured') return false;
      if (targetMediaType(target) !== effectiveInspection.mediaType) return false;
      return true;
    });
  }, [effectiveInspection, embeddedTargetMode, submissionTargets]);
  const requiredTargetPrefix = activeArtifact ? `data:${targetMediaType(activeArtifact)};base64,` : '';
  const wrapperMatchesTarget = !submissionMode || effectiveInspection?.dataUriPrefix === requiredTargetPrefix;

  const resetAnalysis = () => {
    setInspection(null);
    setDuplicateChecks([]);
    setExisting(null);
    setEthscription(null);
    setCustody(null);
    setFinding(null);
    setTargetCheck(null);
    if (!artifact) setSelectedTargetId('');
    setPhase('idle');
    setMessage('');
    setTransactionHash('');
    setConfirmation('');
    setConfirmed(false);
  };

  const chooseFile = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    if (!lockedMediaType && nextFile) setMediaType(mediaTypeForFile(nextFile));
    resetAnalysis();
  };

  const inspectExactBytes = async (event) => {
    event.preventDefault();
    if (!file) return;
    setPhase('inspecting');
    setMessage('Hashing the raw file and complete Data URI locally, then checking the official indexer.');
    setExisting(null);
    setDuplicateChecks([]);
    setTargetCheck(null);
    setTransactionHash('');

    try {
      const nextInspection = await inspectFile(file, lockedMediaType || mediaType);
      setInspection(nextInspection);
      if (embeddedTargetMode && !nextInspection.signatureMatchesMediaType) {
        setPhase('mismatch');
        setMessage(`The selected bytes do not have a valid ${artifact.format} file signature. No transaction was prepared.`);
        return;
      }
      let checkedTarget = null;
      if (submissionMode) {
        checkedTarget = await checkExpeditionTarget(activeArtifact, nextInspection);
        setTargetCheck(checkedTarget);
        if (!checkedTarget.eligible) {
          setPhase('mismatch');
          setMessage('The uploaded bytes do not match the sealed target commitment. No transaction was prepared.');
          return;
        }
      }

      const checks = await buildWrapperChecks(
        nextInspection,
        activeArtifact?.format === 'XPM' || XPM_MEDIA_TYPE_CANDIDATES.includes(nextInspection.mediaType)
          ? XPM_MEDIA_TYPE_CANDIDATES
          : [nextInspection.mediaType],
      );
      const checked = await checkProtocolExistence(checks);
      const firstExisting = earliestExisting(checked);
      setDuplicateChecks(checked);
      setExisting(firstExisting);

      if (firstExisting) {
        setPhase('duplicate');
        setMessage(firstExisting.canonical
          ? 'The exact complete Data URI is already an Ethscription. No creation gas should be spent.'
          : `The same raw bytes were found under the known ${firstExisting.mediaType} wrapper. No duplicate should be created.`);
      } else {
        setPhase('ready');
        setMessage(embeddedTargetMode
          ? checkedTarget?.validation === 'provenance-required'
            ? 'Candidate file passed format preflight. This lost-byte target still requires a reproducible provenance case.'
            : 'Exact target match confirmed by the sealed validator. No duplicate was found for the canonical or known equivalent wrappers.'
          : 'No exact protocol duplicate was found. The transaction can now be prepared.');
      }
    } catch (error) {
      setPhase('error');
      setMessage(error.message || 'The file could not be inspected. No transaction was prepared.');
    }
  };

  const selectTargetForInspection = async (target) => {
    if (!effectiveInspection) return;
    setSelectedTargetId(target.id);
    setTargetCheck(null);
    setClaimSummary(`Exact-byte candidate for ${target.filename}`);
    setSourceUrl('');
    setPhase('inspecting');
    setMessage('Testing your locally hashed bytes against the sealed target commitment.');
    try {
      const checkedTarget = await checkExpeditionTarget(target, effectiveInspection);
      setTargetCheck(checkedTarget);
      if (!checkedTarget.eligible) {
        setPhase('mismatch');
        setMessage('These bytes do not match that target. Your Ethscription remains in your wallet and no deposit was prepared.');
        return;
      }
      setPhase(existing ? 'duplicate' : 'ready');
      setMessage(checkedTarget.validation === 'provenance-required'
        ? 'Candidate format accepted. The historical claim still requires a reproducible provenance case.'
        : 'Exact target match confirmed by the sealed validator. You may continue with the existing matching Ethscription.');
    } catch (error) {
      setPhase('error');
      setMessage(error.message || 'The sealed target validator is unavailable. No deposit was prepared.');
    }
  };

  const requestCreate = async () => {
    if (!account) {
      await connectWallet();
      return;
    }
    if (!onMainnet) {
      await switchToMainnet();
      return;
    }
    setConfirmed(false);
    setConfirmation('create');
  };

  const createEthscription = async () => {
    if (!inspection || !account || !confirmed) return;
    const creator = account;
    setConfirmation('');
    setPhase('creating');
    setMessage('Simulating the exact creation transaction before opening the wallet.');

    try {
      const request = buildCreateEthscriptionTransaction(creator, inspection.dataUri);
      const hash = await simulateAndSendTransaction(provider, request);
      setTransactionHash(hash);
      setPhase('indexing');
      setMessage('Ethereum received the transaction. Waiting for its receipt and official Ethscription recognition.');
      await waitForTransactionReceipt(provider, hash);
      const record = await waitForEthscriptionRecord(hash, {
        owner: creator,
        protocolContentSha256: inspection.protocolContentSha256,
      });
      setEthscription(record);
      setPhase(submissionMode ? 'created' : 'complete');
      setMessage(submissionMode
        ? 'Ethscription created in your wallet. It is not submitted yet; the second transaction deposits this ID into the market.'
        : 'Ethscription verified in your wallet. It was not deposited or assigned to an expedition.');
    } catch (error) {
      setPhase('error');
      setMessage(friendlyTransactionError(error));
    }
  };

  const requestDeposit = async () => {
    const id = selectedEthscriptionId;
    if (!id || !account) return;
    if (!onMainnet) {
      await switchToMainnet();
      return;
    }
    if (existingRecord && !existingOwnedByWallet) return;
    if (hasDepositSelectorCollision(id)) {
      setPhase('error');
      setMessage('This Ethscription ID collides with a V1 function selector. It remains safely in your wallet but cannot use the V1 fallback deposit path.');
      return;
    }
    try {
      const nextMarket = await fetchMarketStatus();
      setMarket(nextMarket);
      if (!nextMarket.intakeEnabled) {
        setPhase('error');
        setMessage(nextMarket.paused
          ? 'The market is paused. The Ethscription remains in your wallet.'
          : 'Market intake is not currently verified as ready. The Ethscription remains in your wallet.');
        return;
      }
      setConfirmed(false);
      setConfirmation('deposit');
    } catch {
      setPhase('error');
      setMessage('Market readiness could not be verified. The Ethscription remains in your wallet.');
    }
  };

  const depositEthscription = async () => {
    const id = selectedEthscriptionId;
    if (!id || !account || !confirmed) return;
    const depositor = account;
    setConfirmation('');
    setPhase('depositing');
    setMessage('Simulating the Ethscription ID transfer before opening the second wallet confirmation.');

    try {
      const request = buildDepositTransaction(depositor, id);
      const hash = await simulateAndSendTransaction(provider, request);
      setTransactionHash(hash);
      setPhase('reconciling');
      setMessage('Deposit confirmed on Ethereum. Waiting for the contract, cooldown, and official indexer to agree.');
      await waitForTransactionReceipt(provider, hash);
      const verified = await waitForVerifiedCustody(depositor, id);
      setCustody(verified);
      setPhase('custody-verified');
      setMessage('Market custody verified. One gas-free wallet signature now binds this Ethscription to the selected target.');
    } catch (error) {
      setPhase('error');
      setMessage(friendlyTransactionError(error));
    }
  };

  const submitAssignment = async (event) => {
    event.preventDefault();
    if (!activeArtifact || !effectiveInspection || !selectedEthscriptionId || !custody || !account) return;
    setPhase('signing');
    setMessage('Review and sign the target assignment. This signature costs no gas and cannot move the artifact.');

    try {
      const assignment = buildFindingAssignment({
        artifact: activeArtifact,
        inspection: effectiveInspection,
        ethscriptionId: selectedEthscriptionId,
        account,
        claimSummary,
        sourceUrl,
      });
      const signed = await signFindingAssignment(provider, account, assignment);
      const result = await publishFinding(assignment, signed.message, signed.signature);
      setFinding(result);
      setPhase('submitted');
      setMessage('Finding published. Custody and the signed target assignment are both independently recorded.');
    } catch (error) {
      setPhase('assignment-error');
      setMessage(friendlyTransactionError(error));
    }
  };

  const canCreate = inspection && rawMatchesTarget && !existing && phase === 'ready';
  const canDepositExisting = submissionMode && inspection && rawMatchesTarget && wrapperMatchesTarget && existing && existingOwnedByWallet;
  const canDepositCreated = submissionMode && ethscription && ethscription.current_owner?.toLowerCase() === connectedOwner;
  const displayTransactionHash = transactionHash || selectedEthscriptionId;

  return (
    <section className={`ethscribe-workbench workbench-${mode}`} aria-label={embeddedTargetMode ? `Submit a finding for ${artifact.filename}` : 'Ethscribe a file into your wallet'}>
      <div className="ethscribe-workbench-heading">
        <div>
          <span>{embeddedTargetMode ? 'ETHSCRIBE + SUBMIT' : 'PERSONAL ETHSCRIBE'}</span>
          <h3>{embeddedTargetMode ? `Test bytes against ${artifact.filename}` : 'Preserve exact bytes in your wallet.'}</h3>
        </div>
        {embeddedTargetMode && <strong>TWO TRANSACTIONS · ONE SIGNATURE</strong>}
      </div>

      <div className="ethscribe-boundary-note">
        <strong>{embeddedTargetMode ? 'CREATION DOES NOT GO DIRECTLY TO THE MARKET' : 'INITIAL OWNER: YOUR CONNECTED WALLET'}</strong>
        <p>{embeddedTargetMode
          ? 'V1 accepts existing 32-byte Ethscription IDs. The first transaction creates the ID to your wallet; only after the official indexer verifies it does the second transaction transfer that ID into market custody.'
          : 'This flow creates one Ethscription with your connected address as initial owner. It does not deposit, list, or assign the artifact. The complete file becomes permanent public Ethereum calldata—never select private material.'}</p>
      </div>

      <form className="ethscribe-inspection-form" onSubmit={inspectExactBytes}>
        <label>
          <span>01 · EXACT FILE</span>
          <input type="file" onChange={chooseFile} required />
          <small>Read locally. Opening and resaving a historical file can change its bytes.</small>
        </label>
        <label>
          <span>02 · DATA URI MEDIA TYPE</span>
          <input
            type="text"
            value={lockedMediaType || mediaType}
            onChange={(event) => { setMediaType(event.target.value); resetAnalysis(); }}
            readOnly={Boolean(lockedMediaType)}
            spellCheck="false"
          />
          <small>{lockedMediaType
            ? `This target locks the canonical prefix: data:${lockedMediaType};base64,`
            : 'The prefix is part of protocol identity. Change it only deliberately.'}</small>
        </label>
        <button type="submit" disabled={!file || busy}>Inspect bytes + check duplicates <ArrowIcon /></button>
      </form>

      {inspection && (
        <div className="ethscribe-byte-report">
          <div><span>RAW FILE</span><strong>{inspection.filename}</strong><small>{inspection.byteLength.toLocaleString('en-US')} bytes</small></div>
          <div><span>RAW SHA-256</span><code>{inspection.rawSha256}</code><small>{submissionMode
            ? targetCheck?.validation === 'exact'
              ? 'SERVER VERIFIED · EXACT TARGET MATCH'
              : targetCheck?.validation === 'provenance-required'
                ? 'CANDIDATE IDENTITY · PROVENANCE REQUIRED'
                : targetCheck?.validation === 'mismatch'
                  ? 'DOES NOT MATCH SEALED TARGET'
                  : 'AWAITING SEALED TARGET CHECK'
            : 'LOCAL CANDIDATE IDENTITY'}</small></div>
          <div><span>PROTOCOL SHA-256</span><code>{inspection.protocolContentSha256}</code><small>SHA-256 of the complete UTF-8 Data URI</small></div>
          <div><span>EXACT PREFIX</span><code>{inspection.dataUriPrefix}</code><small>{inspection.calldataBytes.toLocaleString('en-US')} calldata bytes</small></div>
        </div>
      )}

      {duplicateChecks.length > 0 && (
        <div className="ethscribe-duplicate-report">
          <div><span>OFFICIAL PROTOCOL CHECK</span><strong>{existing ? 'EXISTING CONTENT FOUND' : 'NO KNOWN WRAPPER MATCH'}</strong></div>
          {duplicateChecks.map((check) => (
            <p key={check.mediaType} className={check.exists ? 'duplicate-found' : ''}>
              <code>{check.dataUriPrefix}</code>
              <span>{check.exists ? `ETHSCRIPTION #${check.ethscription.ethscription_number}` : 'Not found'}</span>
            </p>
          ))}
          <small>The official API is authoritative for each complete Data URI checked above. A global raw-byte search across arbitrary MIME parameters, gzip, attachments, or unlisted wrappers requires Ethscribe’s separate decoded-byte index and is not yet claimed here.</small>
        </div>
      )}

      <StatusBanner phase={phase} message={message} transactionHash={displayTransactionHash && ['indexing', 'created', 'complete', 'depositing', 'reconciling', 'custody-verified', 'signing', 'assignment-error', 'submitted'].includes(phase) ? displayTransactionHash : ''} />

      {existingRecord && (
        <div className="existing-ethscription-card">
          <span>EARLIEST MATCH ACROSS CHECKED WRAPPERS</span>
          <strong>Ethscription #{existingRecord.ethscription_number}</strong>
          <code>{existingRecord.transaction_hash}</code>
          <p>Current owner: <a href={`https://etherscan.io/address/${existingRecord.current_owner}`} target="_blank" rel="noreferrer">{short(existingRecord.current_owner)}</a></p>
          <a href={`https://ethscriptions.com/ethscriptions/${existingRecord.transaction_hash}`} target="_blank" rel="noreferrer">Open official record <ArrowIcon /></a>
        </div>
      )}

      <div className="ethscribe-flow-actions">
        {!account && <button type="button" onClick={connectWallet}>Connect wallet to continue <ArrowIcon /></button>}
        {account && !onMainnet && <button type="button" onClick={switchToMainnet}>Switch to Ethereum mainnet <ArrowIcon /></button>}
        {account && onMainnet && canCreate && <button type="button" onClick={requestCreate}>{submissionMode ? '1 OF 2 · ETHSCRIBE TO MY WALLET' : 'ETHSCRIBE TO MY WALLET'} <ArrowIcon /></button>}
        {account && onMainnet && canDepositExisting && <button type="button" onClick={requestDeposit}>DEPOSIT MY EXISTING MATCH <ArrowIcon /></button>}
        {account && onMainnet && canDepositCreated && ['created', 'complete'].includes(phase) && <button type="button" onClick={requestDeposit}>2 OF 2 · DEPOSIT INTO MARKET <ArrowIcon /></button>}
      </div>

      {!embeddedTargetMode && inspection && (ethscription || existingOwnedByWallet) && !submissionMode && (
        <div className="ethscribe-follow-up">
          <div><span>WHAT NEXT?</span><h4>Keep it personal—or submit it to an expedition.</h4></div>
          <p>The Ethscription is already safe in your wallet. An expedition submission is optional and adds market custody plus a signed target assignment.</p>
          {compatibleTargets.length > 0 ? (
            <div className="compatible-targets">
              {compatibleTargets.map((target) => (
                <button type="button" key={target.id} onClick={() => selectTargetForInspection(target)}>
                  <span>{target.validationMode === 'exact' ? 'TEST SEALED TARGET' : 'PROVENANCE RECOVERY TARGET'}</span>
                  <strong>{target.filename}</strong>
                  <small>Expedition 001 · continue to escrow</small>
                </button>
              ))}
            </div>
          ) : <strong className="no-compatible-target">NO COMPATIBLE LIVE TARGET · KEEP IN WALLET</strong>}
        </div>
      )}

      {!embeddedTargetMode && submissionMode && (
        <div className="selected-expedition-target">
          <span>SUBMITTING TO EXPEDITION 001</span>
          <strong>{activeArtifact.filename}</strong>
          {!custody && <button type="button" onClick={() => { setSelectedTargetId(''); setTargetCheck(null); }}>Keep in wallet instead</button>}
        </div>
      )}

      {submissionMode && inspection && rawMatchesTarget && existingRecord && !existingOwnedByWallet && (
        <p className="ethscribe-race-result">Someone else already controls the earliest match found across the checked wrappers. Creating another wrapper would not make this the first known finding, so the site will not prepare a duplicate transaction.</p>
      )}

      {submissionMode && inspection && rawMatchesTarget && existingOwnedByWallet && !wrapperMatchesTarget && (
        <p className="ethscribe-race-result">Your existing Ethscription contains the same decoded bytes, but it does not use this target’s frozen {requiredTargetPrefix} wrapper. It cannot be assigned to this target, and the site will not silently create a second raw-byte copy.</p>
      )}

      {submissionMode && custody && !finding && (
        <form className="finding-assignment-form" onSubmit={submitAssignment}>
          <div><span>03 · SIGN TARGET ASSIGNMENT</span><strong>NO GAS · CANNOT MOVE THE ARTIFACT</strong></div>
          <label>Claim summary<textarea rows="3" maxLength="500" value={claimSummary} onChange={(event) => setClaimSummary(event.target.value)} required /></label>
          <label>{activeArtifact.status === 'lost' ? 'Candidate source / custody URL' : 'Primary source URL'}<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder={activeArtifact.status === 'lost' ? 'Where did these exact bytes come from?' : undefined} required /></label>
          <button type="submit" disabled={phase === 'signing'}>Sign + publish Finding <ArrowIcon /></button>
        </form>
      )}

      {finding && (
        <div className="finding-published-card">
          <span>FINDING PUBLISHED</span><strong>{finding.findingId}</strong><code>{finding.storagePath}</code>
        </div>
      )}

      {confirmation && (
        <div className="ethscribe-confirmation-backdrop" role="presentation" onMouseDown={() => setConfirmation('')}>
          <section className="ethscribe-confirmation" role="dialog" aria-modal="true" aria-labelledby="ethscribe-confirmation-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setConfirmation('')}>×</button>
            <p className="kicker"><span /> Wallet checkpoint</p>
            <h2 id="ethscribe-confirmation-title">{confirmation === 'create' ? 'Create this Ethscription?' : 'Deposit this Ethscription?'}</h2>
            <p>{confirmation === 'create'
              ? `The initial owner will be your connected wallet. ${submissionMode ? 'This is transaction 1 of 2 and does not submit the Finding yet.' : 'No marketplace or expedition assignment is included.'}`
              : 'This is transaction 2 of 2. It transfers the complete Ethscription to the immutable market while preserving your contract withdrawal path.'}</p>
            <dl>
              <div><dt>FROM</dt><dd><code>{account}</code></dd></div>
              <div><dt>TO</dt><dd><code>{confirmation === 'create' ? account : MARKET_ADDRESS}</code></dd></div>
              <div><dt>ETH VALUE</dt><dd>0 ETH · GAS ONLY</dd></div>
              {confirmation === 'create' && <div><dt>FILE / RAW SHA-256</dt><dd><code>{inspection?.filename}<br />{inspection?.rawSha256}</code></dd></div>}
              {confirmation === 'create' && <div><dt>EXACT PREFIX</dt><dd><code>{inspection?.dataUriPrefix}</code></dd></div>}
              {confirmation === 'create' && <div><dt>CALLDATA</dt><dd>{inspection?.calldataBytes.toLocaleString('en-US')} bytes · permanent and public</dd></div>}
              <div><dt>{confirmation === 'create' ? 'PROTOCOL SHA-256' : 'ETHSCRIPTION ID'}</dt><dd><code>{confirmation === 'create' ? inspection?.protocolContentSha256 : selectedEthscriptionId}</code></dd></div>
            </dl>
            <label className="ethscribe-confirm-check">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>{confirmation === 'create'
                ? 'I reviewed the exact file hash, full Data URI prefix, recipient, and understand that a competing transaction can still win before mine is indexed.'
                : 'I reviewed the exact Ethscription ID and market destination and understand that this transfers custody.'}</span>
            </label>
            <button type="button" className="primary-action" disabled={!confirmed} onClick={confirmation === 'create' ? createEthscription : depositEthscription}>Simulate + open wallet <ArrowIcon /></button>
          </section>
        </div>
      )}

      {submissionMode && (
        <p className="ethscribe-market-state">MARKET {market?.paused === false ? 'ACTIVE' : market?.paused ? 'PAUSED' : 'CHECKING'} · TRANSACTION UI {market?.transactionsEnabled ? 'ENABLED' : 'LOCKED'} · INDEXER {market?.indexer?.healthy ? 'CURRENT' : 'NOT VERIFIED'}</p>
      )}
    </section>
  );
}
