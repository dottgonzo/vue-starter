module.exports = {
    root: true,
    extends: 'airbnb-base',
    // required to lint *.vue files
    plugins: [
        'html'
    ],
    // add your custom rules here
    'rules': {
        'import/no-unresolved': 0,
        "indent": [0],
        "semi": [0],
        // allow debugger during development
        'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
        "comma-style": ["error", "last"],
        "comma-dangle": ["error", "never"],
        "no-param-reassign": ["error", { "props": false }],
        "no-shadow": [0]
    }
}
