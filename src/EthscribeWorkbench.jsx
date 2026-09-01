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

function fileFromEthscription(record) {
  const contentUri = record?.content_uri;
  if (typeof contentUri !== 'string' || !contentUri.startsWith('data:')) {
    throw new Error('The official record does not contain a readable Data URI.');
  }
  const comma = contentUri.indexOf(',');
  if (comma < 0) throw new Error('The official record contains an invalid Data URI.');
  const metadata = contentUri.slice(5, comma);
  const parts = metadata.split(';');
  const mediaType = (parts[0] || record.mimetype || '').toLowerCase();
  if (!parts.includes('base64')) {
    throw new Error('This expedition preflight currently supports base64 file Ethscriptions only.');
  }
  const binary = atob(contentUri.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const extension = mediaType.split('/')[1]?.replace(/^x-/, '') || 'bin';
  const filename = `ethscription-${record.ethscription_number ?? 'artifact'}.${extension}`;
  return { file: new File([bytes], filename, { type: mediaType }), mediaType };
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
  onFindingPublished = () => {},
  existingEthscriptionId = '',
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
  const [sourceUrl, setSourceUrl] = useState(artifact?.status === 'lost' ? '' : (artifact?.sourceUrl || ''));
  const [finding, setFinding] = useState(null);
  const [targetCheck, setTargetCheck] = useState(null);
  const [walletEthscription, setWalletEthscription] = useState(null);

  useEffect(() => {
    let active = true;
    fetchMarketStatus().then((nextMarket) => {
      if (active) setMarket(nextMarket);
    }).catch(() => {
      if (active) setMarket(null);
    });
    return () => { active = false; };
  }, [submissionMode]);

  useEffect(() => {
    if (!existingEthscriptionId) return undefined;
    let active = true;
    setPhase('loading-record');
    setMessage('Loading the selected Ethscription from the official index. No transaction is being prepared.');

    fetch(`/api/ethscriptions/${existingEthscriptionId}`, { headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('The selected Ethscription could not be loaded from the official index.');
        const payload = await response.json();
        return payload.result || payload;
      })
      .then((record) => {
        if (!active) return;
        if (record.transaction_hash?.toLowerCase() !== existingEthscriptionId.toLowerCase()) {
          throw new Error('The official index returned a different Ethscription.');
        }
        const decoded = fileFromEthscription(record);
        setWalletEthscription(record);
        setFile(decoded.file);
        setMediaType(decoded.mediaType);
        setPhase('idle');
        setMessage('');
      })
      .catch((error) => {
        if (!active) return;
        setPhase('error');
        setMessage(error.message || 'The selected Ethscription could not be prepared for testing.');
      });

    return () => { active = false; };
  }, [existingEthscriptionId]);

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
      const nextInspection = await inspectFile(file, walletEthscription ? mediaType : (lockedMediaType || mediaType));
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
      const selectedExisting = walletEthscription
        ? checked.find((result) => result.ethscription?.transaction_hash?.toLowerCase() === walletEthscription.transaction_hash?.toLowerCase())
        : null;
      const firstExisting = selectedExisting || earliestExisting(checked);
      setDuplicateChecks(checked);
      setExisting(firstExisting);

      if (firstExisting) {
        if (account && firstExisting.ethscription.current_owner?.toLowerCase() === MARKET_ADDRESS.toLowerCase()
          && firstExisting.ethscription.previous_owner?.toLowerCase() === account.toLowerCase()) {
          const verified = await waitForVerifiedCustody(account, firstExisting.ethscription.transaction_hash);
          setEthscription({ ...firstExisting.ethscription, creationOutcome: 'canonical' });
          setCustody(verified);
          setPhase('custody-verified');
          setMessage('This exact Ethscription is already verified in your direct market custody. No new transaction is needed.');
        } else {
          setPhase('duplicate');
          setMessage(firstExisting.canonical
            ? 'The exact complete Data URI is already an Ethscription. No creation gas should be spent.'
            : `The same raw bytes were found under the known ${firstExisting.mediaType} wrapper. No duplicate should be created.`);
        }
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
    setSourceUrl(target.status === 'lost' ? '' : (target.sourceUrl || ''));
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
      setPhase(custody ? 'custody-verified' : existing ? 'duplicate' : 'ready');
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
    setMessage('Simulating the exact direct-to-vault creation before opening your wallet.');

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
        receiptContentSha256: inspection.receiptContentSha256,
      });
      setEthscription(record);
      if (record.creationOutcome === 'receipt') {
        setPhase('receipt');
        setMessage('Another transaction claimed the canonical Data URI first. Your transaction still created an owned, timestamped Finding Receipt; it did not enter market custody.');
        return;
      }

      setPhase('reconciling');
      setMessage('Canonical Ethscription confirmed. Waiting for direct market custody and the five-block safety window to reconcile.');
      const verified = await waitForVerifiedCustody(creator, hash);
      setCustody(verified);
      setPhase(submissionMode ? 'custody-verified' : 'complete');
      setMessage(submissionMode
        ? 'Canonical artifact and direct market custody verified. One gas-free signature now binds it to this target.'
        : 'Canonical artifact verified in direct market custody. You can keep it vaulted, withdraw it, or assign it to a compatible expedition.');
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
      setMessage('This Ethscription ID conflicts with a reserved market action. It remains safely in your wallet but cannot use the standard deposit path.');
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
      setMessage('Existing Ethscription custody verified. One gas-free wallet signature now binds it to the selected target.');
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
      setMessage('Signature accepted. Publishing the Finding while vault custody services reconcile. No new transaction is needed.');
      const result = await publishFinding(assignment, signed.message, signed.signature);
      setFinding(result);
      onFindingPublished(result);
      setPhase('submitted');
      setMessage('Finding published. Custody and the signed target assignment are both independently recorded.');
    } catch (error) {
      setPhase('assignment-error');
      setMessage(friendlyTransactionError(error));
    }
  };

  const canCreate = inspection && rawMatchesTarget && !existing && phase === 'ready' && market?.intakeEnabled;
  const canDepositExisting = submissionMode && inspection && rawMatchesTarget && wrapperMatchesTarget && existing && existingOwnedByWallet;
  const displayTransactionHash = transactionHash || selectedEthscriptionId;
  const preflightComplete = duplicateChecks.length > 0;
  const preflightTitle = existing
    ? 'EXISTING ETHSCRIPTION FOUND'
    : preflightComplete
      ? 'READY TO ETHSCRIBE'
      : phase === 'mismatch'
        ? 'NOT A TARGET MATCH'
        : phase === 'error'
          ? 'CHECK INCOMPLETE'
          : 'CHECKING…';
  const wrapperCheckSummary = duplicateChecks.length === 1
    ? 'Canonical Data URI checked in the background.'
    : `Canonical Data URI + ${Math.max(duplicateChecks.length - 1, 0)} common XPM aliases checked in the background.`;

  return (
    <section className={`ethscribe-workbench workbench-${mode}`} aria-label={embeddedTargetMode ? `Submit a finding for ${artifact.filename}` : 'Ethscribe a file into the market vault'}>
      <div className="ethscribe-workbench-heading">
        <div>
          <span>{embeddedTargetMode ? 'ETHSCRIBE + SUBMIT' : 'PERSONAL ETHSCRIBE'}</span>
          <h3>{embeddedTargetMode ? `Test bytes against ${artifact.filename}` : 'Preserve exact bytes in the market vault.'}</h3>
        </div>
        {embeddedTargetMode && <strong>READ-ONLY UNTIL YOU CONTINUE</strong>}
      </div>

      <div className="ethscribe-boundary-note">
        <strong>READ-ONLY BYTE CHECK</strong>
        <p>{embeddedTargetMode
          ? 'The expedition supplies the required file wrapper and sealed target commitment. This test hashes the bytes and checks known duplicates. It never opens your wallet or sends a transaction.'
          : 'This test hashes the selected bytes and checks known duplicates. It never opens your wallet or sends a transaction.'}</p>
      </div>

      <form className="ethscribe-inspection-form" onSubmit={inspectExactBytes}>
        {existingEthscriptionId ? (
          <div className="ethscribe-selected-record">
            <span>01 · ETHSCRIPTION IN MY WALLET</span>
            <strong>{walletEthscription ? `Ethscription #${walletEthscription.ethscription_number}` : 'Loading official record…'}</strong>
            <small>{short(existingEthscriptionId, 12, 10)}</small>
          </div>
        ) : (
          <label>
            <span>01 · EXACT FILE</span>
            <input type="file" onChange={chooseFile} required />
            <small>Read locally. Opening and resaving a historical file can change its bytes.</small>
          </label>
        )}
        <button type="submit" disabled={!file || busy}>Test bytes <ArrowIcon /></button>
      </form>

      {inspection && (
        <div className={`ethscribe-preflight-result ${existing ? 'preflight-existing' : preflightComplete ? 'preflight-ready' : phase === 'mismatch' ? 'preflight-mismatch' : ''}`} role="status">
          <div className="preflight-result-heading"><span>BYTE PREFLIGHT</span><strong>{preflightTitle}</strong></div>
          <div className="preflight-checklist">
            <span className="check-passed">✓ FILE HASHED LOCALLY</span>
            {submissionMode && targetCheck?.validation === 'exact' && <span className="check-passed">✓ TARGET MATCHED</span>}
            {submissionMode && targetCheck?.validation === 'provenance-required' && <span className="check-passed">✓ FORMAT ACCEPTED · PROVENANCE REQUIRED</span>}
            {submissionMode && targetCheck?.validation === 'mismatch' && <span className="check-failed">× TARGET DID NOT MATCH</span>}
            {preflightComplete && !existing && <span className="check-passed">✓ NO KNOWN DUPLICATE FOUND</span>}
            {existing && <span className="check-warning">! EXISTING CONTENT FOUND</span>}
          </div>
          <p>{existing
              ? 'Do not create another copy. Review the existing Ethscription below and continue only if your wallet owns it.'
              : preflightComplete
                ? `${wrapperCheckSummary} No transaction has been sent.`
                : phase === 'mismatch'
                  ? 'These bytes are not eligible for this target. No gas transaction was prepared.'
                : 'Running the target and duplicate checks. No transaction has been prepared.'}</p>
          <details className="preflight-technical-details">
            <summary>Technical checks <span>HASHES + WRAPPERS</span></summary>
            <dl>
              <div><dt>RAW FILE</dt><dd>{inspection.filename} · {inspection.byteLength.toLocaleString('en-US')} bytes</dd></div>
              <div><dt>RAW SHA-256</dt><dd><code>{inspection.rawSha256}</code></dd></div>
              <div><dt>PROTOCOL SHA-256</dt><dd><code>{inspection.protocolContentSha256}</code></dd></div>
              <div><dt>EXACT PREFIX</dt><dd><code>{inspection.dataUriPrefix}</code></dd></div>
            </dl>
            {duplicateChecks.length > 0 && (
              <div className="preflight-wrapper-checks">
                {duplicateChecks.map((check) => (
                  <p key={check.mediaType} className={check.exists ? 'duplicate-found' : ''}>
                    <code>{check.dataUriPrefix}</code>
                    <span>{check.exists ? `ETHSCRIPTION #${check.ethscription.ethscription_number}` : 'Not found'}</span>
                  </p>
                ))}
                <small>The official API verifies each complete Data URI listed here. Arbitrary unlisted wrappers require Ethscribe’s separate decoded-byte index and are not covered by this check.</small>
              </div>
            )}
          </details>
        </div>
      )}

      {(!inspection || !['inspecting', 'ready', 'duplicate', 'mismatch'].includes(phase)) && (
        <StatusBanner phase={phase} message={message} transactionHash={displayTransactionHash && ['indexing', 'receipt', 'complete', 'depositing', 'reconciling', 'custody-verified', 'signing', 'assignment-error', 'submitted'].includes(phase) ? displayTransactionHash : ''} />
      )}

      {existingRecord && (
        <div className="existing-ethscription-card">
          <span>{walletEthscription ? 'SELECTED ETHSCRIPTION' : 'EARLIEST MATCH ACROSS CHECKED WRAPPERS'}</span>
          <strong>Ethscription #{existingRecord.ethscription_number}</strong>
          <code>{existingRecord.transaction_hash}</code>
          <p>Current owner: <a href={`https://etherscan.io/address/${existingRecord.current_owner}`} target="_blank" rel="noreferrer">{short(existingRecord.current_owner)}</a></p>
          <a href={`https://ethscriptions.com/ethscriptions/${existingRecord.transaction_hash}`} target="_blank" rel="noreferrer">Open official record <ArrowIcon /></a>
        </div>
      )}

      {ethscription?.creationOutcome === 'receipt' && (
        <div className="ethscribe-race-result">
          <strong>FINDING RECEIPT CREATED</strong>
          <p>An earlier Ethereum transaction claimed the canonical payload first. Your wallet still received an onchain Finding Receipt committed to the attempted content hash. The receipt proves timing; it is not the accepted artifact.</p>
          <a href={`https://ethscriptions.com/ethscriptions/${ethscription.transaction_hash}`} target="_blank" rel="noreferrer">Open Finding Receipt <ArrowIcon /></a>
        </div>
      )}

      <div className="ethscribe-flow-actions">
        {!account && <button type="button" onClick={connectWallet}>Connect wallet to continue <ArrowIcon /></button>}
        {account && !onMainnet && <button type="button" onClick={switchToMainnet}>Switch to Ethereum mainnet <ArrowIcon /></button>}
        {account && onMainnet && canCreate && <button type="button" onClick={requestCreate}>ETHSCRIBE DIRECTLY INTO VAULT <ArrowIcon /></button>}
        {account && onMainnet && canDepositExisting && <button type="button" onClick={requestDeposit}>DEPOSIT MY EXISTING MATCH <ArrowIcon /></button>}
      </div>

      {account && onMainnet && inspection && rawMatchesTarget && !existing && phase === 'ready' && !market?.intakeEnabled && (
        <p className="ethscribe-race-result">Direct creation is unavailable until the vault, transaction interface, and official indexer all report ready. No transaction can be prepared in this state.</p>
      )}

      {!embeddedTargetMode && inspection && (custody || existingOwnedByWallet) && !submissionMode && (
        <div className="ethscribe-follow-up">
          <div><span>WHAT NEXT?</span><h4>Keep it personal—or submit it to an expedition.</h4></div>
          <p>The Ethscription is already verified in market custody. An expedition assignment is optional and requires only a gas-free wallet signature.</p>
          {compatibleTargets.length > 0 ? (
            <div className="compatible-targets">
              {compatibleTargets.map((target) => (
                <button type="button" key={target.id} onClick={() => selectTargetForInspection(target)}>
                  <span>{target.validationMode === 'exact' ? 'TEST SEALED TARGET' : 'PROVENANCE RECOVERY TARGET'}</span>
                  <strong>{target.filename}</strong>
                  <small>Expedition 001 · continue to assignment</small>
                </button>
              ))}
            </div>
          ) : <strong className="no-compatible-target">NO COMPATIBLE LIVE TARGET · KEEP VAULTED</strong>}
        </div>
      )}

      {!embeddedTargetMode && submissionMode && (
        <div className="selected-expedition-target">
          <span>SUBMITTING TO EXPEDITION 001</span>
          <strong>{activeArtifact.filename}</strong>
          {!custody && <button type="button" onClick={() => { setSelectedTargetId(''); setTargetCheck(null); }}>Cancel assignment</button>}
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
          <div><span>02 · SIGN TARGET ASSIGNMENT</span><strong>NO GAS · CANNOT MOVE THE ARTIFACT</strong></div>
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
            <h2 id="ethscribe-confirmation-title">{confirmation === 'create' ? 'Ethscribe directly into the vault?' : 'Deposit this Ethscription?'}</h2>
            <p>{confirmation === 'create'
              ? `Your connected wallet remains the creator and the Ethscribe vault becomes initial owner immediately. ${submissionMode ? 'After custody verification, one gas-free signature submits the Finding.' : 'No listing or expedition assignment is created automatically.'}`
              : 'This transaction transfers an existing Ethscription into the immutable market while preserving your contract withdrawal path.'}</p>
            <dl>
              <div><dt>FROM</dt><dd><code>{account}</code></dd></div>
              <div><dt>TO</dt><dd><code>{MARKET_ADDRESS}</code></dd></div>
              <div><dt>ETH VALUE</dt><dd>0 ETH · GAS ONLY</dd></div>
              {confirmation === 'create' && <div><dt>FILE / RAW SHA-256</dt><dd><code>{inspection?.filename}<br />{inspection?.rawSha256}</code></dd></div>}
              {confirmation === 'create' && <div><dt>EXACT PREFIX</dt><dd><code>{inspection?.dataUriPrefix}</code></dd></div>}
              {confirmation === 'create' && <div><dt>CALLDATA</dt><dd>{inspection?.calldataBytes.toLocaleString('en-US')} bytes · permanent and public</dd></div>}
              <div><dt>{confirmation === 'create' ? 'PROTOCOL SHA-256' : 'ETHSCRIPTION ID'}</dt><dd><code>{confirmation === 'create' ? inspection?.protocolContentSha256 : selectedEthscriptionId}</code></dd></div>
            </dl>
            <label className="ethscribe-confirm-check">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>{confirmation === 'create'
                ? 'I reviewed the exact file hash, canonical file wrapper, and vault destination. I understand the artifact enters custody immediately and a Finding Receipt—not the canonical artifact—wins if another transaction is ordered first.'
                : 'I reviewed the exact Ethscription ID and market destination and understand that this transfers custody.'}</span>
            </label>
            <button type="button" className="primary-action" disabled={!confirmed} onClick={confirmation === 'create' ? createEthscription : depositEthscription}>Simulate + open wallet <ArrowIcon /></button>
          </section>
        </div>
      )}

      <p className="ethscribe-market-state">MARKET {market?.paused === false ? 'ACTIVE' : market?.paused ? 'PAUSED' : 'CHECKING'} · TRANSACTION UI {market?.transactionsEnabled ? 'ENABLED' : 'LOCKED'} · INDEXER {market?.indexer?.healthy ? 'CURRENT' : 'TEMPORARILY UNAVAILABLE'}</p>
    </section>
  );
}
