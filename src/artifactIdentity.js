const hash = value => typeof value === 'string' && /^(?:0x)?[a-f0-9]{64}$/i.test(value)
  ? value.replace(/^0x/i, '').toLowerCase() : null;

// A current wallet record must belong to this exact Ethscription. Optional
// pinned protocol hashes also bind an imported catalogue ID to its payload.
export function matchesArtifactRecord(record, artifact) {
  const id = hash(artifact?.ethscriptionId);
  if (!id || hash(record?.transactionHash) !== id) return false;
  // A hunt's preferred creation wrapper is not necessarily the wrapper of an
  // already recognized Ethscription. Only use a hash bound to this recorded ID.
  if (artifact.recordProtocolSha256 == null) return true;
  const expected = hash(artifact.recordProtocolSha256);
  return Boolean(expected && hash(record.contentSha) === expected);
}
