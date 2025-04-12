/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('postcss-load-config').Config} */
const { parse, atRule, list, rule: _rule } = require('postcss');
const valueParser = require('postcss-value-parser');

/*
    This plugin polyfills @property definitions with regular CSS variables
    Additionally, it removes in <colorspace> after to left or to right gradient args for older browsers
*/
const propertyInjectPlugin = () => {
    return {
        postcssPlugin: 'postcss-property-polyfill',
        Once(root) {
            const fallbackRules = []

            // 1. Collect initial-value props from @property at-rules
            root.walkAtRules('property', (rule) => {
                const declarations = {}
                let varName = null

                rule.walkDecls((decl) => {
                    if (decl.prop === 'initial-value') {
                        varName = rule.params.trim()
                        declarations[varName] = decl.value
                    }
                })

                if (varName) {
                    fallbackRules.push(`${varName}: ${declarations[varName]};`)
                }
            })

            // 2. Inject fallback variables if any exist
            if (fallbackRules.length > 0) {
                const fallbackCSS = `@supports not (background: paint(something)) {
                    :root { ${fallbackRules.join(' ')} }
                }`

                const sourceFile = root.source?.input?.file || root.source?.input?.from
                const fallbackAst = parse(fallbackCSS, { from: sourceFile })

                let lastImportIndex = -1
                root.nodes.forEach((node, i) => {
                    if (node.type === 'atrule' && node.name === 'import') {
                        lastImportIndex = i
                    }
                })

                if (lastImportIndex === -1) {
                    root.prepend(fallbackAst)
                } else {
                    root.insertAfter(root.nodes[lastImportIndex], fallbackAst)
                }
            }

            // 3. Remove in <colorspace> after to left or to right, e.g. "to right in oklab" -> "to right"
            root.walkDecls((decl) => {
                if (!decl.value) return

                decl.value = decl.value.replaceAll(/\bto\s+(left|right)\s+in\s+[\w-]+/g, (_, direction) => {
                    return `to ${direction}`
                })
            })
        },
    }
}

propertyInjectPlugin.postcss = true

/*
    This plugin resolves/calculates CSS variables within color-mix() functions so they can be calculated using postcss-color-mix-function
    Exception: dynamic values like currentColor
*/
const colorMixVarResolverPlugin = () => {
    return {
        postcssPlugin: 'postcss-color-mix-var-resolver',

        Once(root) {
            const cssVariables = {}

            // 1. Collect all CSS variable definitions from tailwind
            root.walkRules((rule) => {
                if (!rule.selectors) return

                const isRootOrHost = rule.selectors.some(
                    sel => sel.includes(':root') || sel.includes(':host'),
                )

                if (isRootOrHost) {
                    rule.walkDecls((decl) => {
                        if (decl.prop.startsWith('--')) {
                            cssVariables[decl.prop] = decl.value.trim()
                        }
                    })
                }
            })

            // 2. Parse each declaration's value and replace var(...) in color-mix(...)
            root.walkDecls((decl) => {
                const originalValue = decl.value
                if (!originalValue || !originalValue.includes('color-mix(')) return

                const parsed = valueParser(originalValue)
                let modified = false

                parsed.walk((node) => {
                    if (node.type === 'function' && node.value === 'color-mix') {
                        node.nodes.forEach((childNode) => {
                            if (childNode.type === 'function' && childNode.value === 'var' && childNode.nodes.length > 0) {
                                const varName = childNode.nodes[0]?.value
                                if (!varName) return

                                const resolvedVarName = cssVariables[varName] === undefined ? 'black' : cssVariables[varName]
                                const resolved = `${resolvedVarName} || var(${varName})`

                                childNode.type = 'word'
                                childNode.value = resolved
                                childNode.nodes = []
                                modified = true
                            }
                        })
                    }
                })

                if (modified) {
                    decl.value = parsed.toString()
                }
            })
        },
    }
}

colorMixVarResolverPlugin.postcss = true

/*
    This plugin transforms shorthand rotate/scale/translate into their transform[3d] counterparts
*/
const transformShortcutPlugin = () => {
    return {
        postcssPlugin: 'postcss-transform-shortcut',

        Once(root) {
            const defaults = {
                rotate: [0, 0, 1, '0deg'],
                scale: [1, 1, 1],
                translate: [0, 0, 0],
            }

            const fallbackAtRule = atRule({
                name: 'supports',
                params: 'not (translate: 0)',
            })

            root.walkRules((rule) => {
                let hasTransformShorthand = false
                const transformFunctions = []

                rule.walkDecls((decl) => {
                    if (/^(rotate|scale|translate)$/.test(decl.prop)) {
                        hasTransformShorthand = true

                        const newValues = [...defaults[decl.prop]]
                        const value = decl.value.replaceAll(/\)\s*var\(/g, ') var(')
                        const userValues = list.space(value)

                        if (decl.prop === 'rotate' && userValues.length === 1) {
                            newValues.splice(-1, 1, ...userValues)
                        } else {
                            newValues.splice(0, userValues.length, ...userValues)
                        }

                        transformFunctions.push(`${decl.prop}3d(${newValues.join(',')})`)
                    }
                })

                if (hasTransformShorthand && transformFunctions.length > 0) {
                    const fallbackRule = _rule({ selector: rule.selector })

                    fallbackRule.append({
                        prop: 'transform',
                        value: transformFunctions.join(' '),
                    })

                    fallbackAtRule.append(fallbackRule)
                }
            })

            if (fallbackAtRule.nodes && fallbackAtRule.nodes.length > 0) {
                root.append(fallbackAtRule)
            }
        },
    }
}

transformShortcutPlugin.postcss = true

/**
 * PostCSS plugin to transform empty fallback values from var(--foo,),
 * turning them into var(--foo, ). Older browsers need this.
 */
const addSpaceForEmptyVarFallback = () => {
    return {
        postcssPlugin: 'postcss-add-space-for-empty-var-fallback',

        OnceExit(root) {
            root.walkDecls((decl) => {
                if (!decl.value || !decl.value.includes('var(')) {
                    return
                }

                const parsed = valueParser(decl.value)
                let changed = false

                parsed.walk((node) => {
                    if (node.type === 'function' && node.value === 'var') {
                        const commaIndex = node.nodes.findIndex(
                            n => n.type === 'div' && n.value === ',',
                        )

                        if (commaIndex === -1) return

                        const fallbackNodes = node.nodes.slice(commaIndex + 1)
                        const fallbackText = fallbackNodes.map(n => n.value).join('').trim()

                        if (fallbackText === '') {
                            const commaNode = node.nodes[commaIndex]
                            if (commaNode.value === ',') {
                                commaNode.value = ', '
                                changed = true
                            }
                        }
                    }
                })

                if (changed) {
                    decl.value = parsed.toString()
                }
            })
        },
    }
}

addSpaceForEmptyVarFallback.postcss = true

const config = {
    plugins: [
        require('@csstools/postcss-cascade-layers'),
        propertyInjectPlugin(),
        colorMixVarResolverPlugin(),
        transformShortcutPlugin(),
        addSpaceForEmptyVarFallback(),
        require('postcss-media-minmax'),
        require('@csstools/postcss-oklab-function'),
        require('@csstools/postcss-color-mix-function'),
        require('postcss-nesting'),
        require('autoprefixer'),
    ],
}

module.exports = config
