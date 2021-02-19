import * as https from 'https';
import { PackageAndVersion } from './types';

export async function getPatches(
  foundPackages: PackageAndVersion[],
  patchesOfInterest: string[],
) {
  const snykPatches = {};
  const checkedLibraries: any[] = [];
  for (const foundLibrary of foundPackages) {
    const toCheck = `${foundLibrary.name}/${foundLibrary.version}`;
    if (!checkedLibraries.includes(toCheck)) {
      checkedLibraries.push(toCheck);
      const { issues } = await httpsGet(
        `https://snyk.io/api/v1/test/npm/${toCheck}`,
        {
          json: true,
          headers: {
            Authorization: `token ${process.env.SNYK_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (issues.vulnerabilities) {
        for (const vulnerability of issues.vulnerabilities) {
          if (patchesOfInterest.includes(vulnerability.id)) {
            snykPatches[vulnerability.package] =
              snykPatches[vulnerability.package] || [];
            const fetchedPatches = await Promise.all(
              vulnerability.patches.map(async (patch) => {
                return {
                  ...patch,
                  diffs: await Promise.all(
                    patch.urls.map(async (url) => httpsGet(url)),
                  ),
                };
              }),
            );
            snykPatches[vulnerability.package] = [...fetchedPatches];
          }
        }
      }
    }
  }
  return snykPatches;
}

// fetch patches => needle
export const httpsGet = async (url: string, options: any = {}): Promise<any> =>
  new Promise((resolve, reject) => {
    const parsedURL = new URL(url);
    const requestOptions = {
      ...options,
      host: parsedURL.host,
      path: parsedURL.pathname,
    };
    const request = https.get(requestOptions, (response) => {
      if (
        response.statusCode &&
        (response.statusCode < 200 || response.statusCode > 299)
      ) {
        reject(
          new Error('Failed to load page, status code: ' + response.statusCode),
        );
      }
      const body: any[] = [];
      response.on('data', (chunk: any) => body.push(chunk));
      response.on('end', () =>
        resolve(options.json ? JSON.parse(body.join('')) : body.join('')),
      );
    });
    request.on('error', reject);
  });
