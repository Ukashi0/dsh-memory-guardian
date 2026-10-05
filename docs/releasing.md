# Releasing

1. Update `version` in `package.json`, `PLUGIN_VERSION` in `src/index.js`, and `CHANGELOG.md`.
2. Run `npm run check`.
3. Run `npm test`.
4. Run `npm run pack:check` and inspect the file list for local stores, logs or credentials.
5. Install the generated package into an isolated DSH Home and verify Host startup.
6. Verify the Web dashboard in light and dark themes at desktop and narrow widths.
7. Test unrelated recall, replacement/coexistence/rejection, stale review refresh, group budgets, restore recheck, project selection, UI-to-tool recall and legacy project binding.
   This beta has automated Store, simulated Host and client-handler coverage. Real DSH installation and theme/layout checks remain manual release gates.
8. Confirm that repository, homepage and bugs links in package.json point to the public source and issue tracker you intend to use. Record the tested DSH and Node versions in the release notes.
9. Publish this prerelease with the beta tag: npm publish --tag beta --access public. Run from this plugin's own directory, or publish its npm-pack-generated tgz. Publish only Memory Guardian.
10. Install the published package by its explicit version or beta tag and verify startup. Registry publication does not itself submit the plugin to any directory or marketplace.

Never publish a real `store.json`, DSH token, browser session, test log containing private content, or npm cache directory.
