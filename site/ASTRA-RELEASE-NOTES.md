# Current production: image-free output modes

- Live: https://tracetoforge.com/#fa-modes
- Production deployment: `5c4fc46a-ba47-4d13-9d53-cb39039870b2`.
- Preview: `9f8e5038-bd8e-48e4-820a-90776665cf46`.
- Previous production / rollback: `cdd21675-730e-400f-8c6c-b3e4228639ff`.
- Current published directory: `release-text-modes/`.

User rejected generated output-mode pictures and selected no pictures. Removed all four mode illustrations, used a compact text layout with subtle dividers, and removed the illustration caption. Hero and original workflow screenshots remain unchanged. Generated mode pictures were never published.

Final browser verification found a cached old stylesheet. Added a version query to the homepage stylesheet link and republished; verified the approved divider layout visually on production and reran all 81 file checks successfully.

Only `index.html` and `forge-features.css` differ from `release-reconciled/`. The fixed app bundle remains `index-BBUhUUiD.js`, SHA256 `a8113753e7d205082a366ed4fde8f4a283244b66808d77358e2aa54a000143d0`. Both Gridfinity fixes are preserved.

Preview and production each passed all 81 file checks, image-free mode checks, app hash/references, metadata, Inter/sitewide branding, analytics, security headers, and production indexing. Reports: `release-text-modes-preview-checks.json` and `release-text-modes-production-checks.json`.

Builder: `build_text_modes.py`. Upload helpers: `hash_text_modes.cjs`, `upload_text_modes.py`; manifest `text-modes-upload-manifest.json`. No token file created. Publication explicitly authorized by the user.

For future changes start with this directory after checking current production. See RECONCILED-RELEASE.md for the preserved fixed-source base and direct-upload workflow limitations. Do not publish the older unfixed release directories or rejected image previews.
