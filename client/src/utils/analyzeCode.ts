import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const analyzeCode = async (code: string) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/lint`, { code });
        return response.data.result; // Return the linting results
    } catch (error) {
        console.error('Error analyzing code:', error);
        return 'Error analyzing code.';
    }
};

export default analyzeCode;