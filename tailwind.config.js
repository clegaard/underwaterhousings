/** @type {import('tailwindcss').Config} */
module.exports = {
    theme: {
        extend: {},
    },
    plugins: [
        function ({ addVariant }) {
            // Target touch-only devices (no hover support) — phones, tablets
            addVariant('touch', '@media (hover: none) and (pointer: coarse)')
        },
    ],
}
