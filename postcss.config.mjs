/* eslint-disable @typescript-eslint/no-var-requires */
/** @type {import('postcss-load-config').Config} */
import { parse, atRule, list, rule as _rule } from 'postcss';
import valueParser from 'postcss-value-parser';
import cascadeLayers from '@csstools/postcss-cascade-layers';
import mediaMinMax from 'postcss-media-minmax';
import oklabFunction from '@csstools/postcss-oklab-function';
import colorMixFunction from '@csstools/postcss-color-mix-function';
import nesting from 'postcss-nesting';
import autoprefixer from 'autoprefixer';

/*
    This plugin polyfills @property definitions with regular CSS variables.
    Additionally, it removes `in <colorspace>` after `to left` or `to right` gradient args for older browsers.
*/
const propertyInjectPlugin = () => ({
    postcssPlugin: 'postcss-property-polyfill',
    Once(root) {
        const fallbackRules = [];

        root.walkAtRules('property', (rule) => {
            const declarations = {};
            let varName = null;

            rule.walkDecls((decl) => {
                if (decl.prop === 'initial-value') {
                    varName = rule.params.trim();
                    declarations[varName] = decl.value;
                }
            });

            if (varName) {
                fallbackRules.push(`${varName}: ${declarations[varName]};`);
            }
        });

        if (fallbackRules.length > 0) {
            const fallbackCSS = `@supports not (background: paint(something)) {
                :root { ${fallbackRules.join(' ')} }
            }`;

            const sourceFile = root.source?.input?.file || root.source?.input?.from;
            const fallbackAst = parse(fallbackCSS, { from: sourceFile });

            let lastImportIndex = -1;
            root.nodes.forEach((node, i) => {
                if (node.type === 'atrule' && node.name === 'import') {
                    lastImportIndex = i;
                }
            });

            if (lastImportIndex === -1) {
                root.prepend(fallbackAst);
            } else {
                root.insertAfter(root.nodes[lastImportIndex], fallbackAst);
            }
        }

        root.walkDecls((decl) => {
            if (!decl.value) return;
            decl.value = decl.value.replaceAll(/\bto\s+(left|right)\s+in\s+[\w-]+/g, (_, direction) => {
                return `to ${direction}`;
            });
        });
    }
});
propertyInjectPlugin.postcss = true;

/*
    This plugin resolves CSS variables inside `color-mix()` functions.
*/
const colorMixVarResolverPlugin = () => ({
    postcssPlugin: 'postcss-color-mix-var-resolver',
    Once(root) {
        const cssVariables = {};

        root.walkRules((rule) => {
            if (!rule.selectors) return;

            const isRootOrHost = rule.selectors.some(
                sel => sel.includes(':root') || sel.includes(':host'),
            );

            if (isRootOrHost) {
                rule.walkDecls((decl) => {
                    if (decl.prop.startsWith('--')) {
                        cssVariables[decl.prop] = decl.value.trim();
                    }
                });
            }
        });

        root.walkDecls((decl) => {
            const originalValue = decl.value;
            if (!originalValue?.includes('color-mix(')) return;

            const parsed = valueParser(originalValue);
            let modified = false;

            parsed.walk((node) => {
                if (node.type === 'function' && node.value === 'color-mix') {
                    node.nodes.forEach((childNode) => {
                        if (
                            childNode.type === 'function' &&
                            childNode.value === 'var' &&
                            childNode.nodes.length > 0
                        ) {
                            const varName = childNode.nodes[0]?.value;
                            if (!varName) return;

                            const resolvedVar = cssVariables[varName] ?? 'black';
                            const resolved = `${resolvedVar} || var(${varName})`;

                            childNode.type = 'word';
                            childNode.value = resolved;
                            childNode.nodes = [];
                            modified = true;
                        }
                    });
                }
            });

            if (modified) {
                decl.value = parsed.toString();
            }
        });
    }
});
colorMixVarResolverPlugin.postcss = true;

/*
    This plugin transforms shorthand rotate/scale/translate into transform3d.
*/
const transformShortcutPlugin = () => ({
    postcssPlugin: 'postcss-transform-shortcut',
    Once(root) {
        const defaults = {
            rotate: [0, 0, 1, '0deg'],
            scale: [1, 1, 1],
            translate: [0, 0, 0],
        };

        const fallbackAtRule = atRule({
            name: 'supports',
            params: 'not (translate: 0)',
        });

        root.walkRules((rule) => {
            let hasTransformShorthand = false;
            const transformFunctions = [];

            rule.walkDecls((decl) => {
                if (/^(rotate|scale|translate)$/.test(decl.prop)) {
                    hasTransformShorthand = true;

                    const newValues = [...defaults[decl.prop]];
                    const value = decl.value.replaceAll(/\)\s*var\(/g, ') var(');
                    const userValues = list.space(value);

                    if (decl.prop === 'rotate' && userValues.length === 1) {
                        newValues.splice(-1, 1, ...userValues);
                    } else {
                        newValues.splice(0, userValues.length, ...userValues);
                    }

                    transformFunctions.push(`${decl.prop}3d(${newValues.join(',')})`);
                }
            });

            if (hasTransformShorthand && transformFunctions.length > 0) {
                const fallbackRule = _rule({ selector: rule.selector });
                fallbackRule.append({
                    prop: 'transform',
                    value: transformFunctions.join(' '),
                });
                fallbackAtRule.append(fallbackRule);
            }
        });

        if (fallbackAtRule.nodes?.length > 0) {
            root.append(fallbackAtRule);
        }
    }
});
transformShortcutPlugin.postcss = true;

/*
    This plugin transforms `var(--foo,)` to `var(--foo, )` for compatibility.
*/
const addSpaceForEmptyVarFallback = () => ({
    postcssPlugin: 'postcss-add-space-for-empty-var-fallback',
    OnceExit(root) {
        root.walkDecls((decl) => {
            if (!decl.value?.includes('var(')) return;

            const parsed = valueParser(decl.value);
            let changed = false;

            parsed.walk((node) => {
                if (node.type === 'function' && node.value === 'var') {
                    const commaIndex = node.nodes.findIndex(
                        n => n.type === 'div' && n.value === ',',
                    );

                    if (commaIndex === -1) return;

                    const fallbackNodes = node.nodes.slice(commaIndex + 1);
                    const fallbackText = fallbackNodes.map(n => n.value).join('').trim();

                    if (fallbackText === '') {
                        const commaNode = node.nodes[commaIndex];
                        if (commaNode.value === ',') {
                            commaNode.value = ', ';
                            changed = true;
                        }
                    }
                }
            });

            if (changed) {
                decl.value = parsed.toString();
            }
        });
    }
});
addSpaceForEmptyVarFallback.postcss = true;

const config = {
    plugins: [
        cascadeLayers,
        propertyInjectPlugin(),
        colorMixVarResolverPlugin(),
        transformShortcutPlugin(),
        addSpaceForEmptyVarFallback(),
        mediaMinMax,
        oklabFunction,
        colorMixFunction,
        nesting,
        autoprefixer,
    ],
};

export default config;
