/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#25aae1',
                    hover: '#1f8fb8',
                    light: '#e0f2fe',
                },
                gray: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    800: '#1f2937',
                    900: '#111827',
                },
            }
        }
    },
    plugins: [],
}
