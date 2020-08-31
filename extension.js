const coc = require('coc.nvim')
const { TextEdit, Range } = require('vscode-languageserver-protocol')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const pkgUp = require('pkg-up')

function activate(context) {
  console.log('Congratulations, your extension "coc-purty" is now active!')
  context.subscriptions.push(
    coc.languages.registerDocumentFormatProvider(
      { scheme: 'file', language: 'purescript' },
      { provideDocumentFormattingEdits: doc => format(doc) }
    )
  )
}

function format(document) {
  console.debug('formatting purescript')
  return purty(document)
    .then(({ stdout }) => {
      const lastLineId = document.lineCount - 1
      const doc = coc.workspace.getDocument(document.uri)
      const wholeDocument = Range.create(
        {character: 0, line: 0},
        {character: doc.getline(lastLineId).length, line: lastLineId}
      )
      return [TextEdit.replace(wholeDocument, stdout)]
    })
    .catch(err => {
      console.log('err', err)
      coc.workspace.showMessage(`Error: ${err}`, 'error');
      coc.workspace.showMessage('Do you have Purty installed? "npm install purty"', 'info');
    })
}

function purty(document) {
  const configs = coc.workspace.getConfiguration('purty');
  const purtyCmd = getPurtyCmd(configs.pathToPurty, document.fileName)
  const cmd = `${purtyCmd} -`;
  const text = document.getText();
  const cwdCurrent = coc.workspace.rootPath;
  return new Promise((resolve, reject) => {
    const childProcess = exec(cmd, { cwd: cwdCurrent }, (err, stdout, stderr) => {
      if (err) {
        console.log('err', err)
        reject(err)
      }
      resolve({ stdout: stdout, stderr: stderr })
    })
    childProcess.stdin.write(text)
    childProcess.stdin.end()
  })
}

function findLocalPurty(fspath) {
  try {
    const pkgPath = pkgUp.sync({ cwd: fspath });
    if (pkgPath) {
      const purtyPath = path.resolve(
        path.dirname(pkgPath),
        'node_modules',
        '.bin',
        'purty'
      );
      if (fs.existsSync(purtyPath)) {
        return purtyPath;
      }
    }
  } catch (e) {
  }
  return null;
}

function getPurtyCmd(pathToPurty, fileName) {
  // We use empty string to mean unspecified because it means that the setting
  // can be edited without having to write json (`["string", "null"]` does not
  // have this property).
  if (pathToPurty !== "") {
    return pathToPurty;
  } else {
    const localPurty = findLocalPurty(fileName);
    if (localPurty != null) {
      return localPurty;
    } else {
      return 'purty';
    }
  }
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
}
