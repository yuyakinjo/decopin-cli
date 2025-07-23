import ts from 'typescript';

export function createSourceFile(content: string, fileName = 'temp.ts'): ts.SourceFile {
  return ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
}

export function findDefaultExportFunction(sourceFile: ts.SourceFile): ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | undefined {
  let defaultExportNode: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      // export default function() {} or export default () => {}
      if (ts.isFunctionExpression(node.expression) || ts.isArrowFunction(node.expression)) {
        defaultExportNode = node.expression;
      } else if (ts.isIdentifier(node.expression)) {
        // export default functionName
        const symbol = (sourceFile as any).locals?.get(node.expression.escapedText.toString());
        if (symbol?.declarations?.[0]) {
          const declaration = symbol.declarations[0];
          if (ts.isFunctionDeclaration(declaration)) {
            defaultExportNode = declaration;
          }
        }
      }
    } else if (
      ts.isFunctionDeclaration(node) &&
      node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword) &&
      node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      // export default function functionName() {}
      defaultExportNode = node;
    }
  });

  return defaultExportNode;
}

export function extractFunctionMetadata(func: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression) {
  const params = func.parameters.map(param => ({
    name: param.name?.getText() || '',
    type: param.type?.getText() || 'any',
    optional: !!param.questionToken
  }));

  const returnType = func.type?.getText() || 'void';
  const isAsync = !!func.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword);

  return {
    params,
    returnType,
    isAsync
  };
}

export function findReturnStatements(node: ts.Node): ts.ReturnStatement[] {
  const returns: ts.ReturnStatement[] = [];

  function visit(node: ts.Node) {
    if (ts.isReturnStatement(node)) {
      returns.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(node);
  return returns;
}

export function getObjectLiteralProperties(obj: ts.ObjectLiteralExpression): Map<string, ts.Expression> {
  const properties = new Map<string, ts.Expression>();

  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
      properties.set(prop.name.text, prop.initializer);
    }
  }

  return properties;
}