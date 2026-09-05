# Expedition 001: preserved preview files

These are unmodified copies of the seven already recognized seed artifacts. They are served from the site so the homepage and expedition do not depend on a live GitHub or Wayback response for every preview.

Each file was fetched from the origin below on 4 September 2026. Both its SHA-256 and byte length were verified against the existing public `src/huntData.js` manifest **before** it was written, and again after writing. No conversion, optimization, metadata stripping, or image editing was performed. Historical `sourceUrl` references in the manifest remain unchanged.

| Local file | Bytes | SHA-256 | Origin |
|---|---:|---|---|
| `original-bc-ico.ico` | 22,486 | `8571889ac8a29b5c2e537f3fb11973295fcffc8f9b348623aa87b3598e869033` | [Bitcoin preserved source](https://raw.githubusercontent.com/bitcoin/bitcoin/4405b78d6059e536c36974088a8ed4d9f0f29898/rc/bitcoin.ico) |
| `new-png-16.png` | 971 | `2b876c9276e857f582c1deb55dce44cc41cf5efa4100d7a46bf21d60f0f1bfff` | [Archived bitcoin16.4.png](https://web.archive.org/web/20101222204928id_/http://www.bitcoin.org/download/bitcoin16.4.png) |
| `new-png-20.png` | 1,329 | `d5c85f2b970c0176f221cb26f8a5542d3bae635933b4465b09c65421e52b590f` | [Archived bitcoin20.4.png](https://web.archive.org/web/20101222205043id_/http://www.bitcoin.org/download/bitcoin20.4.png) |
| `new-png-32.png` | 2,834 | `b89eda7414b76e758d5523e7def5a86b4ff7c20cb8f5f8ff43b37807f938abcd` | [Archived bitcoin32.5.png](https://web.archive.org/web/20101222205146id_/http://www.bitcoin.org/download/bitcoin32.5.png) |
| `new-png-48.png` | 5,090 | `2af6227726572f373020852ea8b80dd7b51827c4abd9bca0645ce2801168ac6b` | [Archived bitcoin48.5.png](https://web.archive.org/web/20101222205116id_/http://www.bitcoin.org/download/bitcoin48.5.png) |
| `new-composite-ico.ico` | 25,782 | `e5b6acae10a53097adf0a146d39df4217be7ac951eaf64423a9df1861d5ed1ef` | [Bitcoin preserved source](https://raw.githubusercontent.com/bitcoin/bitcoin/68b973a913fd1569d3a9a444d4233b15f7866e3e/rc/bitcoin.ico) |
| `favicon-ico.ico` | 2,550 | `44dbcd47d6b7630840dacaf19331b664a9d22958b778c40ec60ed1cbef791aef` | [Bitcoin preserved source](https://raw.githubusercontent.com/bitcoin/bitcoin/68b973a913fd1569d3a9a444d4233b15f7866e3e/rc/favicon.ico) |

From the repository root, `node scripts/cache-expedition-previews.mjs` verifies existing files or recovers missing ones from their original source, falling back to the site's exact Ethscription media endpoint. It refuses mismatched bytes and will not overwrite an existing cache file.

The allowlist contains only these seven public seed records. It does not fetch, disclose, or pre-populate any open or lost expedition target. A cache copy improves availability; it is not a new historical source or a new Ethscription.
