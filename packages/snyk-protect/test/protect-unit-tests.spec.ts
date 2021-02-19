import * as fs from 'fs';
import * as path from 'path';
import { PhysicalModuleToPatch, PackageAndVersion } from '../src/lib/types';

// import protect from '../src';
import { extractPatchMetadata } from '../src/lib/snyk-file';
import { checkProject } from '../src/lib/explore-node-modules';
import { getPatches } from '../src/lib/get-patches';

describe('parsing .snyk files', () => {
  it('seems to work', () => {
    const fixtureFolder =
      '/Users/jeff/hammer-spelunking/test-fixture-for-protect/protect-fixture-1-min';

    const dotSnykFileContents = fs.readFileSync(
      path.resolve(fixtureFolder, '.snyk'),
      'utf8',
    );
    const snykFilePatchMetadata = extractPatchMetadata(dotSnykFileContents);

    const vulnIds = Object.keys(snykFilePatchMetadata);
    const packageNames = Object.values(
      snykFilePatchMetadata,
    ).flat() as string[];

    expect(vulnIds).toEqual(['SNYK-JS-LODASH-567746']);
    expect(packageNames).toEqual(['lodash']);
  });

  it('works with multiple patches', async () => {
    const dotSnykFileContents = `
# Snyk (https://snyk.io) policy file, patches or ignores known vulnerabilities.
version: v1.19.0
ignore: {}
# patches apply the minimum changes required to fix a vulnerability
patch:
  SNYK-JS-LODASH-567746:
    - tap > nyc > istanbul-lib-instrument > babel-types > lodash:
        patched: '2021-02-17T13:43:51.857Z'
  
  SNYK-FAKE-THEMODULE-000000:
    - top-level > some-other > the-module:
        patched: '2021-02-17T13:43:51.857Z'
    `;

    const snykFilePatchMetadata = extractPatchMetadata(dotSnykFileContents);

    const vulnIds = Object.keys(snykFilePatchMetadata);
    const packageNames = Object.values(
      snykFilePatchMetadata,
    ).flat() as string[];

    expect(vulnIds).toEqual([
      'SNYK-JS-LODASH-567746',
      'SNYK-FAKE-THEMODULE-000000',
    ]);
    expect(packageNames).toEqual(['lodash', 'the-module']);
  });

  describe('checkProject', () => {
    it('seems to work', () => {
      const fixtureFolderRelativePath = 'fixtures/single-patchable-module';
      const fixtureFolder = path.join(__dirname, fixtureFolderRelativePath);

      const physicalModulesToPatch: PhysicalModuleToPatch[] = []; // this will get populated by checkProject
      checkProject(fixtureFolder, ['lodash'], physicalModulesToPatch);

      expect(physicalModulesToPatch).toHaveLength(1);
      const m = physicalModulesToPatch[0];
      expect(m.name).toBe('lodash');
      expect(m.version).toBe('4.17.10');
      expect(m.folderPath).toEqual(
        path.join(
          __dirname,
          fixtureFolderRelativePath,
          '/node_modules/nyc/node_modules/lodash',
        ),
      );
    });
  });

  describe('getPatches', () => {
    // This tests makes a real API call to Snyk
    it('seems to work', async () => {
      const packageAndVersions: PackageAndVersion[] = [
        {
          name: 'lodash',
          version: '4.17.10',
        } as PackageAndVersion,
      ];

      const vulnIds = ['SNYK-JS-LODASH-567746'];
      const patches = await getPatches(packageAndVersions, vulnIds);
      expect(Object.keys(patches)).toEqual(['lodash']);
      const lodashPatches = patches['lodash'];
      expect(lodashPatches).toHaveLength(1);
      const theOnePatch = lodashPatches[0];
      expect(theOnePatch.id).toBe('patch:SNYK-JS-LODASH-567746:0');
      expect(theOnePatch.diffs).toHaveLength(1);
      expect(theOnePatch.diffs[0]).toContain('index 9b95dfef..43e71ffb 100644'); // something from the actual patch
    });
  });

  describe('applying patches', () => {
    it('seems to work', () => {
      // TODO: test that applying an actual diff works
    });
  });
});
