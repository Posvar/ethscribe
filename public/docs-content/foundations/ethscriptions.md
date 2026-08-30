# Ethscriptions primer

Ethscriptions are a way to create and transfer digital artifacts on Ethereum without a separate token contract for every collection. A creation transaction places a valid data URI in Ethereum transaction data; the protocol index interprets that transaction as a new Ethscription when the protocol rules are satisfied.

Ethscribe uses this primitive because it gives a recovered file a public creation event, an owner, and a transferable chain of custody.

## The basic object

A simple image Ethscription may begin as a data URI such as:

```text
data:image/png;base64,iVBORw0KGgo...
```

The complete UTF-8 data URI is protocol content. Its media type, parameters, encoding, and payload all matter. The protocol's `content_sha` identifies this complete string; it is not merely a hash of the decoded file.

The official protocol also supports later extensions, including contract-based creation, gzip transport, duplicate content under defined rules, and attachments. Ethscribe's index must understand the accepted ESIPs before it makes historical-order claims.

## Creation and transfer

At a high level:

1. A creator submits an Ethereum transaction whose input satisfies the Ethscriptions creation rules.
2. The first eligible creation of that protocol content receives an Ethscription ID derived from the transaction and, where applicable, event position.
3. The owner transfers the Ethscription by sending a valid transaction to the recipient under the protocol rules.
4. An indexer reconstructs creation, ownership, and transfer history from Ethereum.

The Ethereum chain provides the durable event log. The Ethscriptions protocol supplies the interpretation. Indexers make the result usable, but any important conclusion should remain reproducible from chain data.

## Why this fits Ethscribe

Ethscriptions offer four properties useful to digital archaeology:

- **Public chronology.** Creation and transfer events are ordered on Ethereum.
- **Content addressability.** The complete protocol content has a deterministic identity.
- **Native ownership.** The artifact can have a current owner and a custody history.
- **Low-friction participation.** A hunter can preserve eligible bytes without deploying a bespoke NFT contract.

These properties do not establish historical authenticity by themselves. They make an evidence-backed artifact ownable after the historical case has been made.

## What an Ethscription proves

An Ethscription can prove that particular protocol content appeared under the protocol's rules at a particular point in Ethereum history. It can also support a reconstruction of later ownership.

It does **not** prove:

- who originally authored the historical file;
- when that file first existed off-chain;
- that a source attribution is correct;
- that no equivalent bytes were wrapped in a different data URI;
- copyright ownership or a license grant; or
- that the artifact is culturally significant.

Ethscribe treats those as separate claims supported by evidence and curation.

## Protocol compatibility

Ethscribe intends to follow the current accepted Ethscriptions Improvement Proposals rather than freeze an incomplete interpretation of the protocol. Of particular relevance are:

- ESIP-3 event-based creation;
- ESIP-6 duplicate-content behavior;
- ESIP-7 gzip transport; and
- ESIP-8 attachments.

The official references are maintained in the [Ethscriptions protocol specification](https://docs.ethscriptions.com/overview/protocol-specification) and [accepted ESIPs](https://docs.ethscriptions.com/esips/accepted-esips).

## Two identities, one artifact record

Ethscribe records both:

```text
protocol identity = SHA-256(complete UTF-8 data URI)
artifact identity = SHA-256(decoded artifact bytes)
```

The first answers “which Ethscription content is this?” The second answers “have these exact file bytes appeared under another valid wrapper?” The distinction is foundational to every hunt.
