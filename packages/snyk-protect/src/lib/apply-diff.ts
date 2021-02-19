import * as path from 'path';
import * as fs from 'fs';

// apply patches => patch apply || git apply || js-diff
export function applyDiff(patchDiff: string, baseFolder: string) {
  const patchFile = patchDiff.slice(patchDiff.search(/^--- a\//m)).split('\n');
  const filename = path.resolve(baseFolder, patchFile[0].replace('--- a/', ''));

  const fileToPatch = fs.readFileSync(filename, 'utf-8').split('\n');
  if (!patchFile[2]) {
    return;
  }
  const unparsedLineToPatch = /^@@ -(\d*),.*@@/.exec(patchFile[2]);
  if (!unparsedLineToPatch || !unparsedLineToPatch[1]) {
    return;
  }
  let lineToPatch = parseInt(unparsedLineToPatch[1], 10) - 2;

  const patchLines = patchFile.slice(3, patchFile.length - 2);

  for (const patchLine of patchLines) {
    lineToPatch += 1;
    switch (patchLine.charAt(0)) {
      case '-':
        fileToPatch.splice(lineToPatch, 1);
        break;

      case '+':
        fileToPatch.splice(lineToPatch, 0, patchLine);
        break;

      case ' ':
        if (fileToPatch[lineToPatch] !== patchLine.slice(1)) {
          console.log(
            'Expected\n  line from local file\n',
            fileToPatch[lineToPatch],
          );
          console.log('\n to match patch line\n', patchLine.slice(1), '\n');
          throw new Error(
            `File ${filename} to be patched does not match, not patching`,
          );
        }
        break;
    }
  }

  // fs.writeFileSync(filename, patchLines.join('\n'))
}
