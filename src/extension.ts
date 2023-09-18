import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      ["javascript", "typescript"],
      new EnvCompletionItemProvider(),
      "."
    )
  );
}
type EnvVarItem = {
  name: string;
  value: string;
  file: string;
};
class EnvCompletionItemProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Thenable<vscode.CompletionItem[]> {
    return new Promise((resolve, reject) => {
      let line = document.lineAt(position).text;
      if (line.match(/((process\??\.)|(import\??\.meta\??\.))env\??\./)) {
        let envVariables: EnvVarItem[] = [];
        const workspaceFolder = vscode.workspace.workspaceFolders; //TODO: This should be selectable in case of multiple env files
        if (workspaceFolder) {
          workspaceFolder.forEach((folder) => {
            this.getEnvFilesInDir(folder.uri.fsPath, envVariables);
          });
        }
        let uniqueEnvVariables = [...new Set(envVariables)];
        resolve(
          uniqueEnvVariables.map(({ name, value, file }, index) => {
            const cItem = new vscode.CompletionItem(
              name,
              vscode.CompletionItemKind.Variable
            );
            cItem.documentation = new vscode.MarkdownString(
              `**Environment Variable**\n\n _File: ${file}_\n\n${name}=${value}`
            );
            return cItem;
          })
        );
      } else {
        console.log("No Match");
        resolve([]);
      }
    });
  }

  getEnvFilesInDir(dir: string, envVariables: EnvVarItem[]) {
    let files = fs.readdirSync(dir);
    for (let i in files) {
      let name = dir + "/" + files[i];
      if (!name.includes("node_modules") && fs.statSync(name).isDirectory()) {
        this.getEnvFilesInDir(name, envVariables);
      } else if (/\.env(\.local(\.[a-zA-Z0-9]+)*)?$/gi.test(files[i])) {
        if (files[i].endsWith("js")) {
          const exportedVariables = require(name);
          for (const [key, value] of Object.entries(exportedVariables)) {
            envVariables.push({
              name: key,
              value: value as string,
              file: name,
            });
          }
        } else {
          let content = fs.readFileSync(name, "utf8");
          let lines = content.split("\n");
          for (let line of lines) {
            if (line.startsWith("#")) {
              continue;
            }
            let [key, value] = line.split("=");
            if (key && value) {
              envVariables.push({ name: key, value, file: name });
            }
          }
        }
      }
    }
  }
}

export function deactivate() {}
