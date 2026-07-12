const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function (file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
}

const files = getAllFiles(srcDir);

let modifiedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('from "@/constants/colors"') && !content.includes("from '@/constants/colors'")) {
    continue;
  }

  // Parse file
  let ast;
  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
  } catch (e) {
    console.error(`Error parsing ${file}:`, e);
    continue;
  }

  let hasColorsImport = false;
  let hasStyleSheet = false;

  // 1. Replace import { colors } with import { useAppTheme }
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === '@/constants/colors') {
        hasColorsImport = true;
        path.node.source.value = '@/store/useThemeStore';
        path.node.specifiers = [
          t.importSpecifier(t.identifier('useAppTheme'), t.identifier('useAppTheme'))
        ];
      }
    },
    // 2. Wrap StyleSheet.create
    VariableDeclarator(path) {
      if (
        t.isIdentifier(path.node.id, { name: 'styles' }) &&
        t.isCallExpression(path.node.init) &&
        t.isMemberExpression(path.node.init.callee) &&
        t.isIdentifier(path.node.init.callee.object, { name: 'StyleSheet' }) &&
        t.isIdentifier(path.node.init.callee.property, { name: 'create' })
      ) {
        hasStyleSheet = true;
        // change `const styles = StyleSheet.create(...)`
        // to `const getStyles = (colors: any) => StyleSheet.create(...)`
        
        path.node.id = t.identifier('getStyles');
        
        const colorsParam = t.identifier('colors');
        colorsParam.typeAnnotation = t.tsTypeAnnotation(t.tsAnyKeyword());

        path.node.init = t.arrowFunctionExpression(
          [colorsParam],
          path.node.init
        );
      }
    },
    // 3. Inject into component and modify `styles` references
    FunctionDeclaration(path) {
      // Check if it's a React component (returns JSX)
      let isReact = false;
      path.traverse({
        JSXElement() { isReact = true; },
        JSXFragment() { isReact = true; }
      });

      if (isReact && t.isBlockStatement(path.node.body)) {
        // Inject const { colors } = useAppTheme();
        const useAppThemeCall = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.objectPattern([
              t.objectProperty(t.identifier('colors'), t.identifier('colors'), false, true)
            ]),
            t.callExpression(t.identifier('useAppTheme'), [])
          )
        ]);
        
        // Inject const styles = getStyles(colors);
        const getStylesCall = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('styles'),
            t.callExpression(t.identifier('getStyles'), [t.identifier('colors')])
          )
        ]);

        path.node.body.body.unshift(getStylesCall);
        path.node.body.body.unshift(useAppThemeCall);
      }
    },
    ArrowFunctionExpression(path) {
      // Check if it's a React component (returns JSX and is part of a VariableDeclarator with capitalized name)
      if (path.parent && path.parent.type === 'VariableDeclarator' && /^[A-Z]/.test(path.parent.id.name)) {
        let isReact = false;
        path.traverse({
          JSXElement() { isReact = true; },
          JSXFragment() { isReact = true; }
        });

        if (isReact) {
           if (t.isBlockStatement(path.node.body)) {
             const useAppThemeCall = t.variableDeclaration('const', [
               t.variableDeclarator(
                 t.objectPattern([
                   t.objectProperty(t.identifier('colors'), t.identifier('colors'), false, true)
                 ]),
                 t.callExpression(t.identifier('useAppTheme'), [])
               )
             ]);
             
             const getStylesCall = t.variableDeclaration('const', [
               t.variableDeclarator(
                 t.identifier('styles'),
                 t.callExpression(t.identifier('getStyles'), [t.identifier('colors')])
               )
             ]);
     
             path.node.body.body.unshift(getStylesCall);
             path.node.body.body.unshift(useAppThemeCall);
           } else {
             // Implicit return (e.g. () => <View/>) -> Make it block
             const useAppThemeCall = t.variableDeclaration('const', [
               t.variableDeclarator(
                 t.objectPattern([
                   t.objectProperty(t.identifier('colors'), t.identifier('colors'), false, true)
                 ]),
                 t.callExpression(t.identifier('useAppTheme'), [])
               )
             ]);
             const getStylesCall = t.variableDeclaration('const', [
               t.variableDeclarator(
                 t.identifier('styles'),
                 t.callExpression(t.identifier('getStyles'), [t.identifier('colors')])
               )
             ]);
             
             path.node.body = t.blockStatement([
               useAppThemeCall,
               getStylesCall,
               t.returnStatement(path.node.body)
             ]);
           }
        }
      }
    }
  });

  if (hasColorsImport) {
    const output = generate(ast, { retainLines: false });
    fs.writeFileSync(file, output.code, 'utf8');
    console.log(`Refactored: ${file}`);
    modifiedCount++;
  }
}

console.log(`Total files modified: ${modifiedCount}`);
