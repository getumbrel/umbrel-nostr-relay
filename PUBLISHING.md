# Publishing Nostr images

Push a new `v*.*.*` release tag to this private repository to build all three
images in GitHub Actions. The workflow uses `GITHUB_TOKEN` with `packages: write`;
it does not require Docker Hub credentials or a separately stored token.

The regression job gates native AMD64 and ARM64 builds. Each architecture is
published with an architecture suffix; only after every build succeeds does the
workflow assemble and verify the multi-architecture release manifests.

For release `v1.2.1`, the final images are:

- `ghcr.io/getumbrel/umbrel-nostr-relay:v1.2.1`
- `ghcr.io/getumbrel/umbrel-nostr-relay-proxy:v1.2.1`
- `ghcr.io/getumbrel/nostr-rs-relay:0.10.0-v1.2.1`

The engine is built from the exact public Docker-wrapper commit pinned in the
workflow. Publish that wrapper commit before pushing a release tag that uses it.
Engine tags include the upstream version and app release, so a later app release
does not overwrite an earlier engine tag. Do not move existing release tags.

## First publication and public access

New GHCR packages default to private. A package administrator must set each of
the three packages to public in its GitHub package settings. Package visibility
is independent of this source repository's visibility; this repository stays
private. Future releases of those public packages do not require that setup again.

Verify anonymous pulls of the final tags and both supported architectures before
handing the release to App Store packaging. Use the final multi-architecture
manifest digests in the App Store definitions, not the architecture-specific
tags or local image config IDs. App Store packaging and its upgrade tests are
handled separately after the images are available.

The failed Docker Hub release tag `v1.2.0` is retained as history; it did not
publish any images.
